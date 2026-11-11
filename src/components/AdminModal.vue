<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-gray-950/80 backdrop-blur-md animate-fade-in font-sans">
      
      <!-- 1. Password Verification Screen (If not logged in) -->
      <div
        v-if="!isAuthenticated"
        class="w-full max-w-[320px] bg-white rounded-3xl p-6 shadow-2xl border-4 border-slate-700 text-center relative"
      >
        <button
          class="absolute top-4 right-4 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center text-xs"
          @click="$emit('close')"
        >
          ✕
        </button>

        <div class="text-4xl mb-2 mt-2">
          🔐
        </div>
        <h3 class="text-base font-black text-gray-900 mb-1">
          后台管理身份验证
        </h3>
        <p class="text-[11px] text-gray-500 mb-4">
          请输入独立管理员密码以配置游戏
        </p>

        <div class="space-y-3">
          <input
            type="password"
            v-model="passwordInput"
            placeholder="请输入管理员密码..."
            class="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-300 text-sm focus:outline-none focus:border-slate-800 text-center tracking-widest font-mono"
            @keyup.enter="handleLogin"
            autofocus
          />

          <p v-if="loginError" class="text-xs text-red-500 font-bold animate-shake">
            {{ loginError }}
          </p>

          <button
            class="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md active:scale-95 transition-all"
            @click="handleLogin"
          >
            解锁后台控制中心 🔓
          </button>
        </div>

        <div class="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
          初始默认密码: <span class="font-mono text-gray-600 font-bold">admin</span>
        </div>
      </div>

      <!-- 2. Full Admin Dashboard (After Login) -->
      <div
        v-else
        class="w-full max-w-[460px] max-h-[92vh] bg-white rounded-3xl p-5 shadow-2xl border-4 border-slate-800 flex flex-col relative text-gray-800"
      >
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <span class="text-2xl p-1 bg-slate-100 rounded-xl">🛠️</span>
            <div>
              <h3 class="text-base font-black text-gray-900 leading-tight">
                《钢了钢》独立管理后台
              </h3>
              <p class="text-[10px] text-gray-500">
                专属掌控：图片配置 · 奖惩规则 · 任务自由定制
              </p>
            </div>
          </div>
          <button
            class="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center text-xs"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-1 py-2 border-b border-gray-100 text-[11px] font-bold overflow-x-auto">
          <button
            class="px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all"
            :class="activeTab === 'photos' ? 'bg-slate-900 text-white shadow-xs' : 'bg-gray-100 text-gray-600'"
            @click="activeTab = 'photos'"
          >
            📸 卡牌与图片配置
          </button>
          <button
            class="px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all"
            :class="activeTab === 'rules' ? 'bg-slate-900 text-white shadow-xs' : 'bg-gray-100 text-gray-600'"
            @click="activeTab = 'rules'"
          >
            ⚖️ 奖惩概率与开关
          </button>
          <button
            class="px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all"
            :class="activeTab === 'gf_tasks' ? 'bg-amber-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600'"
            @click="activeTab = 'gf_tasks'"
          >
            🧦 女友惩罚清单 ({{ config.girlfriendTasks.length }})
          </button>
          <button
            class="px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all"
            :class="activeTab === 'bf_rewards' ? 'bg-sky-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600'"
            @click="activeTab = 'bf_rewards'"
          >
            🎁 男友奖励特权 ({{ config.boyfriendRewards.length }})
          </button>
          <button
            class="px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all"
            :class="activeTab === 'security' ? 'bg-red-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600'"
            @click="activeTab = 'security'"
          >
            🔒 密码安全
          </button>
        </div>

        <!-- Tab Content Body -->
        <div class="flex-1 overflow-y-auto py-3 space-y-4 pr-1 text-xs">

          <!-- TAB 1: 卡牌图片全面配置 -->
          <div v-if="activeTab === 'photos'" class="space-y-4">
            
            <!-- 男友自拍切换 (6张精修帅照) -->
            <div class="bg-sky-50/70 p-3 rounded-2xl border border-sky-200">
              <div class="flex items-center justify-between mb-2">
                <span class="font-extrabold text-sky-950 flex items-center gap-1">
                  <span>👦</span>
                  <span>男友帅照切换（共 6 张精修自拍）</span>
                </span>
                <span class="text-[10px] text-sky-700 font-bold bg-sky-200/60 px-2 py-0.5 rounded-full">
                  当前：{{ currentBfText }}
                </span>
              </div>

              <div class="grid grid-cols-4 gap-2">
                <!-- 随机轮播 -->
                <div
                  class="rounded-xl border-2 flex flex-col items-center justify-center p-1 cursor-pointer active:scale-95 transition-all text-center aspect-square"
                  :class="config.bfPhotoIndex === 0 ? 'border-sky-500 bg-sky-200 shadow-sm' : 'border-gray-200 bg-white'"
                  @click="selectBfPhoto(0)"
                >
                  <span class="text-xl">🎲</span>
                  <span class="text-[9px] font-bold mt-1">随机轮播</span>
                </div>

                <!-- 6 张男友照片 -->
                <div
                  v-for="i in 6"
                  :key="'bf-' + i"
                  class="relative rounded-xl border-2 overflow-hidden cursor-pointer active:scale-95 transition-all aspect-square group"
                  :class="config.bfPhotoIndex === i ? 'border-sky-500 ring-2 ring-sky-400 shadow-md' : 'border-gray-200 bg-white'"
                  @click="selectBfPhoto(i)"
                >
                  <img :src="`/photos/bf_${i}.jpg`" class="w-full h-full object-cover" />
                  <div class="absolute bottom-0 inset-x-0 bg-gray-950/60 text-white text-[8px] font-bold text-center py-0.5">
                    帅照 {{ i }}
                  </div>
                  <div v-if="config.bfPhotoIndex === i" class="absolute top-1 right-1 bg-sky-500 text-white text-[8px] rounded-full px-1 font-black">
                    ✓
                  </div>
                </div>
              </div>
            </div>

            <!-- 其他所有卡牌自定义/上传管理 -->
            <div class="bg-gray-50 p-3 rounded-2xl border border-gray-200">
              <div class="font-extrabold text-gray-900 mb-2 flex items-center justify-between">
                <span>🎴 其余卡牌图片管理</span>
                <span class="text-[10px] text-gray-400 font-normal">点击右侧按钮可直接上传更换新图片</span>
              </div>

              <div class="space-y-2">
                <div
                  v-for="card in cardDefs"
                  :key="card.id"
                  class="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 shadow-2xs"
                >
                  <div class="flex items-center gap-2.5">
                    <div class="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50 flex-shrink-0">
                      <img
                        v-if="card.customImage || card.staticImage"
                        :src="card.customImage || card.staticImage"
                        class="w-full h-full object-cover"
                      />
                      <div v-else class="w-6 h-6 flex items-center justify-center" v-html="card.defaultIconSvg"></div>
                    </div>
                    <div>
                      <div class="font-bold text-gray-800 text-xs">{{ card.name }}</div>
                      <div class="text-[10px] text-gray-400">{{ card.desc }}</div>
                    </div>
                  </div>

                  <div class="flex items-center gap-1">
                    <label class="cursor-pointer text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white active:scale-95 transition-all">
                      <span>更换</span>
                      <input
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="handleCardUpload($event, card.id)"
                      />
                    </label>
                    <button
                      v-if="card.customImage"
                      class="text-[10px] text-red-500 hover:text-red-700 px-1 py-1"
                      @click="$emit('reset-card', card.id)"
                      title="恢复默认"
                    >
                      重置
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- TAB 2: 奖惩规则与概率 -->
          <div v-if="activeTab === 'rules'" class="space-y-4">
            
            <!-- 概率滑块 -->
            <div class="bg-rose-50/80 p-4 rounded-2xl border border-rose-200">
              <div class="flex items-center justify-between mb-2">
                <span class="font-extrabold text-rose-950 flex items-center gap-1.5 text-xs">
                  <span>⚖️</span>
                  <span>通关抽取比例：女友受罚 vs 男友买单</span>
                </span>
                <span class="text-xs font-black text-rose-600 bg-rose-200/80 px-2.5 py-0.5 rounded-full">
                  {{ config.gfPenaltyRatio }}% 女友付出
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                v-model.number="config.gfPenaltyRatio"
                @change="handleSave"
                class="w-full accent-rose-500 h-2.5 bg-rose-200 rounded-lg cursor-pointer my-2"
              />

              <div class="flex justify-between items-center text-[10px] text-gray-500">
                <span>0% (全员男友买单)</span>
                <span class="text-rose-600 font-bold">推荐 75% 狠狠拿捏！</span>
                <span>100% (全员女友干活)</span>
              </div>

              <div class="mt-3 text-[11px] text-rose-800 bg-white/80 p-2.5 rounded-xl border border-rose-100">
                当前设定：每次通关或救场抽卡时，有 <b>{{ config.gfPenaltyRatio }}%</b> 概率抽取女友付出任务（洗袜子/捏肩/喊哥哥等），有 <b>{{ 100 - config.gfPenaltyRatio }}%</b> 概率抽取男友付出特权（奶茶/大餐等）。
              </div>
            </div>

            <!-- 救场代价开关 -->
            <div class="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 flex items-center justify-between">
              <div>
                <div class="font-extrabold text-amber-950 text-xs flex items-center gap-1">
                  <span>🦸‍♂️</span>
                  <span>“召唤男友”救场代价开关</span>
                </div>
                <div class="text-[10px] text-amber-800 mt-0.5">
                  开启后，女朋友点击召唤男友救场时，必须当场抽取一项女友付出任务作为代价
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  v-model="config.summonCostEnabled"
                  @change="handleSave"
                  class="sr-only peer"
                />
                <div class="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

          </div>

          <!-- TAB 3: 女友惩罚任务清单 (CRUD) -->
          <div v-if="activeTab === 'gf_tasks'" class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-extrabold text-gray-900">🧦 女友惩罚/付出任务池 (可自由修改)</span>
              <span class="text-[10px] text-amber-600 font-bold">共 {{ config.girlfriendTasks.length }} 项</span>
            </div>

            <!-- Add Task Form -->
            <div class="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 space-y-2">
              <div class="font-bold text-amber-950 text-[11px]">➕ 添加新惩罚任务</div>
              <div class="grid grid-cols-4 gap-1.5">
                <input
                  type="text"
                  v-model="newGfTask.title"
                  placeholder="任务标题(如:手洗袜子)"
                  class="col-span-3 px-2.5 py-1.5 rounded-xl border border-amber-300 bg-white text-xs"
                />
                <input
                  type="text"
                  v-model="newGfTask.icon"
                  placeholder="图标(如🧦)"
                  class="px-2 py-1.5 rounded-xl border border-amber-300 bg-white text-xs text-center"
                />
              </div>
              <div class="flex gap-1.5">
                <input
                  type="text"
                  v-model="newGfTask.desc"
                  placeholder="详细规则(如:给男友洗袜子一次并夸奖好香)"
                  class="flex-1 px-2.5 py-1.5 rounded-xl border border-amber-300 bg-white text-xs"
                  @keyup.enter="addGfTask"
                />
                <button
                  class="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs active:scale-95 transition-all"
                  @click="addGfTask"
                >
                  添加
                </button>
              </div>
            </div>

            <!-- Task List -->
            <div class="space-y-2">
              <div
                v-for="(task, idx) in config.girlfriendTasks"
                :key="task.id"
                class="flex items-start justify-between p-2.5 rounded-xl bg-white border border-gray-200 shadow-2xs"
              >
                <div class="flex items-start gap-2 pr-2">
                  <span class="text-xl p-1 bg-amber-50 rounded-lg flex-shrink-0">{{ task.icon }}</span>
                  <div>
                    <div class="font-extrabold text-gray-800 text-xs">{{ idx + 1 }}. {{ task.title }}</div>
                    <div class="text-[11px] text-gray-500 leading-snug mt-0.5">{{ task.desc }}</div>
                  </div>
                </div>
                <button
                  class="text-gray-300 hover:text-red-500 font-bold px-1.5 py-1 text-xs"
                  @click="removeGfTask(idx)"
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <!-- TAB 4: 男友奖励特权池 (CRUD) -->
          <div v-if="activeTab === 'bf_rewards'" class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="font-extrabold text-gray-900">🎁 男友请客/奖励特权池 (可自由修改)</span>
              <span class="text-[10px] text-sky-600 font-bold">共 {{ config.boyfriendRewards.length }} 项</span>
            </div>

            <!-- Add Reward Form -->
            <div class="bg-sky-50/80 p-3 rounded-2xl border border-sky-200 space-y-2">
              <div class="font-bold text-sky-950 text-[11px]">➕ 添加新奖励特权</div>
              <div class="grid grid-cols-4 gap-1.5">
                <input
                  type="text"
                  v-model="newBfReward.title"
                  placeholder="奖励名称(如:奶茶券)"
                  class="col-span-3 px-2.5 py-1.5 rounded-xl border border-sky-300 bg-white text-xs"
                />
                <input
                  type="text"
                  v-model="newBfReward.icon"
                  placeholder="图标(如🧋)"
                  class="px-2 py-1.5 rounded-xl border border-sky-300 bg-white text-xs text-center"
                />
              </div>
              <div class="flex gap-1.5">
                <input
                  type="text"
                  v-model="newBfReward.desc"
                  placeholder="特权说明(如:大杯加料，立即买单)"
                  class="flex-1 px-2.5 py-1.5 rounded-xl border border-sky-300 bg-white text-xs"
                  @keyup.enter="addBfReward"
                />
                <button
                  class="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs active:scale-95 transition-all"
                  @click="addBfReward"
                >
                  添加
                </button>
              </div>
            </div>

            <!-- Reward List -->
            <div class="space-y-2">
              <div
                v-for="(reward, idx) in config.boyfriendRewards"
                :key="reward.id"
                class="flex items-start justify-between p-2.5 rounded-xl bg-white border border-gray-200 shadow-2xs"
              >
                <div class="flex items-start gap-2 pr-2">
                  <span class="text-xl p-1 bg-sky-50 rounded-lg flex-shrink-0">{{ reward.icon }}</span>
                  <div>
                    <div class="font-extrabold text-gray-800 text-xs">{{ idx + 1 }}. {{ reward.title }}</div>
                    <div class="text-[11px] text-gray-500 leading-snug mt-0.5">{{ reward.desc }}</div>
                  </div>
                </div>
                <button
                  class="text-gray-300 hover:text-red-500 font-bold px-1.5 py-1 text-xs"
                  @click="removeBfReward(idx)"
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <!-- TAB 5: 密码与安全 -->
          <div v-if="activeTab === 'security'" class="space-y-4">
            <!-- Change Password -->
            <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
              <div class="font-extrabold text-gray-900 text-xs">🔒 修改独立管理员密码</div>
              <div class="space-y-2">
                <input
                  type="password"
                  v-model="newPassword"
                  placeholder="输入新的后台密码..."
                  class="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs"
                />
                <input
                  type="password"
                  v-model="confirmPassword"
                  placeholder="再次确认新密码..."
                  class="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs"
                />
                <button
                  class="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs active:scale-95 transition-all"
                  @click="handleChangePassword"
                >
                  保存新密码
                </button>
                <p v-if="passwordChangeMsg" class="text-xs font-bold text-center" :class="passwordChangeSuccess ? 'text-emerald-600' : 'text-red-500'">
                  {{ passwordChangeMsg }}
                </p>
              </div>
            </div>

            <!-- Clear Coupons Data -->
            <div class="bg-red-50 p-4 rounded-2xl border border-red-200 flex items-center justify-between">
              <div>
                <div class="font-extrabold text-red-900 text-xs">🗑️ 重置所有卡券数据</div>
                <div class="text-[10px] text-red-700">清空当前心愿存折中的所有已获得记录</div>
              </div>
              <button
                class="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs active:scale-95"
                @click="resetAllCoupons"
              >
                重置存折
              </button>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
          <span class="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <span>✓</span>
            <span>修改已实时生效</span>
          </span>
          <button
            class="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md active:scale-95 transition-all"
            @click="$emit('close')"
          >
            保存并退出后台
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AdminConfig, CardDefinition, TaskItem } from '../types/game'
import { loadAdminConfig, saveAdminConfig } from '../utils/adminConfig'
import { saveCoupons } from '../utils/coupons'
import { apiLogin, apiResetCoupons } from '../utils/api'

