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
		fmt.Fprintf(w, "pong")
	})

    http.HandleFunc("/flaky", func(w http.ResponseWriter, r *http.Request) {
        if !enableFeatureX {
            log.Println("Simulating an error")
            http.Error(w, "An artificial error", http.StatusInternalServerError)
            return
        }

		fmt.Fprintf(w, "some-response")
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
