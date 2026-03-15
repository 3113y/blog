# PowerShell 编译脚本 - 为 Linux AMD64 编译二进制文件
# 使用方式: .\build.ps1
# 输出: dist/api

$ErrorActionPreference = "Stop"

$OutputDir = "dist"
$OutputName = "api"

# 颜色定义
$Green = "`e[32m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Reset = "`e[0m"

Write-Host "${Yellow}📦 编译 Blog 应用${Reset}"
Write-Host "${Yellow}目标: Linux AMD64${Reset}"
Write-Host ""

# 创建输出目录
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
    Write-Host "${Green}✓${Reset} 创建目录: $OutputDir"
}

# 设置环境变量
$env:GOOS = "linux"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "0"

# 编译
Write-Host "${Yellow}⏳${Reset} 编译中..."
& go build -o "$OutputDir/$OutputName" ./cmd/api

if ($LASTEXITCODE -eq 0) {
    $FileSize = (Get-Item "$OutputDir/$OutputName").Length / 1MB
    Write-Host "${Green}✓${Reset} 编译成功！"
    Write-Host "${Green}✓${Reset} 输出文件: $OutputDir/$OutputName (${FileSize:F2} MB)"
    Write-Host ""
    Write-Host "${Green}完成！${Reset}"
    Write-Host ""
    Write-Host "📌 后续步骤:"
    Write-Host "   1. 将 $OutputDir/$OutputName 拖到服务器项目的 build/ 目录"
    Write-Host "   2. 在服务器执行: docker-compose restart blog_api"
} else {
    Write-Host "${Red}✗${Reset} 编译失败"
    exit 1
}

# 清理环境变量
$env:GOOS = ""
$env:GOARCH = ""
$env:CGO_ENABLED = ""
