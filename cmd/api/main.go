package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/3113y/blog/internal/handler"
	"github.com/3113y/blog/internal/middleware"
	"github.com/3113y/blog/internal/repository"
	"github.com/gin-gonic/gin"
)

func serveStatic(c *gin.Context) {
	requestPath := c.Request.URL.Path
	if requestPath == "/" {
		c.File("./static/index.html")
		return
	}

	cleanPath := strings.TrimPrefix(filepath.Clean(requestPath), "/")
	fullPath := filepath.Join("static", cleanPath)

	if info, err := os.Stat(fullPath); err == nil {
		if info.IsDir() {
			indexPath := filepath.Join(fullPath, "index.html")
			if _, err := os.Stat(indexPath); err == nil {
				c.File(indexPath)
				return
			}
		} else {
			c.File(fullPath)
			return
		}
	}

	htmlPath := fullPath + ".html"
	if _, err := os.Stat(htmlPath); err == nil {
		c.File(htmlPath)
		return
	}

	if _, err := os.Stat("./static/404.html"); err == nil {
		c.File("./static/404.html")
		return
	}

	c.AbortWithStatus(http.StatusNotFound)
}

func main() {
	// 1. 初始化数据库
	repository.InitDB()

	// 2. 设置 Gin
	r := gin.Default()

	// 3. 注册中间件 (CORS等)
	r.Use(middleware.CORS())

	// 4. API 路由
	api := r.Group("/api")
	{
		api.GET("/health", handler.GetHealth)
		api.POST("/register", handler.Register)
		api.POST("/login", handler.Login)
		api.GET("/posts", handler.GetPosts)
		api.POST("/posts", handler.CreatePost)
		api.POST("/comments", handler.CreateComment)
	}

	// 向后兼容旧接口（保留不与 Chirpy 页面冲突的路径）
	r.GET("/health", handler.GetHealth)
	r.POST("/register", handler.Register)
	r.POST("/login", handler.Login)
	r.POST("/posts", handler.CreatePost)
	r.POST("/comments", handler.CreateComment)

	// 5. 静态文件服务（Chirpy 模板）
	r.GET("/", serveStatic)
	r.GET("/categories", func(c *gin.Context) {
		c.Redirect(http.StatusTemporaryRedirect, "/categories/")
	})
	r.GET("/categories/", func(c *gin.Context) {
		c.File("./static/categories.html")
	})
	r.GET("/categories/:name", func(c *gin.Context) {
		c.File("./static/term.html")
	})
	r.GET("/tags", func(c *gin.Context) {
		c.Redirect(http.StatusTemporaryRedirect, "/tags/")
	})
	r.GET("/tags/", func(c *gin.Context) {
		c.File("./static/tags.html")
	})
	r.GET("/tags/:name", func(c *gin.Context) {
		c.File("./static/term.html")
	})
	r.GET("/archives", func(c *gin.Context) {
		c.Redirect(http.StatusTemporaryRedirect, "/archives/")
	})
	r.GET("/archives/", func(c *gin.Context) {
		c.File("./static/archives.html")
	})
	r.GET("/posts", func(c *gin.Context) {
		c.Redirect(http.StatusTemporaryRedirect, "/")
	})
	r.GET("/posts/:id", func(c *gin.Context) {
		c.File("./static/post.html")
	})
	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		serveStatic(c)
	})

	// 6. 启动
	log.Println("Server starting on :8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server: ", err)
	}
}
