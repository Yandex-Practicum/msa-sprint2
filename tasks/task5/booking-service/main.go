package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func newHandler() http.Handler {
	baseFeatureEnabled := strings.EqualFold(os.Getenv("ENABLE_FEATURE_X"), "true")
	appVersion := strings.TrimSpace(os.Getenv("APP_VERSION"))
	if appVersion == "" {
		appVersion = "v1"
	}

	isFeatureEnabled := func(r *http.Request) bool {
		if appVersion == "v2" && strings.EqualFold(r.Header.Get("X-Feature-Enabled"), "true") {
			return true
		}
		return baseFeatureEnabled
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		if appVersion == "v1" && strings.EqualFold(r.Header.Get("X-Simulate-Error"), "true") {
			http.Error(w, "v1 simulated error", http.StatusServiceUnavailable)
			return
		}

		w.Header().Set("X-App-Version", appVersion)
		if isFeatureEnabled(r) {
			fmt.Fprintf(w, "pong-%s-feature-on", appVersion)
			return
		}

		fmt.Fprintf(w, "pong-%s", appVersion)
	})

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-App-Version", appVersion)
		fmt.Fprintf(w, "ok")
	})

	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-App-Version", appVersion)
		fmt.Fprintf(w, "ready")
	})

	mux.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-App-Version", appVersion)
		fmt.Fprintf(w, appVersion)
	})

	mux.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
		if !isFeatureEnabled(r) {
			http.NotFound(w, r)
			return
		}

		w.Header().Set("X-App-Version", appVersion)
		fmt.Fprintf(w, "feature-x-enabled-%s", appVersion)
	})

	return mux
}

func main() {
	appVersion := strings.TrimSpace(os.Getenv("APP_VERSION"))
	if appVersion == "" {
		appVersion = "v1"
	}

	server := &http.Server{
		Addr:              ":8080",
		Handler:           newHandler(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("booking-service (%s) is listening on :8080", appVersion)
	log.Fatal(server.ListenAndServe())
}
