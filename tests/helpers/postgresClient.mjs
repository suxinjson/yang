import fs from 'node:fs'
import path from 'node:path'
import { inflateRawSync } from 'node:zlib'

// embedded-postgres deliberately omits client tools. Cache only pg_dump from
// the official PostgreSQL 17 Windows distribution for the backup integration test.
export async function postgresDumpBinary(binaries) {
  if (process.env.PG_DUMP_BIN) return process.env.PG_DUMP_BIN
  if (process.platform !== 'win32') return 'pg_dump'
  const directory=path.resolve('node_modules/.cache/postgres17-test-client')
  const executable=path.join(directory,'pg_dump.exe')
  if(fs.existsSync(executable)) return executable
  const url='https://get.enterprisedb.com/postgresql/postgresql-17.7-1-windows-x64-binaries.zip'
  async function range(start,end) {
    const response=await fetch(url,{headers:{Range:'bytes='+start+'-'+end},signal:AbortSignal.timeout(30000)})
    if(response.status!==206)throw new Error('PostgreSQL test-client range download failed')
    return Buffer.from(await response.arrayBuffer())
  }
  const response=await fetch(url,{headers:{Range:'bytes=-65536'},signal:AbortSignal.timeout(30000)})
  if(response.status!==206)throw new Error('PostgreSQL ZIP tail download failed')
  const tail=Buffer.from(await response.arrayBuffer())
  let end=-1
  for(let n=tail.length-22;n>=0;n--)if(tail.readUInt32LE(n)===0x06054b50){end=n;break}
  if(end<0)throw new Error('Invalid PostgreSQL ZIP directory')
  const size=tail.readUInt32LE(end+12),offset=tail.readUInt32LE(end+16)
  const central=await range(offset,offset+size-1)
  let target
  for(let n=0;n<central.length;){
    if(central.readUInt32LE(n)!==0x02014b50)throw new Error('Invalid PostgreSQL ZIP entry')
    const filenameLength=central.readUInt16LE(n+28),extra=central.readUInt16LE(n+30),comment=central.readUInt16LE(n+32)
    const name=central.subarray(n+46,n+46+filenameLength).toString()
    if(name.endsWith('/bin/pg_dump.exe'))target={method:central.readUInt16LE(n+10),compressed:central.readUInt32LE(n+20),size:central.readUInt32LE(n+24),offset:central.readUInt32LE(n+42)}
    n+=46+filenameLength+extra+comment
  }
  if(!target)throw new Error('PostgreSQL archive omitted pg_dump')
  const header=await range(target.offset,target.offset+29)
  if(header.readUInt32LE(0)!==0x04034b50)throw new Error('Invalid PostgreSQL local ZIP header')
  const start=target.offset+30+header.readUInt16LE(26)+header.readUInt16LE(28)
  const compressed=await range(start,start+target.compressed-1)
  const data=target.method===8?inflateRawSync(compressed):compressed
  if(data.length!==target.size)throw new Error('Incomplete PostgreSQL client binary')
  fs.mkdirSync(directory,{recursive:true})
  for(const name of fs.readdirSync(path.dirname(binaries.postgres)))if(name.endsWith('.dll'))fs.copyFileSync(path.join(path.dirname(binaries.postgres),name),path.join(directory,name))
  fs.writeFileSync(executable,data)
  return executable
}