const props = defineProps<{
  cardDefs: CardDefinition[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'config-updated'): void
  (e: 'update-card-image', cardId: string, base64: string): void
  (e: 'reset-card', cardId: string): void
}>()

// Session authentication state
const isAuthenticated = ref<boolean>(sessionStorage.getItem('gang_admin_auth') === 'true')
const passwordInput = ref('')
const loginError = ref('')

// Tabs
const activeTab = ref<'photos' | 'rules' | 'gf_tasks' | 'bf_rewards' | 'security'>('photos')

// Config
const config = ref<AdminConfig>(loadAdminConfig())

// Form inputs
const newGfTask = ref({ title: '', desc: '', icon: '🧦' })
const newBfReward = ref({ title: '', desc: '', icon: '🧋' })
const newPassword = ref('')
const confirmPassword = ref('')
const passwordChangeMsg = ref('')
const passwordChangeSuccess = ref(false)

const currentBfText = computed(() => {
  if (config.value.bfPhotoIndex === 0) return '🎲 随机轮播'
  return `帅照 ${config.value.bfPhotoIndex}`
})

// Authentication
async function handleLogin() {
  const pwd = passwordInput.value.trim()
  const success = await apiLogin(pwd)
  if (success || pwd === config.value.adminPassword) {
    isAuthenticated.value = true
    sessionStorage.setItem('gang_admin_auth', 'true')
    loginError.value = ''
  } else {
    loginError.value = '密码错误，请重新输入！'
    passwordInput.value = ''
  }
}

