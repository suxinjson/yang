# 项目全面审查（2026-11-16）

> 修复状态：下文记录的是修复前的发现。12 项问题现已在工作区修复，具体行为、验证及升级要求见 [修复说明](FIX_REPORT_2026-11-16.md)。

## 结论与范围

审查对象为当前工作区（包括既有未提交修改），覆盖 Vue 前端、Express HTTP/WebSocket 服务、库存与奖励逻辑、文件及 PostgreSQL 存储、数据库迁移、Docker/GitHub Actions 部署和测试。发现 12 项需要修复的问题：5 项 P1、7 项 P2。建议先完成 P1 再发布新增平台功能。

未修改业务代码、生产数据或已有审查报告。新增本报告及隔离复现脚本 `artifacts/review-2026-11-16.mjs`。构建更新了本地 dist，测试更新了测试产物。未执行生产部署、外部在线探测、Android Gradle 构建或真机测试；未进行依赖漏洞库扫描，因此本报告不对上述事项作通过判断。

## 验证结果

- `npm run build`：通过（包含 vue-tsc 类型检查）。
- `npm run test:inventory`：4/4 通过，包含真实嵌入式 PostgreSQL 17 的约束、事务、实例锁和重启恢复测试。
- `npx playwright test --reporter=line`：88/88 通过，耗时约 2.3 分钟。
- `node artifacts/review-2026-11-16.mjs`：7 个独立复现均确认问题。脚本使用临时目录与独立 PostgreSQL 数据库，结束时清理临时数据，不连接部署环境。
- Playwright 日志多次出现指向未启动默认后端的 ECONNREFUSED；部分页面测试仍通过，说明当前覆盖不能证明新增平台接口端到端可用。

## P1：优先修复

### 1. 保存装扮可以免费发放任意物品，包含消耗型游戏道具

位置：`shared/inventory.js:264–305`，入口 `shared/platformServer.js:409` 附近的 `/api/home/avatar/save-all`。

`saveAvatarAll` 对未持有或数量为零的 itemId 调用 `grant`，且不检查商品目录、物品分类与装备槽位。个人用户可把 `gang.hint` 放进 top 槽位；耗尽后再保存一次即可重新获得道具，也可创建目录不存在的物品。这绕过商城付款与游戏奖励规则。

独立复现：数量为零的提示卡恢复为 1；未知 `wardrobe.fake.free_item` 被创建，HTTP 200。

建议：装备接口仅允许装备已拥有且数量大于零的服饰；校验目录、服饰分类与 slot 匹配；初始赠送及迁移补偿使用独立的服务端授权路径。

### 2. 单人通关直接信任客户端 outcome，可以不操作就领取奖励

位置：`shared/gameplayServer.js:178–192`。

`/api/play/solo/finish` 只检查 outcome 和初始牌数能否被 3 整除，未验证实际消除过程或最终棋盘。用户开局后立即提交 `won` 即被接受，并执行概率奖励。开局凭证能够证明关卡归属，无法证明完成关卡。

独立复现：开局后没有提交任何消除操作，finish 返回 HTTP 200，关卡按 won 结算。该次随机结果为空奖励，但奖励函数已被调用。

建议：保持本地点击的设计时，在结算请求提交可重放的操作序列，由服务端使用固定初始牌面与规则验证；记录已验证的最终结果并原子结算。不能仅用客户端时长或点击数量代替验证。

### 3. PostgreSQL 未删除已领取打工任务，重启后任务复活

位置：`shared/platformServer.js:286–287`；`shared/stateRepository.js:68–76,156–164`。

领取奖励后内存删除 `idleJobs[profileId]`，但 repository 只对仍存在的任务执行 UPSERT，从不删除数据库旧行，也没有将旧行标记 claimed。重启时又加载 `claimed=false` 的旧行，已领取任务重新出现。换一个 receiptToken 后可再次领取。

独立 PostgreSQL 复现：保存任务、删除任务并保存、关闭并重开 repository，任务仍存在。

