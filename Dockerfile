# 使用极小的 Alpine 作为基础镜像
FROM alpine:latest

# 安装必要的 CA 证书（防止 HTTPS 请求报错）
RUN apk --no-cache add ca-certificates tzdata

# 设置工作目录
WORKDIR /app

# 直接复制本地编译好的二进制文件
# 注意：这里假设你本地编译好的文件名叫 "main"，且在 Dockerfile 同级目录
COPY main .

# 赋予执行权限
RUN chmod +x main

# 暴露端口
EXPOSE 8080

# 运行
CMD ["./main"]