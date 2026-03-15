package handler

import (
	"net/http"

	"github.com/3113y/blog/internal/model"
	"github.com/3113y/blog/internal/repository"
	"github.com/3113y/blog/internal/util"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RegisterRequest 注册请求体
type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
	Email    string `json:"email" binding:"required,email"`
}

// LoginRequest 登录请求体
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// CreatePostRequest 创建文章请求体
type CreatePostRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content" binding:"required"`
	UserID  uint   `json:"user_id" binding:"required"`
}

// CreateCommentRequest 创建评论请求体
type CreateCommentRequest struct {
	Content string `json:"content" binding:"required"`
	UserID  uint   `json:"user_id" binding:"required"`
	PostID  uint   `json:"post_id" binding:"required"`
}

// 博主ID (只有这个ID的用户能发布文章)
const AUTHOR_ID = 1

// GetHealth 健康检查
func GetHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Blog API is running"})
}

// Register 用户注册
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 检查用户是否已存在
	var existingUser model.User
	if result := repository.DB.Where("username = ?", req.Username).First(&existingUser); result.Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "username already exists"})
		return
	}

	// 创建新用户
	user := model.User{
		Username: req.Username,
		Password: req.Password, // BeforeSave 钩子会自动加密
		Email:    req.Email,
	}

	if result := repository.DB.Create(&user); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":       user.ID,
		"username": user.Username,
		"email":    user.Email,
	})
}

// Login 用户登录
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 根据用户名查找用户
	var user model.User
	if result := repository.DB.Where("username = ?", req.Username).First(&user); result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid username or password"})
		return
	}

	// 验证密码
	if !util.VerifyPassword(user.Password, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid username or password"})
		return
	}

	// 登录成功
	c.JSON(http.StatusOK, gin.H{
		"id":       user.ID,
		"username": user.Username,
		"email":    user.Email,
		"message":  "login successful",
	})
}

// CreatePost 创建文章 (仅作者可发布)
func CreatePost(c *gin.Context) {
	var req CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 只有作者(ID=1)能发布文章
	if req.UserID != AUTHOR_ID {
		c.JSON(http.StatusForbidden, gin.H{"error": "only author can publish posts"})
		return
	}

	// 验证用户是否存在
	var user model.User
	if result := repository.DB.First(&user, req.UserID); result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	// 创建文章
	post := model.Post{
		Title:   req.Title,
		Content: req.Content,
		UserID:  req.UserID,
	}

	if result := repository.DB.Create(&post); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	c.JSON(http.StatusCreated, post)
}

// GetPosts 获取文章列表（包含作者信息和评论）
func GetPosts(c *gin.Context) {
	var posts []model.Post
	// Preload 关联来获取作者和评论信息
	repository.DB.Preload("User").Preload("Comments", func(db *gorm.DB) *gorm.DB {
		return db.Preload("User")
	}).Find(&posts)
	c.JSON(http.StatusOK, posts)
}

// CreateComment 创建评论
func CreateComment(c *gin.Context) {
	var req CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 验证用户是否存在
	var user model.User
	if result := repository.DB.First(&user, req.UserID); result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	// 验证文章是否存在
	var post model.Post
	if result := repository.DB.First(&post, req.PostID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}

	// 创建评论
	comment := model.Comment{
		Content: req.Content,
		UserID:  req.UserID,
		PostID:  req.PostID,
	}

	if result := repository.DB.Create(&comment); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": result.Error.Error()})
		return
	}

	// 返回包含用户信息的评论
	repository.DB.Preload("User").First(&comment)
	c.JSON(http.StatusCreated, comment)
}
