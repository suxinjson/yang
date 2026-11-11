<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-gray-950/80 backdrop-blur-md animate-fade-in font-sans">
      
      <!-- 1. Password Verification Screen (If not logged in) -->
      <div
        v-if="!isAuthenticated"
        class="w-full max-w-[320px] bg-white rounded-3xl p-6 shadow-2xl border-4 border-slate-700 text-center relative"
      >
        <button
          class="absolute top-4 right-4 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center text-xs"
          @click="$emit('close')"
        >
          ✕
        </button>

        <div class="text-4xl mb-2 mt-2">
          🔐
        </div>
        <h3 class="text-base font-black text-gray-900 mb-1">
          后台管理身份验证
        </h3>
        <p class="text-[11px] text-gray-500 mb-4">
          请输入独立管理员密码以配置游戏
        </p>

        <div class="space-y-3">
          <input
            type="password"
            v-model="passwordInput"
            placeholder="请输入管理员密码..."
            class="w-full px-3.5 py-2.5 rounded-xl border-2 border-gray-300 text-sm focus:outline-none focus:border-slate-800 text-center tracking-widest font-mono"
            @keyup.enter="handleLogin"
            autofocus
          />

          <p v-if="loginError" class="text-xs text-red-500 font-bold animate-shake">
            {{ loginError }}
          </p>

          <button
            class="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md active:scale-95 transition-all"
            @click="handleLogin"
          >
            解锁后台控制中心 🔓
          </button>
        </div>

        <div class="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
          初始默认密码: <span class="font-mono text-gray-600 font-bold">admin</span>
        </div>
      </div>

      <!-- 2. Full Admin Dashboard (After Login) -->
      <div
        v-else
        class="w-full max-w-[460px] max-h-[92vh] bg-white rounded-3xl p-5 shadow-2xl border-4 border-slate-800 flex flex-col relative text-gray-800"
      >
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <div class="flex items-center gap-2">
            <span class="text-2xl p-1 bg-slate-100 rounded-xl">🛠️</span>
            <div>
              <h3 class="text-base font-black text-gray-900 leading-tight">
                《钢了钢》独立管理后台
              </h3>
              <p class="text-[10px] text-gray-500">
                专属掌控：图片配置 · 奖惩规则 · 任务自由定制
              </p>
            </div>
          </div>
          <button
            class="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center text-xs"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-1 py-2 border-b border-gray-100 text-[11px] font-bold overflow-x-auto">
          <button
            class="px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all"
            :class="activeTab === 'game' ? 'bg-slate-900 text-white shadow-xs' : 'bg-gray-100 text-gray-600'"
            @click="activeTab = 'game'"
          >🎲 关卡与布局</button>
          <button
            class="px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all"
            :class="activeTab === 'photos' ? 'bg-slate-900 text-white shadow-xs' : 'bg-gray-100 text-gray-600'"
            @click="activeTab = 'photos'"
          >
            🎴 卡牌种类与图片 ({{ localCards.length }})
          </button>
          <button
            class="px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all"
            :class="activeTab === 'rules' ? 'bg-slate-900 text-white shadow-xs' : 'bg-gray-100 text-gray-600'"
            @click="activeTab = 'rules'"
          >
            ⚖️ 券名与男女奖惩比例
          </button>
          <button
            class="px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all"
            :class="activeTab === 'gf_tasks' ? 'bg-amber-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600'"
            @click="activeTab = 'gf_tasks'"
          >
            🧦 女方惩罚/任务 ({{ config.girlfriendTasks.length }})
          </button>
          <button
            class="px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all"
            :class="activeTab === 'bf_rewards' ? 'bg-sky-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600'"
            @click="activeTab = 'bf_rewards'"
          >
            🎁 男方买单/特权 ({{ config.boyfriendRewards.length }})
          </button>
          <button
            class="px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-all"
            :class="activeTab === 'security' ? 'bg-red-500 text-white shadow-xs' : 'bg-gray-100 text-gray-600'"
            @click="activeTab = 'security'"
          >
            🔒 密码安全
          </button>
        </div>

        <!-- Tab Content Body -->
        <div class="flex-1 overflow-y-auto py-3 space-y-4 pr-1 text-xs">
          <GameSettingsPanel ref="gamePanel" v-show="activeTab === 'game'" :settings="config.gameSettings" :busy="saveStatus === 'saving'" @save="saveGameSettings" />

          <!-- TAB 1: 卡牌图片与增减全面配置 -->
          <div v-if="activeTab === 'photos'" class="space-y-4">
            
            <!-- 男友自拍切换 (6张精修帅照) -->
            <div class="bg-sky-50/70 p-3 rounded-2xl border border-sky-200">
              <div class="flex items-center justify-between mb-2">
                <span class="font-extrabold text-sky-950 flex items-center gap-1">
                  <span>👦</span>
                  <span>男友帅照切换（共 6 张精修自拍）</span>
                </span>
                <span class="text-[10px] text-sky-700 font-bold bg-sky-200/60 px-2 py-0.5 rounded-full">
                  当前：{{ currentBfText }}
                </span>
              </div>

              <div class="grid grid-cols-4 gap-2">
                <!-- 随机轮播 -->
                <div
                  class="rounded-xl border-2 flex flex-col items-center justify-center p-1 cursor-pointer active:scale-95 transition-all text-center aspect-square"
                  :class="config.bfPhotoIndex === 0 ? 'border-sky-500 bg-sky-200 shadow-sm' : 'border-gray-200 bg-white'"
                  @click="selectBfPhoto(0)"
                >
                  <span class="text-xl">🎲</span>
                  <span class="text-[9px] font-bold mt-1">随机轮播</span>
                </div>

                <!-- 6 张男友照片 -->
                <div
                  v-for="i in 6"
                  :key="'bf-' + i"
                  class="relative rounded-xl border-2 overflow-hidden cursor-pointer active:scale-95 transition-all aspect-square group"
                  :class="config.bfPhotoIndex === i ? 'border-sky-500 ring-2 ring-sky-400 shadow-md' : 'border-gray-200 bg-white'"
                  @click="selectBfPhoto(i)"
                >
                  <img :src="resolveAssetUrl(`/photos/bf_${i}.jpg`)" class="w-full h-full object-cover" />
                  <div class="absolute bottom-0 inset-x-0 bg-gray-950/60 text-white text-[8px] font-bold text-center py-0.5">
                    帅照 {{ i }}
                  </div>
                  <div v-if="config.bfPhotoIndex === i" class="absolute top-1 right-1 bg-sky-500 text-white text-[8px] rounded-full px-1 font-black">
                    ✓
                  </div>
                </div>
              </div>
            </div>

            <!-- 全部卡牌自定义/增减管理 -->
            <div class="bg-gray-50 p-3 rounded-2xl border border-gray-200">
              <div class="flex items-center justify-between mb-2.5">
                <div>
                  <div class="font-extrabold text-gray-900 text-xs flex items-center gap-1.5">
                    <span>🎴</span>
                    <span>全部卡牌配置（增减与修改）</span>
                    <span class="text-[10px] text-rose-600 font-bold bg-rose-100 px-2 py-0.2 rounded-full">
                      当前共 {{ localCards.length }} 种
                    </span>
                  </div>
                  <div class="text-[10px] text-gray-400 mt-0.5">可直接修改卡片名称、上传图片或增减种类</div>
                </div>
                
                <div class="flex items-center gap-1.5">
                  <button
                    class="px-2.5 py-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] shadow-xs active:scale-95 transition-all flex items-center gap-0.5"
                    @click="showAddCardForm = !showAddCardForm"
                  >
                    <span>➕</span>
                    <span>添加卡牌</span>
                  </button>
                  <button
                    class="px-2 py-1 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-[10px] active:scale-95 transition-all"
                    @click="restoreDefaultCards"
                    title="恢复为默认的9种基础卡牌"
                  >
                    恢复默认
                  </button>
                </div>
              </div>

              <!-- 添加新卡片表单 -->
              <div v-if="showAddCardForm" class="bg-white p-3 rounded-xl border border-rose-300 mb-3 space-y-2 shadow-xs">
                <div class="flex items-center justify-between">
                  <span class="font-black text-rose-950 text-xs">✨ 添加新游戏卡牌</span>
                  <button class="text-xs text-gray-400 font-bold" @click="showAddCardForm = false">✕</button>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] font-bold text-gray-600 mb-0.5 block">卡牌名称 *</label>
                    <input
                      type="text"
                      v-model="newCardForm.name"
                      placeholder="如: 亲亲抱抱"
                      class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] font-bold text-gray-600 mb-0.5 block">卡牌描述</label>
                    <input
                      type="text"
                      v-model="newCardForm.desc"
                      placeholder="如: 甜蜜充电"
                      class="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs"
                    />
                  </div>
                </div>

                <!-- 图片上传或表情包 -->
                <div>
                  <label class="text-[10px] font-bold text-gray-600 mb-1 block">卡牌图片或图标</label>
                  <div class="flex items-center gap-2">
                    <div class="w-12 h-12 rounded-lg border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 flex-shrink-0 overflow-hidden">
                      <img v-if="newCardImagePreview" :src="newCardImagePreview" class="w-full h-full object-cover" />
                      <span v-else class="text-2xl">{{ newCardForm.emoji }}</span>
                    </div>
                    <div class="flex-1 space-y-1.5">
                      <div class="flex items-center gap-1.5">
                        <label class="cursor-pointer text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white active:scale-95">
                          <span>上传专属图片</span>
                          <input type="file" accept="image/*" class="hidden" @change="handleNewCardFile" />
                        </label>
                        <span v-if="newCardImagePreview" class="text-[9px] text-emerald-600 font-bold">✓ 已选图片</span>
                      </div>
                      <div class="flex items-center gap-1 flex-wrap">
                        <span class="text-[9px] text-gray-400">或选择Emoji:</span>
                        <button
                          v-for="em in PRESET_EMOJIS"
                          :key="em"
                          type="button"
                          class="text-xs p-0.5 hover:scale-125 transition-transform"
                          @click="newCardForm.emoji = em; newCardImagePreview = ''"
                        >
                          {{ em }}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="pt-1 flex justify-end gap-1.5">
                  <button
                    class="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs"
                    @click="showAddCardForm = false"
                  >
                    取消
                  </button>
                  <button
                    class="px-4 py-1 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-xs"
                    @click="addNewCard"
                  >
                    确认添加
                  </button>
                </div>
              </div>

              <!-- 卡牌列表 -->
              <div class="space-y-2">
                <div
                  v-for="(card, idx) in localCards"
                  :key="card.id"
                  class="flex items-center justify-between p-2 rounded-xl bg-white border border-gray-200 shadow-2xs hover:border-gray-300 transition-all"
                >
                  <div class="flex items-center gap-2 flex-1 min-w-0 pr-2">
                    <div class="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50 flex-shrink-0 relative group">
                      <img
                        v-if="card.customImage || card.staticImage"
                        :src="resolveAssetUrl(card.customImage || card.staticImage)"
                        class="w-full h-full object-cover"
                      />
                      <div v-else class="w-6 h-6 flex items-center justify-center" v-html="card.defaultIconSvg"></div>
                    </div>
                    
                    <div class="flex-1 min-w-0 space-y-0.5">
                      <div class="flex items-center gap-1">
                        <span class="text-[9px] font-black text-gray-400">#{{ idx + 1 }}</span>
                        <input
                          type="text"
                          v-model="card.name"
                          @change="updateCardInfo(card)"
                          placeholder="卡牌名字"
                          class="font-black text-gray-800 text-xs px-1.5 py-0.5 rounded border border-gray-200 hover:border-rose-300 focus:border-rose-400 focus:bg-rose-50/50 w-28 truncate"
                          title="点击可直接修改卡牌名称"
                        />
                      </div>
                      <input
                        type="text"
                        v-model="card.desc"
                        @change="updateCardInfo(card)"
                        placeholder="描述"
                        class="text-[10px] text-gray-400 px-1 py-0.2 rounded border border-transparent hover:border-gray-200 focus:border-gray-300 w-full truncate"
                        title="点击可修改描述"
                      />
                    </div>
                  </div>

                  <div class="flex items-center gap-1 flex-shrink-0">
                    <label class="cursor-pointer text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white active:scale-95 transition-all">
                      <span>换图</span>
                      <input
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="handleCardUpload($event, card.id)"
                      />
                    </label>

                    <button
                      class="text-[10px] font-bold px-1.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 active:scale-95 transition-all"
                      @click="deleteCard(card.id)"
                      title="删除此卡牌"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- TAB 2: 券名配置与男女奖惩比例 -->
          <div v-if="activeTab === 'rules'" class="space-y-4">
            
            <!-- 1. 前端卡券名称统一配置 -->
            <div class="bg-rose-50/90 p-3.5 rounded-2xl border border-rose-200">
              <div class="flex items-center justify-between mb-1">
                <span class="font-extrabold text-rose-950 text-xs flex items-center gap-1.5">
                  <span>🏷️</span>
                  <span>前端卡券展示名称</span>
                </span>
                <span class="text-[10px] text-rose-700 font-bold bg-white px-2 py-0.5 rounded-full border border-rose-200 shadow-2xs">
                  当前展示：🎁 {{ config.couponName || '专属心愿券' }}
                </span>
              </div>
              <p class="text-[10px] text-gray-500 mb-2 leading-relaxed">
                可自由配置所有通关/救场卡券及存折的展示标题（如：专属心愿券、恋爱特权卡、甜蜜互动券等）
              </p>
              <div class="flex items-center gap-1.5">
                <input
                  type="text"
                  v-model="config.couponName"
                  placeholder="如: 专属心愿券"
                  class="flex-1 px-3 py-1.5 rounded-xl border border-rose-300 bg-white text-xs font-bold text-gray-800"
                  @change="handleSave"
                />
                <button
                  class="px-3.5 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs active:scale-95 shadow-xs"
                  @click="handleSave"
                >
                  保存券名
                </button>
              </div>
            </div>

            <!-- 2. 后台区分男女的奖惩比例配置 -->
            <div class="bg-amber-50/80 p-4 rounded-2xl border border-amber-200">
              <div class="flex items-center justify-between mb-2">
                <span class="font-extrabold text-amber-950 flex items-center gap-1.5 text-xs">
                  <span>⚖️</span>
                  <span>男女奖惩抽取比例配置</span>
                </span>
                <div class="flex items-center gap-1 text-[10px] font-black">
                  <span class="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200">女方惩罚 {{ config.gfPenaltyRatio }}%</span>
                  <span class="text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">男方买单 {{ 100 - config.gfPenaltyRatio }}%</span>
                </div>
              </div>

              <!-- 双色比例可视化条 -->
              <div class="w-full h-3 rounded-full overflow-hidden flex bg-gray-200 shadow-inner my-2">
                <div
                  class="bg-gradient-to-r from-rose-400 to-pink-500 h-full transition-all duration-200 flex items-center justify-center text-[8px] text-white font-black"
                  :style="{ width: `${config.gfPenaltyRatio}%` }"
                >
                  <span v-if="config.gfPenaltyRatio >= 15">{{ config.gfPenaltyRatio }}%</span>
                </div>
                <div
                  class="bg-gradient-to-r from-sky-400 to-blue-500 h-full transition-all duration-200 flex items-center justify-center text-[8px] text-white font-black"
                  :style="{ width: `${100 - config.gfPenaltyRatio}%` }"
                >
                  <span v-if="(100 - config.gfPenaltyRatio) >= 15">{{ 100 - config.gfPenaltyRatio }}%</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                v-model.number="config.gfPenaltyRatio"
                @change="handleSave"
                class="w-full accent-amber-500 h-2 bg-amber-200 rounded-lg cursor-pointer my-1.5"
              />

              <div class="flex justify-between items-center text-[10px] text-gray-500 font-bold">
                <span class="text-sky-700">0% (全抽男方特权/买单)</span>
                <span class="text-amber-800">推荐 50% ~ 75% 趣味互动</span>
                <span class="text-rose-700">100% (全抽女方惩罚/干活)</span>
              </div>

              <div class="mt-3 text-[11px] text-amber-900 bg-white/90 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
                💡 <b>后台机制说明</b>：
                <br/>
                每次通关或救场抽卡时，系统后台有 <b>{{ config.gfPenaltyRatio }}%</b> 概率抽取【女方惩罚/任务池】，有 <b>{{ 100 - config.gfPenaltyRatio }}%</b> 概率抽取【男方买单/特权池】。
                <br/>
                <b>✨ 用户端体验保护</b>：在前端用户界面，无论抽中哪项，均统一以自定义券名 <b>「{{ config.couponName || '专属心愿券' }}」</b> 进行甜蜜展示，不向玩家暴露任何惩罚与男女标签！
              </div>
            </div>

            <!-- 3. 救场获得卡券开关 -->
            <div class="bg-sky-50/80 p-4 rounded-2xl border border-sky-200 flex items-center justify-between">
              <div>
                <div class="font-extrabold text-sky-950 text-xs flex items-center gap-1">
                  <span>🦸‍♂️</span>
                  <span>“召唤男友”救场获得卡券开关</span>
                </div>
                <div class="text-[10px] text-sky-800 mt-0.5">
                  开启后，点击召唤男友救场时，会同时抽取一张「{{ config.couponName || '专属心愿券' }}」存入存折
                </div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer ml-3">
                <input
                  type="checkbox"
                  v-model="config.summonCostEnabled"
                  @change="handleSave"
                  class="sr-only peer"
                />
                <div class="w-10 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>

          </div>

          <!-- TAB 3: 女方惩罚/任务清单 (CRUD) -->
          <div v-if="activeTab === 'gf_tasks'" class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-extrabold text-gray-900 text-xs">🧦 女方惩罚/任务池 (可自由修改)</span>
                <div class="text-[10px] text-gray-400">后台抽取倾向：{{ config.gfPenaltyRatio }}% 概率抽中此池</div>
              </div>
              <span class="text-[10px] text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded-full">共 {{ config.girlfriendTasks.length }} 项</span>
            </div>

            <!-- Add Task Form -->
            <div class="bg-amber-50/80 p-3 rounded-2xl border border-amber-200 space-y-2">
              <div class="font-bold text-amber-950 text-[11px]">➕ 添加女方新任务/惩罚</div>
              <div class="grid grid-cols-4 gap-1.5">
                <input
                  type="text"
                  v-model="newGfTask.title"
                  placeholder="任务标题(如:手洗袜子)"
                  class="col-span-3 px-2.5 py-1.5 rounded-xl border border-amber-300 bg-white text-xs"
                />
                <input
                  type="text"
                  v-model="newGfTask.icon"
                  placeholder="图标(如🧦)"
                  class="px-2 py-1.5 rounded-xl border border-amber-300 bg-white text-xs text-center"
                />
              </div>
              <div class="flex gap-1.5">
                <input
                  type="text"
                  v-model="newGfTask.desc"
                  placeholder="详细规则(如:帮对方洗袜子一次并夸奖好香)"
                  class="flex-1 px-2.5 py-1.5 rounded-xl border border-amber-300 bg-white text-xs"
                  @keyup.enter="addGfTask"
                />
                <button
                  class="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs active:scale-95 transition-all shadow-xs"
                  @click="addGfTask"
                >
                  添加
                </button>
              </div>
            </div>

            <!-- Task List -->
            <div class="space-y-2">
              <div
                v-for="(task, idx) in config.girlfriendTasks"
                :key="task.id"
                class="flex items-start justify-between p-2.5 rounded-xl bg-white border border-gray-200 shadow-2xs"
              >
                <div class="flex items-start gap-2 pr-2">
                  <span class="text-xl p-1 bg-amber-50 rounded-lg flex-shrink-0">{{ task.icon }}</span>
                  <div>
                    <div class="font-extrabold text-gray-800 text-xs">{{ idx + 1 }}. {{ task.title }}</div>
                    <div class="text-[11px] text-gray-500 leading-snug mt-0.5">{{ task.desc }}</div>
                  </div>
                </div>
                <button
                  class="text-gray-300 hover:text-red-500 font-bold px-1.5 py-1 text-xs"
                  @click="removeGfTask(idx)"
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <!-- TAB 4: 男方买单/特权清单 (CRUD) -->
          <div v-if="activeTab === 'bf_rewards'" class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-extrabold text-gray-900 text-xs">🎁 男方买单/特权池 (可自由修改)</span>
                <div class="text-[10px] text-gray-400">后台抽取倾向：{{ 100 - config.gfPenaltyRatio }}% 概率抽中此池</div>
              </div>
              <span class="text-[10px] text-sky-600 font-bold bg-sky-100 px-2 py-0.5 rounded-full">共 {{ config.boyfriendRewards.length }} 项</span>
            </div>

            <!-- Add Reward Form -->
            <div class="bg-sky-50/80 p-3 rounded-2xl border border-sky-200 space-y-2">
              <div class="font-bold text-sky-950 text-[11px]">➕ 添加男方新特权/买单</div>
              <div class="grid grid-cols-4 gap-1.5">
                <input
                  type="text"
                  v-model="newBfReward.title"
                  placeholder="奖励名称(如:奶茶券)"
                  class="col-span-3 px-2.5 py-1.5 rounded-xl border border-sky-300 bg-white text-xs"
                />
                <input
                  type="text"
                  v-model="newBfReward.icon"
                  placeholder="图标(如🧋)"
                  class="px-2 py-1.5 rounded-xl border border-sky-300 bg-white text-xs text-center"
                />
              </div>
              <div class="flex gap-1.5">
                <input
                  type="text"
                  v-model="newBfReward.desc"
                  placeholder="特权说明(如:大杯加料，甜蜜畅饮)"
                  class="flex-1 px-2.5 py-1.5 rounded-xl border border-sky-300 bg-white text-xs"
                  @keyup.enter="addBfReward"
                />
                <button
                  class="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs active:scale-95 transition-all shadow-xs"
                  @click="addBfReward"
                >
                  添加
                </button>
              </div>
            </div>

            <!-- Reward List -->
            <div class="space-y-2">
              <div
                v-for="(reward, idx) in config.boyfriendRewards"
                :key="reward.id"
                class="flex items-start justify-between p-2.5 rounded-xl bg-white border border-gray-200 shadow-2xs"
              >
                <div class="flex items-start gap-2 pr-2">
                  <span class="text-xl p-1 bg-sky-50 rounded-lg flex-shrink-0">{{ reward.icon }}</span>
                  <div>
                    <div class="font-extrabold text-gray-800 text-xs">{{ idx + 1 }}. {{ reward.title }}</div>
                    <div class="text-[11px] text-gray-500 leading-snug mt-0.5">{{ reward.desc }}</div>
                  </div>
                </div>
                <button
                  class="text-gray-300 hover:text-red-500 font-bold px-1.5 py-1 text-xs"
                  @click="removeBfReward(idx)"
                  title="删除"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <!-- TAB 5: 密码与安全 -->
          <div v-if="activeTab === 'security'" class="space-y-4">
            <!-- Change Password -->
            <div class="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
              <div class="font-extrabold text-gray-900 text-xs">🔒 修改独立管理员密码</div>
              <div class="space-y-2">
                <input
                  type="password"
                  v-model="newPassword"
                  placeholder="输入新的后台密码..."
                  class="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs"
                />
                <input
                  type="password"
                  v-model="confirmPassword"
                  placeholder="再次确认新密码..."
                  class="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs"
                />
                <button
                  class="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs active:scale-95 transition-all"
                  @click="handleChangePassword"
                >
                  保存新密码
                </button>
                <p v-if="passwordChangeMsg" class="text-xs font-bold text-center" :class="passwordChangeSuccess ? 'text-emerald-600' : 'text-red-500'">
                  {{ passwordChangeMsg }}
                </p>
              </div>
            </div>

            <!-- Clear Coupons Data -->
            <div class="bg-red-50 p-4 rounded-2xl border border-red-200 flex items-center justify-between">
              <div>
                <div class="font-extrabold text-red-900 text-xs">🗑️ 重置所有卡券数据</div>
                <div class="text-[10px] text-red-700">清空当前心愿存折中的所有已获得记录</div>
              </div>
              <button
                class="px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs active:scale-95"
                @click="resetAllCoupons"
              >
                重置存折
              </button>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="pt-3 border-t border-gray-100 flex items-center justify-between">
          <span role="status" class="text-[10px] font-bold flex items-center gap-1 pr-2" :class="saveStatus === 'synced' ? 'text-emerald-600' : 'text-amber-700'">
            <span>{{ saveStatusText }}</span>
          </span>
          <button
            class="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md active:scale-95 transition-all"
            :disabled="saveStatus === 'saving'"
            @click="saveAndClose"
          >
            保存并退出后台
          </button>
        </div>
        <button v-if="saveStatus === 'local'" class="mt-2 text-xs font-bold text-sky-700" @click="isAuthenticated = false">重新登录以同步配置</button>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { AdminConfig, CardDefinition, GameSettings } from '../types/game'
