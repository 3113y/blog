package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/3113y/blog/internal/model"
	"github.com/3113y/blog/internal/repository"
)

// GetHealth 健康检查
func GetHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Blog API is running"})
}

// CreatePost 创建文章 (演示用)
func CreatePost(c *gin.Context) {
	var post model.Post
	if err := c.ShouldBindJSON(&post); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// 模拟一个 user_id
	post.UserID = 1

	if result := repository.DB.Create(&post); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusCreated, post)
}

// GetPosts 获取文章列表
func GetPosts(c *gin.Context) {
	var posts []model.Post
	repository.DB.Find(&posts)
	c.JSON(http.StatusOK, posts)
}