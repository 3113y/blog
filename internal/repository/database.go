package repository

import (
	"fmt"
	"log"
	"os"

	"github.com/3113y/blog/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

// InitDB 初始化数据库连接
func InitDB() {
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Shanghai",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	// 自动迁移 (生产环境建议用 golang-migrate，这里为了演示先用 AutoMigrate)
	log.Println("Auto migrating database schema...")
	DB.AutoMigrate(&model.User{}, &model.Post{}, &model.Comment{})
}
