import { ref, shallowRef } from 'vue'
import type { GameState, GameAction } from '../../shared/gameEngine.js'
import { getBaseUrl } from './api'
import { clientIdentity, operationError } from './clientSession'
import { acceptServerState } from './serverState'
import { ensureProfile, profileCredentials, acceptBackpack } from './backpack'

export interface RoomInfo { id: string; code: string; revision: number; epoch: string; members: number; connected: number; expiresAt: number }
export const playMode = ref<'solo' | 'couple'>('solo')
export const roomInfo = shallowRef<RoomInfo | null>(null)
export const roomGame = shallowRef<GameState | null>(null)
export const roomConnection = ref<'connecting' | 'ready' | 'disconnected'>('disconnected')
export const roomBusy = ref(false)
export const serverOffset = ref(0)
let socket: WebSocket | undefined, retry: ReturnType<typeof setTimeout> | undefined, timeout: ReturnType<typeof setTimeout> | undefined
let retries = 0, stopped = true, credentials: { roomId: string; token: string } | null = null
let pending: { type: string; operationId: string; revision: number; roundId: string; action: GameAction } | null = null
let sentPending = false

export async function playPost(path: string, body: Record<string, unknown>, timeoutMs = 8000) {
  await ensureProfile()
  const response = await fetch(getBaseUrl() + '/api/play/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...clientIdentity(), ...body, ...profileCredentials() }), signal: AbortSignal.timeout(timeoutMs) })
  const data = await response.json()
  if (data.backpack) acceptBackpack(data.backpack)
  if (data.state) acceptServerState(data.state)
  if (!response.ok) throw Object.assign(new Error(data.error || '服务暂不可用，请重试'), { status: response.status })
  if (data.serverNow) serverOffset.value = data.serverNow - Date.now()
  return data
}
function clearPending() {
  pending = null; roomBusy.value = false; sentPending = false
  if (timeout) clearTimeout(timeout)
  localStorage.removeItem('gang_room_pending')
}
function dispatchPending() {
  if (!pending || sentPending || socket?.readyState !== WebSocket.OPEN || roomConnection.value !== 'ready') return
  socket.send(JSON.stringify(pending)); sentPending = true
  timeout = setTimeout(() => { if (pending) { roomConnection.value = 'disconnected'; socket?.close(); reconnectRoom() } }, 5000)
}
export function sendRoomAction(action: GameAction) {
  if (roomConnection.value !== 'ready' || !roomInfo.value || !roomGame.value || roomBusy.value) return
  pending = { type: 'command', operationId: crypto.randomUUID(), revision: roomInfo.value.revision, roundId: roomGame.value.roundId, action }
  try { localStorage.setItem('gang_room_pending', JSON.stringify(pending)) }
  catch { pending = null; operationError.value = '本机空间不足，无法保存操作凭据；请释放空间后重试'; return }
  roomBusy.value = true; operationError.value = ''; dispatchPending()
}
function connect() {
  if (stopped || !credentials) return
  if (retry) clearTimeout(retry)
  if (timeout) clearTimeout(timeout)
  roomConnection.value = 'connecting'; sentPending = false
  const url = new URL(getBaseUrl() + '/api/play/socket'); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  const auth = { ...credentials, ...profileCredentials() }
  const current = new WebSocket(url); socket = current
  timeout = setTimeout(() => current.close(), 8000)
  current.onopen = () => { if (socket === current && !stopped) current.send(JSON.stringify({ type: 'auth', ...auth })); else current.close() }
  current.onmessage = event => {
    if (socket !== current || stopped) return
    try {
      const data = JSON.parse(event.data)
      if (data.backpack) acceptBackpack(data.backpack)
      if (data.state) acceptServerState(data.state)
      if (data.serverNow) serverOffset.value = data.serverNow - Date.now()
      if (data.type === 'ended') { stopRoom(); operationError.value = data.error; return }
      if (data.type === 'replaced') {
        stopped = true; roomConnection.value = 'disconnected'; sentPending = false
        if (timeout) clearTimeout(timeout)
        if (retry) clearTimeout(retry)
        operationError.value = data.error; current.close(); return
      }
      if (data.type === 'error') {
        operationError.value = data.error
        if (data.rejected && data.rejected === pending?.operationId) clearPending()
        else { current.close(); roomConnection.value = 'disconnected' }
        return
      }
      if (data.type === 'snapshot') {
        // A full snapshot also resets revision after a server restart.
        roomInfo.value = data.room; roomGame.value = data.game; roomConnection.value = 'ready'; retries = 0
        if (timeout) clearTimeout(timeout)
      } else if (data.type === 'patch') {
        if (!roomInfo.value || !roomGame.value || data.room.epoch !== roomInfo.value.epoch || data.baseRevision !== roomInfo.value.revision) {
          current.send(JSON.stringify({ type: 'sync' })); return
        }
        const { cardsChanged, ...fields } = data.patch
        const changed = new Map<number, GameState['cards'][number]>((cardsChanged || []).map((card: GameState['cards'][number]) => [card.id, card]))
        roomGame.value = { ...roomGame.value, ...fields, cards: roomGame.value.cards.map(card => changed.get(card.id) || card) }
        roomInfo.value = data.room
      } else if (data.type === 'presence') roomInfo.value = data.room
      if (data.ack && pending?.operationId === data.ack) { clearPending(); operationError.value = '' }
      if (data.rejected && pending?.operationId === data.rejected) { clearPending(); operationError.value = data.error }
      if (data.type === 'snapshot') dispatchPending()
    } catch { current.close() }
  }
  current.onclose = () => {
    if (socket !== current || stopped) return
    roomConnection.value = 'disconnected'; sentPending = false
    if (timeout) clearTimeout(timeout)
    retry = setTimeout(connect, Math.min(10000, 500 * 2 ** Math.min(retries++, 5)))
  }
  current.onerror = () => current.close()
}
function enter(data: { room: RoomInfo; token: string; game: GameState }) {
  const saved = { roomId: data.room.id, token: data.token }
  localStorage.setItem('gang_room_credentials', JSON.stringify(saved))
  localStorage.setItem('gang_play_mode', 'couple')
  stopRoom(false)
  credentials = saved
  roomInfo.value = data.room; roomGame.value = data.game; playMode.value = 'couple'; stopped = false
  connect()
}
type Entry = { path: 'rooms' | 'rooms/join'; code?: string; operationId: string; claimToken: string }
async function requestEntry(path: Entry['path'], code?: string) {
  const key = 'gang_room_entry', raw = localStorage.getItem(key)
  const entry: Entry = raw ? JSON.parse(raw) : { path, ...(code ? { code } : {}), operationId: crypto.randomUUID(),
    claimToken: Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('') }
  if (entry.path !== path || entry.code !== code) throw new Error('有房间请求尚未确认，请点击重试未确认操作')
  localStorage.setItem(key, JSON.stringify(entry))
  try {
    const data = await playPost(entry.path, entry)
    enter(data); localStorage.removeItem(key)
  } catch (error) {
    const status = (error as { status?: number }).status
    if (status && status >= 400 && status < 500 && status !== 429) localStorage.removeItem(key)
    throw error
  }
}
export async function createRoom() { await requestEntry('rooms') }
export async function joinRoom(code: string) { await requestEntry('rooms/join', code) }
export async function retryRoomEntry() {
  const raw = localStorage.getItem('gang_room_entry')
  if (!raw) return
  const entry = JSON.parse(raw) as Entry
  await requestEntry(entry.path, entry.code)
}
export async function resumeRoom() {
  const raw = localStorage.getItem('gang_room_credentials')
  if (!raw) return false
  try {
    const saved = JSON.parse(raw), rawPending = localStorage.getItem('gang_room_pending')
    const data = await playPost('rooms/resume', saved)
    enter(data)
    if (rawPending) { pending = JSON.parse(rawPending); roomBusy.value = true }
    return true
  } catch (error) {
    if ((error as { status?: number }).status === 403 || error instanceof SyntaxError) stopRoom()
    operationError.value = error instanceof Error ? error.message : '无法恢复房间'; return false
  }
}
export function reconnectRoom(manual = true) { if (credentials && playMode.value === 'couple' && (manual || !stopped)) { stopped = false; if (manual) operationError.value = ''; socket?.close(); connect() } }
export function leaveRoom() {
  localStorage.setItem('gang_play_mode', 'solo')
  stopRoom(false); playMode.value = 'solo'; roomInfo.value = null; roomGame.value = null
}
export function stopRoom(forget = true) {
  stopped = true
  if (retry) clearTimeout(retry)
  if (timeout) clearTimeout(timeout)
  socket?.close(); socket = undefined
  pending = null; roomBusy.value = false; sentPending = false
  roomConnection.value = 'disconnected'
  if (forget) { localStorage.removeItem('gang_room_credentials'); localStorage.removeItem('gang_room_pending'); localStorage.setItem('gang_play_mode', 'solo'); credentials = null; roomInfo.value = null; roomGame.value = null; playMode.value = 'solo' }
}
