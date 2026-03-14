package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/3113y/blog/internal/handler"
	"github.com/3113y/blog/internal/repository"
	"github.com/3113y/blog/internal/middleware"
)

func main() {
	// 1. 初始化数据库
	repository.InitDB()

	// 2. 设置 Gin
	r := gin.Default()
	
	// 3. 注册中间件 (CORS等)
	r.Use(middleware.CORS())

	// 4. 路由
	r.GET("/health", handler.GetHealth)
	r.GET("/posts", handler.GetPosts)
	r.POST("/posts", handler.CreatePost)

	// 5. 启动
	log.Println("Server starting on :8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server: ", err)
	}
}