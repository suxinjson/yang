<template>
  <div class="pet-art" :class="[type, { roaming, away }]" role="img" :aria-label="pet.name" :style="{ '--coat': pet.coat, '--accent': pet.accent }">
    <svg viewBox="0 0 140 120" aria-hidden="true">
      <defs><radialGradient :id="uid"><stop stop-color="var(--accent)"/><stop offset="1" stop-color="var(--coat)"/></radialGradient></defs>
      <ellipse cx="70" cy="105" rx="40" ry="7" fill="#403629" opacity=".12"/>
      <g class="pet-breathe">
        <path class="pet-tail" :d="type === 'rabbit' ? 'M100 78Q124 62 115 85Q110 95 100 88' : type === 'fox' ? 'M96 88Q139 100 129 52Q113 54 112 75L95 72' : 'M96 85Q132 94 120 57Q112 43 110 54Q122 83 96 74'" fill="var(--coat)" stroke="var(--accent)" stroke-width="5"/>
        <ellipse cx="76" cy="79" :rx="type === 'labrador' || type === 'golden' ? 36 : 33" ry="23" :fill="`url(#${uid})`"/>
        <g class="pet-feet" fill="var(--accent)"><ellipse cx="54" cy="99" rx="10" ry="5"/><ellipse cx="89" cy="99" rx="11" ry="5"/></g>
        <g class="pet-head">
          <path v-if="type === 'rabbit'" d="M42 50Q22 3 38 9Q52 15 53 43M63 43Q57 0 74 11Q88 25 72 53" fill="var(--coat)" stroke="var(--accent)" stroke-width="4"/>
          <path v-else-if="type === 'dog' || type === 'labrador' || type === 'golden'" d="M32 55 32 25Q47 28 51 49M64 48Q76 23 84 29L80 61" fill="var(--coat)"/>
          <path v-else d="M31 55 34 24 53 43M62 43 84 23 83 59" fill="var(--coat)" stroke="var(--accent)" stroke-width="3"/>
          <ellipse cx="57" cy="62" :rx="type === 'fox' ? 27 : 29" ry="25" :fill="`url(#${uid})`"/>
          <path v-if="type === 'labrador' || type === 'golden'" d="M35 67Q57 91 79 67Q75 88 57 91Q39 88 35 67Z" fill="var(--accent)" opacity=".8"/>
          <path d="M34 65Q44 90 59 83Q75 90 81 65Q69 68 58 74Q45 68 34 65" fill="var(--accent)"/>
          <g class="pet-eyes" fill="#313633"><ellipse cx="44" cy="59" rx="2.2" ry="3.4"/><ellipse cx="70" cy="59" rx="2.2" ry="3.4"/></g>
          <path d="m53 71 5 4 5-4Z" fill="#65534c"/><path d="M58 75v4m-5 0q5 4 10 0" fill="none" stroke="#65534c" stroke-width="1.1" stroke-linecap="round"/>
          <g v-if="type === 'cat'" stroke="#6f7875" stroke-width=".8"><path d="m39 72-16-3m16 7-15 2m51-6 15-3m-15 7 16 2"/></g>
        </g>
      </g>
    </svg>
  </div>
</template>
<script setup lang="ts">
import { computed, useId } from 'vue'
import { PETS, type PetType } from '../../../shared/pets'
const props=withDefaults(defineProps<{type?: PetType; roaming?: boolean; away?: boolean}>(),{type:'cat'})
const uid=`pet-${useId().replace(/:/g,'')}`
const pet=computed(()=>PETS.find(p=>p.id===props.type)||PETS[0]!)
</script>
<style scoped>
.pet-art{width:100px;height:90px;pointer-events:none}.pet-art svg{width:100%;height:100%;overflow:visible}
.pet-breathe{transform-origin:70px 100px;animation:pet-breathe 3.6s ease-in-out infinite}
.pet-tail{transform-origin:99px 82px;animation:tail-sway 2.8s ease-in-out infinite}
.dog .pet-tail,.labrador .pet-tail,.golden .pet-tail{animation-duration:.7s}.pet-eyes{transform-origin:57px 59px;animation:pet-blink 6.8s infinite}
.pet-head{transform-origin:59px 75px;animation:pet-look 9s ease-in-out infinite}
.roaming{animation:pet-wander 26s ease-in-out infinite}.away{opacity:.55}
@keyframes pet-breathe{50%{transform:scaleY(1.025)}}@keyframes tail-sway{50%{transform:rotate(15deg)}}
@keyframes pet-blink{0%,43%,47%,100%{transform:scaleY(1)}45%{transform:scaleY(.08)}}
@keyframes pet-look{0%,30%,70%,100%{transform:rotate(0)}40%,55%{transform:rotate(-7deg)}}
@keyframes pet-wander{0%,12%,100%{transform:translate(0,0)}30%,42%{transform:translate(65px,-15px)}65%,78%{transform:translate(-32px,8px)}}
@media(prefers-reduced-motion:reduce){.pet-art,.pet-art *{animation:none!important}}
</style>
