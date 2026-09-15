package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPing(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	rec := httptest.NewRecorder()
	pingHandler(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Ping status = %d, want %d", rec.Code, http.StatusOK)
	}
	if rec.Body.String() != "pong" {
		t.Fatalf("Ping body = %q, want %q", rec.Body.String(), "pong")
	}
}

func TestReady(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	rec := httptest.NewRecorder()
	readyHandler(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Ready status = %d, want %d", rec.Code, http.StatusOK)
	}
	if rec.Body.String() != `{"status":"ready"}` {
		t.Fatalf("Ready body = %q", rec.Body.String())
	}
}

func TestHealth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	healthHandler(rec, req)

	if rec.Code != http.StatusOK || rec.Body.String() != "ok" {
		t.Fatalf("Health = %d %q, want 200 ok", rec.Code, rec.Body.String())
	}
}

func TestFeatureDisabledByDefault(t *testing.T) {
	featureXEnabled = false
	req := httptest.NewRequest(http.MethodGet, "/feature", nil)
	rec := httptest.NewRecorder()
	featureHandler(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("Feature (disabled) status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestFeatureEnabled(t *testing.T) {
	featureXEnabled = true
	req := httptest.NewRequest(http.MethodGet, "/feature", nil)
	rec := httptest.NewRecorder()
	featureHandler(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Feature (enabled) status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Body.String(); got != "Feature X is enabled!" {
		t.Fatalf("Feature body = %q", got)
	}
	featureXEnabled = false
}