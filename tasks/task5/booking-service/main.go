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

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/ready", readinessHandler)
	http.HandleFunc("/ping", pingHandler)

	if enableFeatureX {
		http.HandleFunc("/feature", featureHandler)
	}

	go func() {
		time.Sleep(5 * time.Second)
		ready.Store(true)
		log.Println("Service v1 is ready")
	}()

	log.Println("Booking Service v1 running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("X-Version", "v1")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "healthy")
}

func readinessHandler(w http.ResponseWriter, r *http.Request) {
	if ready.Load().(bool) {
		w.Header().Set("X-Version", "v1")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "ready")
	} else {
		w.WriteHeader(http.StatusServiceUnavailable)
		fmt.Fprintf(w, "not ready")
	}
}

func pingHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("X-Version", "v1")
	fmt.Fprintf(w, "pong")
}

func featureHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("X-Version", "v1")
	fmt.Fprintf(w, "Feature X is enabled on v1!")
}