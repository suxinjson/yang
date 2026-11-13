<template>
  <div class="admin-page">
    <form v-if="!isAuthenticated" class="admin-login" @submit.prevent="handleLogin">
      <h1>钢了钢</h1><h2>后台管理身份验证</h2>
      <label class="admin-field"><span class="sr-only">管理员密码</span><input v-model="passwordInput" type="password" placeholder="请输入管理员密码..." autocomplete="current-password" autofocus required /></label>
      <p v-if="loginError" role="alert" class="text-xs text-red-600">{{ loginError }}</p>
      <button class="admin-primary w-full" :disabled="loggingIn">登录后台</button>
    </form>
    <div v-else class="admin-shell">
      <header class="admin-header"><div><span class="admin-brand">钢了钢</span><span class="ml-3 text-xs text-slate-400">管理后台</span></div><button class="admin-text" @click="logout">退出登录</button></header>
      <div class="admin-layout">
        <nav class="admin-nav" aria-label="后台导航">
          <button v-for="tab in tabs" :key="tab.id" :aria-current="activeTab === tab.id ? 'page' : undefined" @click="activeTab = tab.id">{{ tab.label }}</button>
        </nav>
        <main class="admin-content">
          <RuntimeAdmin v-if="activeTab === 'runtime'" />
          <ClientLogsPanel v-if="activeTab === 'logs'" />
          <GameSettingsPanel ref="gamePanel" v-show="activeTab === 'game'" :settings="config.gameSettings" :groups="config.cardGroups" :cards="localCards" :busy="saveStatus === 'saving'" @save="saveGameSettings" />
          <div v-show="activeTab === 'photos'" class="space-y-8">
            <CardSettingsPanel :cards="localCards" :groups="config.cardGroups" @groups="updateGroups" :text-mode="config.cardTextMode" :busy="bfUploading || cardUploading" @busy="cardUploading = $event" @update="updateCards" @text-mode="updateCardTextMode" />
            <details><summary class="cursor-pointer text-sm text-slate-500">救场形象设置</summary><BoyfriendSettingsPanel :config="config" @update="updateBoyfriendConfig" @save="handleSave" @busy="bfUploading = $event" /></details>
          </div>
          <section v-if="activeTab === 'rules'" class="space-y-6">
            <h2 class="panel-title">心愿券设置</h2>
            <form class="admin-panel space-y-5" @submit.prevent="handleSave">
              <label class="admin-field">券名称<input v-model.trim="config.couponName" aria-label="券名称" maxlength="30" /></label>
              <div class="space-y-3">
                <div class="flex justify-between gap-3 text-xs"><span>男友心愿 {{ config.gfPenaltyRatio }}%</span><span>女友心愿 {{ 100 - config.gfPenaltyRatio }}%</span></div>
                <input v-model.number="config.gfPenaltyRatio" type="range" min="0" max="100" step="5" aria-label="男友心愿抽取比例" class="w-full accent-slate-700" />
              </div>
              <h3 class="font-semibold">通关奖励</h3>
              <label class="flex items-center gap-2 text-sm"><input v-model="config.rewardPolicy.simultaneous" type="checkbox" aria-label="共同获取道具" />共同获取道具</label>
              <p class="text-xs leading-relaxed text-slate-500">{{ config.rewardPolicy.simultaneous ? '各道具分别按概率抽取，可同时获得多种。' : '最多获得一种道具。概率合计不足 100% 的部分为空奖。' }}心愿券单独抽取。</p>
              <label v-for="rule in rewardFields" :key="rule.key" class="admin-field">{{ rule.label }} (%)<input v-model.number="config.rewardPolicy[rule.key]" :aria-label="rule.label" type="number" min="0" max="100" step="0.01" /></label>
              <p v-if="!config.rewardPolicy.simultaneous && config.rewardPolicy.hintChance + config.rewardPolicy.rescueChance > 100" role="alert" class="text-xs text-red-600">关闭共同获取时，两种道具概率合计不能超过 100%。</p>
              <p class="text-xs text-slate-500">道具进入个人背包，跨关卡保留。新身份只获得一次初始道具。</p>
              <button class="admin-primary" :disabled="saveStatus === 'saving'">保存心愿券设置</button>
            </form>
          </section>
          <RewardPoolEditor v-if="activeTab === 'gf_tasks'" title="男友心愿" :items="config.girlfriendTasks" :ratio="config.gfPenaltyRatio" target="girlfriend_pays" :busy="saveStatus === 'saving'" @update="items => updatePool('girlfriendTasks', items)" />
          <RewardPoolEditor v-if="activeTab === 'bf_rewards'" title="女友心愿" :items="config.boyfriendRewards" :ratio="100 - config.gfPenaltyRatio" target="boyfriend_pays" :busy="saveStatus === 'saving'" @update="items => updatePool('boyfriendRewards', items)" />
          <AdminSecurityPanel v-if="activeTab === 'security'" />
          <div v-if="remoteConflict" role="alert" class="mt-5 rounded-xl bg-amber-50 p-4 text-xs text-amber-800">
            其他页面已更新配置，当前修改已保留。
            <button class="ml-2 font-semibold underline" @click="reloadRemoteConfig">重新载入最新配置</button>
          </div>
          <footer v-if="configTab" class="admin-savebar">
            <span role="status" class="text-xs" :class="saveStatus === 'synced' ? 'text-emerald-700' : saveStatus === 'failed' ? 'text-red-600' : 'text-slate-500'">{{ saveStatusText }}</span>
            <button class="admin-primary" :disabled="saveStatus === 'saving' || bfUploading || cardUploading" @click="saveAll">保存全部配置</button>
          </footer>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { AdminConfig, CardDefinition, CardTextMode, GameSettings, TaskItem, CardGroup } from '../types/game'
