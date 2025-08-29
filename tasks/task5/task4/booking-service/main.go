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
		fmt.Fprintf(w, "pong")
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "healthy")
	})

	http.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		uptime := time.Since(startTime)
		if uptime > 5*time.Second {
			w.WriteHeader(http.StatusOK)
			fmt.Fprintf(w, "ready")
		} else {
			w.WriteHeader(http.StatusServiceUnavailable)
			fmt.Fprintf(w, "starting up")
		}
	})

	if enableFeatureX {
		http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "Feature X is enabled!")
		})
	}

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
