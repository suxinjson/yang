import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { validateRelease } from '../shared/appRelease.js'
const version=JSON.parse(fs.readFileSync('android/version.json','utf8'))
if(!Number.isSafeInteger(version.versionCode)||version.versionCode<1||!/^[\w.+-]{1,40}$/.test(version.versionName)) throw new Error('Invalid Android version')
if(process.argv[2]==='manifest') {
  const apk=process.argv[3], directory=process.argv[4]||'artifacts/android-release'
  const buffer=fs.readFileSync(apk), apkFile=`ganglegang-${version.versionName}-${version.versionCode}.apk`
  const release=validateRelease({schema:1,...version,sha256:crypto.createHash('sha256').update(buffer).digest('hex'),size:buffer.length,apkFile,publishedAt:new Date().toISOString()})
  fs.mkdirSync(directory,{recursive:true}); fs.copyFileSync(apk,path.join(directory,apkFile)); fs.writeFileSync(path.join(directory,'latest.json'),JSON.stringify(release,null,2))
  console.log(`Android ${release.versionName} (${release.versionCode}): ${release.size} bytes; manifest verified`)
} else { console.log(JSON.stringify(version)) }
