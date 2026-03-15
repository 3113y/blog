# 使用极小的 Alpine 作为基础镜像
FROM alpine:latest

# 安装必要的 CA 证书（防止 HTTPS 请求报错）
RUN apk --no-cache add ca-certificates tzdata

# 设置工作目录
WORKDIR /app

# 复制编译好的二进制文件（从 build 目录）
# build/api 是从本地编译后拖拽上传的
COPY build/api .

# 复制静态文件
COPY static ./static

# 赋予执行权限
RUN chmod +x api

# 暴露端口
EXPOSE 8080

# 运行
CMD ["./api"]
CMD ["./main"]