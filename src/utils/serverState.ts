import { shallowRef } from 'vue'
import type { AdminConfig, LoveCoupon } from '../types/game'

export interface ServerState {
  epoch: string
  revision: number
  configVersion: string
  config: AdminConfig
  coupons: LoveCoupon[]
}
export const serverState = shallowRef<ServerState | null>(null)
const retiredEpochs = new Set<string>()

export function acceptServerState(input: unknown): boolean {
  const state = input as ServerState
  if (!state || typeof state.epoch !== 'string' || typeof state.configVersion !== 'string' || !/^[a-f0-9]{64}$/.test(state.configVersion) || !Number.isSafeInteger(state.revision) || state.revision < 0 || !state.config?.gameSettings || !Array.isArray(state.coupons) || state.coupons.some(c => !c || typeof c.id !== 'string' || typeof c.title !== 'string' || typeof c.used !== 'boolean')) throw new Error('Invalid server state')
  if (retiredEpochs.has(state.epoch)) return false
  const current = serverState.value
  if (current?.epoch === state.epoch && current.revision >= state.revision) return false
  if (current && current.epoch !== state.epoch) retiredEpochs.add(current.epoch)
  serverState.value = state
  return true
}

export function beginStateSession() {
  // Old requests are rejected by the online session generation guard before applying a snapshot.
  serverState.value = null
  retiredEpochs.clear()
}
