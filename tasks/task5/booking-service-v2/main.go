package main

import (
	"fmt"
	"log"
	"net/http"
	"sync/atomic"
	"time"
)

var ready atomic.Value

func init() {
	ready.Store(false)
}

func main() {
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/ready", readinessHandler)
	http.HandleFunc("/ping", pingHandler)
	http.HandleFunc("/feature", featureHandler)

	go func() {
		time.Sleep(3 * time.Second)
		ready.Store(true)
		log.Println("Service v2 is ready")
	}()

	log.Println("Booking Service v2 running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("X-Version", "v2")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "healthy")
}

func readinessHandler(w http.ResponseWriter, r *http.Request) {
	if ready.Load().(bool) {
		w.Header().Set("X-Version", "v2")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "ready")
	} else {
		w.WriteHeader(http.StatusServiceUnavailable)
		fmt.Fprintf(w, "not ready")
	}
}

func pingHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("X-Version", "v2")
	fmt.Fprintf(w, "pong")
}

func featureHandler(w http.ResponseWriter, r *http.Request) {
	featureEnabled := r.Header.Get("X-Feature-Enabled")

	if featureEnabled == "true" {
		w.Header().Set("X-Version", "v2")
		w.Header().Set("X-Feature-Status", "enabled")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "Feature X is enabled on v2!")
	} else {
		w.Header().Set("X-Version", "v2")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "v2 response")
	}
}