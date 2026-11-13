import { createApp } from 'vue'
import './style.css'
import { Capacitor } from '@capacitor/core'

const admin = import.meta.env.MODE !== 'android' && !Capacitor.isNativePlatform() && (/(^|\/)admin\/?$/.test(location.pathname) || new URLSearchParams(location.search).has('admin'))
// Separate entry chunks: the App never mounts or imports the administrator UI.
const page = admin ? await import('./AdminApp.vue') : await import('./App.vue')
if (!admin) (await import('./utils/appLifecycle')).startLifecycleTracking()
createApp(page.default).mount('#app')
