package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"
	app_version, app_version_exists := os.LookupEnv("APP_VERSION")

	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
	    if !app_version_exists {
		    fmt.Fprintf(w, fmt.Sprintf("pong %v", app_version_exists))
		} else {
		    log.Println(fmt.Sprintf("pong %s", app_version))
            fmt.Fprintf(w, fmt.Sprintf("pong %s", app_version))
        }
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
