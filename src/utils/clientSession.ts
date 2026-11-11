import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import type { AdminConfig, LoveCoupon } from '../types/game'
import { acceptServerState, beginStateSession } from './serverState'

export const onlineRequired = Capacitor.isNativePlatform() || import.meta.env.VITE_REQUIRE_ONLINE === 'true'
export const onlineState = ref<'connecting' | 'ready' | 'blocked' | 'background'>(onlineRequired ? 'connecting' : 'ready')
export const onlineMessage = ref('正在验证在线连接…')
export const actionBusy = ref(false)
export const onlineSessionId = ref('')
export const operationError = ref('')
const VERSION = '1.2.1'
let baseUrl = ''
let token = ''
let generation = 0
let heartbeat: ReturnType<typeof setInterval> | undefined
let heartbeatPending = false
let lastVerified = 0
let pendingEvents = 0
let eventQueue: Promise<unknown> = Promise.resolve()
let cleanupListeners: (() => void) | undefined

export function blockOnline(message = '连接已中断，请联网后重新连接') {
  if (!onlineRequired) return
  onlineMessage.value = message
  onlineState.value = 'blocked'
  if (heartbeat) clearInterval(heartbeat)
  heartbeat = undefined
}

function clientHeaders() {
  return { 'Content-Type': 'application/json', 'X-Client-Mode': 'online', 'X-Client-Token': token }
}

export function getInstallationId() {
  let deviceId = localStorage.getItem('ganglegang_installation_id')
  if (!deviceId || !/^[a-zA-Z0-9_-]{8,80}$/.test(deviceId)) {
    deviceId = crypto.randomUUID()
    localStorage.setItem('ganglegang_installation_id', deviceId)
  }
  return deviceId
}

export async function clientFetch(url: string, init: RequestInit = {}) {
  if (!onlineRequired) return fetch(url, init)
  if (onlineState.value !== 'ready' || !token || !navigator.onLine || document.hidden) {
    blockOnline()
    throw new Error('Online session required')
  }
  const current = generation
  try {
    const response = await fetch(url, { ...init, cache: 'no-store', headers: { ...clientHeaders(), ...init.headers }, signal: AbortSignal.timeout(5000) })
    if (current !== generation || onlineState.value !== 'ready') throw new Error('Session changed')
    if (response.status === 440 || response.status >= 500 || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Online backend unavailable')
    const readJson = response.json.bind(response)
    response.json = async () => {
      const data = await readJson()
      if (current !== generation || onlineState.value !== 'ready') throw new Error('Session changed while reading response')
      return data
    }
    return response
  } catch (error) {
    if (current === generation) blockOnline('服务器连接或日志服务不可用，游戏已暂停')
    throw error
  }
}

async function sessionPost(path: string, body: unknown, current = generation) {
  if (!token || !navigator.onLine || document.hidden) throw new Error('Online session required')
  const response = await fetch(`${baseUrl}/api/client/${path}`, {
    method: 'POST', headers: clientHeaders(), body: JSON.stringify(body),
    cache: 'no-store', signal: AbortSignal.timeout(5000)
  })
  if (current !== generation || !response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Online acknowledgement failed')
  const data = await response.json()
  if (current !== generation || data.ok !== true) throw new Error('Invalid online acknowledgement')
  if (path === 'heartbeat') acceptServerState(data.state)
  lastVerified = Date.now()
  return data
}

export async function openOnlineSession(base: string): Promise<{ config: AdminConfig; coupons: LoveCoupon[] }> {
  const current = ++generation
  token = ''
  onlineSessionId.value = ''
  onlineState.value = 'connecting'
  onlineMessage.value = '正在连接服务器并获取最新配置…'
  if (heartbeat) clearInterval(heartbeat)
  heartbeat = undefined
  baseUrl = base
  eventQueue = Promise.resolve()
  pendingEvents = 0
  heartbeatPending = false
  actionBusy.value = false
  beginStateSession()
  try {
    if (!navigator.onLine || document.hidden) throw new Error('No active network')
    const deviceId = getInstallationId()
    const response = await fetch(`${base}/api/client/session`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, platform: Capacitor.getPlatform(), version: VERSION }),
      cache: 'no-store', signal: AbortSignal.timeout(5000)
    })
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Server upgrade required')
    const data = await response.json()
    if (current !== generation) throw new Error('Session replaced')
    if (typeof data.token !== 'string' || data.token.length !== 64 || typeof data.sessionId !== 'string' || !data.config?.gameSettings || !Array.isArray(data.coupons)) throw new Error('Invalid session bootstrap')
    token = data.token
    onlineSessionId.value = data.sessionId
    acceptServerState(data.state)
    lastVerified = Date.now()
    return data
  } catch (error) {
    if (current === generation) blockOnline('无法建立在线会话，请检查网络和后台服务后重试')
    throw error
  }
}

