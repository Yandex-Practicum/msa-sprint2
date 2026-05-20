package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPingHandlerV2(t *testing.T) {
	req, _ := http.NewRequest("GET", "/ping", nil)
	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(pingHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("wrong status: got %v want %v", status, http.StatusOK)
	}

	if rr.Body.String() != "pong" {
		t.Errorf("wrong body: got %v want %v", rr.Body.String(), "pong")
	}

	if rr.Header().Get("X-Version") != "v2" {
		t.Errorf("wrong version header: got %v want v2", rr.Header().Get("X-Version"))
	}
}

func TestHealthHandlerV2(t *testing.T) {
	req, _ := http.NewRequest("GET", "/health", nil)
	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(healthHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("wrong status: got %v want %v", status, http.StatusOK)
	}

	if rr.Header().Get("X-Version") != "v2" {
		t.Errorf("wrong version header")
	}
}

func TestFeatureHandlerV2(t *testing.T) {
	// Test with feature enabled
	req, _ := http.NewRequest("GET", "/feature", nil)
	req.Header.Set("X-Feature-Enabled", "true")
	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(featureHandler)
	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("wrong status: got %v want %v", status, http.StatusOK)
	}

	if rr.Header().Get("X-Version") != "v2" {
		t.Errorf("wrong version header")
	}

	if rr.Header().Get("X-Feature-Status") != "enabled" {
		t.Errorf("feature not enabled")
	}

	// Test without feature header
	req2, _ := http.NewRequest("GET", "/feature", nil)
	rr2 := httptest.NewRecorder()
	handler.ServeHTTP(rr2, req2)

	if rr2.Body.String() != "v2 response" {
		t.Errorf("wrong body for default: got %v", rr2.Body.String())
	}
}