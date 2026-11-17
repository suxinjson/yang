#!/usr/bin/env bash
set -euo pipefail

# 载入生产 .env 文件（如果存在）
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
STORAGE_DRIVER=${STORAGE_DRIVER:-postgres}

echo ">>> [1/2] 重新构建并平滑启动 Docker 服务..."
if docker compose version >/dev/null 2>&1; then
  DOCKER_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_CMD=(docker-compose)
else
  echo "❌ 错误：服务器上未安装 Docker Compose！"
  echo "请先在服务器上安装 Docker 与 Docker Compose 插件。"
  exit 1
fi

# 在生产环境中确保数据库外部网络就绪与已有 db 容器接入
if [ -z "${DEPLOY_TEST_SCENARIO:-}" ]; then
  # 自动定位宿主机上的数据库容器名称（如 member-db-1, member_db_1, db 等）
  DB_CONTAINER=""
  if docker inspect db >/dev/null 2>&1; then
    DB_CONTAINER="db"
  elif docker inspect member-db-1 >/dev/null 2>&1; then
    DB_CONTAINER="member-db-1"
  elif docker inspect member_db_1 >/dev/null 2>&1; then
    DB_CONTAINER="member_db_1"
  else
    DB_CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E '(^|[-_])(db|postgres)([-_]|$)' | head -n1 || true)
  fi

  # 自动检测数据库容器所属网络
  DETECTED_NET=""
  if [ -n "$DB_CONTAINER" ]; then
    DETECTED_NET=$(docker inspect "$DB_CONTAINER" --format '{{range $k, $v := .NetworkSettings.Networks}}{{if ne $k "bridge"}}{{$k}} {{end}}{{end}}' 2>/dev/null | awk '{print $1}' || true)
  fi
  DB_NET="${GANG_DATABASE_NETWORK:-${DETECTED_NET:-member_private}}"
  export GANG_DATABASE_NETWORK="$DB_NET"

  if ! docker network inspect "$DB_NET" >/dev/null 2>&1; then
    docker network create "$DB_NET" 2>/dev/null || true
  fi
  if [ -n "$DB_CONTAINER" ]; then
    docker network connect "$DB_NET" "$DB_CONTAINER" 2>/dev/null || true
  fi

  # 自动检测并确保 PostgreSQL 独立业务账号与数据库存在并同步密码
  if [ -n "${GANG_DATABASE_PASSWORD:-}" ] && [ -n "$DB_CONTAINER" ]; then
    DB_USER="${GANG_DATABASE_USER:-ganglegang_app}"
    DB_NAME="${GANG_DATABASE_NAME:-ganglegang}"

    echo ">>> 定位到数据库容器: $DB_CONTAINER，正在同步数据库用户 $DB_USER..."

    # 自动提取容器内的超级用户账号、初始数据库与密码
    ADMIN_USER=$(docker inspect "$DB_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep '^POSTGRES_USER=' | head -n1 | cut -d= -f2- || true)
    ADMIN_USER="${ADMIN_USER:-postgres}"

    ADMIN_DB=$(docker inspect "$DB_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep '^POSTGRES_DB=' | head -n1 | cut -d= -f2- || true)
    ADMIN_DB="${ADMIN_DB:-template1}"

    ROOT_PASS="${POSTGRES_PASSWORD:-$(docker inspect "$DB_CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | grep '^POSTGRES_PASSWORD=' | head -n1 | cut -d= -f2- || true)}"
    EXEC_PSQL=(docker exec)
    if [ -n "$ROOT_PASS" ]; then
      EXEC_PSQL+=(-e "PGPASSWORD=$ROOT_PASS")
    fi
    EXEC_PSQL+=(-e "PGCONNECT_TIMEOUT=5" "$DB_CONTAINER" psql -w -U "$ADMIN_USER" -d "$ADMIN_DB")

    # 确保用户存在且密码与 GANG_DATABASE_PASSWORD 同步
    timeout 15 "${EXEC_PSQL[@]}" -c "
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE USER \"$DB_USER\" WITH PASSWORD '$GANG_DATABASE_PASSWORD';
  ELSE
    ALTER USER \"$DB_USER\" WITH PASSWORD '$GANG_DATABASE_PASSWORD';
  END IF;
END
\$\$;" 2>/dev/null || true

    # 确保数据库存在并授权拥有者
    if ! timeout 15 "${EXEC_PSQL[@]}" -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | grep -q 1; then
      timeout 15 "${EXEC_PSQL[@]}" -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";" 2>/dev/null || true
    fi
    timeout 15 "${EXEC_PSQL[@]}" -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";" 2>/dev/null || true
  fi
fi

# 构建失败时保留运行中的旧服务；记录旧镜像以便替换失败后恢复。
PREVIOUS_IMAGE=$(docker inspect ganglegang --format '{{.Image}}' 2>/dev/null || true)
PREVIOUS_RUNNING=$(docker inspect ganglegang --format '{{.State.Running}}' 2>/dev/null || true)
"${DOCKER_CMD[@]}" build

