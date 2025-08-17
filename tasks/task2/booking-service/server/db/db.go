package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib" // Драйвер PostgreSQL
	"github.com/jmoiron/sqlx"
)

type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

func CreateDB() *sqlx.DB {
	// Загрузка конфигурации (обычно из переменных окружения)
	cfg := Config{
		Host:     GetEnv("DB_HOST", "localhost"),
		Port:     GetEnv("DB_PORT", "5433"),
		User:     GetEnv("DB_USER", "hotelio"),
		Password: GetEnv("DB_PASSWORD", "hotelio"),
		DBName:   GetEnv("DB_NAME", "hotelio"),
		SSLMode:  GetEnv("DB_SSLMODE", "disable"),
	}

	// Формируем строку подключения
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName, cfg.SSLMode)

	// Подключаемся к БД
	db, err := sqlx.Connect("postgres", connStr)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	//defer db.Close()

	// Проверка подключения
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		log.Fatalf("Unable to ping database: %v\n", err)
	}

	log.Println("Successfully connected to PostgreSQL!")

	return db
}

func GetEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}
