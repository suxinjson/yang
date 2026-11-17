import { reactive } from 'vue'
import { App } from '@capacitor/app'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { getBaseUrl } from './api'

export interface Release { versionCode:number; versionName:string; minSupportedVersionCode:number; sha256:string; size:number; notes:string; downloadPath:string }
const Installer=registerPlugin<{download(options:{url:string;sha256:string;size:number;versionCode:number}):Promise<void>;install():Promise<void>;status():Promise<{ready:boolean;progress:number;error?:string}>}>('AppUpdater')
export const appUpdate=reactive({release:null as Release|null,required:false,busy:false,ready:false,progress:0,error:'',checking:false})
let started=false, lastCheck=0
export function parseRelease(value: any): Release {
  if(!value || !Number.isSafeInteger(value.versionCode) || value.versionCode<1 || !Number.isSafeInteger(value.minSupportedVersionCode) || value.minSupportedVersionCode<1 || value.minSupportedVersionCode>value.versionCode ||
    typeof value.versionName!=='string' || !/^[\w.+-]{1,40}$/.test(value.versionName) || !/^[a-f0-9]{64}$/.test(value.sha256) ||
    !Number.isSafeInteger(value.size)||value.size<1||value.size>300*1024*1024||!/^\/api\/app\/download\/ganglegang-[\w.+-]+\.apk$/.test(value.downloadPath)) throw new Error('更新信息不完整，请稍后重试')
  return {...value,notes:String(value.notes||'').slice(0,2000)}
}
export async function checkAppUpdate(force=false) {
  if(Capacitor.getPlatform()!=='android'||appUpdate.checking||(!force&&Date.now()-lastCheck<60000))return
  appUpdate.checking=true; lastCheck=Date.now()
  try {
    const info=await App.getInfo(), current=Number(info.build)
    const response=await fetch(`${getBaseUrl()}/api/app/version`,{cache:'no-store',signal:AbortSignal.timeout(12000)})
    if(response.status===204)return
    if(!response.ok)throw new Error('暂时无法检查更新')
    const release=parseRelease(await response.json())
    if(release.versionCode>current){appUpdate.release=release;appUpdate.required=current<release.minSupportedVersionCode}
  } catch(error:any){ if(force)appUpdate.error=error.message } finally{appUpdate.checking=false}
}
export async function installAppUpdate() {
  if(!appUpdate.release||appUpdate.busy)return
  appUpdate.busy=true;appUpdate.error=''
  let poll:ReturnType<typeof setInterval>|undefined
  try {
    if(!appUpdate.ready){
      const url=new URL(`${getBaseUrl()}${appUpdate.release.downloadPath}`)
      if(url.protocol!=='https:')throw new Error('更新下载需要 HTTPS 连接')
      poll=setInterval(()=>{void Installer.status().then(s=>{appUpdate.progress=s.progress}).catch(()=>{})},700)
      await Installer.download({url:url.href,sha256:appUpdate.release.sha256,size:appUpdate.release.size,versionCode:appUpdate.release.versionCode})
      appUpdate.ready=true;appUpdate.progress=100
    }
    await Installer.install()
  } catch(error:any){appUpdate.error=error.message||'下载或安装失败，请重试'}finally{if(poll)clearInterval(poll);appUpdate.busy=false}
}
export function startAppUpdates(){
  if(started||Capacitor.getPlatform()!=='android')return;started=true
  void checkAppUpdate()
  void App.addListener('appStateChange',({isActive})=>{if(isActive){if(appUpdate.ready)void Installer.status().catch(()=>{});void checkAppUpdate()}})
  setInterval(()=>{if(!document.hidden)void checkAppUpdate()},15*60*1000)
  window.addEventListener('online',()=>void checkAppUpdate(true))
}
