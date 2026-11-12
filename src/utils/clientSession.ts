import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'

// Solo input is local on every platform. Network failures affect durable
// operations, never turn ordinary card picks into cloud requests.
export const actionBusy = ref(false)
export const operationError = ref('')
export function getInstallationId() {
  let id = localStorage.getItem('ganglegang_installation_id')
  if (!id || !/^[a-zA-Z0-9_-]{8,80}$/.test(id) || Object.hasOwn(Object.prototype, id) || id === '__proto__') { id = crypto.randomUUID(); localStorage.setItem('ganglegang_installation_id', id) }
  return id
}
export function clientIdentity() { return { deviceId: getInstallationId(), platform: Capacitor.getPlatform(), version: '2.0.0' } }
