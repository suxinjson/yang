<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="job-panel">
      <!-- Header -->
      <div class="panel-header">
        <div class="flex items-center gap-2">
          <span class="text-xl">💻</span>
          <div>
            <h2 class="text-base font-bold text-stone-800 leading-tight">打工与日程中心</h2>
            <p class="text-xs text-stone-500">下线挂机持续产生收益，离线归来收获大量金币与图纸！</p>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="job-content">
        <!-- Active Job Card (if any) -->
        <div v-if="activeJob" class="active-job-box">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-2xl">{{ currentJobDef?.icon || '⏱️' }}</span>
              <div>
                <div class="font-bold text-stone-800 text-sm">{{ currentJobDef?.title || '进行中的日程' }}</div>
                <div class="text-xs text-stone-500">固定收益：🪙 {{ activeJob.rewardCoins }} 金币</div>
              </div>
            </div>
            <span class="status-pill" :class="{ ready: isComplete }">
              {{ isComplete ? '已完成！可领取' : '打工进行中...' }}
            </span>
          </div>

          <!-- Progress Bar & Timer -->
          <div class="mt-3">
            <div class="flex justify-between text-xs text-stone-600 mb-1">
              <span>进度：{{ Math.min(100, Math.round(progressPercent)) }}%</span>
              <span class="font-mono font-semibold">{{ timerText }}</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="mt-3 flex justify-end gap-2">
            <button
              v-if="!isComplete"
              class="btn-speedup"
              :disabled="loading"
              @click="handleSpeedup"
            >
              ☕ 浓缩咖啡加速 1h
            </button>
            <button
              v-if="isComplete"
              class="btn-claim"
              :disabled="loading"
              @click="handleClaim"
            >
              🎉 领取 🪙 {{ activeJob.rewardCoins }} 金币与奖励
            </button>
          </div>
        </div>

        <!-- Available Jobs List -->
        <div class="mt-4">
          <h3 class="text-xs font-bold text-stone-600 mb-2 uppercase tracking-wide">可指派的日程职位</h3>
          <div class="jobs-list">
            <div
              v-for="job in jobsList"
              :key="job.id"
              class="job-card"
              :class="{ 'card-disabled': activeJob && !isComplete }"
            >
              <div class="job-main">
                <span class="job-icon">{{ job.icon }}</span>
                <div class="job-info">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-stone-800 text-sm">{{ job.title }}</span>
                    <span class="duration-badge">⏱️ {{ Math.round(job.durationSeconds / 3600) }}小时</span>
                  </div>
                  <p class="text-xs text-stone-500 mt-0.5">{{ job.desc }}</p>
                  <div class="rewards-row mt-1">
                    <span class="reward-pill gold">🪙 +{{ job.rewardCoins }} 金币</span>
                    <span class="reward-pill surprise">🎁 概率掉落图纸/补给</span>
                  </div>
                </div>
              </div>
              <button
                class="btn-start"
                :disabled="Boolean(activeJob) || loading"
                @click="handleStart(job.id)"
              >
                指派打工
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  platformOverview,
  startIdleJob,
  claimIdleJob,
  buyStoreItem
} from '../../utils/platformState'
import { JOBS_CONFIG, type JobDefinition } from '../../../shared/platformServer'

const emit = defineEmits(['close'])

const loading = ref(false)
const now = ref(Date.now())
const jobsList = computed<JobDefinition[]>(() => Object.values(JOBS_CONFIG))

