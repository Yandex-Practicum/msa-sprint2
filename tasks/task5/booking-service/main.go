package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"
	appVersion := os.Getenv("APP_VERSION")
	if appVersion == "" {
		appVersion = "v1"
	}

	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		// Версия в заголовке нужна, чтобы видеть, какая версия ответила (канареечный релиз в задании 5)
		w.Header().Set("X-App-Version", appVersion)
		fmt.Fprintf(w, "pong")
	})

	// Фича-флаг: при ENABLE_FEATURE_X=true появляется /feature
	if enableFeatureX {
		http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("X-App-Version", appVersion)
			fmt.Fprintf(w, "Feature X is enabled!")
		})
	}

	log.Printf("Server %s running on :8080, feature X enabled: %t", appVersion, enableFeatureX)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
