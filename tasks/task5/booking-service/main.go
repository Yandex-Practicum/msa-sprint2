package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	// APP_VERSION устанавливается конфигами Deployment.
	version := os.Getenv("APP_VERSION")
	if version == "" {
		version = "v1"
	}

	// ENABLE_FEATURE_X устанавливается конфигами Deployment.
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"

	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		// x-feature-route устанавливается в envoy filter
		x_feature_route_flag := r.Header.Get("x-feature-route"); // Выведем дублирующий флаг, выставляемый в envoy filter
		if r.Header.Get("X-Feature-Enabled") == "true" && version == "v2" {
			fmt.Fprintf(w, "pong-v2 (feature enabled) x_feature_route_flag:%s", x_feature_route_flag)
			return
		}
		fmt.Fprintf(w, "pong-%s  x_feature_route_flag:%s", version, x_feature_route_flag)
	})

	if enableFeatureX {
		http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "Feature X is enabled! (version %s)", version)
		})
	}

	log.Printf("Server running on :8080 (version=%s, feature=%t)", version, enableFeatureX)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
