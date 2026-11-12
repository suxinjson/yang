<template><AdminDashboard :card-defs="cardDefs" @config-updated="reloadCards" /></template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import './admin.css'
import AdminDashboard from './components/AdminDashboard.vue'
import { loadCardDefinitions } from './utils/cardThemes'
import { acceptServerState, serverState } from './utils/serverState'
import { getBaseUrl } from './utils/api'
import { acceptServerConfig } from './utils/adminConfig'
const cardDefs = ref(loadCardDefinitions())
function reloadCards() { cardDefs.value = loadCardDefinitions() }
let timer: ReturnType<typeof setInterval> | undefined, pending = false
async function sync() {
  if (pending || document.hidden) return
  pending = true
  try {
    const response = await fetch(getBaseUrl() + '/api/state', { cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (response.ok) { const data = await response.json(); if (data.state) { acceptServerState(data.state); if (serverState.value) acceptServerConfig(serverState.value.config) }; reloadCards() }
  } catch { /* Drafts remain intact on a connection error. */ } finally { pending = false }
}
onMounted(() => { document.title = '钢了钢 · 开发者管理后台'; void sync(); timer = setInterval(sync, 5000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>
