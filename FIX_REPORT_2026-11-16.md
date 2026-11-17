# 审查问题修复说明（2026-11-16）

本次修复覆盖审查报告全部 12 项问题，保留此前工作区修改。尚未提交代码或部署生产环境。

| 审查项 | 修复结果 | 主要位置 |
| --- | --- | --- |
| 1. 装扮发物 | 只允许已拥有的目录服饰，校验槽位；保存不赠送物品 | shared/inventory.js |
| 2. 伪造通关 | 本地记录操作，服务端重放初始牌面；付费道具/扩容必须匹配已提交回执且不能复用 | shared/soloProof.js、shared/gameplayServer.js、src/utils/useGame.ts |
| 3. 打工复活 | 同事务删除任务数据库行；持久化任务实例；启动时清理有领奖日志证明的遗留已结算任务 | shared/stateRepository.js、shared/inventory.js |
| 4. 迁移失败继续发布 | 构建后优雅停止旧实例，再备份迁移；任何失败阻止切换并恢复旧镜像 | deploy/deploy-update.sh |
| 5. 默认管理员密码 | 新实例无固定默认密码；未设置 ADMIN_INITIAL_PASSWORD 时禁止登录；初始及新密码至少 12 位 | server.js、compose.yaml、.env.example |
| 6. 寻宝时间丢失 | 完整读写截止时间；无效时间拒绝领奖；缺失时间的旧寻宝状态恢复为完整一小时行程 | shared/stateRepository.js、shared/platformServer.js |
| 7. 重复库存写入 | 版本 3 依据规范库存重建历史重复投影，建立所有目录条目的唯一约束，后续幂等更新 | deploy/schema.sql、shared/stateRepository.js |
| 8. 匿名榜单造假 | 关闭任意成绩写入；由已验证单人/双人结算自动写入，按个人身份去重、聚合；旧未验证记录不参榜 | shared/gameplayServer.js、shared/platformServer.js |
| 9. 家具校验 | 服务器目录决定尺寸/层级；校验库存数量、坐标、旋转、实例编号、边界及地面碰撞；旧账户补齐固定初始家具所有权 | shared/platformServer.js、shared/inventory.js、FurnitureGridEditor.vue |
| 10. 口令与会话 | 随机盐 scrypt、登录/注册来源和账号限速、统一登录错误；成功登录迁移旧哈希并轮换凭证；退出撤销凭证，WebSocket 同样检查撤销 | shared/accountSecurity.js、shared/platformServer.js、shared/gameplayServer.js |
| 11. 退出残留 | 统一清空平台/背包/牌局/房间状态，注册游客后加载新快照；旧请求不能覆盖新身份；不再保存账号明文长期凭证到服务端用户记录 | src/utils/backpack.ts、platformState.ts、playSession.ts、useGame.ts、AuthModal.vue |
| 12. 领奖重试失败 | 先查绑定个人身份的回执，再判断任务；客户端保留待确认 token，页面重新加载时恢复确认 | shared/platformServer.js、src/utils/platformState.ts |

验证全部通过：构建与类型检查、93/93 项 Playwright 测试、6/6 项库存 Node 测试，以及最终部署脚本的 6/6 项回归复测；git diff --check 通过。新增真实 HTTP 负面用例、操作重放验证、丢失响应重试、账号切换延迟响应隔离、旧口令升级、迁移失败回滚和实际 PostgreSQL 17 重启验证。数据库测试也检查旧重复库存修复、迁移锁互斥和规范/投影库存数量稳定。发布工作流已加入构建后的库存与浏览器回归门禁。

升级要求：

- PostgreSQL 必须先完成带备份的版本 3 结构迁移；更新后的部署脚本负责停服、迁移及失败回滚。
- 新部署需要设置至少 12 位的 ADMIN_INITIAL_PASSWORD（Actions 使用同名 Secret）；已有配置中的后台密码继续有效。
- 前后端及 Android 客户端应同步升级。旧版本没有操作记录的进行中单人局转为本地练习，联网重开后才能领取奖励。服务器会拒绝旧客户端直接提交的胜利和任意榜单记录。
- 账号每次登录会轮换当前个人凭证，其他设备的旧凭证会失效；旧密码哈希在成功登录后升级。未进行生产环境数据修改、线上发布、Android Gradle 构建或真机验证。
