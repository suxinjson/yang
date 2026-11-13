import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { clientIdentity } from './clientSession'
import { getBaseUrl } from './api'
import { LIFECYCLE_EVENTS } from '../../shared/logRules.js'

type Report = { eventId: string; sessionId: string; deviceId: string; platform: string; version: string; at: string; event: string; details: Record<string, string | number> }
const QUEUE_KEY = 'gang_lifecycle_queue_v1'
let started = false
let sending: Promise<void> | undefined
let queue: Report[] = []
function saveQueue() { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)) } catch { /* Lifecycle logging must never block play. */ } }

export function flushLifecycleReports(): Promise<void> {
  if (sending) return sending
  sending = (async () => {
    while (queue.length) {
      const batch = queue.slice(0, 20)
      try {
        const response = await fetch(getBaseUrl() + '/api/client/lifecycle', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reports: batch }), keepalive: true, signal: AbortSignal.timeout(4000) })
        if (!response.ok || !(await response.json()).ok) return
        const sent = new Set(batch.map(report => report.eventId))
        queue = queue.filter(report => !sent.has(report.eventId)); saveQueue()
      } catch { return }
    }
  })().finally(() => { sending = undefined })
  return sending
}

export function startLifecycleTracking() {
  if (started) return
  started = true
  try {
    const saved = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    if (Array.isArray(saved)) queue = saved.filter(report => report && LIFECYCLE_EVENTS.has(report.event) && typeof report.eventId === 'string' &&
      typeof report.deviceId === 'string' && typeof report.sessionId === 'string' && ['android', 'ios', 'web'].includes(report.platform) &&
      Date.parse(report.at) >= Date.now() - 29 * 86400000 && Date.parse(report.at) <= Date.now() + 300000).slice(-100)
  } catch { queue = [] }
  let identity: ReturnType<typeof clientIdentity>
  try { identity = clientIdentity() } catch { return }
  const native = Capacitor.isNativePlatform(), sessionId = identity.sessionId, openedAt = Date.now()
  let state: 'foreground' | 'background' | 'closed' = 'foreground', changedAt = openedAt, foregroundMs = 0
  function record(event: string, reason: string, backgroundMs = 0) {
    const now = Date.now()
    queue.push({ ...identity, sessionId, eventId: crypto.randomUUID(), event, at: new Date(now).toISOString(),
      details: { reason, elapsedMs: Math.max(0, now - openedAt), foregroundMs: foregroundMs + (state === 'foreground' ? Math.max(0, now - changedAt) : 0), backgroundMs } })
    queue = queue.slice(-100); saveQueue(); void flushLifecycleReports()
  }
  function change(active: boolean, reason: string) {
    if (state === 'closed' || active === (state === 'foreground')) return
    const now = Date.now(), backgroundMs = active ? Math.max(0, now - changedAt) : 0
    if (!active) foregroundMs += Math.max(0, now - changedAt)
    state = active ? 'foreground' : 'background'; changedAt = now
    record(native ? active ? 'app_foreground' : 'app_background' : active ? 'page_visible' : 'page_hidden', reason, backgroundMs)
  }
  function close(reason: string) {
    if (state === 'closed') return
    if (state === 'foreground') foregroundMs += Math.max(0, Date.now() - changedAt)
    state = 'closed'; record(native ? 'app_exit' : 'page_close', reason)
  }
  record(native ? 'app_open' : 'page_open', 'launch')
  if (document.hidden) change(false, 'visibility')
  document.addEventListener('visibilitychange', () => change(!document.hidden, 'visibility'))
  window.addEventListener('pagehide', event => { if (event.persisted) change(false, 'pagehide'); else close('pagehide') })
  window.addEventListener('pageshow', () => change(!document.hidden, 'visibility'))
  window.addEventListener('online', () => { void flushLifecycleReports() })
  if (native && Capacitor.isPluginAvailable('App')) {
    void App.addListener('appStateChange', ({ isActive }) => change(isActive, 'native_state')).catch(() => {})
    if (identity.platform === 'android') void App.addListener('backButton', async ({ canGoBack }) => {
      if (canGoBack) { history.back(); return }
      close('back_button')
      // Record the explicit exit intent before Android destroys the WebView.
      // The persisted queue retries on next open if delivery is interrupted.
      await Promise.race([flushLifecycleReports(), new Promise(resolve => setTimeout(resolve, 400))])
      await App.exitApp()
    }).catch(() => {})
  }
}
