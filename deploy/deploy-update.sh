#!/usr/bin/env bash
set -euo pipefail

echo ">>> [1/2] 重新构建并平滑启动 Docker 服务..."
if docker compose version >/dev/null 2>&1; then
  DOCKER_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_CMD="docker-compose"
else
  echo "❌ 错误：服务器上未安装 Docker Compose！"
  echo "请先在服务器上安装 Docker 与 Docker Compose 插件。"
  exit 1
fi

# 检查并清理可能导致名称冲突的旧容器（如手动 docker run 或旧项目残留的容器）
if docker ps -a --format '{{.Names}}' | grep -Eq '^ganglegang$'; then
  echo ">>> 检测到已有同名 ganglegang 容器，正在停止并移除旧容器以释放名称..."
  docker rm -f ganglegang 2>/dev/null || true
fi

$DOCKER_CMD up -d --build --remove-orphans --force-recreate

# 自动将 ganglegang 接入 Caddy (member-web-1) 所在的 Docker 网络，确保容器间直接通过服务名通信
for MEMBER_NET in $(docker inspect member-web-1 --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null); do
  echo ">>> 正在将 ganglegang 接入 Caddy 网络 ($MEMBER_NET)..."
  docker network connect --alias ganglegang "$MEMBER_NET" ganglegang 2>/dev/null || true
done

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
  $DOCKER_CMD logs --tail=50
  exit 1
fi

echo "✅ 《钢了钢》服务部署并探测成功！"
