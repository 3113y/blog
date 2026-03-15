package model

import (
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
	Title    string    `gorm:"not null" json:"title"`
	Content  string    `gorm:"type:text" json:"content"`
	UserID   uint      `json:"user_id"`
	User     User      `json:"author,omitempty"`
	Comments []Comment `json:"comments,omitempty"`
}

// Comment 评论模型
type Comment struct {
	gorm.Model
	Content string `gorm:"type:text;not null" json:"content"`
	UserID  uint   `json:"user_id"`
	User    User   `json:"author,omitempty"`
	PostID  uint   `json:"post_id"`
}
