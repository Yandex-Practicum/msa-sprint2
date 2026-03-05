package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	appVersion := os.Getenv("APP_VERSION")
	if appVersion == "" {
		appVersion = "v1"
	}

	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true" || appVersion == "v2"

	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "pong-%s", appVersion)
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "ok")
	})

	http.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "booking-service version: %s", appVersion)
	})

	if enableFeatureX {
		http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "Feature X is enabled! (version: %s)", appVersion)
		})
	}

	log.Printf("Server running on :8080 (version: %s, feature-x: %v)", appVersion, enableFeatureX)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
