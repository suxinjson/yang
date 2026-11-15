<template>
  <div class="iso-furniture-item" :class="catalogId" :style="{ width: `${width}px`, height: `${height}px` }">
    <!-- 1. Modern Bouclé Sofa -->
    <svg v-if="catalogId.includes('sofa')" viewBox="0 0 120 80" class="iso-svg">
      <!-- Shadow on floor -->
      <ellipse cx="60" cy="74" rx="52" ry="6" fill="#3a1e28" opacity="0.14" />
      <!-- Wood feet -->
      <line x1="16" y1="68" x2="14" y2="76" stroke="#5d4037" stroke-width="4" stroke-linecap="round" />
      <line x1="104" y1="68" x2="106" y2="76" stroke="#5d4037" stroke-width="4" stroke-linecap="round" />
      <line x1="35" y1="70" x2="33" y2="77" stroke="#4e342e" stroke-width="3.5" stroke-linecap="round" />
      <line x1="85" y1="70" x2="87" y2="77" stroke="#4e342e" stroke-width="3.5" stroke-linecap="round" />
      <!-- Backrest -->
      <rect x="12" y="16" width="96" height="42" rx="18" fill="#f5ede7" stroke="#e3d4ca" stroke-width="1.2" />
      <path d="M 24 22 Q 60 28 96 22" stroke="#e8dad0" stroke-width="1.5" fill="none" />
      <!-- Left & Right Armrests -->
      <rect x="8" y="28" width="20" height="42" rx="10" fill="#ede1d8" stroke="#dfd0c4" stroke-width="1.2" />
      <rect x="92" y="28" width="20" height="42" rx="10" fill="#ede1d8" stroke="#dfd0c4" stroke-width="1.2" />
      <!-- Plump Seat Cushion -->
      <rect x="22" y="44" width="76" height="26" rx="12" fill="#faf4ef" stroke="#e5d8cd" stroke-width="1.2" />
      <!-- Throw Pillows -->
      <rect x="25" y="32" width="18" height="18" rx="4" transform="rotate(-8 34 41)" fill="#f48fb1" opacity="0.9" />
      <rect x="78" y="32" width="18" height="18" rx="4" transform="rotate(8 87 41)" fill="#80cbc4" opacity="0.9" />
      <!-- Cozy drape blanket -->
      <path d="M 52 46 C 54 58, 56 68, 58 74 L 68 74 C 66 68, 64 58, 63 46 Z" fill="#b0bec5" opacity="0.85" />
    </svg>

    <!-- 2. Retro Arcade Cabinet -->
    <svg v-else-if="catalogId.includes('tv.retro')" viewBox="0 0 90 95" class="iso-svg">
      <ellipse cx="45" cy="90" rx="36" ry="5" fill="#3a1e28" opacity="0.16" />
      <!-- Cabinet Body -->
      <path d="M 18 20 L 72 20 L 75 88 L 15 88 Z" fill="#37474f" />
      <path d="M 22 8 L 68 8 L 72 20 L 18 20 Z" fill="#d81b60" />
      <text x="45" y="16" fill="#ffffff" font-size="7" font-weight="900" text-anchor="middle" letter-spacing="1">GANG ARCADE</text>
      <!-- Glowing Animated Screen -->
      <rect x="22" y="26" width="46" height="34" rx="4" fill="#0d1b2a" stroke="#455a64" stroke-width="2" />
      <!-- Screen Scanlines & Heart preview -->
      <rect x="24" y="28" width="42" height="30" rx="2" fill="#1b2838" />
      <path d="M 45 44 C 41 38, 35 40, 35 44 C 35 48, 45 54, 45 54 C 45 54, 55 48, 55 44 C 55 40, 49 38, 45 44 Z" fill="#ff4081" class="screen-pulse-heart" />
      <!-- Control Panel -->
      <path d="M 14 62 L 76 62 L 75 74 L 15 74 Z" fill="#e91e63" />
      <!-- Joystick & Buttons -->
      <circle cx="28" cy="67" r="3" fill="#ffeb3b" />
      <line x1="28" y1="67" x2="28" y2="72" stroke="#212121" stroke-width="2" />
      <circle cx="48" cy="68" r="2.2" fill="#00e676" />
      <circle cx="56" cy="66" r="2.2" fill="#2979ff" />
      <circle cx="64" cy="68" r="2.2" fill="#ff1744" />
      <!-- Coin door -->
      <rect x="36" y="78" width="18" height="8" rx="1" fill="#263238" />
      <line x1="45" y1="80" x2="45" y2="84" stroke="#fbc02d" stroke-width="1.2" />
    </svg>

    <!-- 3. Scandinavian Work Desk with iMac -->
    <svg v-else-if="catalogId.includes('desk.work')" viewBox="0 0 100 85" class="iso-svg">
      <ellipse cx="50" cy="80" rx="42" ry="5" fill="#3a1e28" opacity="0.14" />
      <!-- Desk Legs -->
      <line x1="14" y1="44" x2="12" y2="80" stroke="#795548" stroke-width="3.5" stroke-linecap="round" />
      <line x1="86" y1="44" x2="88" y2="80" stroke="#795548" stroke-width="3.5" stroke-linecap="round" />
      <line x1="22" y1="45" x2="20" y2="81" stroke="#5d4037" stroke-width="2.5" stroke-linecap="round" />
      <line x1="78" y1="45" x2="80" y2="81" stroke="#5d4037" stroke-width="2.5" stroke-linecap="round" />
      <!-- Desktop Surface -->
      <path d="M 8 40 L 92 40 L 96 46 L 4 46 Z" fill="#d7ccc8" stroke="#bcaaa4" stroke-width="1" />
      <rect x="4" y="46" width="92" height="4" fill="#a1887f" />
      <!-- iMac Display -->
      <rect x="34" y="10" width="32" height="22" rx="2" fill="#eceff1" stroke="#b0bec5" stroke-width="1" />
      <rect x="36" y="12" width="28" height="16" fill="#263238" />
      <!-- Screen Code Lines Glow -->
      <line x1="39" y1="16" x2="52" y2="16" stroke="#80cbc4" stroke-width="1" />
      <line x1="39" y1="20" x2="58" y2="20" stroke="#ffab91" stroke-width="1" />
      <line x1="43" y1="24" x2="54" y2="24" stroke="#ce93d8" stroke-width="1" />
      <!-- Stand -->
      <polygon points="46,32 54,32 56,40 44,40" fill="#cfd8dc" />
      <!-- Slim Keyboard & Mouse -->
      <rect x="38" y="42" width="16" height="3" rx="0.5" fill="#ffffff" />
      <ellipse cx="60" cy="43.5" rx="1.5" ry="1.2" fill="#ffffff" />
      <!-- Desk Lamp (Glowing Warm) -->
      <path d="M 18 42 L 18 25 L 26 22" stroke="#ffb74d" stroke-width="2" fill="none" stroke-linecap="round" />
      <polygon points="24,18 32,24 22,26" fill="#ffa726" />
      <ellipse cx="27" cy="27" rx="6" ry="3" fill="#ffe082" opacity="0.6" />
      <!-- Coffee Mug -->
      <rect x="76" y="41" width="5" height="5" rx="1" fill="#e91e63" />
      <path d="M 81 42 Q 83 43.5 81 45" stroke="#e91e63" stroke-width="0.8" fill="none" />
    </svg>

    <!-- 4. Arched Gold Vanity Mirror -->
    <svg v-else-if="catalogId.includes('mirror.dresser')" viewBox="0 0 70 95" class="iso-svg">
      <ellipse cx="35" cy="90" rx="26" ry="4" fill="#3a1e28" opacity="0.12" />
      <!-- Gold Brass Arch Frame -->
      <path d="M 12 88 L 12 35 C 12 12, 58 12, 58 35 L 58 88 Z" fill="none" stroke="#fbc02d" stroke-width="3.5" />
      <!-- Mirror Glass with reflection sheen -->
      <path d="M 14 88 L 14 36 C 14 15, 56 15, 56 36 L 56 88 Z" fill="#e0f2f1" opacity="0.85" />
      <!-- Reflection Glare Lines -->
      <line x1="22" y1="28" x2="48" y2="70" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.6" />
      <line x1="28" y1="26" x2="36" y2="38" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />
      <!-- Small Vanity Stand Shelf -->
      <rect x="8" y="86" width="54" height="4" rx="2" fill="#d7ccc8" />
      <!-- Perfume bottle & flowers on shelf -->
      <rect x="18" y="80" width="5" height="6" rx="1" fill="#f48fb1" />
      <circle cx="20.5" cy="78" r="1.5" fill="#fbc02d" />
      <ellipse cx="48" cy="83" rx="4" ry="2.5" fill="#80cbc4" />
    </svg>

    <!-- 5. Fluffy Pet Bed with Scratching Tree -->
    <svg v-else-if="catalogId.includes('pet.bed')" viewBox="0 0 95 80" class="iso-svg">
      <ellipse cx="48" cy="74" rx="42" ry="5" fill="#3a1e28" opacity="0.14" />
      <!-- Woven Basket Bed -->
      <ellipse cx="38" cy="62" rx="26" ry="12" fill="#d7ccc8" stroke="#bcaaa4" stroke-width="1.5" />
      <ellipse cx="38" cy="60" rx="24" ry="10" fill="#f8bbd0" />
      <!-- Fluffy Pillow Cushion inside bed -->
      <ellipse cx="38" cy="59" rx="20" ry="8" fill="#ffffff" />
      <path d="M 32 59 Q 38 62 44 59" stroke="#f48fb1" stroke-width="1" fill="none" opacity="0.8" />
      <!-- Sisal Scratching Post with Platform -->
      <rect x="72" y="32" width="7" height="38" fill="#d7ccc8" stroke="#bcaaa4" stroke-width="1" />
      <line x1="72" y1="36" x2="79" y2="38" stroke="#8d6e63" stroke-width="0.8" />
      <line x1="72" y1="44" x2="79" y2="46" stroke="#8d6e63" stroke-width="0.8" />
      <line x1="72" y1="52" x2="79" y2="54" stroke="#8d6e63" stroke-width="0.8" />
      <line x1="72" y1="60" x2="79" y2="62" stroke="#8d6e63" stroke-width="0.8" />
      <!-- Top Perch Platform -->
      <ellipse cx="75" cy="32" rx="12" ry="4" fill="#a1887f" />
      <!-- Hanging Toy Ball -->
      <line x1="70" y1="34" x2="66" y2="42" stroke="#e91e63" stroke-width="0.8" />
      <circle cx="66" cy="44" r="2.5" fill="#ff4081" />
    </svg>

    <!-- 6. Couple Photo Wall Frame -->
    <svg v-else-if="catalogId.includes('frame.couple')" viewBox="0 0 65 75" class="iso-svg">
      <!-- Shadow on wall -->
      <rect x="9" y="9" width="48" height="58" rx="4" fill="#3a1e28" opacity="0.1" />
      <!-- Oak Frame -->
      <rect x="6" y="6" width="52" height="62" rx="3" fill="#8d6e63" stroke="#6d4c41" stroke-width="1.5" />
      <!-- Inner Matte White Border -->
      <rect x="11" y="11" width="42" height="52" fill="#fffdfa" />
      <!-- Photo Area (Couple Silhouette & Heart) -->
      <rect x="14" y="14" width="36" height="46" fill="#fce4ec" />
      <circle cx="27" cy="30" r="5" fill="#ad1457" opacity="0.75" />
      <circle cx="37" cy="30" r="5" fill="#4a148c" opacity="0.75" />
      <path d="M 22 46 C 22 38, 32 38, 32 46 Z" fill="#ad1457" opacity="0.75" />
      <path d="M 32 46 C 32 38, 42 38, 42 46 Z" fill="#4a148c" opacity="0.75" />
      <path d="M 32 23 C 30 20, 26 21, 26 23 C 26 25, 32 29, 32 29 C 32 29, 38 25, 38 23 C 38 21, 34 20, 32 23 Z" fill="#e91e63" />
    </svg>

    <!-- 7. Potted Monstera / Fiddle Fig Houseplant -->
    <svg v-else-if="catalogId.includes('plant.monstera')" viewBox="0 0 70 85" class="iso-svg">
      <ellipse cx="35" cy="80" rx="22" ry="4" fill="#3a1e28" opacity="0.14" />
      <!-- White Ribbed Ceramic Pot -->
      <polygon points="22,54 48,54 44,78 26,78" fill="#ffffff" stroke="#e0e0e0" stroke-width="1" />
      <ellipse cx="35" cy="54" rx="13" ry="3" fill="#5d4037" />
      <!-- Plant Stems & Lush Leaves -->
      <path d="M 35 54 Q 32 35 24 24" stroke="#2e7d32" stroke-width="2.5" fill="none" stroke-linecap="round" />
      <path d="M 35 54 Q 38 32 46 18" stroke="#2e7d32" stroke-width="2.5" fill="none" stroke-linecap="round" />
      <path d="M 35 54 Q 45 42 54 36" stroke="#2e7d32" stroke-width="2" fill="none" stroke-linecap="round" />
      <!-- Big Monstera Leaves with slits -->
      <ellipse cx="22" cy="22" rx="12" ry="8" transform="rotate(-30 22 22)" fill="#388e3c" />
      <ellipse cx="46" cy="16" rx="13" ry="9" transform="rotate(25 46 16)" fill="#4caf50" />
      <ellipse cx="54" cy="36" rx="10" ry="7" transform="rotate(40 54 36)" fill="#2e7d32" />
    </svg>

    <!-- 8. Soft Heart Fleece Rug -->
    <svg v-else-if="catalogId.includes('rug.love')" viewBox="0 0 110 90" class="iso-svg">
      <!-- Soft Ambient Shadow on Floor -->
      <path
        d="M 55 78 C 30 58, 10 40, 10 26 C 10 14, 24 8, 38 14 C 46 18, 55 24, 55 24 C 55 24, 64 18, 72 14 C 86 8, 100 14, 100 26 C 100 40, 80 58, 55 78 Z"
        fill="#3d1d2b"
        opacity="0.12"
        transform="translate(0, 4)"
      />
      <!-- Pastel Blush Fleece Heart Rug -->
      <path
        d="M 55 78 C 30 58, 10 40, 10 26 C 10 14, 24 8, 38 14 C 46 18, 55 24, 55 24 C 55 24, 64 18, 72 14 C 86 8, 100 14, 100 26 C 100 40, 80 58, 55 78 Z"
        fill="#ffebee"
        stroke="#f8bbd0"
        stroke-width="1.8"
      />
      <!-- Cozy Inner Stitch Accent -->
      <path
        d="M 55 72 C 34 54, 16 38, 16 26 C 16 16, 26 12, 38 17 C 46 21, 55 26, 55 26 C 55 26, 64 21, 72 17 C 84 12, 94 16, 94 26 C 94 38, 76 54, 55 72 Z"
        fill="none"
        stroke="#f48fb1"
        stroke-width="1"
        stroke-dasharray="3 3"
        opacity="0.8"
      />
    </svg>

    <!-- Fallback default clean item -->
    <div v-else class="fallback-box">
      <span class="fallback-icon">🛋️</span>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    catalogId: string
    width?: number
    height?: number
  }>(),
  {
    width: 80,
    height: 60
  }
)
</script>

<style scoped>
.iso-furniture-item {
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  filter: drop-shadow(0 4px 10px rgba(60, 20, 35, 0.12));
}
.iso-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.screen-pulse-heart {
  animation: screen-pulse 1.8s infinite ease-in-out;
  transform-origin: 45px 44px;
}
@keyframes screen-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
}
.fallback-box {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 32px;
}
</style>
