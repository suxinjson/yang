import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { fork, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import crypto from 'node:crypto'
import WebSocket from 'ws'
import pg from 'pg'
import EmbeddedPostgres from 'embedded-postgres'
import { drawToolRewards, InventoryService } from '../shared/inventory.js'
import { postgresDumpBinary } from './helpers/postgresClient.mjs'
import { PostgresStateRepository, databaseOptions } from '../shared/stateRepository.js'
import { normalizeCardCatalog } from '../shared/cardGroups.js'
import { LAYOUTS } from '../shared/layoutCatalog.js'
import { createLevel, checkCardOverlap } from '../shared/levelGenerator.js'
import { defaultGameSettings, normalizeGameSettings } from '../shared/gameConfig.js'
import { getBoardLayout } from '../shared/boardGeometry.js'

function seed(n) { return () => { n = Math.imul(1664525, n) + 1013904223 | 0; return (n >>> 0) / 4294967296 } }
function safeRemove(directory) {
  const resolved = path.resolve(directory)
  assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()))
  assert.match(path.basename(resolved), /^yang-inventory-/)
  fs.rmSync(resolved, { recursive: true, force: true })
}
test('twelve layouts preserve geometry, triples and certified high-pressure paths over many seeds', () => {
  let boards = 0, pressure = 0
  for (const layout of LAYOUTS) for (const dimensions of [[420,540,54,64], [300,360,76,90], [600,700,40,44]]) for (const mode of ['guaranteed','hard']) for (let n=1;n<=8;n++) {
    const settings = defaultGameSettings()
    ;[settings.boardWidth,settings.boardHeight,settings.cardWidth,settings.cardHeight] = dimensions
    settings.initialSlots = 7
    settings.levels = [{ ...settings.levels[0], layout: layout.id, minCards: 270, maxCards: 270, types: 7, layers: 6, solvability: mode }]
    const { cards, solution } = createLevel(1, ['a','b','c','d','e','f','g'], seed(n), settings)
    const geometry = getBoardLayout(normalizeGameSettings(settings))
    assert.equal(cards.length,270); assert.equal(new Set(solution).size,270)
    for (const card of cards) {
      assert.ok(card.x * geometry.stepX >= -1e-6 && card.y * geometry.stepY >= -1e-6)
      assert.ok(card.x * geometry.stepX + geometry.cardWidth + geometry.padding*2 <= geometry.width + 1e-6)
      assert.ok(card.y * geometry.stepY + geometry.cardHeight + geometry.padding*2 <= geometry.height + 1e-6)
    }
    const live = new Set(cards.map(card=>card.id)), held = new Map()
    let size=0, maximum=0
    for (const id of solution) {
      const card=cards[id]
      assert.ok(cards.every(other=>!live.has(other.id)||other.id===id||other.layer<=card.layer||!checkCardOverlap(card,other,geometry.cardWidth/geometry.stepX,geometry.cardHeight/geometry.stepY)), layout.id)
      live.delete(id)
      const count=(held.get(card.type)||0)+1
      if(count===3){held.delete(card.type);size-=2}else{held.set(card.type,count);size++}
      maximum=Math.max(maximum,size);assert.ok(size<7)
    }
    assert.equal(size,0)
    if(mode==='hard'&&maximum>=6)pressure++
    boards++
  }
  assert.equal(boards,576);assert.equal(pressure,288)
})
test('legacy photos migrate once into ordinary groups and reward percentages have honest one-of semantics', () => {
  const catalog=normalizeCardCatalog({})
  assert.equal(catalog.customCards.filter(card=>card.groupId==='boyfriend').length,6)
  const changed={...catalog, customCards:catalog.customCards.map(card=>({...card,name:'Editable '+card.id}))}
  assert.equal(normalizeCardCatalog(changed).customCards[0].name,changed.customCards[0].name)
  assert.equal(normalizeCardCatalog(changed).customCards.length,catalog.customCards.length)
  assert.deepEqual(drawToolRewards({simultaneous:true,hintChance:0,rescueChance:0}),[])
  assert.equal(drawToolRewards({simultaneous:true,hintChance:100,rescueChance:100}).length,2)
  assert.equal(drawToolRewards({simultaneous:false,hintChance:25,rescueChance:25},()=>.1)[0].itemId,'gang.hint')
  assert.equal(drawToolRewards({simultaneous:false,hintChance:25,rescueChance:25},()=>.3)[0].itemId,'gang.rescue')
  assert.deepEqual(drawToolRewards({simultaneous:false,hintChance:25,rescueChance:25},()=>.8),[])
  assert.throws(()=>drawToolRewards({simultaneous:false,hintChance:80,rescueChance:40}),/100/)
  const value={coupons:[]}, service=new InventoryService(value), credentials={profileId:crypto.randomUUID(),profileSecret:crypto.randomBytes(32).toString('hex')}
  service.create(credentials);service.create(credentials)
  assert.deepEqual(service.tools(credentials.profileId),{hint:2,rescue:1})
  assert.throws(()=>service.authenticate({...credentials,profileSecret:'0'.repeat(64)}),/凭证/)
  service.grant(credentials.profileId,'wardrobe.shirt.blue',1,{name:'蓝色上衣',kind:'avatar_clothing',stackable:false})
  assert.equal(service.snapshot(credentials.profileId).items.find(item=>item.itemId==='wardrobe.shirt.blue').kind,'avatar_clothing')
})
async function startBackend(directory, env={}) {
  let child,base
  async function start() {
    child=fork(path.resolve('server.js'),[],{env:{...process.env,PORT:'0',DATA_DIR:directory,...env},silent:true})
    let errors=''
    child.stderr.on('data',data=>errors+=data)
    const result=await Promise.race([once(child,'message'),once(child,'exit').then(()=>{throw new Error('Backend exited: '+errors)}),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Backend startup timed out')),12000);timer.unref()})])
    base='http://127.0.0.1:'+result[0].port
  }
  async function stop(){if(child?.exitCode===null){const exited=once(child,'exit');child.kill();await exited}}
  await start()
  return {get base(){return base},async restart(){await stop();await start()},stop}
}
function frame(socket,predicate) {
  return new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>{socket.off('message',listener);reject(new Error('Socket timeout'))},8000)
    function listener(raw){const data=JSON.parse(raw.toString());if(predicate(data)){clearTimeout(timeout);socket.off('message',listener);resolve(data)}}
    socket.on('message',listener)
  })
}
async function exerciseBackpack(server) {
  const credentials=()=>({profileId:crypto.randomUUID(),profileSecret:crypto.randomBytes(32).toString('hex')})
  const a=credentials(),b=credentials()
  const post=(url,body={},who=a,admin='')=>fetch(server.base+url,{method:'POST',headers:{'Content-Type':'application/json',...(admin?{Authorization:'Bearer '+admin}:{})},body:JSON.stringify({...who,deviceId:'node_test_device',sessionId:'node_test_session',platform:'android',...body})})
  const json=async response=>{assert.equal(response.status,200,await response.clone().text());return response.json()}
  const admin=(await json(await post('/api/admin/login',{password:'admin'}))).token
  await json(await post('/api/config',{rewardPolicy:{simultaneous:true,hintChance:100,rescueChance:100,couponChance:100},gameSettings:{levels:[{minCards:12,maxCards:12,types:3}]}},a,admin))
  await json(await post('/api/coupons',{id:'legacy_privacy_sample',title:'legacy sample',used:false,target:'boyfriend_pays'},a,admin))
  await json(await post('/api/play/profile',{},a));await json(await post('/api/play/profile',{},b))
  const initial=await json(await post('/api/play/profile',{},a));assert.deepEqual(initial.backpack.tools,{hint:2,rescue:1})
  const start=()=>post('/api/play/solo/start',{operationId:crypto.randomUUID()},a).then(json)
  let round=await start()
  const tool={roundId:round.game.roundId,token:round.token,operationId:crypto.randomUUID(),tool:'hint'}
  assert.equal((await post('/api/play/solo/tool',tool,b)).status,403)
  assert.equal((await post('/api/play/solo/tool',tool,{})).status,403)
  await json(await post('/api/play/solo/tool',tool));await json(await post('/api/play/solo/tool',tool))
  assert.equal((await json(await post('/api/play/backpack'))).backpack.tools.hint,1)
  await server.restart()
  await json(await post('/api/play/solo/tool',tool))
  round=await start();assert.equal(round.game.tools.hint,1)
  const finish={roundId:round.game.roundId,token:round.token,outcome:'won'}
  const reward=await json(await post('/api/play/solo/finish',finish))
  assert.equal(reward.rewards.length,2);assert.equal(reward.backpack.coupons.length,1)
  await json(await post('/api/play/solo/finish',finish));await server.restart()
  const duplicate=await json(await post('/api/play/solo/finish',finish))
  assert.equal(duplicate.backpack.coupons.length,1);assert.equal(duplicate.backpack.tools.hint,2)
  const legacyUse=await json(await post('/api/coupons/redeem',{id:'legacy_privacy_sample'},b))
  assert.ok(!legacyUse.list.some(coupon=>coupon.ownerId))
  const activeAdmin=(await json(await post('/api/admin/login',{password:'admin'}))).token
  const legacyDraw={operationId:crypto.randomUUID(),context:'win_1'}
  const issued=await json(await post('/api/coupons/draw',legacyDraw,b,activeAdmin))
  const recovered=await json(await post('/api/coupons/draw',legacyDraw,b))
  assert.equal(issued.coupon.id,recovered.coupon.id)
  for(const response of [issued,recovered]) {
    assert.ok(!response.list.some(coupon=>coupon.ownerId))
    assert.ok(!JSON.stringify(response).includes(a.profileId))
  }
  const anonymous=await (await fetch(server.base+'/api/state')).json()
  assert.ok(!JSON.stringify(anonymous).includes(a.profileId));assert.ok(!JSON.stringify(anonymous).includes(a.profileSecret))
  assert.ok(!(await (await fetch(server.base+'/api/coupons')).json()).some(c=>c.id===reward.rewardId))
  const bad=await post('/api/play/coupons/redeem',{couponId:reward.rewardId,operationId:crypto.randomUUID()},b)
  assert.equal(bad.status,403)
  assert.equal((await post('/api/coupons/redeem',{id:reward.rewardId},b)).status,403)
  const use={couponId:reward.rewardId,operationId:crypto.randomUUID()}
  await json(await post('/api/play/coupons/redeem',use,a));await json(await post('/api/play/coupons/redeem',use,a))
  const room=await json(await post('/api/play/rooms',{operationId:crypto.randomUUID(),claimToken:crypto.randomBytes(32).toString('hex')},a))
  const partner=await json(await post('/api/play/rooms/join',{code:room.room.code,deviceId:'node_partner_device'},b))
  const sockets=[]
  try{
    for(const [entry,who] of [[room,a],[partner,b]]){
      const socket=new WebSocket(server.base.replace('http:','ws:')+'/api/play/socket');sockets.push(socket);await once(socket,'open')
      const ready=frame(socket,data=>data.type==='snapshot');socket.send(JSON.stringify({type:'auth',roomId:entry.room.id,token:entry.token,...who}));await ready
    }
    const hint={type:'command',roundId:room.game.roundId,revision:partner.room.revision,operationId:crypto.randomUUID(),action:{type:'hint'}}
    const ack=frame(sockets[0],data=>data.ack===hint.operationId);sockets[0].send(JSON.stringify(hint));await ack
    const bagA=(await json(await post('/api/play/backpack',{},a))).backpack,bagB=(await json(await post('/api/play/backpack',{},b))).backpack
    assert.equal(bagA.tools.hint,1);assert.equal(bagB.tools.hint,2)
    const current=frame(sockets[0],data=>data.type==='snapshot');sockets[0].send(JSON.stringify({type:'sync'}));const synced=await current
    const reset={type:'command',roundId:synced.game.roundId,revision:synced.room.revision,operationId:crypto.randomUUID(),action:{type:'restart'}}
    const resetAck=frame(sockets[0],data=>data.ack===reset.operationId);sockets[0].send(JSON.stringify(reset));const restarted=await resetAck
    assert.equal(restarted.game.tools.hint,1)
    const bagAfter=(await json(await post('/api/play/backpack',{},b))).backpack;assert.equal(bagAfter.tools.hint,2)
  }finally{sockets.forEach(socket=>socket.terminate())}
  const overview=await json(await post('/api/play/admin/control',{profileId:a.profileId,action:'grant_tool',tool:'hint',count:1,operationId:crypto.randomUUID()},a,activeAdmin))
  assert.ok(overview.success)
}
test('file adapter: private ownership, one-time starter, idempotent rewards, restart recovery and per-player room inventory',async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'yang-inventory-file-'))
  const server=await startBackend(directory,{STORAGE_DRIVER:'file'})
  try{await exerciseBackpack(server)}finally{await server.stop();safeRemove(directory)}
})
test('PostgreSQL 17: backup-gated migration, constraints, atomic rollback, instance lock and real gameplay persistence', {timeout:120000}, async()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'yang-inventory-pg-'))
  const listening=net.createServer();listening.listen(0,'127.0.0.1');await once(listening,'listening');const port=listening.address().port;await new Promise(resolve=>listening.close(resolve))
  const embedded=new EmbeddedPostgres({databaseDir:path.join(directory,'cluster'),user:'test_cluster_owner',password:'test-only-cluster-secret',port,persistent:true,createPostgresUser:false,postgresFlags:['-h','127.0.0.1','-c','shared_buffers=16MB','-c','max_connections=15'],onLog:()=>{},onError:()=>{}})
  let server,pool
  const oldEnv={...process.env}
  try{
    await embedded.initialise();await embedded.start()
    pool=new pg.Pool({host:'127.0.0.1',port,user:'test_cluster_owner',password:'test-only-cluster-secret',database:'postgres',max:1})
    assert.match((await pool.query('SHOW server_version')).rows[0].server_version,/^17\./)
    await pool.query("CREATE USER ganglegang_test_app WITH PASSWORD 'test-only-app-secret'")
    await pool.query('CREATE DATABASE ganglegang_test OWNER ganglegang_test_app')
    const binaries=process.platform === 'win32' ? await import('@embedded-postgres/windows-x64') : {}
    const env={...process.env,STORAGE_DRIVER:'postgres',PGHOST:'127.0.0.1',PGPORT:String(port),PGDATABASE:'ganglegang_test',PGUSER:'ganglegang_test_app',PGPASSWORD:'test-only-app-secret',BACKUP_DIR:path.join(directory,'backups'),PG_DUMP_BIN:await postgresDumpBinary(binaries)}
    delete env.DATABASE_URL
    const refused=spawnSync(process.execPath,['scripts/migrate-database.mjs'],{env:{...env,PG_DUMP_BIN:path.join(directory,'missing-pg-dump')},encoding:'utf8'})
    assert.notEqual(refused.status,0)
    assert.match(refused.stderr,/备份失败，已停止迁移/)
    const schemaCheck=new pg.Pool({...databaseOptions(env),max:1})
    try {
      assert.equal((await schemaCheck.query("SELECT to_regclass('public.app_schema_version') AS schema")).rows[0].schema,null)
    } finally { await schemaCheck.end() }
    const migration=spawnSync(process.execPath,['scripts/migrate-database.mjs'],{env,encoding:'utf8'})
    assert.equal(migration.status,0,migration.stderr)
    assert.equal(fs.readdirSync(env.BACKUP_DIR).filter(name=>name.endsWith('.dump')).length,1)
    delete process.env.DATABASE_URL
    Object.assign(process.env,env)
    const credentials={profileId:crypto.randomUUID(),profileSecret:crypto.randomBytes(32).toString('hex')}
    const repository=await PostgresStateRepository.open(()=>({coupons:[],operations:{}}))
    const state=repository.load();const service=new InventoryService(state);service.create(credentials);await repository.save(state)
    const before=repository.load();const invalid=repository.load();invalid.profiles[credentials.profileId].items['gang.hint'].quantity=-1
    await assert.rejects(repository.save(invalid),/check constraint/)
    assert.deepEqual(repository.load(),before)
    await assert.rejects(PostgresStateRepository.open(()=>({})),/已有游戏实例/)
    await repository.close()
    const reopened=await PostgresStateRepository.open(()=>{throw new Error('Must not remigrate existing state')})
    assert.deepEqual(new InventoryService(reopened.load()).tools(credentials.profileId),{hint:2,rescue:1});await reopened.close()
    server=await startBackend(directory,env);await exerciseBackpack(server)
    assert.equal(databaseOptions(env).max,5)
    assert.throws(()=>databaseOptions({...env,PGDATABASE:'member'}),/独立数据库/)
    assert.throws(()=>databaseOptions({...env,PGUSER:'member_app'}),/专用业务账号/)
  }finally{
    if(server)await server.stop()
    await pool?.end();await embedded.stop()
    for(const key of Object.keys(process.env))if(!(key in oldEnv))delete process.env[key]
    Object.assign(process.env,oldEnv)
    safeRemove(directory)
  }
})

