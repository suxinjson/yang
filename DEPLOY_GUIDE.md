# 《钢了钢》服务器部署与安卓打包终极指南 🚀

本项目已完成**全栈服务端架构**（Node.js + Express API + 永久数据持久化 + 纯净端与独立后台解耦 + Android 原生工程支持）。

---

部署 2.0.0 时需同步更新 shared/、package-lock.json、server.js 和 Web 资源，使用 npm ci 安装 ws 依赖，代理支持 /api/play/socket 的 WebSocket 升级。后台独立于游戏；单人选牌本地运行，情侣棋盘由服务端统一处理。仅运行一个 Node 实例写持久化账本。详情见 [ANDROID_ONLINE.md](ANDROID_ONLINE.md)。

## 🏗️ 整体架构流程

```
[ 你 (男朋友) ] ---> 浏览器访问 http://服务器IP:3000/admin
                      └── 独立密码解锁后台 -> 切换帅照 / 调整惩罚比例 / 增删任务
                      └── 实时同步保存到服务器 data/config.json
                                   │
                                   ▼
                            [ 你的云服务器 ]
                            (运行 node server.js)
                                   │
                                   ▼
[ 她 (女朋友) ] <--- 安卓手机 App (打开即玩)
                      └── 纯净游戏界面（无任何后台或图集入口）
                      └── 自动实时拉取服务器最新的卡牌图片与奖惩规则
```

---

## 零、 自动一键部署：GitHub Actions 持续集成与发布 🚀

本项目已内置自动化 CI/CD 工作流（`.github/workflows/deploy.yml`）。每次当你将代码推送到 GitHub，GitHub 就会自动在云端执行打包编译、并将轻量精简更新包通过 SSH 安全推送到你的云服务器，执行加锁原子更新与 Docker 容器热重启。

### 为什么之前 Actions 显示失败？
因为 GitHub Actions 连接并部署到你的服务器需要**在仓库中配置服务器连接凭据（Secrets）**。如果未配置，工作流就会在第 5 步（远程 SSH 部署）直接报错。

### ⚙️ 如何配置 GitHub Secrets（仅需配置一次）：
1. 访问你的 GitHub 仓库页面：
   👉 **[https://github.com/suxinjson/yang/settings/secrets/actions](https://github.com/suxinjson/yang/settings/secrets/actions)**
2. 点击右上角绿色的 **`New repository secret`** 按钮，分别添加以下变量：

| Secret 变量名称 | 说明 | 示例 |
| :--- | :--- | :--- |
| **`SERVER_HOST`**（必须） | 你的云服务器公网 IP 或解析域名 | `123.45.67.89` 或 `love.yourdomain.com` |
| **`SERVER_USER`**（必须） | SSH 登录用户名 | `root` 或 `ubuntu` |
| **`SERVER_SSH_KEY`**（必须） | 登录服务器的 SSH **私钥内容** | `-----BEGIN OPENSSH PRIVATE KEY----- ... -----END OPENSSH PRIVATE KEY-----` |
| **`SERVER_PORT`**（可选） | SSH 端口，默认 22 | `22` |
| **`SERVER_DEPLOY_PATH`**（可选） | 服务器上的部署目录，默认 `~/ganglegang` | `~/ganglegang` 或 `/var/www/ganglegang` |

> 💡 **提示**：`SERVER_KNOWN_HOSTS` **已支持自动公钥扫描与安全接受**，无需手动配置！

3. 配置完成后，点击 Actions 页面上的 **Re-run all jobs**，或在本地随意提交推送一次代码，工作流就会自动打通并部署成功！

---

## 一、 部署到你的云服务器 🖥️

### 步骤 1：上传项目代码到服务器
你可以把当前工作目录的文件上传到服务器（例如 `/var/www/ganglegang`），**除了 `node_modules` 之外**。

### 步骤 2：在服务器安装依赖并构建
在服务器终端中进入项目目录，执行：
```bash
npm install
npm run build
```

### 步骤 3：启动服务（推荐使用 PM2 守护进程）
```bash
# 方式 A：直接后台启动
PORT=3000 node server.js

# 方式 B：使用 PM2 守护进程（推荐，服务器重启自动自启）
npm install -g pm2
pm2 start server.js --name "ganglegang"
pm2 save
pm2 startup
```

> **开放端口**：请确保服务器安全组（如阿里云/腾讯云/华为云控制台）已放行 `3000` 端口（或你设置的自定义端口）。

### 步骤 4（可选）：配置 Nginx 绑定你的域名
如果你有域名（如 `love.yourdomain.com`），可以在 Nginx 里配置反向代理：
```nginx
server {
    listen 80;
    server_name love.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 二、 你的独立管理后台访问 💻

部署完成后：
1. 打开浏览器访问：
   ```text
   http://你的服务器IP:3000/admin
   # 或（绑定域名后）：
   http://love.yourdomain.com/admin
   ```
2. 输入初始管理员密码：**`admin`**
3. 可以在后台：
   - 切换 6 张男友帅照或开启随机轮播；
   - 调整女友惩罚比例滑块（0% ~ 100%）；
   - 自由增删女友受罚任务（手洗臭袜子、捏肩、买阔乐等）；
   - 在“安全设置”中修改管理员密码！

---

## 三、 女朋友的安卓程序制作与安装 📱

### 方式 1：WebAPK 直接生成（最轻快推荐 ⭐⭐⭐⭐⭐，免装 Android Studio）
1. 用女朋友的安卓手机（如小米、华为、OPPO、vivo 等）浏览器打开服务器网址：
   `http://你的服务器IP:3000/`
2. 点击浏览器右上角菜单，选择 **“安装应用”** 或 **“添加到主屏幕”**；
3. 安卓系统会自动为你生成一个原生的 **独立 WebAPK**，桌面上显示带有粉色盾牌的 **《钢了钢》** App 图标；
4. 点击打开就是 100% 原生全屏运行（没有网址栏，没有浏览器边框），完全等同于原生 App！

### 方式 2：使用 Android Studio 导出真正的 `.apk` 安装包
项目中已经为你生成并配置好了完整的原生安卓工程目录 `android/`：
1. 如果你想直接发一个 `.apk` 安装文件微信传给她：
   打开 **Android Studio**，选择 `Open`，选择本项目下的 `android` 文件夹；
2. 如果想让 APK 实时加载你服务器的最新页面，可打开 `android/app/src/main/assets/capacitor.config.json`，在 `server` 加上：
   ```json
   "server": {
     "url": "http://你的服务器IP:3000",
     "cleartext": true
   }
   ```
3. 在 Android Studio 顶部菜单点击：**`Build` -> `Build Bundle(s) / APK(s)` -> `Build APK(s)`**；
4. 构建完成后会弹出提示，点击 `locate` 就能找到 `app-debug.apk`，发给她即可安装！