建议：将已领取状态持久化或在同一事务删除任务行；领取回执绑定 profileId 与任务实例 ID，并与发奖一起提交。

### 4. 部署在旧实例持锁时执行迁移，并吞掉迁移失败

位置：`deploy/deploy-update.sh:132–140`；`scripts/migrate-database.mjs:24–25`；`shared/stateRepository.js:26–29`。

旧服务整个运行周期持有 advisory lock `(721614,1)`；部署先运行迁移，然后才删除旧容器。因此正常在线升级时迁移必然无法获得同一把锁。脚本的 `|| true` 忽略失败并继续启动新镜像。旧表结构可能继续被使用；健康检查只检查进程响应，不能证明迁移完成。

此项由锁与脚本执行顺序确认；没有触碰生产服务。现有部署测试设置 `DEPLOY_TEST_SCENARIO` 跳过此分支，因此全部通过仍无法发现该问题。

建议：构建成功后停止旧业务实例、备份并迁移、确认成功后启动新实例；迁移失败必须阻止切换，按预定兼容与恢复策略恢复服务。增加包含真实 advisory lock 的升级测试。

### 5. 新部署默认管理员密码固定为 admin

位置：`server.js:46,70,229`。

首次运行缺少配置文件时，服务将固定密码写入配置并直接开放管理登录。登录后可以改全局配置、发券及清空库存券。该风险适用于新部署或配置缺失后的重建；本审查没有推断生产仍使用默认密码。

建议：首次启动从部署密钥读取初始密码，或使用一次性初始化流程；缺少安全初始化条件时拒绝开放管理接口。

## P2：应尽快修复

### 6. 宠物寻宝截止时间未写入和读取 PostgreSQL

位置：`shared/stateRepository.js:58–66,149–152`；`shared/platformServer.js:378–384`。

表中有 `pet_forage_end_at`，repository 的 SELECT 和 UPSERT 均遗漏此列。重启后 petStatus 仍为 foraging，但 `petForageEndAt` 丢失：前端不能显示正常倒计时；领奖接口对 undefined 解析得到 NaN，`Date.now() < NaN` 为 false，从而提前放行奖励。

独立复现：重启前设置一小时后的截止时间，重启后状态为 foraging，截止时间为 null/undefined。

建议：完整持久化并恢复截止时间；领奖前明确验证时间合法、有限且已到期，异常状态不能默认放行。

### 7. 每次档案更新重复插入衣服和家具数据库行

位置：`shared/stateRepository.js:116–124`；`deploy/schema.sql:59–60`。

`player_inventory` 的唯一索引仅覆盖可堆叠分类。保存时却对所有物品执行相同的部分索引 ON CONFLICT；wardrobe/furniture 行不受该索引约束，因此每次 profile revision 变化都会插入新行。一次普通互动就可能重复写入所有服饰，导致数量记录失真和表持续增长。目前主背包读取旧 inventory 表，因此该问题可能暂时不表现在界面。

独立 PostgreSQL 复现：没有新增物品，仅递增 revision 并再次保存，player_inventory 总行数由 7 增至 11。

建议：明确非堆叠物品的实例身份并按实例 UPSERT；如果当前模型仍按目录聚合，则使用 profileId/catalogId 唯一约束。修复前先制定已有重复数据的整理方案。

### 8. 排行榜提交完全匿名，身份和成绩均可伪造

位置：`shared/platformServer.js:670–696`；`src/utils/platformState.ts:279` 附近。

`/api/game/record` 不认证个人身份，允许请求直接指定 username、nickname、level 和 cleared；成绩时间只限制最低 1 秒。可以冒充其他用户提交 1 秒通关记录，并刷满保留列表挤掉真实成绩。

独立复现：没有任何个人凭证提交他人用户名、12 关、1 秒、0 步，HTTP 200。

建议：从认证账户取得身份，由已验证的游戏结算生成榜单；对 roundId/profileId 去重，不向客户端开放任意成绩写入。

