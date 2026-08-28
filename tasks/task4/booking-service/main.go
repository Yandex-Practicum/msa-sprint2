package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

var featureXEnabled = false

func pingHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "pong")
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	// Эндпоинт для liveness probe (проверка, что процесс жив)
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "healthy")
}

func readyHandler(w http.ResponseWriter, r *http.Request) {
	// Эндпоинт для readiness probe (проверка, что сервис готов принимать трафик)
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "ready")
}

func featureHandler(w http.ResponseWriter, r *http.Request) {
	if featureXEnabled {
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, "Feature X is enabled!")
	} else {
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprint(w, "Feature X is disabled")
	}
}

func main() {
	// Считываем переменную окружения один раз при старте
	if os.Getenv("ENABLE_FEATURE_X") == "true" {
		featureXEnabled = true
		log.Println("Feature X is ENABLED")
	} else {
		log.Println("Feature X is DISABLED")
	}

	http.HandleFunc("/ping", pingHandler)
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/ready", readyHandler)
	http.HandleFunc("/feature", featureHandler)

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}