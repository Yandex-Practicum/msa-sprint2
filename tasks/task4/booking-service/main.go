package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

func newHandler() http.Handler {
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"
	mux := http.NewServeMux()

	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "pong")
	})

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "ok")
	})

	mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "ready")
	})

	if enableFeatureX {
		mux.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "Фича X включена!")
		})
	}

	return mux
}

func main() {
	server := &http.Server{
		Addr:              ":8080",
		Handler:           newHandler(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Println("Сервер запущен на :8080")
	log.Fatal(server.ListenAndServe())
}
