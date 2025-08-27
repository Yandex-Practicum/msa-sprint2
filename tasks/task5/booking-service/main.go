package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"
	version := os.Getenv("VERSION")
	if version == "" {
		version = "unknown"
	}
	//ready check
	http.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "ready")
	})
	//health check
	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		response := fmt.Sprintf("pong: %s", version)
		fmt.Fprintf(w, response)
	})

	// TODO: Feature flag route
	// if ENABLE_FEATURE_X=true, expose /feature
	if enableFeatureX {
		http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "Feature X is enabled!")
		})
	}

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
