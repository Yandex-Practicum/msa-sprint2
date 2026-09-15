package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

var featureXEnabled bool
var serviceVersion = "v1"

func featureHeader(r *http.Request) bool {
	return r.Header.Get("X-Feature-Enabled") == "true"
}

func pingHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("X-Service-Version", serviceVersion)
	if serviceVersion == "v2" && featureHeader(r) {
		fmt.Fprint(w, "pong (v2) feature-on")
		return
	}
	fmt.Fprintf(w, "pong (%s)", serviceVersion)
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
	if serviceVersion == "v2" && featureHeader(r) {
		fmt.Fprint(w, "Feature X is enabled! (v2, X-Feature-Enabled)")
		return
	}
	fmt.Fprint(w, "Feature X is enabled!")
}

func main() {
	serviceVersion = os.Getenv("SERVICE_VERSION")
	if serviceVersion == "" {
		serviceVersion = "v1"
	}
	featureXEnabled = os.Getenv("ENABLE_FEATURE_X") == "true"

	http.HandleFunc("/ping", pingHandler)
	http.HandleFunc("/ready", readyHandler)
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/feature", featureHandler)

	log.Printf("booking-service %s running on :8080 (ENABLE_FEATURE_X=%v)", serviceVersion, featureXEnabled)
	log.Fatal(http.ListenAndServe(":8080", nil))
}