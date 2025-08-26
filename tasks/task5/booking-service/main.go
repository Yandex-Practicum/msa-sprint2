package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

var (
	isReady = false
	version = "1.0.0"
)

type HealthStatus struct {
	Status  string `json:"status"`
	Version string `json:"version"`
	Ready   bool   `json:"ready"`
}

type FeatureResponse struct {
	Feature string `json:"feature"`
	Enabled bool   `json:"enabled"`
	Message string `json:"message"`
}

func main() {
	// Получаем версию из переменной окружения
	if v := os.Getenv("SERVICE_VERSION"); v != "" {
		version = v
	}
	
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"
	environment := os.Getenv("ENVIRONMENT")
	if environment == "" {
		environment = "development"
	}

	// Настройка маршрутов
	mux := http.NewServeMux()

	// Health check endpoint (для liveness probe)
	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[%s v%s] Health check from %s", environment, version, r.RemoteAddr)
		// Возвращаем версию для проверки канареечного деплоя
		w.Header().Set("X-Version", version)
		fmt.Fprintf(w, "pong-v%s", version)
	})

	// Ready endpoint (для readiness probe)
	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		if !isReady {
			log.Printf("[%s] Readiness check failed - service not ready", environment)
			w.WriteHeader(http.StatusServiceUnavailable)
			fmt.Fprintf(w, "not ready")
			return
		}
		log.Printf("[%s] Readiness check passed", environment)
		fmt.Fprintf(w, "ready")
	})

	// Status endpoint с JSON ответом
	mux.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		status := HealthStatus{
			Status:  "healthy",
			Version: version,
			Ready:   isReady,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(status)
	})

	// Feature flag endpoint
	// Проверяем как переменную окружения, так и заголовок запроса
	mux.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
		// Проверяем заголовок X-Feature-Enabled
		headerFeatureEnabled := r.Header.Get("X-Feature-Enabled") == "true"
		featureEnabled := enableFeatureX || headerFeatureEnabled
		
		if headerFeatureEnabled {
			log.Printf("[%s v%s] Feature X enabled via header from %s", environment, version, r.RemoteAddr)
		} else if enableFeatureX {
			log.Printf("[%s v%s] Feature X enabled via env from %s", environment, version, r.RemoteAddr)
		}
		
		response := FeatureResponse{
			Feature: "X",
			Enabled: featureEnabled,
			Message: fmt.Sprintf("Feature X is %s in %s environment (v%s)!", 
				map[bool]string{true: "enabled", false: "disabled"}[featureEnabled],
				environment, version),
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Version", version)
		json.NewEncoder(w).Encode(response)
	})
	
	if enableFeatureX {
		log.Printf("[%s v%s] Feature X is ENABLED by default", environment, version)
	} else {
		log.Printf("[%s v%s] Feature X is DISABLED by default", environment, version)
	}

	// Bookings endpoint (простая заглушка для демонстрации)
	mux.HandleFunc("/bookings", func(w http.ResponseWriter, r *http.Request) {
		headerFeatureEnabled := r.Header.Get("X-Feature-Enabled") == "true"
		featureEnabled := enableFeatureX || headerFeatureEnabled
		
		log.Printf("[%s v%s] Bookings requested from %s", environment, version, r.RemoteAddr)
		bookings := map[string]interface{}{
			"bookings": []map[string]string{
				{"id": "1", "hotel": "Grand Hotel", "status": "confirmed"},
				{"id": "2", "hotel": "City Plaza", "status": "pending"},
			},
			"environment": environment,
			"version":     version,
			"featureX":    featureEnabled,
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Version", version)
		json.NewEncoder(w).Encode(bookings)
	})

	// Создание HTTP сервера
	srv := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Запуск сервера в горутине
	go func() {
		log.Printf("[%s v%s] Starting booking-service on :8080", environment, version)
		log.Printf("[%s v%s] Environment: %s", environment, version, environment)
		log.Printf("[%s v%s] Feature X default: %v", environment, version, enableFeatureX)
		
		// Имитация инициализации (например, подключение к БД)
		time.Sleep(2 * time.Second)
		isReady = true
		log.Printf("[%s v%s] Service is ready to accept requests", environment, version)

		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Printf("[%s] Shutting down server...", environment)

	// Даём 5 секунд на завершение активных запросов
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("[%s] Server forced to shutdown: %v", environment, err)
	}

	log.Printf("[%s] Server exited", environment)
}
