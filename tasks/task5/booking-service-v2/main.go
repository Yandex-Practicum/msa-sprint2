package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

var startTime time.Time

func main() {
	startTime = time.Now()
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"

	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "pong-v2")
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "healthy-v2")
	})

	http.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		uptime := time.Since(startTime)
		if uptime > 5*time.Second {
			w.WriteHeader(http.StatusOK)
			fmt.Fprintf(w, "ready-v2")
		} else {
			w.WriteHeader(http.StatusServiceUnavailable)
			fmt.Fprintf(w, "starting up-v2")
		}
	})

	http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
		featureEnabled := r.Header.Get("X-Feature-Enabled") == "true"
		if enableFeatureX && featureEnabled {
			fmt.Fprintf(w, "Feature X is enabled in v2!")
		} else {
			fmt.Fprintf(w, "Feature X is disabled in v2")
		}
	})

	http.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "v2")
	})

	log.Println("Server v2 running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
