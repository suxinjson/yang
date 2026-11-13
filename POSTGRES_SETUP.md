# PostgreSQL 17 接入与迁移

使用已有 db 容器和已有 Docker 外部网络，不新增数据库容器、不使用 member 库、不开放公网 5432。

## 1. 先创建独立库和业务账号

在原数据库的管理控制台，由具备创建角色/数据库权限的运维账号执行。密码由运维生成，示例占位符不可用于正式服务：

~~~sql
CREATE USER ganglegang_app WITH PASSWORD '<独立生成的长随机密码>';
CREATE DATABASE ganglegang OWNER ganglegang_app;
~~~

应用只能使用 ganglegang_app，禁止使用 member、member_app 或 postgres。不会向 member 写表。已有持久化卷 database 保持不变。

## 2. 配置应用

将 .env.example 复制为 .env，并填写真实的外部网络名和专用密码。该文件不提交 Git。compose.yaml 设置 STORAGE_DRIVER=postgres、PGHOST=db、PGPORT=5432；连接池最多 5 个连接。不要填入现有会员业务账号。

在 Docker 之外开发时默认使用 JSON 文件适配器；如需直连本机数据库，只映射已有 db 的 127.0.0.1:5432:5432，禁止 0.0.0.0:5432。没有数据库配置时不会尝试连接现有 member 库；配置了 PostgreSQL 但连接失败时停止启动，不悄悄回退 JSON。

## 3. 备份后迁移

本轮只交付源码。准备好新版镜像后，先停止游戏服务：

~~~sh
docker compose stop ganglegang
docker compose run --rm --no-deps ganglegang npm run db:migrate
docker compose up -d ganglegang
~~~

迁移命令先用 PostgreSQL 17 的 pg_dump -Fc 备份独立游戏库到 data/backups，备份成功后才执行 deploy/schema.sql。任何备份错误都会停止结构迁移。镜像含 PostgreSQL 17 客户端；本机运行需要 pg_dump 在 PATH 或通过 PG_DUMP_BIN 指定。数据库结构不会在服务启动时自动升级。

首次启动 PostgreSQL 模式，将现有 data/coupon-ledger.json 或更早的 coupons.json 导入新库，同时保留原 JSON 文件。旧券保持无 ownerId 的共享归属；已有个人身份和库存一并迁移。首次导入完成后 PostgreSQL 为资产唯一来源，编辑旧 JSON 不会改变线上背包。

若运行在 Windows PowerShell，需要先设置 PGHOST、PGPORT、PGDATABASE、PGUSER、PGPASSWORD 环境变量，再执行 npm run db:migrate；密码不要写入命令参数或提交文件。

## 4. 备份、回退与资源限制

- 严禁 docker compose down -v。不要删除或重新初始化现有 database 卷。
- 迁移前另备份 data/config.json、data/photos 和旧账本。数据库备份只包含游戏库，不触碰会员库。
- 生产定时备份同样使用 pg_dump -Fc，以专用账号连接 ganglegang；保留离机副本，并定期验证恢复。
- 只运行一个游戏实例；数据库锁会拒绝第二个写入实例。现有 db 资源上限 512 MB / 1 CPU / 128 PIDs，连接池上限为 5，包含协调器的常驻连接。
- PostgreSQL 上线后不要改回文件模式继续发奖，那会形成两套不一致的资产。出现故障先停游戏写入，修复数据库或由运维恢复游戏库及配套 data 备份。
- 恢复使用 pg_restore，目标必须是独立游戏库；涉及清理现有对象时先审查目标库及备份，不向 member 库执行恢复。

