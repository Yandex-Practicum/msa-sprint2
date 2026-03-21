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
		w.WriteHeader(http.StatusOK)
		// v1
		if os.Getenv("ENABLE_FEATURE_X") == "false" {
			w.Write([]byte("pong-v1"))
		}

		// v2
		if os.Getenv("ENABLE_FEATURE_X") == "true" {
			w.Write([]byte("pong-v2"))
		}
	})

	// health and readiness endpoints
	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, "ok")
	})
	http.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, "ready")
	})

	// if ENABLE_FEATURE_X=true, expose /feature
	if enableFeatureX {
		http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "Feature X is enabled!")
		})
	}

	log.Println("Server running on :8080, ENABLE_FEATURE_X=", enableFeatureX)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
