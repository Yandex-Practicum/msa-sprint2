package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"

	// Liveness
	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "pong")
	})

	// Readiness
	http.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "ok")
	})

	// Feature-flag endpoint
	if enableFeatureX {
		http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprint(w, "Feature X is enabled!")
		})
	}

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
