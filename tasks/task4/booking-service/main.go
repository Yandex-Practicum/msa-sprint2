package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"

	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "pong")
	})
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "ok")
	})

	http.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "ready")
	})

	http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
		if !enableFeatureX {
			http.Error(w, "Feature X is disabled", http.StatusNotFound)
			return
		}
		fmt.Fprintf(w, "Feature X is enabled!")
	})

	log.Printf("Server running on :8080 (ENABLE_FEATURE_X=%v)", enableFeatureX)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
