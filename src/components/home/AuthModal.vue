<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="auth-panel">
      <!-- Header -->
      <div class="auth-header">
        <div class="flex items-center gap-2">
          <span class="text-xl"><DesignIcon name="user" /></span>
          <div>
            <h3 class="font-extrabold text-base text-stone-800 leading-tight">
              {{ currentAuthUser ? '个人账号中心' : (activeTab === 'login' ? '账号登录' : '注册新账号') }}
            </h3>
            <p class="text-[11px] text-stone-500">
              个人背包跟随账号隔离，心愿单小家共享
            </p>
          </div>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- State 1: Already Logged In -->
      <div v-if="currentAuthUser" class="auth-body logged-in-view">
        <div class="user-card-box">
          <div class="avatar-badge">
            <span v-if="currentAuthUser.gender === 'male'" class="text-3xl"><DesignIcon name="user" /></span>
            <span v-else class="text-3xl"><DesignIcon name="user" /></span>
          </div>
          <div class="user-details">
            <div class="flex items-center gap-1.5">
              <span class="user-nickname font-bold text-stone-800">{{ currentAuthUser.nickname }}</span>
              <span
                class="gender-pill"
                :class="currentAuthUser.gender === 'male' ? 'male' : 'female'"
              >
                {{ currentAuthUser.gender === 'male' ? '男生' : '女生' }}
              </span>
            </div>
            <div class="text-xs text-stone-500 mt-0.5">账号: {{ currentAuthUser.username }}</div>
          </div>
        </div>

        <div class="account-features-tips">
          <div class="tip-item">
            <span class="tip-icon"><DesignIcon name="bag" /></span>
            <div class="tip-text">
              <span class="tip-title">个人专属背包</span>
              <span class="tip-desc">道具、金币、服饰随账号同步隔离保存</span>
            </div>
          </div>
          <div class="tip-item">
            <span class="tip-icon">🏡</span>
            <div class="tip-text">
              <span class="tip-title">房间心愿单共享</span>
              <span class="tip-desc">与房间内伙伴共同发布与兑现心愿券</span>
            </div>
          </div>
        </div>

        <div class="action-buttons-group">
          <button class="btn-switch" @click="handleLogout">
            退出 / 切换其他账号
          </button>
          <button class="btn-confirm-stay" @click="$emit('close')">
            返回小家
          </button>
        </div>
      </div>

      <!-- State 2: Login / Register Form -->
      <div v-else class="auth-body">
        <!-- Tabs -->
        <div class="auth-tabs">
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'login' }"
            @click="activeTab = 'login'; errorMsg = ''"
          >
            登录账号
          </button>
          <button
            class="tab-btn"
            :class="{ active: activeTab === 'register' }"
            @click="activeTab = 'register'; errorMsg = ''"
          >
            注册新账号
          </button>
        </div>

        <!-- Form -->
        <form class="auth-form" @submit.prevent="handleSubmit">
          <div class="form-item">
            <label class="item-label">登录账号</label>
            <input
              v-model="form.username"
              type="text"
              class="form-input"
              placeholder="请输入账号（字母/数字/下划线）"
              required
              autocomplete="username"
            />
          </div>

          <div class="form-item">
            <label class="item-label">登录密码</label>
            <input
              v-model="form.password"
              type="password"
                :minlength="activeTab === 'register' ? 8 : undefined"
                maxlength="128"
              class="form-input"
              placeholder="请输入密码"
              required
              autocomplete="current-password"
            />
          </div>

          <!-- Register Specific Fields -->
          <template v-if="activeTab === 'register'">
            <div class="form-item">
              <label class="item-label">小家昵称</label>
              <input
                v-model="form.nickname"
                type="text"
                class="form-input"
                placeholder="例如：甜蜜喵星人、暖阳少年"
              />
            </div>

            <div class="form-item">
              <label class="item-label">角色性别（注册后自动生成专属男女形象）</label>
              <div class="gender-selector-grid">
                <button
                  type="button"
                  class="gender-card-btn"
                  :class="{ selected: form.gender === 'female' }"
                  @click="form.gender = 'female'"
                >
                  <span class="gender-avatar"><DesignIcon name="user" /></span>
                  <div class="gender-info">
                    <span class="gender-title">甜美女生</span>
                    <span class="gender-desc">微卷长发 · 粉色卫衣 · 百褶裙</span>
                  </div>
                  <span v-if="form.gender === 'female'" class="check-mark">✓</span>
                </button>

                <button
                  type="button"
                  class="gender-card-btn"
                  :class="{ selected: form.gender === 'male' }"
                  @click="form.gender = 'male'"
                >
                  <span class="gender-avatar"><DesignIcon name="user" /></span>
                  <div class="gender-info">
                    <span class="gender-title">阳光男生</span>
                    <span class="gender-desc">清爽短发 · 英伦西装 · 牛仔长裤</span>
                  </div>
                  <span v-if="form.gender === 'male'" class="check-mark">✓</span>
                </button>
              </div>
            </div>
          </template>

          <div v-if="errorMsg" class="error-tip" role="alert">
            ⚠️ {{ errorMsg }}
          </div>

          <div v-if="successMsg" class="success-tip" role="status">
            ✨ {{ successMsg }}
          </div>

          <button type="submit" class="submit-btn" :disabled="loading">
            {{ loading ? '正在提交...' : (activeTab === 'login' ? '立即登录' : '完成注册并进入小家') }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DesignIcon from '../DesignIcon.vue'
import { ref, reactive, onMounted } from 'vue'
import { getBaseUrl } from '../../utils/api'
import {
  getStoredAuthUser,
  setStoredAuthUser,
  type AuthUser
} from '../../utils/backpack'
import { fetchPlatformOverview } from '../../utils/platformState'

const emit = defineEmits(['close', 'auth-changed'])

const activeTab = ref<'login' | 'register'>('login')
const currentAuthUser = ref<AuthUser | null>(null)
const loading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const form = reactive({
  username: '',
  password: '',
  nickname: '',
  gender: 'female' as 'male' | 'female'
})

onMounted(() => {
  currentAuthUser.value = getStoredAuthUser()
})

async function handleSubmit() {
  try {
    loading.value = true
    errorMsg.value = ''
    successMsg.value = ''

    const endpoint = activeTab.value === 'login' ? '/api/auth/login' : '/api/auth/register'
    const res = await fetch(`${getBaseUrl()}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || '操作失败')
    }

    // Save auth user
    setStoredAuthUser(data.user)
    currentAuthUser.value = data.user
    successMsg.value = data.message || '操作成功！'

    // Refresh platform state for this user
    await fetchPlatformOverview()
    emit('auth-changed', data.user)

    setTimeout(() => {
      emit('close')
    }, 700)
  } catch (err: any) {
    errorMsg.value = err.message || '网络请求错误，请重试'
  } finally {
    loading.value = false
  }
}

async function handleLogout() {
  loading.value = true
  try {
    const response = await fetch(`${getBaseUrl()}/api/auth/logout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentAuthUser.value), signal: AbortSignal.timeout(8000) })
    if (!response.ok && response.status !== 403) throw new Error('退出尚未确认，请重试')
    setStoredAuthUser(null)
    currentAuthUser.value = null
    activeTab.value = 'login'
    form.username = ''
    form.password = ''
    emit('auth-changed', null)
  } catch (error: any) { errorMsg.value = error.message }
  finally { loading.value = false }
}
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
.auth-panel {
  width: 100%;
  max-width: 380px;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(78, 30, 48, 0.18);
  overflow: hidden;
  animation: pop-in 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes pop-in {
  from { transform: scale(0.92); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.auth-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff5f7, #fdf2f4);
  border-bottom: 1px solid #f3e5e8;
}
.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: #f0e1e4;
  color: #7a505b;
  font-size: 13px;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.auth-body {
  padding: 20px;
}
.auth-tabs {
  display: flex;
  background: #f7eff1;
  padding: 3px;
  border-radius: 12px;
  margin-bottom: 18px;
}
.tab-btn {
  flex: 1;
  padding: 8px 0;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  border-radius: 9px;
  border: none;
  color: #8c6a73;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn.active {
  background: #ffffff;
  color: #d81b60;
  box-shadow: 0 2px 8px rgba(216, 27, 96, 0.14);
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.item-label {
  font-size: 11px;
  font-weight: 700;
  color: #634d53;
}
.form-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #e6d3d7;
  border-radius: 10px;
  font-size: 13px;
  color: #37292c;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.form-input:focus {
  border-color: #d81b60;
  box-shadow: 0 0 0 3px rgba(216, 27, 96, 0.12);
}
.gender-selector-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.gender-card-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 8px;
  border-radius: 12px;
  border: 1.5px solid #ebdbe0;
  background: #fcf9fa;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.gender-card-btn.selected {
  border-color: #d81b60;
  background: #fff0f3;
  box-shadow: 0 4px 12px rgba(216, 27, 96, 0.12);
}
.gender-avatar {
  font-size: 26px;
  margin-bottom: 2px;
}
.gender-title {
  font-size: 12px;
  font-weight: 700;
  color: #4a2832;
}
.gender-desc {
  font-size: 9px;
  color: #8c6a73;
  margin-top: 2px;
  line-height: 1.2;
}
.check-mark {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 10px;
  font-weight: bold;
  background: #d81b60;
  color: #fff;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.error-tip {
  font-size: 11px;
  color: #c2185b;
  background: #fde8ed;
  padding: 8px 10px;
  border-radius: 8px;
}
.success-tip {
  font-size: 11px;
  color: #2e7d32;
  background: #e8f5e9;
  padding: 8px 10px;
  border-radius: 8px;
}
.submit-btn {
  height: 42px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #ec407a, #d81b60);
  color: white;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(216, 27, 96, 0.28);
  transition: transform 0.1s, opacity 0.2s;
}
.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Logged in state */
.user-card-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #fdf5f7;
  border-radius: 14px;
  border: 1px solid #f3dce2;
}
.gender-pill {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 700;
}
.gender-pill.male {
  background: #e0f2fe;
  color: #0284c7;
}
.gender-pill.female {
  background: #fce7f3;
  color: #db2777;
}
.account-features-tips {
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tip-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #faf7f8;
  border-radius: 10px;
}
.tip-icon {
  font-size: 18px;
}
.tip-title {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: #4a2832;
}
.tip-desc {
  display: block;
  font-size: 10px;
  color: #8c6a73;
}
.action-buttons-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 18px;
}
.btn-switch {
  height: 38px;
  border-radius: 10px;
  border: 1px solid #ebdbe0;
  background: #fff;
  color: #8c6a73;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.btn-confirm-stay {
  height: 40px;
  border-radius: 10px;
  border: none;
  background: #f06292;
  color: white;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
</style>
