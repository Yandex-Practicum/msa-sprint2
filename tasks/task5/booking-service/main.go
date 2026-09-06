package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
)

// Тот же сервис, что в task4, расширенный дляработы под Istio: 
// читает версию из окружения VERSION и отдаёт её в /version,
// чтобы при канареечном тесте можно было отличить ответы v1 от v2.
//
// Endpoints:
//   /ping    -> pong                        (liveness/readiness probe)
//   /health  -> ok                          (healthcheck endpoint)
//   /ready   -> ready                       (readiness endpoint)
//   /version -> JSON {"version","feature_x"} (кто ответил: v1 или v2)
//   /feature -> Feature X is enabled!       (только при ENABLE_FEATURE_X=true)
func main() {
	version := os.Getenv("VERSION")
	if version == "" {
		version = "v1"
	}
	enableFeatureX := os.Getenv("ENABLE_FEATURE_X") == "true"
	log.Printf("VERSION=%s ENABLE_FEATURE_X=%v", version, enableFeatureX)

	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "pong")
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "ok")
	})

	http.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "ready")
	})

	// Версия + состояние фича-флага — для проверки канарейки и фича-флага.
	http.HandleFunc("/version", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"version":   version,
			"feature_x": enableFeatureX,
		})
	})

	// Feature flag: если ENABLE_FEATURE_X=true, expose /feature
	if enableFeatureX {
		http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			fmt.Fprintf(w, "Feature X is enabled!")
		})
	} else {
		// /feature существует, но возвращает 404/disabled
		http.HandleFunc("/feature", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprintf(w, "Feature X is disabled")
		})
	}

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