import { loadAdminConfig, saveAdminConfig } from '../utils/adminConfig'
import { saveCoupons } from '../utils/coupons'
import { apiLogin, apiResetCoupons, apiChangePassword, getAdminToken, resolveAssetUrl } from '../utils/api'
import { DEFAULT_CARD_DEFINITIONS } from '../utils/cardThemes'
import GameSettingsPanel from './GameSettingsPanel.vue'

const props = defineProps<{
  cardDefs: CardDefinition[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'config-updated'): void
  (e: 'update-card-image', cardId: string, base64: string): void
  (e: 'reset-card', cardId: string): void
}>()

// Session authentication state
const isAuthenticated = ref<boolean>(Boolean(getAdminToken()))
const passwordInput = ref('')
const loginError = ref('')

// Tabs
const activeTab = ref<'game' | 'photos' | 'rules' | 'gf_tasks' | 'bf_rewards' | 'security'>('game')

// Config
const config = ref<AdminConfig>(loadAdminConfig())
const gamePanel = ref<InstanceType<typeof GameSettingsPanel> | null>(null)
const saveStatus = ref<'idle' | 'saving' | 'synced' | 'local' | 'failed'>('idle')
const saveStatusText = computed(() => ({ idle: '修改后请保存；关卡参数下局应用', saving: '正在保存到服务器…', synced: '已保存并同步到服务器', local: '仅保存在本机，未同步；请检查网络或重新登录', failed: '保存失败，请重试或释放本机存储空间' })[saveStatus.value])
let saveVersion = 0