import { loadAdminConfig, saveAdminConfig } from '../utils/adminConfig'
import { apiLogin, getAdminToken, setAdminToken } from '../utils/api'
import { DEFAULT_CARD_DEFINITIONS } from '../../shared/cardDefinitions.js'
import CardSettingsPanel from './CardSettingsPanel.vue'
import RewardPoolEditor from './RewardPoolEditor.vue'
import AdminSecurityPanel from './AdminSecurityPanel.vue'
import GameSettingsPanel from './GameSettingsPanel.vue'
import BoyfriendSettingsPanel from './BoyfriendSettingsPanel.vue'
import RuntimeAdmin from './RuntimeAdmin.vue'
import ClientLogsPanel from './ClientLogsPanel.vue'
import { serverState } from '../utils/serverState'
import { normalizeAdminConfig } from '../utils/adminConfig'

const props = defineProps<{
  cardDefs: CardDefinition[]
}>()

const emit = defineEmits<{
  (e: 'config-updated'): void
}>()

// Session authentication state
const isAuthenticated = ref<boolean>(Boolean(getAdminToken()))
const passwordInput = ref('')
const loginError = ref(''), loggingIn = ref(false)

// Tabs
const activeTab = ref<'game' | 'photos' | 'rules' | 'gf_tasks' | 'bf_rewards' | 'security' | 'logs' | 'runtime'>('game')

const tabs = [
  { id: 'runtime', label: '运行与个人背包' }, { id: 'game', label: '关卡与布局' }, { id: 'photos', label: '卡牌种类与图片' },
  { id: 'rules', label: '心愿券设置' }, { id: 'gf_tasks', label: '男友心愿' }, { id: 'bf_rewards', label: '女友心愿' },
  { id: 'logs', label: '客户端日志' }, { id: 'security', label: '密码安全' }
] as const
const configTab = computed(() => !['runtime', 'logs', 'security'].includes(activeTab.value))

// Config
const config = ref<AdminConfig>(loadAdminConfig())
const rewardFields = [{ key: 'hintChance', label: '透视卡获得概率' }, { key: 'rescueChance', label: '召唤男友卡获得概率' }, { key: 'couponChance', label: '心愿券获得概率' }] as const
const bfUploading = ref(false)
const gamePanel = ref<InstanceType<typeof GameSettingsPanel> | null>(null)
const saveStatus = ref<'idle' | 'saving' | 'synced' | 'failed'>('idle')
const saveStatusText = computed(() => saveStatus.value === 'synced' && hasUnsavedChanges.value ? '' : ({ idle: '', saving: '正在保存…', synced: '已保存并同步到服务器', failed: '保存失败，请重试' })[saveStatus.value])
let saveVersion = 0
const remoteConflict = ref(false)
let configVersion = serverState.value?.configVersion
const cleanDraft = ref('')
const hasUnsavedChanges = computed(() => JSON.stringify(config.value) !== cleanDraft.value || !!gamePanel.value?.hasChanges())

const cardUploading = ref(false)
const localCards = ref<CardDefinition[]>([])

