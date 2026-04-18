package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func pingHandler(w http.ResponseWriter, r *http.Request) {
	if os.Getenv("ENABLE_FEATURE_X") == "true" {
		fmt.Fprint(w, "pong-feature-x")
		return
	}
	fmt.Fprint(w, "pong")
}

func readyHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "ready")
}

func main() {
	http.HandleFunc("/ping", pingHandler)
	http.HandleFunc("/ready", readyHandler)

	port := "8080"
	log.Printf("booking-service started on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}