<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="companion-panel">
      <!-- Header -->
      <div class="panel-header">
        <div class="flex items-center gap-2">
          <span class="text-xl">💖</span>
          <div>
            <h2 class="text-base font-bold text-stone-800 leading-tight">伴侣羁绊与宠物空间</h2>
            <p class="text-xs text-stone-500">陪伴是最长情的告白，抚育毛孩子收获意外宝藏！</p>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="panel-content">
        <!-- Partner Section -->
        <div class="section-card partner-card">
          <div class="flex items-center gap-3">
            <div class="partner-avatar">
              <span class="text-3xl">🧑‍💼</span>
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-stone-800 text-sm">{{ companion?.partnerName || '亲爱的' }}</span>
                <span class="text-xs font-semibold text-rose-600">好感度 {{ companion?.favorability || 100 }} 💕</span>
              </div>
              <p class="text-xs text-stone-600 mt-1 italic">
                “{{ currentLoveQuote || '今天也超级想你，小家因为有你才温馨！' }}”
              </p>
            </div>
          </div>
          <div class="mt-3 flex justify-end gap-2">
            <button class="btn-action" :disabled="loading" @click="handleChat">
              💬 甜蜜日常互动 (+5好感, +5爱心币)
            </button>
          </div>
        </div>

        <!-- Pet Section -->
        <div class="section-card pet-card mt-4">
          <div class="flex items-center gap-3">
            <div class="pet-avatar">
              <span class="text-4xl">🐱</span>
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-stone-800 text-sm">小猫咪（毛球）</span>
                <span class="pet-status-pill" :class="companion?.petStatus">
                  {{ petStatusText }}
                </span>
              </div>
              <!-- Hunger Bar -->
              <div class="mt-2">
                <div class="flex justify-between text-xs text-stone-500 mb-1">
                  <span>饱腹感：{{ companion?.petHunger || 80 }}/100</span>
                  <span v-if="(companion?.petHunger || 80) >= 80" class="text-emerald-600 font-semibold">吃饱饱寻宝中！</span>
                  <span v-else class="text-amber-600 font-semibold">小猫肚子饿啦~</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: `${companion?.petHunger || 80}%` }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pet Action Buttons -->
          <div class="mt-4 flex justify-end gap-2 flex-wrap">
            <button
              class="btn-feed"
              :disabled="loading || (companion?.petHunger || 0) >= 100"
              @click="handleFeed"
            >
              🥫 喂食深海三文鱼罐头 (+40饱腹)
            </button>
            <button
              v-if="companion?.petStatus === 'foraging'"
              class="btn-forage-claim"
              :disabled="loading"
              @click="handlePetReward"
            >
              🎁 领取寻宝战利品
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  platformOverview,
  interactCompanion,
  feedPet,
  claimPetReward,
  buyStoreItem
} from '../../utils/platformState'

defineEmits(['close'])

const loading = ref(false)
const currentLoveQuote = ref('')

const companion = computed(() => platformOverview.value?.companion)

const petStatusText = computed(() => {
  const comp = companion.value
  if (!comp) return '悠闲'
  if (comp.petStatus === 'foraging') return '🐾 外出寻宝探险中...'
  if (comp.petHunger < 40) return '😿 肚子饿饿求喂食'
  return '😺 快乐踱步中'
})

async function handleChat() {
  try {
    loading.value = true
    const result = await interactCompanion('chat')
    currentLoveQuote.value = result.quote
  } catch (err: any) {
    alert(err.message || '伴侣互动失败')
  } finally {
    loading.value = false
  }
}

async function handleFeed() {
  const canned = platformOverview.value?.items?.find((i: any) => i.catalogId === 'pet.supply.canned_food' && i.quantity > 0)
  if (!canned) {
    if (confirm('背包中没有三文鱼罐头，是否花费 60 金币在商城快速购买并喂食？')) {
      try {
        loading.value = true
        await buyStoreItem('pet.supply.canned_food', 1)
        await feedPet('pet.supply.canned_food')
        alert('购买并喂食成功！小猫开心地喵喵叫~')
      } catch (err: any) {
        alert(err.message)
      } finally {
        loading.value = false
      }
    }
    return
  }
  try {
    loading.value = true
    const res = await feedPet('pet.supply.canned_food')
    alert(res.message)
  } catch (err: any) {
    alert(err.message || '喂食失败')
  } finally {
    loading.value = false
  }
}

async function handlePetReward() {
  try {
    loading.value = true
    const res = await claimPetReward()
    alert(res.message)
  } catch (err: any) {
    alert(err.message || '领取失败')
  } finally {
    loading.value = false
  }
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
.companion-panel {
  width: 100%;
  max-width: 460px;
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
.panel-content {
  padding: 16px;
  overflow-y: auto;
}
.section-card {
  border-radius: 16px;
  padding: 14px 16px;
  border: 1px solid;
}
.partner-card {
  background: #fff5f8;
  border-color: #ffd6e0;
}
.partner-avatar, .pet-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #ffffff;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 10px rgba(100, 30, 50, 0.08);
}
.btn-action {
  padding: 6px 14px;
  border-radius: 10px;
  background: #f48fb1;
  color: #5c1b30;
  font-size: 12px;
  font-weight: 700;
  transition: transform 0.1s;
}
.pet-card {
  background: #f9f6f0;
  border-color: #ede5d5;
}
.pet-status-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  background: #e0d7c7;
  color: #5d4037;
}
.pet-status-pill.foraging {
  background: #ffe082;
  color: #e65100;
}
.progress-track {
  width: 100%;
  height: 7px;
  border-radius: 4px;
  background: #e2dbce;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ffb74d, #f57c00);
  border-radius: 4px;
  transition: width 0.3s;
}
.btn-feed {
  padding: 7px 14px;
  border-radius: 10px;
  background: #d7ccc8;
  color: #4e342e;
  font-size: 12px;
  font-weight: 600;
}
.btn-forage-claim {
  padding: 7px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: white;
  font-size: 12px;
  font-weight: 700;
}
</style>
