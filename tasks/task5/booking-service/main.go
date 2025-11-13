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

	http.HandleFunc("/hello", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello!")
	})

	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		if enableFeatureX {
			fmt.Fprintf(w, "pong-v2")
		} else {
			fmt.Fprintf(w, "pong-v1")
		}
	})

	if enableFeatureX {
		http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "Feature X is enabled!")
		})
	}

	log.Println("Server running on :8080 with version", version)
	log.Println("Server running on :8080 with enableFeatureX", enableFeatureX)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