// Form inputs
const newGfTask = ref({ title: '', desc: '', icon: '🧦' })
const newBfReward = ref({ title: '', desc: '', icon: '🧋' })
const newPassword = ref('')
const confirmPassword = ref('')
const passwordChangeMsg = ref('')
const passwordChangeSuccess = ref(false)

// Card Management State
const localCards = ref<CardDefinition[]>([])
const showAddCardForm = ref(false)
const newCardForm = ref({
  name: '',
  desc: '',
  tag: '甜蜜',
  emoji: '💖',
  image: ''
})
const newCardImagePreview = ref('')
const PRESET_EMOJIS = ['💖', '🌹', '🧋', '🍦', '🎁', '🍫', '🎬', '✈️', '🐱', '🐶', '🍭', '💍']

function initLocalCards() {
  if (config.value.customCards && Array.isArray(config.value.customCards) && config.value.customCards.length >= 3) {
    localCards.value = JSON.parse(JSON.stringify(config.value.customCards))
  } else if (props.cardDefs && props.cardDefs.length > 0) {
    localCards.value = JSON.parse(JSON.stringify(props.cardDefs))
    config.value.customCards = JSON.parse(JSON.stringify(props.cardDefs))
  } else {
    localCards.value = JSON.parse(JSON.stringify(DEFAULT_CARD_DEFINITIONS))
    config.value.customCards = JSON.parse(JSON.stringify(DEFAULT_CARD_DEFINITIONS))
  }
}
initLocalCards()

