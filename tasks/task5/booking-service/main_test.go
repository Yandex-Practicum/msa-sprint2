package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestPing(t *testing.T) {
	t.Setenv("SERVICE_VERSION", "v1")
	mux := http.NewServeMux()
	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		ver := os.Getenv("SERVICE_VERSION")
		if ver == "" {
			ver = "v1"
		}
		w.Write([]byte("pong " + ver))
	})
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d", rec.Code)
	}
	if rec.Body.String() != "pong v1" {
		t.Fatalf("body %q", rec.Body.String())
	}
}
