package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

var featureXEnabled = false

func pingHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "pong")
}

func readyHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprint(w, `{"status":"ready"}`)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "ok")
}

func featureHandler(w http.ResponseWriter, r *http.Request) {
	if !featureXEnabled {
		http.Error(w, "Feature X is disabled", http.StatusNotFound)
		return
	}
	fmt.Fprint(w, "Feature X is enabled!")
}

func main() {
	featureXEnabled = os.Getenv("ENABLE_FEATURE_X") == "true"

	http.HandleFunc("/ping", pingHandler)
	http.HandleFunc("/ready", readyHandler)
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/feature", featureHandler)

	if featureXEnabled {
		log.Println("ENABLE_FEATURE_X=true: /feature route enabled")
	} else {
		log.Println("ENABLE_FEATURE_X not set: /feature route disabled")
	}

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}