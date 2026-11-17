import fs from 'node:fs'
import path from 'node:path'

export function validateRelease(value) {
  if (!value || value.schema !== 1 || !Number.isSafeInteger(value.versionCode) || value.versionCode < 1 ||
    !Number.isSafeInteger(value.minSupportedVersionCode) || value.minSupportedVersionCode < 1 || value.minSupportedVersionCode > value.versionCode ||
    typeof value.versionName !== 'string' || !/^[\w.+-]{1,40}$/.test(value.versionName) ||
    !/^[a-f0-9]{64}$/.test(value.sha256) || !Number.isSafeInteger(value.size) || value.size <= 0 || value.size > 300*1024*1024 ||
    typeof value.apkFile !== 'string' || !/^ganglegang-[\w.+-]+\.apk$/.test(value.apkFile)) throw new Error('Invalid Android release manifest')
  return { schema:1, versionCode:value.versionCode, versionName:value.versionName, minSupportedVersionCode:value.minSupportedVersionCode,
    sha256:value.sha256, size:value.size, apkFile:value.apkFile, notes:String(value.notes || '').slice(0,2000), publishedAt:value.publishedAt }
}

export function registerAppRelease(app, directory) {
  app.get('/api/app/version', (_req,res) => {
    const file=path.join(directory,'latest.json')
    if(!fs.existsSync(file)) return res.status(204).end()
    try {
      const release=validateRelease(JSON.parse(fs.readFileSync(file,'utf8')))
      if(!fs.existsSync(path.join(directory,release.apkFile))) throw new Error('Missing APK')
      res.set('Cache-Control','no-store').json({...release,downloadPath:`/api/app/download/${release.apkFile}`})
    } catch { res.status(503).json({error:'更新包正在准备，请稍后重试'}) }
  })
  app.get('/api/app/download/:file', (req,res) => {
    const name=req.params.file
    if(!/^ganglegang-[\w.+-]+\.apk$/.test(name)) return res.status(404).end()
    const file=path.join(directory,name)
    if(!fs.existsSync(file)) return res.status(404).end()
    res.set('Cache-Control','public, max-age=31536000, immutable')
    res.type('application/vnd.android.package-archive').sendFile(file)
  })
}
