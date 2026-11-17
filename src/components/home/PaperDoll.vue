<template>
  <div class="paper-doll-wrapper" :class="['pose-'+pose, 'mood-'+mood, 'gender-'+gender]">
    <ModelPreview catalog-id="character" :width="width" :height="height" label="人物穿搭预览" :options="{gender, skin, hairColor, eyeColor, lipColor, pose, equippedSlots}" />
  </div>
</template>
<script setup lang="ts">
import ModelPreview from './ModelPreview.vue'
withDefaults(defineProps<{width?:number;height?:number;skin?:string;equippedSlots?:Record<string,string|null>;gender?:string;pose?:'standing'|'sitting';mood?:'happy'|'gentle'|'wink';eyeColor?:string;hairColor?:string;lipColor?:string}>(),{width:120,height:180,skin:'#deb99b',gender:'female',pose:'standing',mood:'gentle',equippedSlots:()=>({})})
</script>
<style scoped>.paper-doll-wrapper{display:inline-flex;vertical-align:middle;animation:doll-breathe 6s ease-in-out infinite;transform-origin:bottom center}@keyframes doll-breathe{50%{transform:translateY(-1px)}}@media(prefers-reduced-motion:reduce){.paper-doll-wrapper{animation:none}}</style>