watch(() => props.cardDefs, (newDefs) => {
  if (!config.value.customCards || config.value.customCards.length === 0) {
    localCards.value = JSON.parse(JSON.stringify(newDefs))
  }
})

function handleNewCardFile(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]
  const reader = new FileReader()
  reader.onload = (e) => {
    const rawUrl = e.target?.result as string
    if (!rawUrl) return
    const img = new Image()
    img.src = rawUrl
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxDim = 240
      let width = img.width
      let height = img.height
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85)
        newCardForm.value.image = compressedBase64
        newCardImagePreview.value = compressedBase64
      }
    }
  }
  reader.readAsDataURL(file)
  target.value = ''
}

function addNewCard() {
  if (!newCardForm.value.name.trim()) {
    alert('请输入卡牌名称！')
    return
  }
  const newId = `card_custom_${Date.now()}`
  const card: CardDefinition = {
    id: newId,
    name: newCardForm.value.name.trim(),
    desc: newCardForm.value.desc.trim() || '恋爱日常',
    tag: newCardForm.value.tag.trim() || '甜蜜',
    bgColor: '#FFF5F7',
    borderColor: '#FDA4AF',
    customImage: newCardForm.value.image || undefined,
    defaultIconSvg: `
      <svg viewBox="0 0 100 100" class="w-full h-full">
        <circle cx="50" cy="50" r="42" fill="#FFE4E6"/>
        <text x="50" y="62" font-size="38" text-anchor="middle">${newCardForm.value.emoji || '💖'}</text>
      </svg>
    `
  }
  localCards.value.push(card)
  config.value.customCards = [...localCards.value]
  handleSave()
  newCardForm.value = { name: '', desc: '', tag: '甜蜜', emoji: '💖', image: '' }
  newCardImagePreview.value = ''
  showAddCardForm.value = false
}

