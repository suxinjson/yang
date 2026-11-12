<template>
  <section class="space-y-6">
    <h2 class="panel-title">密码安全</h2>
    <form class="admin-panel space-y-4 max-w-lg" @submit.prevent="changePassword">
      <label class="admin-field">新密码<input v-model="password" type="password" placeholder="输入新的后台密码..." autocomplete="new-password" minlength="3" required /></label>
      <label class="admin-field">确认密码<input v-model="confirmation" type="password" placeholder="再次确认新密码..." autocomplete="new-password" required /></label>
      <button class="admin-primary" :disabled="busy">保存新密码</button>
    </form>
    <div class="admin-panel flex flex-wrap items-center justify-between gap-4">
      <h3 class="text-sm font-semibold">清空心愿券</h3><button class="admin-text text-red-600" :disabled="busy" @click="reset">清空全部券</button>
    </div>
    <p v-if="message" role="status" class="text-xs" :class="success ? 'text-emerald-700' : 'text-red-600'">{{ message }}</p>
  </section>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { apiChangePassword, apiResetCoupons } from '../utils/api'
const password = ref(''), confirmation = ref(''), message = ref(''), success = ref(false), busy = ref(false)
async function changePassword() {
  if (busy.value) return
  success.value = false
  if (password.value.length < 3) { message.value = '密码至少 3 位'; return }
  if (password.value !== confirmation.value) { message.value = '两次密码不一致'; return }
  busy.value = true
  success.value = await apiChangePassword(password.value)
  message.value = success.value ? '密码已更新' : '修改失败，请重新登录后重试'
  if (success.value) { password.value = ''; confirmation.value = '' }
  busy.value = false
}
async function reset() {
  if (busy.value || !confirm('清空所有已获得的心愿券？此操作无法撤销。')) return
  busy.value = true
  success.value = await apiResetCoupons()
  message.value = success.value ? '心愿券已清空' : '清空失败，请重试'
  busy.value = false
}
</script>
