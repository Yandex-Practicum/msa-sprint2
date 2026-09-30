package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	version := os.Getenv("APP_VERSION")
	if version == "" {
		version = "unknown"
	}
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"

	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "pong from %s", version)
	})

	http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
		headerFlag := r.Header.Get("X-Feature-Enabled") == "true"
		if enableFeatureX || headerFlag {
			fmt.Fprintf(w, "Feature X is enabled! (version=%s)", version)
			return
		}
		http.Error(w, "Feature X is disabled", http.StatusForbidden)
	})

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "booking-service %s", version)
	})

	log.Printf("booking-service %s started on :8080, ENABLE_FEATURE_X=%t", version, enableFeatureX)
	log.Fatal(http.ListenAndServe(":8080", nil))
}