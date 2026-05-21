package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"sync/atomic"
	"time"
)

var ready atomic.Value

func init() {
	ready.Store(false)
}

func main() {
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"

	// Health check endpoint
	http.HandleFunc("/health", healthHandler)

	// Readiness probe endpoint
	http.HandleFunc("/ready", readinessHandler)

	// Ping endpoint
	http.HandleFunc("/ping", pingHandler)

	// Feature flag route
	if enableFeatureX {
		http.HandleFunc("/feature", featureHandler)
	}

	// Simulate service initialization
	go func() {
		time.Sleep(5 * time.Second)
		ready.Store(true)
		log.Println("Service is ready")
	}()

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "healthy")
}

func readinessHandler(w http.ResponseWriter, r *http.Request) {
	if ready.Load().(bool) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "ready")
	} else {
		w.WriteHeader(http.StatusServiceUnavailable)
		fmt.Fprintf(w, "not ready")
	}
}

func pingHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "pong")
}

func featureHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Feature X is enabled!")
}