function deleteCard(cardId: string) {
  if (localCards.value.length <= 3) {
    alert('⚠️ 游戏关卡至少需要保留 3 种基础卡牌，无法继续删除哦~')
    return
  }
  const card = localCards.value.find(c => c.id === cardId)
  if (!confirm(`确定要删除卡牌【${card?.name || '此卡牌'}】吗？`)) return

  localCards.value = localCards.value.filter(c => c.id !== cardId)
  config.value.customCards = [...localCards.value]
  handleSave()
}

function updateCardInfo(card: CardDefinition) {
  const target = config.value.customCards?.find(c => c.id === card.id)
  if (target) {
    target.name = card.name
    target.desc = card.desc
  }
  handleSave()
}

function restoreDefaultCards() {
  if (!confirm('确定要恢复默认的 9 种卡牌套组吗？')) return
  config.value.customCards = JSON.parse(JSON.stringify(DEFAULT_CARD_DEFINITIONS))
  handleSave()
  initLocalCards()
}

const currentBfText = computed(() => {
  if (config.value.bfPhotoIndex === 0) return '🎲 随机轮播'
  return `帅照 ${config.value.bfPhotoIndex}`
})

// Authentication
async function handleLogin() {
  const pwd = passwordInput.value
  const success = await apiLogin(pwd)
  if (success) {
    isAuthenticated.value = true
    sessionStorage.setItem('gang_admin_auth', 'true')
    loginError.value = ''
  } else {
    loginError.value = '密码错误，请重新输入！'
    passwordInput.value = ''
  }
}

