# 构建阶段
FROM golang:1.26-alpine AS builder
WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
ENV GOPROXY=https://goproxy.cn,direct
ENV GOMAXPROCS=1
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -installsuffix cgo -o main ./cmd/api

# 运行阶段
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]
