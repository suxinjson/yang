import fs from 'node:fs'
const root='src/components/home'
const names=fs.readdirSync(root).filter(n=>n.endsWith('.vue')&&!['ModelPreview.vue','PetCompanion.vue','PaperDoll.vue','IsometricFurniture.vue'].includes(n))
const icons={'🎒':'bag','💌':'heart','🏪':'shop','💻':'work','🐾':'pet','🛠️':'tools','🚪':'room','🪙':'coin','💖':'heart','💕':'heart','🏆':'trophy','👤':'user','🎮':'game','🛋️':'sofa','🪞':'mirror','👗':'shirt','✨':'spark','🎁':'gift','🎨':'spark','🧑‍💼':'user','🥫':'gift','👦':'user','👧':'user'}
for(const file of names){
 const p=root+'/'+file; let s=fs.readFileSync(p,'utf8'); const end=s.indexOf('</template>'); if(end<0)continue
 let template=s.slice(0,end),rest=s.slice(end)
 for(const [icon,name] of Object.entries(icons)) template=template.replaceAll(icon,`<DesignIcon name="${name}" />`)
 // Replace icon strings rendered from tab metadata with consistent line icons.
 template=template.replace(/\{\{ (tab|cat)\.icon \}\}/g,(_,v)=>`<DesignIcon :name="${v}.key === 'furniture' ? 'sofa' : ${v}.key === 'wardrobe' ? 'shirt' : ${v}.key === 'wish_coupon' ? 'heart' : 'bag'" />`)
 if(template.includes('<DesignIcon'))rest=rest.replace('<script setup lang="ts">',`<script setup lang="ts">\nimport DesignIcon from '../DesignIcon.vue'`)
 fs.writeFileSync(p,template+rest)
}
