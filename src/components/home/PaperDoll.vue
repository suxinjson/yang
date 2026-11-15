<template>
  <div
    class="paper-doll-wrapper"
    :style="{ width: `${width}px`, height: `${height}px` }"
    :class="[`pose-${pose}`, `mood-${mood}`]"
  >
    <svg
      :viewBox="viewBox"
      class="doll-vector"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- Skin gradients for ambient shading -->
        <linearGradient :id="`skin-grad-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="skinColor" />
          <stop offset="100%" :stop-color="skinShadow" />
        </linearGradient>

        <linearGradient :id="`neck-shadow-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="skinShadow" />
          <stop offset="100%" :stop-color="skinColor" />
        </linearGradient>

        <!-- Eye Iris Gradient -->
        <linearGradient :id="`iris-grad-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1a151e" />
          <stop offset="45%" :stop-color="eyeColor" />
          <stop offset="100%" :stop-color="eyeColorLight" />
        </linearGradient>

        <!-- Lip Gloss Gradient -->
        <radialGradient :id="`lip-grad-${uid}`" cx="50%" cy="50%" r="50%">
          <stop offset="0%" :stop-color="lipColor" />
          <stop offset="85%" :stop-color="lipColor" stop-opacity="0.85" />
          <stop offset="100%" :stop-color="skinColor" stop-opacity="0" />
        </radialGradient>

        <!-- Hair Gradient -->
        <linearGradient :id="`hair-grad-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="hairHighlight" />
          <stop offset="40%" :stop-color="hairBaseColor" />
          <stop offset="100%" :stop-color="hairShadowColor" />
        </linearGradient>

        <!-- Blush Radial Gradient -->
        <radialGradient :id="`blush-grad-${uid}`" cx="50%" cy="50%" r="50%">
          <stop offset="0%" :stop-color="blushHex" stop-opacity="0.65" />
          <stop offset="100%" :stop-color="skinColor" stop-opacity="0" />
        </radialGradient>

        <!-- Soft Drop Shadow Filter -->
        <filter :id="`doll-shadow-${uid}`" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#4a2233" flood-opacity="0.14" />
        </filter>
      </defs>

      <!-- Character Drop Shadow on Floor -->
      <ellipse
        v-if="pose === 'standing'"
        cx="100"
        cy="282"
        rx="46"
        ry="7"
        fill="#3d1d2b"
        opacity="0.16"
      />
      <ellipse
        v-else
        cx="100"
        cy="245"
        rx="54"
        ry="9"
        fill="#3d1d2b"
        opacity="0.18"
      />

      <!-- ================= LAYER 0: BACK HAIR (Long / Ponytail) ================= -->
      <g v-if="equippedHair.includes('wavy') || equippedHair.includes('ponytail')" class="layer-back-hair">
        <template v-if="equippedHair.includes('ponytail')">
          <!-- Back Ponytail tail -->
          <path
            d="M 124 64 C 150 48, 172 70, 160 115 C 150 145, 128 160, 122 170 C 120 150, 140 120, 138 95 C 136 78, 128 70, 124 64 Z"
            :fill="`url(#hair-grad-${uid})`"
          />
        </template>
        <template v-else-if="equippedHair.includes('wavy')">
          <!-- Flowing Back Hair behind shoulders -->
          <path
            d="M 68 80 C 60 120, 52 165, 60 200 C 64 212, 76 210, 78 195 C 80 165, 84 130, 86 110 L 114 110 C 116 130, 120 165, 122 195 C 124 210, 136 212, 140 200 C 148 165, 140 120, 132 80 Z"
            :fill="`url(#hair-grad-${uid})`"
          />
        </template>
      </g>

      <!-- ================= LAYER 1: BODY BASE (Neck, Torso, Legs) ================= -->
      <!-- Standing Pose Body -->
      <g v-if="pose === 'standing'" class="layer-body">
        <!-- Legs & Calves -->
        <g class="body-legs">
          <!-- Left Leg -->
          <path d="M 85 165 L 85 248 C 85 252, 88 254, 91 254 L 92 254 C 95 254, 97 252, 97 248 L 95 165 Z" :fill="`url(#skin-grad-${uid})`" />
          <!-- Right Leg -->
          <path d="M 105 165 L 103 248 C 103 252, 105 254, 108 254 L 109 254 C 112 254, 115 252, 115 248 L 115 165 Z" :fill="`url(#skin-grad-${uid})`" />
        </g>

        <!-- Torso & Hip -->
        <path
          d="M 76 104 C 76 96, 85 92, 100 92 C 115 92, 124 96, 124 104 L 122 145 C 122 158, 116 168, 100 168 C 84 168, 78 158, 78 145 Z"
          :fill="`url(#skin-grad-${uid})`"
        />

        <!-- Neck & Clavicle -->
        <path d="M 92 78 L 92 95 C 92 98, 95 101, 100 101 C 105 101, 108 98, 108 95 L 108 78 Z" :fill="`url(#neck-shadow-${uid})`" />
        <!-- Clavicle line -->
        <path d="M 88 98 Q 100 102 112 98" stroke="#cca496" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.6" />

        <!-- Arms -->
        <!-- Left Arm -->
        <path d="M 76 96 C 68 110, 64 135, 68 155 C 69 160, 75 160, 76 156 C 77 140, 80 120, 83 105 Z" :fill="`url(#skin-grad-${uid})`" />
        <!-- Right Arm -->
        <path d="M 124 96 C 132 110, 136 135, 132 155 C 131 160, 125 160, 124 156 C 123 140, 120 120, 117 105 Z" :fill="`url(#skin-grad-${uid})`" />
      </g>

      <!-- Sitting Pose Body (for sofa partner) -->
      <g v-else class="layer-body-sitting">
        <!-- Angled Thighs & Lower Legs -->
        <path d="M 80 148 C 80 140, 95 140, 105 140 L 132 175 C 134 180, 130 186, 124 186 L 100 186 C 90 186, 80 165, 80 148 Z" :fill="`url(#skin-grad-${uid})`" />
        <path d="M 120 186 L 122 236 C 122 240, 126 242, 130 242 L 132 242 C 136 242, 138 240, 138 236 L 135 186 Z" :fill="`url(#skin-grad-${uid})`" />

        <!-- Torso & Neck -->
        <path d="M 78 96 C 78 90, 88 88, 100 88 C 112 88, 122 90, 122 96 L 120 148 C 120 156, 114 162, 100 162 C 86 162, 80 156, 80 148 Z" :fill="`url(#skin-grad-${uid})`" />
        <path d="M 93 76 L 93 92 C 93 95, 96 97, 100 97 C 104 97, 107 95, 107 92 L 107 76 Z" :fill="`url(#neck-shadow-${uid})`" />

        <!-- Relaxed Arms resting on lap -->
        <path d="M 78 96 C 72 110, 72 135, 85 145 C 90 148, 96 146, 95 140 C 88 132, 84 116, 84 102 Z" :fill="`url(#skin-grad-${uid})`" />
        <path d="M 122 96 C 128 110, 128 135, 115 145 C 110 148, 104 146, 105 140 C 112 132, 116 116, 116 102 Z" :fill="`url(#skin-grad-${uid})`" />
      </g>

      <!-- ================= LAYER 2: BOTTOM (Pants / Skirt) ================= -->
      <g v-if="equippedBottom" class="layer-bottom">
        <template v-if="equippedBottom.includes('skirt')">
          <!-- Elegant High-Waist Pleated Plaid Skirt -->
          <path d="M 80 132 C 80 130, 88 128, 100 128 C 112 128, 120 130, 120 132 L 128 172 C 128 175, 124 177, 100 177 C 76 177, 72 175, 72 172 Z" fill="#6d3544" />
          <!-- Pleat Lines -->
          <path d="M 86 130 L 82 174 M 94 129 L 92 176 M 100 128 L 100 177 M 106 129 L 108 176 M 114 130 L 118 174" stroke="#ffccd5" stroke-width="1.2" opacity="0.6" />
          <!-- Waistband -->
          <path d="M 80 132 C 86 134, 114 134, 120 132 L 120 127 C 114 129, 86 129, 80 127 Z" fill="#522532" />
        </template>
        <template v-else>
          <!-- Modern Straight-Leg Denim Jeans with shadow and seam -->
          <path
            d="M 78 130 C 86 132, 114 132, 122 130 L 124 165 L 121 248 C 121 252, 113 252, 112 248 L 103 175 L 100 175 L 91 175 L 88 248 C 87 252, 79 252, 79 248 L 76 165 Z"
            fill="#34495e"
          />
          <!-- Denim Highlights & Pocket Stitching -->
          <path d="M 86 135 C 92 137, 108 137, 114 135" stroke="#f39c12" stroke-width="1" fill="none" opacity="0.7" />
          <path d="M 80 136 C 85 146, 92 144, 93 138" stroke="#f39c12" stroke-width="0.8" fill="none" opacity="0.6" />
          <path d="M 120 136 C 115 146, 108 144, 107 138" stroke="#f39c12" stroke-width="0.8" fill="none" opacity="0.6" />
          <!-- Inner leg seam -->
          <line x1="100" y1="148" x2="100" y2="175" stroke="#243342" stroke-width="1.5" />
          <!-- Turn-up cuff -->
          <rect x="78" y="244" width="10" height="4" rx="1" fill="#465c71" />
          <rect x="112" y="244" width="10" height="4" rx="1" fill="#465c71" />
        </template>
      </g>

      <!-- ================= LAYER 3: SHOES ================= -->
      <g v-if="equippedShoes" class="layer-shoes">
        <template v-if="equippedShoes.includes('leather')">
          <!-- Retro Horsebit Loafers -->
          <g class="shoe-left">
            <path d="M 76 248 C 76 246, 88 246, 89 248 L 92 256 C 92 258, 86 260, 77 259 C 75 258, 75 252, 76 248 Z" fill="#4e342e" />
            <rect x="79" y="250" width="8" height="2" rx="0.5" fill="#fbc02d" />
            <path d="M 75 257 L 91 257 L 91 260 L 75 260 Z" fill="#2d1d19" />
          </g>
          <g class="shoe-right">
            <path d="M 124 248 C 124 246, 112 246, 111 248 L 108 256 C 108 258, 114 260, 123 259 C 125 258, 125 252, 124 248 Z" fill="#4e342e" />
            <rect x="113" y="250" width="8" height="2" rx="0.5" fill="#fbc02d" />
            <path d="M 125 257 L 109 257 L 109 260 L 125 260 Z" fill="#2d1d19" />
          </g>
        </template>
        <template v-else>
          <!-- Modern Aesthetic Platform Sneakers -->
          <g class="sneaker-left">
            <path d="M 77 247 C 77 245, 89 245, 90 247 L 93 255 C 93 257, 85 260, 75 259 C 74 257, 75 252, 77 247 Z" fill="#ffffff" stroke="#e0e0e0" stroke-width="0.8" />
            <path d="M 74 256 C 82 256, 92 256, 93 256 C 94 259, 93 262, 74 262 C 73 260, 73 258, 74 256 Z" fill="#f5f5f5" stroke="#d6d6d6" stroke-width="0.8" />
            <circle cx="83" cy="251" r="2" fill="#ec407a" />
          </g>
          <g class="sneaker-right">
            <path d="M 123 247 C 123 245, 111 245, 110 247 L 107 255 C 107 257, 115 260, 125 259 C 126 257, 125 252, 123 247 Z" fill="#ffffff" stroke="#e0e0e0" stroke-width="0.8" />
            <path d="M 126 256 C 118 256, 108 256, 107 256 C 106 259, 107 262, 126 262 C 127 260, 127 258, 126 256 Z" fill="#f5f5f5" stroke="#d6d6d6" stroke-width="0.8" />
            <circle cx="117" cy="251" r="2" fill="#ec407a" />
          </g>
        </template>
      </g>

      <!-- ================= LAYER 4: TOP (Outfit) ================= -->
      <g v-if="equippedTop" class="layer-top">
        <template v-if="equippedTop.includes('pink_hoodie')">
          <!-- Oversized Cozy Pastel Hoodie -->
          <path
            d="M 70 102 C 70 94, 82 92, 100 92 C 118 92, 130 94, 130 102 L 128 144 C 128 147, 120 148, 100 148 C 80 148, 72 147, 72 144 Z"
            fill="#f48fb1"
          />
          <!-- Hoodie Collar / Hood folds -->
          <path d="M 88 94 C 88 104, 100 106, 100 106 C 100 106, 112 104, 112 94 C 106 98, 94 98, 88 94 Z" fill="#ec407a" />
          <!-- Drawstrings with metal tips -->
          <line x1="94" y1="102" x2="93" y2="120" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" />
          <circle cx="93" cy="121" r="1.5" fill="#f8bbd0" />
          <line x1="106" y1="102" x2="107" y2="120" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" />
          <circle cx="107" cy="121" r="1.5" fill="#f8bbd0" />
          <!-- Kangaroo Front Pocket -->
          <path d="M 86 126 L 114 126 L 118 142 L 82 142 Z" fill="#f06292" rx="3" />
          <!-- Dropped Sleeves -->
          <path d="M 70 102 C 60 114, 58 132, 62 145 C 64 148, 69 148, 71 144 C 74 132, 75 118, 78 106 Z" fill="#f48fb1" />
          <path d="M 130 102 C 140 114, 142 132, 138 145 C 136 148, 131 148, 129 144 C 126 132, 125 118, 122 106 Z" fill="#f48fb1" />
        </template>
        <template v-else-if="equippedTop.includes('couple_suit')">
          <!-- Tailored Chic Modern Blazer -->
          <path d="M 72 100 C 72 94, 84 92, 100 92 C 116 92, 128 94, 128 100 L 126 148 L 74 148 Z" fill="#2c3e50" />
          <!-- Inner Crisp White Shirt & V-Neck -->
          <polygon points="92,94 100,115 108,94" fill="#ffffff" />
          <!-- Lapels -->
          <polygon points="76,96 92,94 100,126 94,128 78,108" fill="#34495e" />
          <polygon points="124,96 108,94 100,126 106,128 122,108" fill="#34495e" />
          <!-- Gold Blazer Button -->
          <circle cx="100" cy="134" r="2" fill="#f1c40f" />
          <!-- Sleeves -->
          <path d="M 72 100 C 65 112, 64 135, 66 150 C 68 153, 73 153, 74 148 C 76 135, 78 120, 80 106 Z" fill="#2c3e50" />
          <path d="M 128 100 C 135 112, 136 135, 134 150 C 132 153, 127 153, 126 148 C 124 135, 122 120, 120 106 Z" fill="#2c3e50" />
        </template>
        <template v-else>
          <!-- Chic Relaxed Drop-Shoulder White Tee with fine collar -->
          <path
            d="M 74 100 C 74 94, 85 92, 100 92 C 115 92, 126 94, 126 100 L 123 138 C 123 140, 115 142, 100 142 C 85 142, 77 140, 77 138 Z"
            fill="#ffffff"
            stroke="#f0e6e8"
            stroke-width="0.8"
          />
          <!-- Fine Ribbed Crewneck -->
          <path d="M 92 94 C 92 100, 108 100, 108 94 C 105 97, 95 97, 92 94 Z" fill="#fafafa" stroke="#e0d4d7" stroke-width="0.8" />
          <!-- Subtle Embroidered Heart -->
          <path d="M 87 110 C 85 107, 82 108, 82 110 C 82 113, 87 116, 87 116 C 87 116, 92 113, 92 110 C 92 108, 89 107, 87 110 Z" fill="#ff4081" />
          <!-- Short Sleeves -->
          <path d="M 74 100 C 67 106, 66 116, 68 124 C 71 126, 75 125, 77 121 C 78 114, 79 108, 80 102 Z" fill="#ffffff" stroke="#f0e6e8" stroke-width="0.8" />
          <path d="M 126 100 C 133 106, 134 116, 132 124 C 129 126, 125 125, 123 121 C 122 114, 121 108, 120 102 Z" fill="#ffffff" stroke="#f0e6e8" stroke-width="0.8" />
        </template>
      </g>

      <!-- ================= LAYER 5: HEAD & FACE ================= -->
      <g class="layer-head" :filter="`url(#doll-shadow-${uid})`">
        <!-- Delicate Jawline & Face Shape -->
        <path
          d="M 76 48 C 74 24, 126 24, 124 48 C 124 64, 118 78, 100 84 C 82 78, 76 64, 76 48 Z"
          :fill="`url(#skin-grad-${uid})`"
        />

        <!-- Ears with soft shading & optional pearl earring -->
        <path d="M 75 48 C 72 48, 72 58, 75 60 Z" :fill="skinColor" />
        <path d="M 125 48 C 128 48, 128 58, 125 60 Z" :fill="skinColor" />
        <circle cx="75" cy="58" r="1.5" fill="#fff" opacity="0.9" />
        <circle cx="125" cy="58" r="1.5" fill="#fff" opacity="0.9" />

        <!-- Cheek Blush (Soft Radiant Gradients) -->
        <circle cx="86" cy="58" r="10" :fill="`url(#blush-grad-${uid})`" />
        <circle cx="114" cy="58" r="10" :fill="`url(#blush-grad-${uid})`" />

        <!-- Delicate Anime Eyebrows -->
        <g class="doll-eyebrows">
          <path d="M 83 41 C 88 38, 93 39, 95 41" stroke="#3e2723" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.85" />
          <path d="M 105 41 C 107 39, 112 38, 117 41" stroke="#3e2723" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.85" />
        </g>

        <!-- Expressive Anime Eyes (with natural blink cycle) -->
        <g class="doll-eyes-group">
          <!-- Left Eye -->
          <g class="eye-left">
            <!-- Sclera -->
            <path d="M 83 48 C 85 45, 93 45, 95 48 C 93 52, 85 52, 83 48 Z" fill="#ffffff" />
            <!-- Iris with gradient & pupil -->
            <ellipse cx="89" cy="48.5" rx="4.2" ry="4.5" :fill="`url(#iris-grad-${uid})`" />
            <circle cx="89" cy="48.5" r="2.2" fill="#0d0b0f" />
            <!-- Starry Catchlights / Reflections -->
            <circle cx="87.5" cy="46.8" r="1.5" fill="#ffffff" />
            <circle cx="90.5" cy="50.2" r="0.8" fill="#ffffff" opacity="0.8" />
            <!-- Eyelash Line & Winged Tip -->
            <path d="M 81 48.5 C 84 44.5, 93 44.5, 96 47.5" stroke="#212121" stroke-width="1.8" stroke-linecap="round" fill="none" />
            <!-- Aegyo-Sal Shadow under eye -->
            <path d="M 85 52.8 Q 89 54.2 93 52.8" stroke="#cca496" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.5" />
          </g>

          <!-- Right Eye -->
          <g class="eye-right">
            <!-- Sclera -->
            <path d="M 105 48 C 107 45, 115 45, 117 48 C 115 52, 107 52, 105 48 Z" fill="#ffffff" />
            <!-- Iris with gradient & pupil -->
            <ellipse cx="111" cy="48.5" rx="4.2" ry="4.5" :fill="`url(#iris-grad-${uid})`" />
            <circle cx="111" cy="48.5" r="2.2" fill="#0d0b0f" />
            <!-- Starry Catchlights / Reflections -->
            <circle cx="109.5" cy="46.8" r="1.5" fill="#ffffff" />
            <circle cx="112.5" cy="50.2" r="0.8" fill="#ffffff" opacity="0.8" />
            <!-- Eyelash Line & Winged Tip -->
            <path d="M 104 47.5 C 107 44.5, 116 44.5, 119 48.5" stroke="#212121" stroke-width="1.8" stroke-linecap="round" fill="none" />
            <!-- Aegyo-Sal Shadow under eye -->
            <path d="M 107 52.8 Q 111 54.2 115 52.8" stroke="#cca496" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.5" />
          </g>
        </g>

        <!-- Minimalist Dainty Nose -->
        <path d="M 100 52 L 99 56 C 99 57.5, 101 57.5, 101 56" stroke="#c09384" stroke-width="1" stroke-linecap="round" fill="none" opacity="0.75" />

        <!-- Plump Gradient Lips with Gloss Highlight -->
        <g class="doll-lips">
          <!-- Lip Color Base -->
          <ellipse cx="100" cy="67" rx="6" ry="3.5" :fill="`url(#lip-grad-${uid})`" />
          <!-- Smile Crease Line -->
          <path d="M 96 66.5 Q 100 68 104 66.5" stroke="#a3324f" stroke-width="1.1" stroke-linecap="round" fill="none" />
          <!-- Gloss highlight -->
          <ellipse cx="100" cy="68.2" rx="2.5" ry="0.8" fill="#ffffff" opacity="0.7" />
        </g>

        <!-- Optional Beauty Mark (Mole under left eye) -->
        <circle cx="85" cy="54.5" r="0.7" fill="#4a3728" opacity="0.85" />
      </g>

      <!-- ================= LAYER 6: FRONT HAIR ================= -->
      <g v-if="equippedHair" class="layer-front-hair">
        <template v-if="equippedHair.includes('wavy')">
          <!-- Elegant Long Soft Waves with Face-framing Strands -->
          <path
            d="M 72 46 C 72 16, 128 16, 128 46 C 132 60, 134 85, 128 115 C 124 135, 118 160, 124 178 C 120 178, 116 150, 118 128 C 120 100, 124 64, 112 44 C 104 46, 96 46, 88 44 C 76 64, 80 100, 82 128 C 84 150, 80 178, 76 178 C 82 160, 76 135, 72 115 C 66 85, 68 60, 72 46 Z"
            :fill="`url(#hair-grad-${uid})`"
          />
          <!-- Airy Bangs & Hair Gloss Ribbon -->
          <path d="M 78 38 Q 100 48 122 38 Q 100 24 78 38 Z" :fill="hairBaseColor" />
          <path d="M 85 30 Q 100 35 115 30" stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.35" />
        </template>
        <template v-else-if="equippedHair.includes('ponytail')">
          <!-- Sleek High Ponytail Front Crown -->
          <path
            d="M 74 44 C 74 18, 126 18, 126 44 C 126 52, 118 56, 100 50 C 82 56, 74 52, 74 44 Z"
            :fill="`url(#hair-grad-${uid})`"
          />
          <!-- Hair Scrunchie -->
          <circle cx="124" cy="62" r="5" fill="#e91e63" />
          <circle cx="124" cy="62" r="3" fill="#f48fb1" />
          <!-- Hair Gloss Highlight -->
          <path d="M 86 28 Q 100 32 114 28" stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.4" />
        </template>
        <template v-else>
          <!-- Modern Korean Curtain Bangs & Layered Cut -->
          <path
            d="M 73 44 C 73 18, 127 18, 127 44 C 125 54, 120 58, 114 52 C 108 38, 92 38, 86 52 C 80 58, 75 54, 73 44 Z"
            :fill="`url(#hair-grad-${uid})`"
          />
          <path d="M 77 42 Q 100 46 123 42" stroke="none" fill="none" />
          <!-- Gloss Ribbon -->
          <path d="M 84 28 Q 100 32 116 28" stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.35" />
        </template>
      </g>

      <!-- ================= LAYER 7: ACCESSORIES ================= -->
      <g v-if="equippedAccessory" class="layer-accessory">
        <template v-if="equippedAccessory.includes('glasses')">
          <!-- Chic Thin Gold Wire Glasses -->
          <circle cx="89" cy="48.5" r="7" stroke="#e6b800" stroke-width="1.3" fill="none" opacity="0.9" />
          <circle cx="111" cy="48.5" r="7" stroke="#e6b800" stroke-width="1.3" fill="none" opacity="0.9" />
          <line x1="96" y1="48" x2="104" y2="48" stroke="#e6b800" stroke-width="1.3" />
          <!-- Glass lens reflection -->
          <line x1="91" y1="44" x2="94" y2="47" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.7" />
          <line x1="113" y1="44" x2="116" y2="47" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.7" />
        </template>
        <template v-else-if="equippedAccessory.includes('cat_ears')">
          <!-- Plush Velvet Cat Ears Headband -->
          <path d="M 74 32 L 80 12 L 91 26 Z" fill="#f06292" stroke="#ad1457" stroke-width="1" />
          <polygon points="76,30 81,16 88,25" fill="#ffebee" />
          <path d="M 126 32 L 120 12 L 109 26 Z" fill="#f06292" stroke="#ad1457" stroke-width="1" />
          <polygon points="124,30 119,16 112,25" fill="#ffebee" />
          <path d="M 78 30 C 88 24, 112 24, 122 30" stroke="#ad1457" stroke-width="1.8" fill="none" stroke-linecap="round" />
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
    pose?: 'standing' | 'sitting'
    mood?: 'happy' | 'gentle' | 'wink'
    eyeColor?: string
    hairColor?: string
    lipColor?: string
  }>(),
  {
    width: 120,
    height: 180,
    skin: '#ffdbac',
    gender: 'neutral',
    pose: 'standing',
    mood: 'happy',
    eyeColor: '#4e342e',
    hairColor: '#2b2320',
    lipColor: '#e57373',
    equippedSlots: () => ({})
  }
)