### 9. 家具摆放信任客户端尺寸、层级和目录 ID

位置：`shared/platformServer.js:73–125`。

接口不校验所有权、有效目录、正整数坐标及尺寸，且客户端可以把地面家具声明为 rug 绕过碰撞检测。负尺寸可跳过占用格循环；相同 instanceId 的重复家具也被重叠判断放行。

独立复现：未知目录家具、负 w/h、rug 层级均被接受，HTTP 200。

建议：从服务端商品目录派生 footprint/layer，验证实例归属和数量、坐标范围及允许旋转角度，拒绝重复 instanceId 与非有限数值。

### 10. 新用户登录无失败限速，密码使用固定盐快速哈希

位置：`shared/platformServer.js:440–516`。

`/api/auth/login` 没有类似管理员登录的失败限速，用户名存在与不存在使用不同错误，密码最低仅 3 位。密码存储使用 SHA-256(password + 固定字符串)，相同密码得到相同哈希；登录后返回永久 profileSecret，服务端也将其明文放在用户数据中。当前没有登出撤销或轮换该凭证的服务端流程。

建议：增加账号与来源维度的失败限速和统一认证错误，使用每用户随机盐的 scrypt/Argon2id 等口令派生算法；把账号登录会话与长期背包恢复凭证分开，支持失效与轮换。此项为代码检查，没有实施口令猜测。

### 11. 退出账户没有清空平台快照，页面继续展示上一账户资产

位置：`src/utils/backpack.ts:27–37`；`src/components/home/AuthModal.vue:243–250`；`src/components/home/HomeHub.vue:522–525`；`src/utils/platformState.ts:101`。

退出仅删除凭证并清空 personalBackpack，没有清空全局 platformOverview，也不刷新游客 overview。页面仍显示原账户金币、房间及形象；随后漫游生成新身份但未完成注册，会静默失败。若之后触发新身份的局部平台更新，旧快照还可能写入新身份缓存。

建议：身份切换统一清空两个背包状态、房间成员、请求及缓存上下文；注册/恢复新身份后重新加载。异步响应更新前核对发起时的 profileId，避免旧请求覆盖新账户。

### 12. 打工领奖的幂等检查在任务存在检查之后，丢失响应无法重试恢复

位置：`shared/platformServer.js:259–273`。

首次领奖成功会删除当前任务。相同 receiptToken 再次请求，先遇到“没有可领取的打工奖励”并返回 409，永远到不了已存在回执的分支。客户端还在每次点击 claimIdleJob 时生成新 token，进一步削弱重试恢复。网络丢失确认时，玩家收到失败，无法通过原回执确认已到账结果。

建议：先验证认证身份并查找绑定该用户/任务的回执，再检查尚未结算任务；客户端保留同一待确认操作 token，直至获得确定结果。修复任务实例与持久化状态后，同时增加丢失成功响应和重启重试测试。

## 测试与维护建议

1. 将上述独立复现转化为对应的回归断言，优先验证物品所有权、服务器结算、领取回执和 PostgreSQL 重启，不只验证返回成功。
2. 新增平台 HTTP 集成测试：当前 `tests/platformUniverse.spec.ts:125` 的碰撞测试自行计算矩形并断言常量，没有调用实际家具保存接口，因此无法检出输入绕过。
3. GitHub Actions 当前构建后直接发布，未执行库存和 Playwright 测试；应添加必要发布检查，尤其是实际 PostgreSQL 升级/恢复测试。
4. 当前文件与 PostgreSQL 双重模型、旧 inventory 与 player_inventory 双写的语义不同，需明确唯一事实来源、实例/堆叠规则及状态删除规则，避免继续靠增补字段维持一致性。

## 建议修复顺序

先封堵装扮发物和伪造结算，再修复打工/宠物状态与重复库存写入；随后修复迁移顺序及失败处理，再处理榜单、输入验证与账户生命周期。新增默认管理员初始化约束应随下一次部署一起完成。
