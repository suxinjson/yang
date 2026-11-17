<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="wish-panel">
      <!-- Header -->
      <div class="panel-header">
        <div class="flex items-center gap-2">
          <span class="text-2xl"><DesignIcon name="heart" /></span>
          <div>
            <h3 class="font-extrabold text-base text-stone-800 leading-tight">
              房间共享心愿单（房间 #{{ roomId }}）
            </h3>
            <p class="text-[11px] text-stone-500">
              同房间伙伴共同发布、共享与兑现甜蜜心愿
            </p>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Add New Wish Area -->
      <div class="publish-section">
        <div class="flex gap-2">
          <input
            v-model="newTitle"
            type="text"
            class="wish-input"
            placeholder="写下一个想和TA一起完成的心愿..."
            maxlength="30"
          />
          <button class="btn-publish" :disabled="!newTitle.trim() || publishing" @click="handlePublish">
            {{ publishing ? '发布中' : '许愿 <DesignIcon name="spark" />' }}
          </button>
        </div>
      </div>

      <!-- Wish List -->
      <div class="panel-body">
        <div v-if="loading" class="empty-state">
          正在加载房间共享心愿...
        </div>

        <div v-else-if="!wishes.length" class="empty-state">
          <span>🌟</span>
          <p>房间还没有心愿哦，快在上方许下第一个甜蜜愿望吧！</p>
        </div>

        <div v-else class="wish-list">
          <div
            v-for="wish in wishes"
            :key="wish.id"
            class="wish-card"
            :class="{ completed: wish.completed }"
          >
            <div class="wish-status-icon">
              <span v-if="wish.completed"><DesignIcon name="heart" /></span>
              <span v-else>🌸</span>
            </div>

            <div class="wish-content flex-1">
              <div class="wish-title">{{ wish.title }}</div>
              <div class="wish-desc">{{ wish.desc }}</div>
              <div class="wish-meta">
                许愿人: {{ wish.author || '伴侣' }}
                <span v-if="wish.completed" class="completed-by">
                  · 已由 {{ wish.completedBy || '伙伴' }} 甜蜜兑现
                </span>
              </div>
            </div>

            <button
              v-if="!wish.completed"
              class="btn-redeem"
              @click="handleRedeem(wish.id)"
            >
              兑现 ✦
            </button>
            <div v-else class="tag-done">
              已兑现
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
import { roomWishAction, type RoomWish } from '../../utils/platformState'

const props = withDefaults(
  defineProps<{
    roomId?: string
  }>(),
  {
    roomId: 'room_666'
  }
)

const emit = defineEmits(['close'])

const wishes = ref<RoomWish[]>([])
const loading = ref(false)
const publishing = ref(false)
const newTitle = ref('')

async function loadWishes() {
  try {
    loading.value = true
    const res = await roomWishAction(props.roomId, 'list', {})
    wishes.value = res.wishes || []
  } catch (err: any) {
    console.error('加载房间心愿失败', err)
  } finally {
    loading.value = false
  }
}

async function handlePublish() {
  if (!newTitle.value.trim()) return
  try {
    publishing.value = true
    const res = await roomWishAction(props.roomId, 'add', {
      wishTitle: newTitle.value.trim(),
      wishDesc: '甜蜜心愿，期待一起实现！'
    })
    wishes.value = res.wishes || []
    newTitle.value = ''
  } catch (err: any) {
    alert(err.message || '发布心愿失败')
  } finally {
    publishing.value = false
  }
}

async function handleRedeem(wishId: string) {
  try {
    const res = await roomWishAction(props.roomId, 'redeem', { wishId })
    wishes.value = res.wishes || []
  } catch (err: any) {
    alert(err.message || '兑现失败')
  }
}

onMounted(() => {
  loadWishes()
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
.wish-panel {
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
  background: linear-gradient(135deg, #fff0f3, #ffe4e9);
  border-bottom: 1px solid #ffd0d8;
}
.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: #ffd0d8;
  color: #881337;
  font-size: 13px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.publish-section {
  padding: 12px 16px;
  background: #fffafa;
  border-bottom: 1px solid #fce7ec;
}
.wish-input {
  flex: 1;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #fecdd3;
  border-radius: 10px;
  font-size: 12px;
  outline: none;
}
.wish-input:focus {
  border-color: #f43f5e;
}
.btn-publish {
  padding: 0 14px;
  height: 38px;
  background: #f43f5e;
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.btn-publish:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  color: #9f717d;
  font-size: 12px;
  gap: 8px;
}
.wish-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.wish-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #fff8f9;
  border: 1px solid #ffe4e9;
  border-radius: 12px;
}
.wish-card.completed {
  opacity: 0.75;
  background: #f7faf8;
  border-color: #e2ede5;
}
.wish-status-icon {
  font-size: 20px;
}
.wish-title {
  font-size: 13px;
  font-weight: 700;
  color: #3e1b24;
}
.wish-desc {
  font-size: 11px;
  color: #7b4b57;
  margin-top: 2px;
}
.wish-meta {
  font-size: 10px;
  color: #a87e87;
  margin-top: 4px;
}
.completed-by {
  color: #059669;
  font-weight: 600;
}
.btn-redeem {
  padding: 6px 12px;
  background: #ffe4e9;
  border: 1px solid #f43f5e;
  color: #e11d48;
  font-size: 11px;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
}
.tag-done {
  font-size: 11px;
  font-weight: 700;
  color: #059669;
}
</style>
