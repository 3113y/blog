# 开发和部署指南

## 🏗️ 项目架构

```
您的本地项目                       云服务器项目
(Windows)                         (Linux)
    │                                 │
    ├─ 源代码                         ├─ 源代码 (git pull 保持同步)
    │  (cmd/, internal/,              │
    │   static/ 等)                   ├─ build/
    │                                 │  └─ api (本地编译的二进制)
    ├─ docker-compose.yml ◄─────────► ├─ docker-compose.yml
    ├─ Dockerfile ◄─────────────────► ├─ Dockerfile
    └─ build.ps1 (编译脚本)           └─ 数据库卷等...
```

## 🔄 完整的开发工作流

### 第 1️⃣ 步：初始化部署（仅需一次）

在云服务器上：

```bash
# 1. 克隆项目
git clone https://github.com/3113y/blog.git
cd blog

# 2. 副本 .env 配置
cp .env.example .env
nano .env  # 修改密码等信息

# 3. 创建 build 目录
mkdir -p build

# 4. 启动服务（此时会失败，因为还没有二进制文件）
docker-compose up -d
```

### 第 2️⃣ 步：本地编译（每次更新代码后）

在本地 Windows：

```powershell
# 1. 修改代码
# ...编辑 Go 源代码...

# 2. 提交到 Git
git add .
git commit -m "fix: 修复某个功能"
git push origin main

# 3. 编译为 Linux 二进制
.\build.ps1

# 输出: dist/api (36+ MB)
```

### 第 3️⃣ 步：上传到服务器

**方式 A：拖拽**（在 VS Code 中）

1. 打开两个终端窗口：
   - 左：本地（已有）
   - 右：SSH 连接服务器 `ssh user@server-ip`

2. 拖拽 `dist/api` 文件到右窗口

3. 确认上传位置：`/home/user/blog/build/api`

**方式 B：SCP 命令**

```bash
scp dist/api user@your-server-ip:/home/user/blog/build/
```

### 第 4️⃣ 步：服务器更新并重启

在服务器上执行：

```bash
cd ~/blog

# 1. 更新源代码（如果有其他变更）
git pull origin main

# 2. 重启容器（使用新的二进制文件）
docker-compose restart blog_api

# 3. 验证
curl http://localhost:8080/health
docker-compose logs -f blog_api
```

---

## 📋 Dockerfile 说明

当前 Dockerfile：

```dockerfile
FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app
COPY build/api .      # 从 build 目录复制本地编译的二进制
RUN chmod +x api
EXPOSE 8080
CMD ["./api"]
```

**重要：** 需要在服务器上保持 `build/api` 目录存在且有可执行文件。

---

## 🚀 工作流速查表

### 最快的更新循环

```bash
# 本地
.\build.ps1          # 1. 编译 (10秒)

# 拖拽 dist/api 到服务器的 build/api

# 服务器
docker-compose restart blog_api   # 3. 重启 (5秒)
```

**总耗时：** 15 秒左右 ✨

---

## 🔍 常见场景

### 场景 1：修改前端文件

```bash
# 本地
git add static/
git commit -m "update: 更新前端样式"
git push

# 服务器
git pull  # 前端文件自动更新
# Docker 已包含新的 static 文件，无需重启
```

### 场景 2：修改 Go 后端代码

```bash
# 本地
# ...修改 cmd/api/main.go...
git commit -am "fix: 修复 API 问题"
git push
.\build.ps1         # 编译

# 拖拽 dist/api 到服务器

# 服务器
git pull            # 同步源代码
docker-compose restart blog_api  # 重启应用
```

### 场景 3：修改数据库模型

```bash
# 本地
# ...修改 internal/model/model.go...
git commit -am "feat: 添加新字段"
git push
.\build.ps1

# 服务器
git pull
docker-compose restart blog_api
# GORM 的 AutoMigrate 会自动更新数据库结构
```

### 场景 4：修改 docker-compose.yml

```bash
# 本地
# ...修改 docker-compose.yml...
git commit -am "config: 更新 docker-compose"
git push

# 服务器
git pull
docker-compose up -d  # 重新部署（保持数据库数据）
```

### 场景 5：启用 HTTPS（80/443）

1. 在服务器项目根目录创建或修改 `.env`：

```bash
DOMAIN=你的域名
ACME_EMAIL=你的邮箱
```

2. 确认 DNS 已生效：

```bash
nslookup 你的域名
```

3. 确认服务器安全组/防火墙已放行 TCP 80 和 443。

4. 启动或更新服务：

```bash
docker-compose up -d --build
```

5. 查看证书签发与代理日志：

```bash
docker-compose logs -f caddy
```

6. 验证：

```bash
curl -I https://你的域名
```

如果返回 `HTTP/2 200` 或 `HTTP/1.1 200`，说明 HTTPS 已正常工作。

---

## 📁 服务器项目结构

```
/home/user/blog/
├── .git/              # Git 仓库
├── cmd/               # 源代码（从 git pull 获取）
├── internal/          # 源代码
├── static/            # 前端文件
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── build/             # 编译输出目录
│   └── api            # 本地编译的二进制文件 ← 拖拽上传到这里
├── docker-compose.yml # Docker 配置
├── Dockerfile         # 镜像定义
├── go.mod
├── go.sum
├── .env               # 环境变量（数据库配置）
└── .env.example
```

---

## ⚙️ 编译命令详解

```powershell
.\build.ps1
```

此脚本会：
1. ✅ 设置环境变量：
   - `GOOS=linux`
   - `GOARCH=amd64`
   - `CGO_ENABLED=0`

2. ✅ 编译：`go build -o dist/api ./cmd/api`

3. ✅ 输出到 `dist/api`

**输出特点：**
- 平台：Linux AMD64
- 大小：~36MB
- 格式：ELF 64-bit LSB
- 依赖：无（CGO_ENABLED=0 确保静态链接）

---


## 📊 性能优化

### 编译时间

```
首次编译：~10-30秒（取决于网络，缓存下载包）
增量编译：~2-5秒（只重新编译改动的包）
```

### 容器重启时间

```
docker-compose restart blog_api：~2-5秒
```

### 更新流程总时间

```
编译 → 上传 → 重启 = 15-30秒
```

---

## ✅ 检查列表

部署每次更新时：

- [ ] 本地编译成功：`.\build.ps1`
- [ ] 二进制文件生成：`dist/api` 存在
- [ ] 上传到服务器：`build/api` 已更新
- [ ] 源代码同步：服务器执行 `git pull`
- [ ] 容器重启：`docker-compose restart blog_api`
- [ ] 健康检查：`curl http://localhost:8080/health`
- [ ] 查看日志：`docker-compose logs -f blog_api`

---

## 🎯 总结

**这个工作流的优势：**

✅ **快速** - 编译上传重启总共 15 秒  
✅ **安全** - 源代码通过 Git 管理，二进制单独上传  
✅ **灵活** - 前端改动自动同步，后端改动快速编译上传  
✅ **隔离** - 源代码和编译输出分离  
✅ **可靠** - Docker 确保环境一致性  

---

## 🚀 立即开始

```powershell
# 1. 首先在服务器完成初始化（见上方）

# 2. 本地编译
.\build.ps1

# 3. 上传 dist/api 到服务器的 build/ 目录

# 4. 服务器重启
docker-compose restart blog_api

# 完成！🎉
```
