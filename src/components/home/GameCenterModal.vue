<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="arcade-panel">
      <!-- Header -->
      <div class="panel-header">
        <div class="flex items-center gap-2">
          <span class="text-xl">🕹️</span>
          <div>
            <h2 class="text-base font-bold text-stone-800 leading-tight">游戏中心 · 游戏机</h2>
            <p class="text-xs text-stone-500">双人互动与经典单人，通关赢取心愿券与海量道具！</p>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="arcade-content">
        <!-- Main Featured Game: 钢了钢 -->
        <div class="game-featured-card">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="game-cover">羊</div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-extrabold text-stone-800 text-base">钢了钢 · 元宇宙版</h3>
                  <span class="rank-tag">12 阶复杂造型</span>
                </div>
                <p class="text-xs text-stone-500 mt-1">深井陷阱与高压死锁诱导，严格三消烧脑挑战！</p>
              </div>
            </div>
          </div>

          <div class="game-features-list mt-3">
            <span class="feat-chip">💎 局内道具与通用背包实时联动</span>
            <span class="feat-chip">💖 通关掉落心愿券与服饰</span>
            <span class="feat-chip">👥 支持双人情侣房间联机同玩</span>
          </div>

          <div class="mt-4 flex justify-end gap-2">
            <button class="btn-play-gang" @click="$emit('start-gang')">
              ▶️ 开启消除对局
            </button>
          </div>
        </div>

        <!-- Coming Soon Games -->
        <h4 class="text-xs font-bold text-stone-500 mt-4 mb-2 uppercase tracking-wide">扩展接入游戏池</h4>
        <div class="coming-soon-grid">
          <div class="preview-game-card">
            <div class="p-icon">🧩</div>
            <div class="p-name">双人情侣照片拼图</div>
            <div class="p-status">敬请期待 · 共享平台背包</div>
          </div>
          <div class="preview-game-card">
            <div class="p-icon">🔗</div>
            <div class="p-name">甜蜜连连看</div>
            <div class="p-status">敬请期待 · 共享成就系统</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits(['close', 'start-gang'])
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
.arcade-panel {
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
.arcade-content {
  padding: 16px;
  overflow-y: auto;
}
.game-featured-card {
  background: linear-gradient(135deg, #fff5f8, #fbeef2);
  border: 1.5px solid #ebd0d7;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 14px rgba(131, 57, 80, 0.08);
}
.game-cover {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #9c4d68, #6d3345);
  color: white;
  font-size: 26px;
  font-weight: 900;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 10px rgba(100, 30, 50, 0.2);
}
.rank-tag {
  font-size: 10px;
  font-weight: 700;
  background: #9c4d68;
  color: white;
  padding: 2px 7px;
  border-radius: 6px;
}
.game-features-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.feat-chip {
  font-size: 11px;
  color: #6d4251;
  font-weight: 500;
}
.btn-play-gang {
  padding: 10px 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #a8516d, #833950);
  color: white;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(131, 57, 80, 0.28);
  transition: transform 0.1s;
}
.btn-play-gang:active {
  transform: scale(0.97);
}
.coming-soon-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.preview-game-card {
  background: #fbf5f6;
  border: 1px dashed #dfc8ce;
  border-radius: 12px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 4px;
}
.p-icon {
  font-size: 24px;
}
.p-name {
  font-size: 12px;
  font-weight: 700;
  color: #5d3f48;
}
.p-status {
  font-size: 10px;
  color: #8b6772;
}
</style>