connect_caddy_networks() {
  for MEMBER_NET in $(docker inspect member-web-1 --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null); do
    docker network connect --alias ganglegang "$MEMBER_NET" ganglegang 2>/dev/null || true
  done
  if [ -n "${GANG_DATABASE_NETWORK:-}" ]; then
    docker network connect --alias ganglegang "$GANG_DATABASE_NETWORK" ganglegang 2>/dev/null || true
  fi
  if [ -n "${DB_CONTAINER:-}" ]; then
    for DB_NET_ITEM in $(docker inspect "$DB_CONTAINER" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null); do
      docker network connect --alias ganglegang "$DB_NET_ITEM" ganglegang 2>/dev/null || true
    done
  fi
}

restore_on_failure() {
  DEPLOY_STATUS=$?
  trap - EXIT
  if [ "$DEPLOY_STATUS" -ne 0 ] && [ -n "$PREVIOUS_IMAGE" ] && [ "$PREVIOUS_RUNNING" = "true" ]; then
    echo "❌ 更新失败，正在恢复旧镜像..."
    ROLLBACK_FILE=$(mktemp "$PWD/.app-rollback.XXXXXX")
    printf 'services:\n  ganglegang:\n    image: "%s"\n' "$PREVIOUS_IMAGE" > "$ROLLBACK_FILE"
    if "${DOCKER_CMD[@]}" -f compose.yaml -f "$ROLLBACK_FILE" up -d --no-build --remove-orphans --force-recreate; then
      connect_caddy_networks
      echo "已恢复旧镜像，请检查更新失败原因。"
    else
      echo "❌ 旧镜像恢复失败，请立即检查 Docker 日志！" >&2
    fi
    rm -f -- "$ROLLBACK_FILE"
  fi
  exit "$DEPLOY_STATUS"
}
trap restore_on_failure EXIT

# 新镜像已构建成功后，停止并移除旧容器以释放名称与数据库连接。
if docker inspect ganglegang >/dev/null 2>&1; then
  echo ">>> 检测到已有同名 ganglegang 容器，正在停止并移除旧容器以释放名称与连接..."
  docker stop --time 15 ganglegang 2>/dev/null || true
  docker rm -f ganglegang 2>/dev/null || true
fi

# The old coordinator must release its advisory lock before backup and migration.
# A failed backup or migration stops deployment and triggers image rollback.
if [ "${STORAGE_DRIVER:-}" = "postgres" ]; then
  echo ">>> 执行数据库结构初始化与迁移 (npm run db:migrate)..."
  timeout 60 "${DOCKER_CMD[@]}" run --rm --no-deps ganglegang npm run db:migrate
fi

"${DOCKER_CMD[@]}" up -d --no-build --remove-orphans --force-recreate

# 自动将 ganglegang 接入 Caddy (member-web-1) 与数据库网络
connect_caddy_networks

# 自动检查并维护宿主机 Caddyfile 的 /gang 路由规则（防止被会员系统更新覆盖）
HOST_CADDY=$(docker inspect member-web-1 --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true)
if [ -n "$HOST_CADDY" ] && [ -f "$HOST_CADDY" ]; then
  python3 -c "
import sys, os
rule = '''    redir /gang /gang/ 308
    handle_path /gang/* {
        reverse_proxy ganglegang:3000
    }
'''
targets = set(sys.argv[1:])
for path in targets:
    if not path or not os.path.isfile(path):
        continue
    try:
        with open(path, 'r', encoding='utf-8') as f:
            c = f.read()
        if 'handle_path /gang/*' not in c:
            if 'redir /admin' in c:
                c = c.replace('redir /admin', rule + '    redir /admin', 1)
            elif 'handle {' in c:
                c = c.replace('handle {', rule + '    handle {', 1)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(c)
            print('>>> [Caddyfile] 已自动持久化 /gang 路由至:', path)
    except Exception as e:
        print('>>> [Caddyfile] 更新告警:', e)
" "$HOST_CADDY" "$(dirname "$HOST_CADDY")/Caddyfile" "$(dirname "$HOST_CADDY")/Caddyfile.ip" 2>/dev/null || true

  # 通知 Caddy 重新加载配置
  docker exec member-web-1 caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true
fi

echo ">>> [2/2] 执行服务健康探测 (Health Check)..."
HEALTH_URL="http://127.0.0.1:3000/api/health"
HEALTH_READY=0

for attempt in {1..15}; do
  if STATUS=$(curl -fsS -o /dev/null -w '%{http_code}' "$HEALTH_URL" 2>/dev/null) && [ "$STATUS" = "200" ]; then
    HEALTH_READY=1
    break
  fi
  echo "等待服务启动中 ($attempt/15)..."
  sleep 2
done

if [ "$HEALTH_READY" -ne 1 ]; then
  echo "❌ 健康检查失败，请检查 Docker 日志！"
  "${DOCKER_CMD[@]}" logs --tail=50
  exit 1
fi

echo "✅ 《钢了钢》服务部署并探测成功！"
