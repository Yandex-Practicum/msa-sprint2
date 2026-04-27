package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func newRouter(enableFeatureX bool, version string) http.Handler {
	if version == "" {
		version = "v1"
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		if version == "v1" && r.Header.Get("X-Force-Fail") == "true" {
			http.Error(w, "forced v1 failure", http.StatusInternalServerError)
			return
		}
		fmt.Fprintf(w, "pong %s", version)
	})

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "ok")
	})

	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "ready")
	})

	mux.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "%s", version)
	})

	if enableFeatureX {
		mux.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "Feature X is enabled on %s", version)
		})
	}

	return mux
}

func main() {
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"
	version := os.Getenv("SERVICE_VERSION")

	log.Printf("Server running on :8080, version=%s, featureX=%t", version, enableFeatureX)
	log.Fatal(http.ListenAndServe(":8080", newRouter(enableFeatureX, version)))
}
