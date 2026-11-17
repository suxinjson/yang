#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR=${1:?Usage: install-update.sh deploy-directory update.tar.gz}
BUNDLE=${2:?Missing update archive}
ENV_BUNDLE=${3:-}

case "$TARGET_DIR" in
  '~') TARGET_DIR="$HOME" ;;
  '~/'*) TARGET_DIR="$HOME/${TARGET_DIR:2}" ;;
esac

mkdir -p "$TARGET_DIR"
mkdir -p "$TARGET_DIR/data"
TARGET_DIR=$(cd "$TARGET_DIR" && pwd -P)

# 1. 独占锁防并发部署（避免并发提交相互冲突，带 30 秒超时）
exec 9>"$TARGET_DIR/.app-deploy.lock"
if ! flock -w 30 9; then
  echo "⚠️ 警告：无法获取部署锁（可能上次部署未退出），正在强制释放旧锁并接管..."
  fuser -k -9 "$TARGET_DIR/.app-deploy.lock" 2>/dev/null || true
  sleep 1
  flock -w 10 9 || true
fi

echo ">>> [1/3] 解压更新包至暂存区..."
STAGING=$(mktemp -d "$TARGET_DIR/.app-update.XXXXXX")
cleanup() { rm -rf -- "$STAGING"; }
trap cleanup EXIT

tar -xzf "$BUNDLE" -C "$STAGING"
if [ -d "$STAGING/app-releases" ]; then
  mkdir -p "$TARGET_DIR/data/app-releases"
  cp -f "$STAGING/app-releases"/* "$TARGET_DIR/data/app-releases/"
fi

echo ">>> [2/3] 原子性同步更新生产文件..."
# 保留现有的 data/ 文件夹（确保配置和心愿存折记录不被覆盖）
cp -a "$STAGING/." "$TARGET_DIR/"

# 若传入了包含数据库密码的环境变量文件，原子同步至 TARGET_DIR/.env
if [ -n "$ENV_BUNDLE" ] && [ -f "$ENV_BUNDLE" ]; then
  cp -f "$ENV_BUNDLE" "$TARGET_DIR/.env"
  chmod 600 "$TARGET_DIR/.env"
fi

echo ">>> [3/3] 触发容器平滑构建与健康检查..."
cd "$TARGET_DIR"
chmod +x deploy/deploy-update.sh
exec 9>&-
bash deploy/deploy-update.sh
