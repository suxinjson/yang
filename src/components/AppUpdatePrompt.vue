<template>
  <Teleport to="body"><div v-if="appUpdate.release && !dismissed" class="update-backdrop" role="dialog" aria-modal="true" aria-labelledby="update-title">
    <section class="update-card"><span class="update-eyebrow">A NEW CHAPTER</span><h2 id="update-title">让小家焕然一新</h2><p class="update-version">版本 {{ appUpdate.release.versionName }} · {{ (appUpdate.release.size/1024/1024).toFixed(1) }} MB</p>
      <p class="update-notes">{{ appUpdate.release.notes }}</p><p v-if="appUpdate.required" class="update-required">当前版本需要升级后继续使用。</p>
      <progress v-if="appUpdate.busy" max="100" :value="appUpdate.progress" aria-label="更新包下载进度" />
      <p v-if="appUpdate.error" role="alert">{{ appUpdate.error }}</p>
      <button :disabled="appUpdate.busy" @click="installAppUpdate">{{ appUpdate.busy ? `正在下载 ${appUpdate.progress}%` : appUpdate.ready ? '打开安装包' : '下载并安装更新' }}</button>
      <button v-if="!appUpdate.required" class="update-later" :disabled="appUpdate.busy" @click="dismissed=true">稍后提醒</button>
      <small>安装时请按系统提示允许此应用安装更新，再确认安装。</small>
    </section>
  </div></Teleport>
</template>
<script setup lang="ts">
import { ref,watch } from 'vue'
import { appUpdate,installAppUpdate } from '../utils/appUpdate'
const dismissed=ref(false);watch(()=>appUpdate.release?.versionCode,()=>dismissed.value=false)
</script>
<style scoped>
.update-backdrop{position:fixed;inset:0;z-index:50000;display:grid;place-items:center;padding:24px;background:#27342bcc;backdrop-filter:blur(12px)}.update-card{width:100%;max-width:380px;max-height:85svh;overflow:auto;padding:32px 26px;background:#f8f7ef;border:1px solid #fff8;border-radius:26px;color:#4c5a45;box-shadow:0 30px 80px #0003}.update-eyebrow{font-size:10px;letter-spacing:.25em;color:#9b8c6b}.update-card h2{font-size:24px;font-weight:500;margin:16px 0 8px}.update-version{font-size:12px;color:#8e957f}.update-notes{white-space:pre-line;line-height:1.9;font-size:14px;margin:24px 0}.update-required{font-size:12px;color:#8a6b50}.update-card button{width:100%;padding:13px;border-radius:12px;background:#55694e;color:#fffdf5;margin-top:12px}.update-card button:disabled{opacity:.6}.update-card .update-later{background:transparent;color:#8a927e}.update-card small{display:block;margin-top:18px;font-size:10px;line-height:1.8;color:#8e957f}.update-card progress{width:100%;accent-color:#708662}.update-card [role=alert]{font-size:12px;color:#a54e40}
</style>