let timerInterval: any = null
onMounted(() => {
  timerInterval = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

const activeJob = computed(() => platformOverview.value?.idleJob || null)
const currentJobDef = computed(() => {
  if (!activeJob.value) return null
  return (JOBS_CONFIG as any)[activeJob.value.jobId] || null
})

const elapsedSeconds = computed(() => {
  if (!activeJob.value) return 0
  const started = new Date(activeJob.value.startedAt).getTime()
  return Math.max(0, Math.floor((now.value - started) / 1000))
})

const isComplete = computed(() => {
  if (!activeJob.value) return false
  return elapsedSeconds.value >= activeJob.value.durationSeconds
})

const progressPercent = computed(() => {
  if (!activeJob.value) return 0
  return Math.min(100, (elapsedSeconds.value / activeJob.value.durationSeconds) * 100)
})

const timerText = computed(() => {
  if (!activeJob.value) return ''
  const remaining = Math.max(0, activeJob.value.durationSeconds - elapsedSeconds.value)
  if (remaining <= 0) return '已就绪'
  const h = Math.floor(remaining / 3600).toString().padStart(2, '0')
  const m = Math.floor((remaining % 3600) / 60).toString().padStart(2, '0')
  const s = (remaining % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
})

async function handleStart(jobId: string) {
  try {
    loading.value = true
    await startIdleJob(jobId)
  } catch (err: any) {
    alert(err.message || '指派打工失败')
  } finally {
    loading.value = false
  }
}

async function handleClaim() {
  try {
    loading.value = true
    const result = await claimIdleJob()
    const msg = `🎉 成功领取 ${result.rewardCoins} 金币！` + (result.bonusItem ? ` 额外获得惊喜：${result.bonusItem.name}！` : '')
    alert(msg)
  } catch (err: any) {
    alert(err.message || '领取打工奖励失败')
  } finally {
    loading.value = false
  }
}

async function handleSpeedup() {
  const token = platformOverview.value?.items?.find((i: any) => i.catalogId === 'work.token.coffee' && i.quantity > 0)
  if (!token) {
    if (confirm('背包中没有提神浓缩咖啡，是否花费 90 金币在商城快速购买并使用？')) {
      try {
        loading.value = true
        await buyStoreItem('work.token.coffee', 1)
        alert('购买成功！已加入背包')
      } catch (err: any) {
        alert(err.message)
      } finally {
        loading.value = false
      }
    }
    return
  }
  alert('已使用提神咖啡加速打工进度！')
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(30, 15, 22, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.job-panel {
  width: 100%;
  max-width: 480px;
  background: #fffcfb;
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(80, 30, 45, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 90vh;
}
.panel-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #f0e2e5;
}
.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #f5e8eb;
  color: #7b4c59;
  font-size: 14px;
}
.job-content {
  padding: 16px;
  overflow-y: auto;
}
.active-job-box {
  background: #fbf0f3;
  border: 1.5px solid #ebd3da;
  border-radius: 16px;
  padding: 14px 16px;
}
.status-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
  background: #ecd5db;
  color: #7b4251;
}
.status-pill.ready {
  background: #4caf50;
  color: white;
  animation: pulse-badge 1.5s infinite;
}
@keyframes pulse-badge {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
.progress-track {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #ecd5db;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff80ab, #c2185b);
  border-radius: 4px;
  transition: width 0.3s;
}
.btn-speedup {
  padding: 6px 14px;
  border-radius: 10px;
  background: #f0e2e5;
  color: #6d4251;
  font-size: 12px;
  font-weight: 600;
}
.btn-claim {
  padding: 8px 18px;
  border-radius: 12px;
  background: linear-gradient(135deg, #e91e63, #c2185b);
  color: white;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(194, 24, 91, 0.3);
}
.jobs-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.job-card {
  background: #ffffff;
  border: 1px solid #eedde1;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  transition: all 0.15s;
}
.job-card.card-disabled {
  opacity: 0.65;
}
.job-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.job-icon {
  font-size: 32px;
}
.duration-badge {
  font-size: 10px;
  font-weight: 600;
  color: #8b6772;
  background: #f7ebef;
  padding: 2px 6px;
  border-radius: 6px;
}
.rewards-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.reward-pill {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 6px;
}
.reward-pill.gold {
  background: #fff8e1;
  color: #f57f17;
}
.reward-pill.surprise {
  background: #f3e5f5;
  color: #7b1fa2;
}
.btn-start {
  padding: 8px 16px;
  border-radius: 10px;
  background: #8b4255;
  color: white;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.btn-start:disabled {
  background: #d8c2c7;
  cursor: not-allowed;
}
</style>
