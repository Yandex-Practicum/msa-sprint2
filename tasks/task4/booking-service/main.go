package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

// Booking service (task4). REST-сервис с feature flag.
// Endpoints:
//   /ping    -> pong                       (liveness/readiness probe)
//   /health  -> ok                         (healthcheck endpoint)
//   /ready   -> ready                      (readiness endpoint)
//   /feature -> Feature X is enabled!      (только если ENABLE_FEATURE_X=true)
func main() {
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"
	log.Printf("ENABLE_FEATURE_X=%v", enableFeatureX)

	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "pong")
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "ok")
	})

	http.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "ready")
	})

	// Feature flag: если ENABLE_FEATURE_X=true, expose /feature
	if enableFeatureX {
		http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "Feature X is enabled!")
		})
	} else {
		// /feature существует, но возвращает 404/disabled
		http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprintf(w, "Feature X is disabled")
		})
	}

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