function selectBfPhoto(index: number) {
  config.value.bfPhotoIndex = index
  handleSave()
}

function handleSave() {
  saveAdminConfig(config.value)
  emit('config-updated')
}

// GF Tasks
function addGfTask() {
  if (!newGfTask.value.title.trim()) return
  config.value.girlfriendTasks.unshift({
    id: `gf_${Date.now()}`,
    title: newGfTask.value.title.trim(),
    desc: newGfTask.value.desc.trim() || newGfTask.value.title.trim(),
    icon: newGfTask.value.icon.trim() || '🧦',
    target: 'girlfriend_pays'
  })
  newGfTask.value = { title: '', desc: '', icon: '🧦' }
  handleSave()
}

function removeGfTask(index: number) {
  config.value.girlfriendTasks.splice(index, 1)
  handleSave()
}

// BF Rewards
function addBfReward() {
  if (!newBfReward.value.title.trim()) return
  config.value.boyfriendRewards.unshift({
    id: `bf_${Date.now()}`,
    title: newBfReward.value.title.trim(),
    desc: newBfReward.value.desc.trim() || newBfReward.value.title.trim(),
    icon: newBfReward.value.icon.trim() || '🧋',
    target: 'boyfriend_pays'
  })
  newBfReward.value = { title: '', desc: '', icon: '🧋' }
  handleSave()
}

