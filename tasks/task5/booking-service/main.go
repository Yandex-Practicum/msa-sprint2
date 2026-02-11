package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	version := os.Getenv("SERVICE_VERSION")
	if version == "" {
		version = "v1"
	}
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"

	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		featureEnabled := r.Header.Get("X-Feature-Enabled") == "true"
		if featureEnabled || version == "v2" {
			fmt.Fprintf(w, "pong (%s, feature-enabled)", version)
		} else {
			fmt.Fprintf(w, "pong (%s)", version)
		}
	})

	if enableFeatureX || version == "v2" {
		http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "Feature X is enabled! (version: %s)", version)
		})
	}

	log.Printf("Server running on :8080 [version=%s, featureX=%v]", version, enableFeatureX)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
