package model

import "gorm.io/gorm"

// User 博主/用户模型
type User struct {
	gorm.Model
	Username string `gorm:"uniqueIndex;not null" json:"username"`
	Password string `gorm:"not null" json:"-"` // json:"-" 表示不返回密码
	Email    string `json:"email"`
}

// Post 文章模型
type Post struct {
	gorm.Model
	Title   string `gorm:"not null" json:"title"`
	Content string `gorm:"type:text" json:"content"`
	UserID  uint   `json:"user_id"`
	User    User   `json:"author,omitempty"`
}