function removeBfReward(index: number) {
  config.value.boyfriendRewards.splice(index, 1)
  handleSave()
}

// Password Change
function handleChangePassword() {
  if (!newPassword.value || newPassword.value.length < 3) {
    passwordChangeMsg.value = '密码长度至少需要 3 位！'
    passwordChangeSuccess.value = false
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordChangeMsg.value = '两次输入的密码不一致！'
    passwordChangeSuccess.value = false
    return
  }
  config.value.adminPassword = newPassword.value
  handleSave()
  passwordChangeMsg.value = '密码修改成功，请牢记！'
  passwordChangeSuccess.value = true
  newPassword.value = ''
  confirmPassword.value = ''
}

async function resetAllCoupons() {
  if (confirm('确认清空当前所有的心愿存折记录吗？')) {
    saveCoupons([])
    await apiResetCoupons()
    emit('config-updated')
    alert('心愿存折已清空！')
  }
}

// Card Upload Handler inside Admin
function handleCardUpload(event: Event, cardId: string) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  const reader = new FileReader()

  reader.onload = (e) => {
    const rawUrl = e.target?.result as string
    if (!rawUrl) return

    const img = new Image()
    img.src = rawUrl
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxDim = 240
      let width = img.width
      let height = img.height

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85)
        emit('update-card-image', cardId, compressedBase64)
      }
    }
  }

  reader.readAsDataURL(file)
  target.value = ''
}
</script>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fade-in {
  animation: fade-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.25s ease-in-out;
}
</style>