function selectBfPhoto(index: number) {
  config.value.bfPhotoIndex = index
  handleSave()
}

async function handleSave() {
  const version = ++saveVersion
  saveStatus.value = 'saving'
  const result = await saveAdminConfig(config.value)
  if (version === saveVersion) saveStatus.value = result
  emit('config-updated')
  return result
}

function saveGameSettings(settings: GameSettings) {
  config.value.gameSettings = settings
  handleSave()
}

async function saveAndClose() {
  if (gamePanel.value) config.value.gameSettings = gamePanel.value.prepareSettings()
  const result = await handleSave()
  if (result === 'synced') emit('close')
}

// GF Tasks
function addGfTask() {
  if (!newGfTask.value.title.trim()) return
  config.value.girlfriendTasks.unshift({
    id: `gf_${Date.now()}`,
    title: newGfTask.value.title.trim(),
    desc: newGfTask.value.desc.trim() || newGfTask.value.title.trim(),
    icon: newGfTask.value.icon.trim() || '🧦',
    target: 'girlfriend_pays'
  })
  newGfTask.value = { title: '', desc: '', icon: '🧦' }
  handleSave()
}

function removeGfTask(index: number) {
  config.value.girlfriendTasks.splice(index, 1)
  handleSave()
}

// BF Rewards
function addBfReward() {
  if (!newBfReward.value.title.trim()) return
  config.value.boyfriendRewards.unshift({
    id: `bf_${Date.now()}`,
    title: newBfReward.value.title.trim(),
    desc: newBfReward.value.desc.trim() || newBfReward.value.title.trim(),
    icon: newBfReward.value.icon.trim() || '🧋',
    target: 'boyfriend_pays'
  })
  newBfReward.value = { title: '', desc: '', icon: '🧋' }
  handleSave()
}

