<template>
  <div
    class="game-card select-none"
    :class="{
      'is-covered': card.isCovered,
      'is-clickable': !card.isCovered && card.status === 'board',
      'in-slot': card.status === 'slot',
      'in-staged': card.status === 'staged',
      'is-eliminating': isEliminating
    }"
    :style="cardStyle"
    @click="handleClick"
  >
    <!-- 3D Card Edge & Shadow -->
    <div 
      class="card-inner w-full h-full rounded-xl overflow-hidden flex flex-col items-center justify-between p-1 transition-all"
      :style="{
        backgroundColor: def?.bgColor || '#FFFFFF',
        borderColor: def?.borderColor || '#E2E8F0'
      }"
    >
      <!-- Icon or Custom Photo -->
      <div class="card-media-box flex-1 w-full flex items-center justify-center overflow-hidden my-0.5 relative rounded-lg">
        <template v-if="displayImage && !imageFailed">
          <img
            :src="displayImage"
            :alt="def?.name"
            class="w-full h-full object-cover rounded-md pointer-events-none"
            @error="imageFailed = true"
          />
        </template>
        <template v-else>
          <div 
            class="w-full h-full flex items-center justify-center pointer-events-none"
            v-html="def?.defaultIconSvg"
          ></div>
        </template>
      </div>

      <!-- Card Title -->
      <div class="w-full text-center truncate pb-0.5">
        <span class="text-[10px] font-extrabold text-gray-800 tracking-tight leading-none block truncate">
          {{ def?.name || '卡牌' }}
        </span>
      </div>
    </div>

    <!-- Covered Mask (Dark overlay when covered by upper layers) -->
    <div
      v-if="card.isCovered && card.status === 'board'"
      class="covered-mask absolute inset-0 rounded-xl bg-gray-900/45 backdrop-blur-[0.5px] pointer-events-none transition-opacity duration-200"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CardItem, CardDefinition } from '../types/game'
import { sound } from '../utils/sound'
import { resolveAssetUrl } from '../utils/api'

const props = defineProps<{
  card: CardItem
  def?: CardDefinition
  boardWidth?: number
  isEliminating?: boolean
}>()

const emit = defineEmits<{
  (e: 'click-card', card: CardItem): void
}>()

const imageFailed = ref(false)

const displayImage = computed(() => {
  const raw = props.def?.customImage || props.def?.staticImage
  return raw ? resolveAssetUrl(raw) : null
})

// Compute absolute position on the board based on card.x, card.y, and layer
const cardStyle = computed(() => {
  if (props.card.status === 'board') {
    // Standard unit step: 52px width, 60px height
    const unitX = 54
    const unitY = 62
    const left = props.card.x * unitX + 16
    const top = props.card.y * unitY + 16
    const zIndex = props.card.layer * 10 + 1

    return {
      position: 'absolute' as const,
      left: `${left}px`,
      top: `${top}px`,
      width: '56px',
      height: '66px',
      zIndex: zIndex,
      transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
    }
  }

  // Inside Slot or Staged
  return {
    width: '100%',
    maxWidth: '46px',
    height: '56px',
    position: 'relative' as const,
    zIndex: 5,
    transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
  }
})

function handleClick() {
  if (props.card.status !== 'board') return
  if (props.card.isCovered) {
    // Cannot click covered cards
    sound.playClick()
    return
  }
  sound.playClick()
  emit('click-card', props.card)
}
</script>

<style scoped>
.game-card {
  user-select: none;
  touch-action: manipulation;
  cursor: default;
}

.game-card.is-clickable {
  cursor: pointer;
}

.game-card.is-clickable:active {
  transform: scale(0.92);
}

.card-inner {
  border-width: 2px;
  border-style: solid;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -2px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.is-covered .card-inner {
  filter: brightness(0.72) grayscale(0.25);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.is-eliminating {
  animation: eliminate-burst 0.35s forwards ease-in-out;
}

@keyframes eliminate-burst {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3) rotate(8deg);
    opacity: 0.8;
  }
  100% {
    transform: scale(0) rotate(-20deg);
    opacity: 0;
  }
}
</style>
