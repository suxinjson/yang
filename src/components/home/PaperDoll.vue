<template>
  <div class="paper-doll-container" :style="{ width: `${width}px`, height: `${height}px` }">
    <svg :viewBox="`0 0 100 140`" class="doll-svg" xmlns="http://www.w3.org/2000/svg">
      <!-- Shadow under character -->
      <ellipse cx="50" cy="136" rx="28" ry="4" fill="rgba(80, 50, 60, 0.15)" />

      <!-- Layer 0: Body Base (Legs, Torso, Neck, Head, Arms) -->
      <g class="doll-body">
        <!-- Legs -->
        <rect x="42" y="85" width="6" height="38" rx="3" :fill="skinColor" />
        <rect x="52" y="85" width="6" height="38" rx="3" :fill="skinColor" />

        <!-- Torso base -->
        <rect x="38" y="52" width="24" height="38" rx="6" :fill="skinColor" />

        <!-- Neck -->
        <rect x="46" y="44" width="8" height="12" rx="4" :fill="skinColor" />

        <!-- Head -->
        <circle cx="50" cy="34" r="16" :fill="skinColor" />

        <!-- Arms -->
        <rect x="31" y="55" width="6" height="32" rx="3" :fill="skinColor" class="arm-left" />
        <rect x="63" y="55" width="6" height="32" rx="3" :fill="skinColor" class="arm-right" />
      </g>

      <!-- Layer 1: Bottom (Jeans, Skirt, etc.) -->
      <g v-if="equippedBottom" class="doll-bottom">
        <template v-if="equippedBottom.includes('plaid_skirt')">
          <!-- Plaid Skirt -->
          <path d="M 38 78 L 62 78 L 66 98 L 34 98 Z" fill="#8b4255" />
          <path d="M 44 78 L 42 98 M 50 78 L 50 98 M 56 78 L 58 98" stroke="#ffe0e6" stroke-width="1" />
        </template>
        <template v-else>
          <!-- Classic Denim Jeans -->
          <path d="M 38 76 L 62 76 L 62 118 L 52 118 L 50 90 L 48 118 L 38 118 Z" fill="#3b5998" />
          <line x1="50" y1="76" x2="50" y2="88" stroke="#253860" stroke-width="1.5" />
        </template>
      </g>

      <!-- Layer 2: Shoes -->
      <g v-if="equippedShoes" class="doll-shoes">
        <template v-if="equippedShoes.includes('leather')">
          <!-- Brown Leather Shoes -->
          <rect x="39" y="118" width="10" height="7" rx="3" fill="#6d4c41" />
          <rect x="51" y="118" width="10" height="7" rx="3" fill="#6d4c41" />
        </template>
        <template v-else>
          <!-- White Sneakers -->
          <rect x="39" y="118" width="10" height="7" rx="3" fill="#ffffff" stroke="#e0d5d5" stroke-width="0.8" />
          <rect x="51" y="118" width="10" height="7" rx="3" fill="#ffffff" stroke="#e0d5d5" stroke-width="0.8" />
          <circle cx="43" cy="120" r="1.5" fill="#f06292" />
          <circle cx="57" cy="120" r="1.5" fill="#f06292" />
        </template>
      </g>

      <!-- Layer 3: Top (T-shirt, Hoodie, Suit) -->
      <g v-if="equippedTop" class="doll-top">
        <template v-if="equippedTop.includes('pink_hoodie')">
          <!-- Pink Hoodie -->
          <path d="M 34 52 L 66 52 L 64 82 L 36 82 Z" fill="#f48fb1" rx="4" />
          <!-- Hoodie pocket & strings -->
          <rect x="42" y="68" width="16" height="10" rx="3" fill="#ec407a" />
          <line x1="47" y1="52" x2="46" y2="62" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
          <line x1="53" y1="52" x2="54" y2="62" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
          <!-- Sleeves -->
          <rect x="30" y="53" width="8" height="24" rx="4" fill="#f48fb1" />
          <rect x="62" y="53" width="8" height="24" rx="4" fill="#f48fb1" />
        </template>
        <template v-else-if="equippedTop.includes('couple_suit')">
          <!-- Couple Suit -->
          <path d="M 35 50 L 65 50 L 64 84 L 36 84 Z" fill="#37474f" />
          <!-- Inner white collar & tie -->
          <polygon points="46,50 50,60 54,50" fill="#ffffff" />
          <polygon points="49,57 51,57 52,68 50,71 48,68" fill="#e53935" />
          <!-- Sleeves -->
          <rect x="30" y="52" width="8" height="26" rx="3" fill="#37474f" />
          <rect x="62" y="52" width="8" height="26" rx="3" fill="#37474f" />
        </template>
        <template v-else>
          <!-- White Casual T-shirt -->
          <path d="M 36 50 L 64 50 L 63 79 L 37 79 Z" fill="#ffffff" stroke="#e8dede" stroke-width="0.8" />
          <!-- Heart icon on chest -->
          <path d="M 50 63 C 48 59 44 60 44 63 C 44 66 50 70 50 70 C 50 70 56 66 56 63 C 56 60 52 59 50 63 Z" fill="#ff4081" />
          <!-- Sleeves -->
          <rect x="31" y="52" width="7" height="15" rx="3" fill="#ffffff" stroke="#e8dede" stroke-width="0.8" />
          <rect x="62" y="52" width="7" height="15" rx="3" fill="#ffffff" stroke="#e8dede" stroke-width="0.8" />
        </template>
      </g>

      <!-- Layer 4: Face Features (Eyes, Brows, Lips, Blush) -->
      <g class="doll-face">
        <!-- Eyebrows -->
        <path d="M 42 27 Q 45 25 47 27" stroke="#4a3b32" stroke-width="1.2" stroke-linecap="round" fill="none" />
        <path d="M 53 27 Q 55 25 58 27" stroke="#4a3b32" stroke-width="1.2" stroke-linecap="round" fill="none" />

        <!-- Eyes (with blinking animation) -->
        <g class="doll-eyes">
          <ellipse cx="44" cy="32" rx="2" ry="2.5" fill="#2d2424" />
          <circle cx="43.3" cy="31" r="0.8" fill="#ffffff" />
          <ellipse cx="56" cy="32" rx="2" ry="2.5" fill="#2d2424" />
          <circle cx="55.3" cy="31" r="0.8" fill="#ffffff" />
        </g>

        <!-- Blush cheeks -->
        <circle cx="40" cy="36" r="3" fill="#ff80ab" opacity="0.45" />
        <circle cx="60" cy="36" r="3" fill="#ff80ab" opacity="0.45" />

        <!-- Cute Smile -->
        <path d="M 47 38 Q 50 41 53 38" stroke="#d81b60" stroke-width="1.2" stroke-linecap="round" fill="none" />
      </g>

      <!-- Layer 5: Hair -->
      <g v-if="equippedHair" class="doll-hair">
        <template v-if="equippedHair.includes('brown_wavy')">
          <!-- Soft Brown Wavy Hair -->
          <path d="M 33 34 C 33 16 67 16 67 34 C 69 46 72 58 66 68 C 64 64 64 52 63 45 C 60 27 40 27 37 45 C 36 52 36 64 34 68 C 28 58 31 46 33 34 Z" fill="#5d4037" />
          <!-- Bangs -->
          <path d="M 34 30 Q 50 36 66 30 Q 50 20 34 30 Z" fill="#6d4c41" />
        </template>
        <template v-else-if="equippedHair.includes('ponytail')">
          <!-- High Ponytail -->
          <path d="M 34 32 C 34 18 66 18 66 32 C 66 36 60 40 50 35 C 40 40 34 36 34 32 Z" fill="#212121" />
          <!-- Ponytail tail waving to the side -->
          <path d="M 64 24 C 74 16 80 28 72 44 C 68 36 68 30 64 24 Z" fill="#212121" />
          <circle cx="64" cy="24" r="2.5" fill="#e91e63" />
        </template>
        <template v-else>
          <!-- Classic Black Short Hair -->
          <path d="M 33 34 C 33 18 67 18 67 34 C 66 40 64 42 61 40 C 58 28 42 28 39 40 C 36 42 34 40 33 34 Z" fill="#212121" />
          <path d="M 35 32 Q 50 34 65 30 Q 50 22 35 32 Z" fill="#303030" />
        </template>
      </g>

      <!-- Layer 6: Accessories (Glasses, Cat Ears) -->
      <g v-if="equippedAccessory" class="doll-accessory">
        <template v-if="equippedAccessory.includes('glasses')">
          <!-- Gold Wire Glasses -->
          <circle cx="44" cy="32" r="4.5" stroke="#fbc02d" stroke-width="0.9" fill="none" />
          <circle cx="56" cy="32" r="4.5" stroke="#fbc02d" stroke-width="0.9" fill="none" />
          <line x1="48.5" y1="32" x2="51.5" y2="32" stroke="#fbc02d" stroke-width="0.9" />
        </template>
        <template v-else-if="equippedAccessory.includes('cat_ears')">
          <!-- Fluffy Cat Ears Headband -->
          <path d="M 34 26 L 39 12 L 46 22 Z" fill="#f48fb1" stroke="#ad1457" stroke-width="0.8" />
          <polygon points="36,24 39,15 44,21" fill="#ffffff" />
          <path d="M 66 26 L 61 12 L 54 22 Z" fill="#f48fb1" stroke="#ad1457" stroke-width="0.8" />
          <polygon points="64,24 61,15 56,21" fill="#ffffff" />
        </template>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    width?: number
    height?: number
    skin?: string
    equippedSlots?: Record<string, string | null>
    gender?: string
  }>(),
  {
    width: 100,
    height: 140,
    skin: '#ffdbac',
    gender: 'neutral',
    equippedSlots: () => ({})
  }
)

const skinColor = computed(() => props.skin || '#ffdbac')
const equippedHair = computed(() => props.equippedSlots?.hair || 'wardrobe.hair.black_short')
const equippedTop = computed(() => props.equippedSlots?.top || 'wardrobe.top.white_tshirt')
const equippedBottom = computed(() => props.equippedSlots?.bottom || 'wardrobe.bottom.denim_jeans')
const equippedShoes = computed(() => props.equippedSlots?.shoes || 'wardrobe.shoes.sneakers')
const equippedAccessory = computed(() => props.equippedSlots?.accessory || null)
</script>

<style scoped>
.paper-doll-container {
  display: inline-block;
  user-select: none;
  filter: drop-shadow(0 4px 10px rgba(70, 30, 45, 0.12));
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.doll-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.doll-eyes {
  animation: doll-blink 4.2s infinite ease-in-out;
  transform-origin: 50px 32px;
}
@keyframes doll-blink {
  0%, 94%, 100% {
    transform: scaleY(1);
  }
  96% {
    transform: scaleY(0.1);
  }
}
</style>