function removeBfReward(index: number) {
  config.value.boyfriendRewards.splice(index, 1)
  handleSave()
}

// Password Change
async function handleChangePassword() {
  if (!newPassword.value || newPassword.value.length < 3) {
    passwordChangeMsg.value = '密码长度至少需要 3 位！'
    passwordChangeSuccess.value = false
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordChangeMsg.value = '两次输入的密码不一致！'
    passwordChangeSuccess.value = false
    return
  }
  if (!await apiChangePassword(newPassword.value)) {
    passwordChangeMsg.value = '密码修改失败，请检查网络并重新登录后重试！'
    passwordChangeSuccess.value = false
    return
  }
  passwordChangeMsg.value = '密码修改成功，请牢记！'
  passwordChangeSuccess.value = true
  newPassword.value = ''
  confirmPassword.value = ''
}

async function resetAllCoupons() {
  if (confirm('确认清空当前所有的心愿存折记录吗？')) {
    if (!await apiResetCoupons()) {
      alert('清空失败，请检查网络或重新登录后重试！')
      return
    }
    saveCoupons([])
    emit('config-updated')
    alert('心愿存折已清空！')
  }
}

// Card Upload Handler inside Admin
function handleCardUpload(event: Event, cardId: string) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  const reader = new FileReader()

  reader.onload = (e) => {
    const rawUrl = e.target?.result as string
    if (!rawUrl) return

    const img = new Image()
    img.src = rawUrl
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxDim = 240
      let width = img.width
      let height = img.height

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85)

        // Update in localCards
        const local = localCards.value.find(c => c.id === cardId)
        if (local) {
          local.customImage = compressedBase64
        }
        if (config.value.customCards) {
          const cfgCard = config.value.customCards.find(c => c.id === cardId)
          if (cfgCard) {
            cfgCard.customImage = compressedBase64
          }
        }
        handleSave()
        emit('update-card-image', cardId, compressedBase64)
      }
    }
  }

  reader.readAsDataURL(file)
  target.value = ''
}
</script>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fade-in {
  animation: fade-in 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.25s ease-in-out;
}
</style>