const uid = Math.random().toString(36).slice(2, 8)
const viewBox = computed(() => '0 0 200 300')

// Skin Tone & Shadow
const skinColor = computed(() => props.skin || '#ffdbac')
const skinShadow = computed(() => {
  const map: Record<string, string> = {
    '#ffdbac': '#e8bd95',
    '#f1c27d': '#d49d5c',
    '#e0ac69': '#bf884d',
    '#c68642': '#a4652a',
    '#ffd1dc': '#e8a9b8'
  }
  return map[skinColor.value] || '#e8bd95'
})

// Eye Colors
const eyeColor = computed(() => props.eyeColor || '#4e342e')
const eyeColorLight = computed(() => {
  if (eyeColor.value === '#3a506b') return '#64dfdf'
  if (eyeColor.value === '#4a7c59') return '#a7c957'
  if (eyeColor.value === '#7b2cbf') return '#c77dff'
  return '#8d6e63'
})

// Lip & Blush
const lipColor = computed(() => props.lipColor || '#e57373')
const blushHex = computed(() => '#ff4081')

// Hair Colors & Shading
const hairBaseColor = computed(() => props.hairColor || '#2b2320')
const hairHighlight = computed(() => {
  if (hairBaseColor.value === '#2b2320') return '#4a3b32'
  if (hairBaseColor.value === '#5d4037') return '#8d6e63'
  return '#6d4c41'
})
const hairShadowColor = computed(() => {
  if (hairBaseColor.value === '#2b2320') return '#15100e'
  return '#3e2723'
})

// Equipped Slots
const equippedHair = computed(() => props.equippedSlots?.hair || 'wardrobe.hair.black_short')
const equippedTop = computed(() => props.equippedSlots?.top || 'wardrobe.top.white_tshirt')
const equippedBottom = computed(() => props.equippedSlots?.bottom || 'wardrobe.bottom.denim_jeans')
const equippedShoes = computed(() => props.equippedSlots?.shoes || 'wardrobe.shoes.sneakers')
const equippedAccessory = computed(() => props.equippedSlots?.accessory || null)
</script>

<style scoped>
.paper-doll-wrapper {
  display: inline-block;
  user-select: none;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.doll-vector {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.doll-eyes-group {
  animation: natural-blink 4.5s infinite ease-in-out;
  transform-origin: 100px 48px;
}
@keyframes natural-blink {
  0%, 94%, 100% {
    transform: scaleY(1);
  }
  96% {
    transform: scaleY(0.08);
  }
}
</style>
