package model

import (
	"strings"

	"github.com/3113y/blog/internal/util"
	"gorm.io/gorm"
)

// User 博主/用户模型
type User struct {
	gorm.Model
	Username string `gorm:"uniqueIndex;not null" json:"username"`
	Password string `gorm:"not null" json:"-"` // json:"-" 表示不返回密码
	Email    string `json:"email"`
}

// BeforeSave 在保存前自动加密密码 (GORM 钩子)
func (u *User) BeforeSave(tx *gorm.DB) error {
	// 如果密码字段有新值，则进行加密
	if tx.Statement.Changed("Password") {
		hashedPassword, err := util.HashPassword(u.Password)
		if err != nil {
			return err
		}
		tx.Statement.SetColumn("Password", hashedPassword)
	}
	return nil
}

// Post 文章模型
type Post struct {
	gorm.Model
	Title      string    `gorm:"not null" json:"title"`
	Content    string    `gorm:"type:text" json:"content"`
	Categories []string  `gorm:"type:text;serializer:json" json:"categories"`
	Tags       []string  `gorm:"type:text;serializer:json" json:"tags"`
	UserID     uint      `json:"user_id"`
	User       User      `json:"author,omitempty"`
	Comments   []Comment `json:"comments,omitempty"`
}

// Comment 评论模型
type Comment struct {
	gorm.Model
	Content string `gorm:"type:text;not null" json:"content"`
	UserID  uint   `json:"user_id"`
	Email   string `gorm:"uniqueIndex;not null" json:"email"`
	PostID  uint   `json:"post_id"`
	User    User   `json:"author,omitempty"`
}

func (u *User) hashPasswordIfNeeded() error {
	if strings.HasPrefix(u.Password, "$2a$") || strings.HasPrefix(u.Password, "$2b$") || strings.HasPrefix(u.Password, "$2y$") {
		return nil
	}

	hashedPassword, err := util.HashPassword(u.Password)
	if err != nil {
		return err
	}
	u.Password = hashedPassword
	return nil
}

// BeforeCreate 在创建前自动加密密码 (GORM 钩子)
func (u *User) BeforeCreate(tx *gorm.DB) error {
	return u.hashPasswordIfNeeded()
}

// BeforeUpdate 在更新前自动加密密码 (GORM 钩子)
func (u *User) BeforeUpdate(tx *gorm.DB) error {
	return u.hashPasswordIfNeeded()
}
