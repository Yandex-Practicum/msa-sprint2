package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func newRouter(enableFeatureX bool) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "pong")
	})

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "ok")
	})

	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "ready")
	})

	if enableFeatureX {
		mux.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "Feature X is enabled!")
		})
	}

	return mux
}

func main() {
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", newRouter(enableFeatureX)))
}
