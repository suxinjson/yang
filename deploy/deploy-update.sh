#!/usr/bin/env bash
set -euo pipefail

echo ">>> [1/2] 重新构建并平滑启动 Docker 服务..."
docker compose up -d --build

echo ">>> [2/2] 执行服务健康探测 (Health Check)..."
HEALTH_URL="http://127.0.0.1:3000/api/health"
HEALTH_READY=0

for attempt in {1..12}; do
  if STATUS=$(curl -fsS -o /dev/null -w '%{http_code}' "$HEALTH_URL" 2>/dev/null) && [ "$STATUS" = "200" ]; then
    HEALTH_READY=1
    break
  fi
  echo "等待服务启动中 ($attempt/12)..."
  sleep 2
done

if [ "$HEALTH_READY" -ne 1 ]; then
  echo "❌ 健康检查失败，请检查 Docker 日志！"
  docker compose logs --tail=50
  exit 1
fi

echo "✅ 《钢了钢》服务部署并探测成功！"
