<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="leaderboard-panel">
      <!-- Header -->
      <div class="panel-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl"><DesignIcon name="trophy" /></span>
          <div>
            <h3 class="font-extrabold text-base text-stone-800 leading-tight">全服闯关荣誉榜</h3>
            <p class="text-[11px] text-stone-500">神速通关 · 累计闯关达人 · 实时战报</p>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'fastest' }"
          @click="switchTab('fastest')"
        >
          ⚡ 最快通关榜
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'passes' }"
          @click="switchTab('passes')"
        >
          🏅 闯关达人榜
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'recent' }"
          @click="switchTab('recent')"
        >
          📜 实时战报
        </button>
      </div>

      <!-- Body List -->
      <div class="panel-body">
        <div v-if="loading" class="loading-state">
          <span class="spinner"></span> 正在拉取最新榜单...
        </div>

        <div v-else-if="!list.length" class="empty-state">
          <span><DesignIcon name="game" /></span>
          <p>暂无排行记录，快开启对局抢占榜首！</p>
        </div>

        <!-- 1. Fastest List -->
        <div v-else-if="activeTab === 'fastest'" class="rank-list">
          <div
            v-for="(item, idx) in list"
            :key="item.id || idx"
            class="rank-row"
            :class="{ top3: idx < 3 }"
          >
            <div class="rank-badge">
              <span v-if="idx === 0">🥇</span>
              <span v-else-if="idx === 1">🥈</span>
              <span v-else-if="idx === 2">🥉</span>
              <span v-else class="rank-num">{{ idx + 1 }}</span>
            </div>

            <div class="player-avatar-circle">
              <span v-if="item.gender === 'male'"><DesignIcon name="user" /></span>
              <span v-else><DesignIcon name="user" /></span>
            </div>

            <div class="player-info flex-1">
              <div class="flex items-center gap-1.5">
                <span class="player-name">{{ item.nickname || item.username }}</span>
                <span class="level-tag">第 {{ item.level || 1 }} 关</span>
              </div>
              <div class="record-meta">
                步数: {{ item.movesCount || 0 }} 步 · {{ formatTime(item.at) }}
              </div>
            </div>

            <div class="score-box">
              <div class="score-val">{{ item.durationSeconds }}秒</div>
              <div class="score-label">通关耗时</div>
            </div>
          </div>
        </div>

        <!-- 2. Total Passes List -->
        <div v-else-if="activeTab === 'passes'" class="rank-list">
          <div
            v-for="(item, idx) in list"
            :key="item.username || idx"
            class="rank-row"
            :class="{ top3: idx < 3 }"
          >
            <div class="rank-badge">
              <span v-if="idx === 0">🥇</span>
              <span v-else-if="idx === 1">🥈</span>
              <span v-else-if="idx === 2">🥉</span>
              <span v-else class="rank-num">{{ idx + 1 }}</span>
            </div>

            <div class="player-avatar-circle">
              <span v-if="item.gender === 'male'"><DesignIcon name="user" /></span>
              <span v-else><DesignIcon name="user" /></span>
            </div>

            <div class="player-info flex-1">
              <div class="player-name">{{ item.nickname || item.username }}</div>
              <div class="record-meta">
                最快单局: {{ item.bestTime !== Infinity ? `${item.bestTime}秒` : '-' }}
              </div>
            </div>

            <div class="score-box">
              <div class="score-val count">{{ item.totalPasses }} 次</div>
              <div class="score-label">累计通关</div>
            </div>
          </div>
        </div>

        <!-- 3. Recent Records List -->
        <div v-else class="rank-list">
          <div
            v-for="(item, idx) in list"
            :key="item.id || idx"
            class="rank-row recent"
          >
            <div class="player-avatar-circle">
              <span v-if="item.gender === 'male'"><DesignIcon name="user" /></span>
              <span v-else><DesignIcon name="user" /></span>
            </div>

            <div class="player-info flex-1">
              <div class="flex items-center gap-1.5">
                <span class="player-name">{{ item.nickname || item.username }}</span>
                <span class="victory-tag">🎉 顺利消除通关</span>
              </div>
              <div class="record-meta">
                用时 {{ item.durationSeconds }} 秒 · {{ formatTime(item.at) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DesignIcon from '../DesignIcon.vue'
import { ref, onMounted } from 'vue'
import { fetchLeaderboard } from '../../utils/platformState'

const emit = defineEmits(['close'])

const activeTab = ref<'fastest' | 'passes' | 'recent'>('fastest')
const list = ref<any[]>([])
const loading = ref(false)

async function loadData() {
  try {
    loading.value = true
    const res = await fetchLeaderboard(activeTab.value)
    list.value = res.list || []
  } catch (err) {
    console.warn('Failed to load leaderboard:', err)
  } finally {
    loading.value = false
  }
}

function switchTab(tab: 'fastest' | 'passes' | 'recent') {
  activeTab.value = tab
  loadData()
}

function formatTime(isoStr: string) {
  if (!isoStr) return '刚刚'
  try {
    const d = new Date(isoStr)
    const m = d.getMonth() + 1
    const day = d.getDate()
    const h = d.getHours().toString().padStart(2, '0')
    const min = d.getMinutes().toString().padStart(2, '0')
    return `${m}月${day}日 ${h}:${min}`
  } catch {
    return '刚刚'
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(30, 15, 22, 0.52);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.leaderboard-panel {
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(78, 30, 48, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff7ed, #fff1f2);
  border-bottom: 1px solid #fed7aa;
}
.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: #ffedd5;
  color: #7c2d12;
  font-size: 13px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.tabs-bar {
  display: flex;
  background: #fbf7f4;
  padding: 6px 12px;
  border-bottom: 1px solid #f2e7e3;
  gap: 6px;
}
.tab-btn {
  flex: 1;
  padding: 8px 0;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #8c736e;
  cursor: pointer;
}
.tab-btn.active {
  background: #ea580c;
  color: white;
  box-shadow: 0 2px 8px rgba(234, 88, 12, 0.24);
}
.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  color: #8c736e;
  font-size: 12px;
  gap: 8px;
}
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rank-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fdfaf7;
  border: 1px solid #f3ebe6;
  border-radius: 12px;
}
.rank-row.top3 {
  background: #fffbf5;
  border-color: #fed7aa;
}
.rank-badge {
  width: 26px;
  font-size: 18px;
  text-align: center;
  font-weight: 800;
}
.rank-num {
  font-size: 13px;
  color: #9a3412;
}
.player-avatar-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid #fed7aa;
  display: grid;
  place-items: center;
  font-size: 16px;
}
.player-name {
  font-size: 12px;
  font-weight: 700;
  color: #292524;
}
.level-tag {
  font-size: 10px;
  padding: 1px 5px;
  background: #ffedd5;
  color: #c2410c;
  border-radius: 4px;
}
.victory-tag {
  font-size: 10px;
  color: #15803d;
  font-weight: 600;
}
.record-meta {
  font-size: 10px;
  color: #78716c;
  margin-top: 1px;
}
.score-box {
  text-align: right;
}
.score-val {
  font-size: 14px;
  font-weight: 800;
  color: #ea580c;
  font-variant-numeric: tabular-nums;
}
.score-val.count {
  color: #0284c7;
}
.score-label {
  font-size: 9px;
  color: #a8a29e;
}
</style>