function initLocalCards() {
  if (config.value.customCards && Array.isArray(config.value.customCards) && config.value.customCards.length >= 3) {
    localCards.value = JSON.parse(JSON.stringify(config.value.customCards))
  } else if (props.cardDefs && props.cardDefs.length > 0) {
    localCards.value = JSON.parse(JSON.stringify(props.cardDefs))
    config.value.customCards = JSON.parse(JSON.stringify(props.cardDefs))
  } else {
    localCards.value = JSON.parse(JSON.stringify(DEFAULT_CARD_DEFINITIONS))
    config.value.customCards = JSON.parse(JSON.stringify(DEFAULT_CARD_DEFINITIONS))
  }
}
initLocalCards()
cleanDraft.value = JSON.stringify(config.value)
function reloadRemoteConfig() {
  if (!serverState.value) return
  config.value = normalizeAdminConfig(serverState.value.config)
  initLocalCards()
  configVersion = serverState.value.configVersion
  cleanDraft.value = JSON.stringify(config.value)
  remoteConflict.value = false
  saveStatus.value = 'idle'
}
watch(() => serverState.value?.configVersion, version => {
  if (!version || version === configVersion) return
  if (saveStatus.value === 'saving') return
  if (hasUnsavedChanges.value) {
    remoteConflict.value = true
  } else reloadRemoteConfig()
})

watch(() => props.cardDefs, (newDefs) => {
  if (!config.value.customCards || config.value.customCards.length === 0) {
    localCards.value = JSON.parse(JSON.stringify(newDefs))
  }
})

function updateGroups(groups: CardGroup[]) {
  config.value.cardGroups = groups
  config.value.gameSettings.levels.forEach(level => { if (level.cardGroupIds) { level.cardGroupIds = level.cardGroupIds.filter(id => groups.some(group => group.id === id)); if (!level.cardGroupIds.length) delete level.cardGroupIds } })
  void handleSave()
}
function updateCards(cards: CardDefinition[]) { localCards.value = cards; config.value.customCards = cards; void handleSave() }
function updateCardTextMode(mode: CardTextMode) { config.value.cardTextMode = mode; void handleSave() }
function updatePool(key: 'girlfriendTasks' | 'boyfriendRewards', items: TaskItem[]) { config.value[key] = items; void handleSave() }

// Authentication
function logout() { setAdminToken(null); isAuthenticated.value = false; passwordInput.value = '' }
async function handleLogin() {
  if (loggingIn.value) return
  loggingIn.value = true
  const success = await apiLogin(passwordInput.value)
  loggingIn.value = false
  if (success) {
    isAuthenticated.value = true
    loginError.value = ''
  } else {
    loginError.value = '密码错误，请重新输入！'
    passwordInput.value = ''
  }
}

function updateBoyfriendConfig(patch: Partial<Pick<AdminConfig, 'bfPhotos' | 'bfPhotoIndex' | 'bfCardEnabled'>>) {
  Object.assign(config.value, patch)
}

async function handleSave() {
  if (remoteConflict.value) { saveStatus.value = 'failed'; return 'failed' }
  const version = ++saveVersion
  const submitted = JSON.stringify(config.value)
  saveStatus.value = 'saving'
  let committedVersion: string | undefined
  const result = await saveAdminConfig(config.value, configVersion, saved => { committedVersion = saved })
  if (version === saveVersion) saveStatus.value = result
  if (version === saveVersion && result === 'synced') {
    if (committedVersion && serverState.value?.configVersion !== committedVersion) {
      remoteConflict.value = true
      saveStatus.value = 'failed'
      return 'failed'
    }
    const unchanged = JSON.stringify(config.value) === submitted && !gamePanel.value?.hasChanges()
    if (serverState.value && unchanged) config.value = normalizeAdminConfig(serverState.value.config)
    configVersion = committedVersion || serverState.value?.configVersion
    cleanDraft.value = unchanged ? JSON.stringify(config.value) : submitted
    remoteConflict.value = false
  } else if (serverState.value?.configVersion && serverState.value.configVersion !== configVersion) remoteConflict.value = true
  emit('config-updated')
  return result
}

function saveGameSettings(settings: GameSettings) {
  config.value.gameSettings = settings
  handleSave()
}

async function saveAll() {
  if (bfUploading.value || cardUploading.value) return
  if (gamePanel.value) config.value.gameSettings = gamePanel.value.prepareSettings()
  await handleSave()
}

</script>
