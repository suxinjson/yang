import fs from 'node:fs'
const write=(p,s)=>fs.writeFileSync(p,s)
const edit=(p,f)=>write(p,f(fs.readFileSync(p,'utf8')))
write('src/components/home/IsometricFurniture.vue',`<template><ModelPreview :catalog-id="catalogId" :width="width" :height="height" /></template>
<script setup lang="ts">
import ModelPreview from './ModelPreview.vue'
withDefaults(defineProps<{catalogId:string;width?:number;height?:number}>(),{width:80,height:60})
</script>`)
write('src/components/home/PaperDoll.vue',`<template>
  <div class="paper-doll-wrapper" :class="['pose-'+pose, 'mood-'+mood, 'gender-'+gender]">
    <ModelPreview catalog-id="character" :width="width" :height="height" label="人物穿搭预览" :options="{gender, skin, hairColor, eyeColor, lipColor, pose, equippedSlots}" />
  </div>
</template>
<script setup lang="ts">
import ModelPreview from './ModelPreview.vue'
withDefaults(defineProps<{width?:number;height?:number;skin?:string;equippedSlots?:Record<string,string|null>;gender?:string;pose?:'standing'|'sitting';mood?:'happy'|'gentle'|'wink';eyeColor?:string;hairColor?:string;lipColor?:string}>(),{width:120,height:180,skin:'#deb99b',gender:'female',pose:'standing',mood:'gentle',equippedSlots:()=>({})})
</script>
<style scoped>.paper-doll-wrapper{display:inline-flex;vertical-align:middle;animation:doll-breathe 6s ease-in-out infinite;transform-origin:bottom center}@keyframes doll-breathe{50%{transform:translateY(-1px)}}@media(prefers-reduced-motion:reduce){.paper-doll-wrapper{animation:none}}</style>`)
for(const name of ['StoreModal','UniversalBackpackModal','WardrobeModal','FurnitureGridEditor']) {
 edit('src/components/home/'+name+'.vue',s=>s.replace('<script setup lang="ts">','<script setup lang="ts">\nimport ModelPreview from \'./ModelPreview.vue\'' )
 .replace("{{ item.icon || '📦' }}",'<ModelPreview :catalog-id="item.id" :width="110" :height="100" :label="item.name" />')
 .replace("{{ item.icon || item.metadata?.icon || '📦' }}",'<ModelPreview :catalog-id="item.catalogId" :width="76" :height="76" />')
 .replace("{{ selectedItem.icon || selectedItem.metadata?.icon || '📦' }}",'<ModelPreview :catalog-id="selectedItem.catalogId" :width="60" :height="60" />')
 .replace("{{ getFurnDef(furn.catalogId)?.icon || '🛋️' }}",'<ModelPreview :catalog-id="furn.catalogId" :width="84" :height="74" />')
 .replace("{{ item.metadata?.icon || '🛋️' }}",'<ModelPreview :catalog-id="item.catalogId" :width="66" :height="60" />')
 .replace(/\{\{ item\.icon(?: \|\| '[^']*')? \}\}/g,'<ModelPreview :catalog-id="item.id" :width="64" :height="64" />'))
}
edit('src/components/home/HomeHub.vue',s=>s.replace('<script setup lang="ts">',`<script setup lang="ts">
import PetCompanion from './PetCompanion.vue'`)
 .replace('<div class="pet-sprite">🐱</div>','<PetCompanion :type="companion?.petType" roaming :away="companion?.petStatus === \'foraging\'" />')
 .replace('小家元宇宙 · 个人背包独立隔离','生活的留白 · 我们的小家')
 .replace("'👦 阳光男生' : '👧 甜美女生'","'自然 · 男生' : '自然 · 女生'"))
edit('src/components/home/CompanionModal.vue',s=>s.replace('<script setup lang="ts">',`<script setup lang="ts">
import PetCompanion from './PetCompanion.vue'
import PaperDoll from './PaperDoll.vue'
import { PETS, type PetType } from '../../../shared/pets'
import { selectPet } from '../../utils/platformState'`)
 .replace('<span class="text-3xl">🧑‍💼</span>','<PaperDoll :width="48" :height="68" gender="male" />')
 .replace('<span class="text-4xl">🐱</span>','<PetCompanion :type="companion?.petType" />')
 .replace('小猫咪（毛球）',"{{ PETS.find(p => p.id === companion?.petType)?.name || PETS[0]?.name }}")
 .replace('<!-- Pet Action Buttons -->',`<div class="pet-selection" aria-label="选择宠物">
  <button v-for="pet in PETS" :key="pet.id" :aria-pressed="companion?.petType === pet.id" :disabled="loading" @click="handleSelectPet(pet.id)">
    <PetCompanion :type="pet.id" /><strong>{{ pet.name }}</strong><small>{{ pet.description }}</small>
  </button>
</div>
<p v-if="petError" role="alert" class="pet-error">{{ petError }}</p>
<!-- Pet Action Buttons -->`)
 .replace('const loading = ref(false)',`const loading = ref(false)
const petError = ref('')
async function handleSelectPet(type: PetType) {
  loading.value = true; petError.value = ''
  try { await selectPet(type) } catch (error: any) { petError.value = error.message || '暂时无法切换宠物' } finally { loading.value = false }
}`)
 .replaceAll('companion?.petHunger || 80','companion?.petHunger ?? 80'))