export function activateOnlineSession() {
  if (!token || !navigator.onLine || document.hidden) { blockOnline(); return }
  onlineState.value = 'ready'
  heartbeat = setInterval(() => {
    if (Date.now() - lastVerified > 10000) { blockOnline('在线验证已超时，请重新连接'); return }
    if (heartbeatPending) return
    heartbeatPending = true
    const current = generation
    void sessionPost('heartbeat', {}, current).catch(() => {
      if (current === generation) blockOnline('在线验证失败，游戏已暂停')
    }).finally(() => { heartbeatPending = false })
  }, 5000)
}

export function recordClientEvent(event: string, details: Record<string, string | number | boolean> = {}) {
  if (!onlineRequired) return Promise.resolve()
  if (!token || !['ready', 'connecting'].includes(onlineState.value) || pendingEvents >= 100) {
    blockOnline('在线记录不可用，请重新连接')
    return Promise.reject(new Error('Online recording unavailable'))
  }
  const current = generation
  const eventId = crypto.randomUUID()
  pendingEvents++
  const pending = eventQueue.then(async () => {
    if (current !== generation || !['ready', 'connecting'].includes(onlineState.value)) throw new Error('Session no longer active')
    await sessionPost('events', { event, eventId, details }, current)
  }).catch(error => {
    if (current === generation) blockOnline('操作记录未获服务器确认，游戏已暂停')
    throw error
  }).finally(() => { if (current === generation) pendingEvents-- })
  eventQueue = pending.catch(() => {})
  return pending
}

export function runClientAction(event: string, details: Record<string, string | number | boolean>, action: () => unknown) {
  if (!onlineRequired) {
    if (actionBusy.value) return
    actionBusy.value = true
    operationError.value = ''
    try {
      const result = action()
      if (result instanceof Promise) return result.catch(() => { operationError.value = '操作未获服务器确认，请联网后重试' }).finally(() => { actionBusy.value = false })
      actionBusy.value = false
      return result
    } catch { operationError.value = '操作失败，请刷新后重试'; actionBusy.value = false; return }
  }
  if (onlineState.value !== 'ready' || actionBusy.value) return
  actionBusy.value = true
  const current = generation
  return recordClientEvent(event, details).then(async () => {
    if (current === generation && onlineState.value === 'ready') {
      await refreshClientState()
      if (current === generation && onlineState.value === 'ready') await action()
    }
  }).catch(() => {
    if (current === generation) blockOnline('操作未完成，请重新连接服务器')
  }).finally(() => { if (current === generation) actionBusy.value = false })
}

export async function refreshClientState() {
  const response = await clientFetch(`${baseUrl}/api/client/state`)
  if (!response.ok) throw new Error('State synchronization failed')
  const data = await response.json()
  acceptServerState(data.state)
}

export function installClientLifecycle(reconnect: () => void) {
  if (!onlineRequired) return
  cleanupListeners?.()
  const offline = () => blockOnline('网络已断开，联网后才能继续使用')
  const visibility = () => {
    if (document.hidden) {
      // Best effort only: the OS can kill an app without delivering a final event.
      if (token && onlineState.value === 'ready') void fetch(`${baseUrl}/api/client/events`, {
        method: 'POST', headers: clientHeaders(), keepalive: true,
        body: JSON.stringify({ event: 'background', eventId: crypto.randomUUID(), details: {} })
      }).catch(() => {})
      if (heartbeat) clearInterval(heartbeat)
      heartbeat = undefined
      ++generation
      token = ''
      onlineState.value = 'background'
    } else reconnect()
  }
  const ui = (event: Event) => {
    if (onlineState.value !== 'ready') return
    const element = event.target instanceof Element ? event.target.closest('button, input, select, textarea, [data-card-id], [data-audit-control]') : null
    if (!element || element.closest('[data-online-gate]')) return
    const cardId = Number(element.getAttribute('data-card-id'))
    // Never capture entered values, image data, passwords, or raw error text.
    const control = element.getAttribute('data-audit-control') || element.getAttribute('title') || element.getAttribute('aria-label') || (element.tagName === 'BUTTON' ? element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 60) : `${element.tagName.toLowerCase()}:${element.getAttribute('type') || 'field'}`) || 'control'
    void recordClientEvent(event.type === 'change' ? 'ui_change' : 'ui_click', { control, ...(element.hasAttribute('data-card-id') ? { cardId } : {}) }).catch(() => {})
  }
  const clientError = () => { void recordClientEvent('client_error', { code: 'runtime_error' }).catch(() => {}) }
  window.addEventListener('offline', offline)
  document.addEventListener('visibilitychange', visibility)
  document.addEventListener('click', ui, true)
  document.addEventListener('change', ui, true)
  window.addEventListener('error', clientError)
  window.addEventListener('unhandledrejection', clientError)
  cleanupListeners = () => {
    window.removeEventListener('offline', offline)
    document.removeEventListener('visibilitychange', visibility)
    document.removeEventListener('click', ui, true)
    document.removeEventListener('change', ui, true)
    window.removeEventListener('error', clientError)
    window.removeEventListener('unhandledrejection', clientError)
  }
}

export function stopClientSession() {
  cleanupListeners?.()
  cleanupListeners = undefined
  if (heartbeat) clearInterval(heartbeat)
  heartbeat = undefined
  generation++
  token = ''
}
