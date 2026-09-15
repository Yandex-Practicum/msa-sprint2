package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPingV1(t *testing.T) {
	serviceVersion = "v1"
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	rec := httptest.NewRecorder()
	pingHandler(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("Ping status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Body.String(); got != "pong (v1)" {
		t.Fatalf("Ping body = %q, want %q", got, "pong (v1)")
	}
	if v := rec.Header().Get("X-Service-Version"); v != "v1" {
		t.Fatalf("X-Service-Version = %q, want v1", v)
	}
}

func TestPingV2WithoutHeader(t *testing.T) {
	serviceVersion = "v2"
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	rec := httptest.NewRecorder()
	pingHandler(rec, req)
	if got := rec.Body.String(); got != "pong (v2)" {
		t.Fatalf("Ping body = %q, want %q", got, "pong (v2)")
	}
}

func TestPingV2FeatureEnabled(t *testing.T) {
	serviceVersion = "v2"
	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set("X-Feature-Enabled", "true")
	rec := httptest.NewRecorder()
	pingHandler(rec, req)
	if got := rec.Body.String(); got != "pong (v2) feature-on" {
		t.Fatalf("Ping body = %q, want %q", got, "pong (v2) feature-on")
	}
}

func TestReady(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	rec := httptest.NewRecorder()
	readyHandler(rec, req)
	if rec.Code != http.StatusOK || rec.Body.String() != `{"status":"ready"}` {
		t.Fatalf("Ready = %d %q", rec.Code, rec.Body.String())
	}
}

func TestHealth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	healthHandler(rec, req)
	if rec.Code != http.StatusOK || rec.Body.String() != "ok" {
		t.Fatalf("Health = %d %q", rec.Code, rec.Body.String())
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
	serviceVersion = "v1"
	req := httptest.NewRequest(http.MethodGet, "/feature", nil)
	rec := httptest.NewRecorder()
	featureHandler(rec, req)
	if rec.Code != http.StatusOK || rec.Body.String() != "Feature X is enabled!" {
		t.Fatalf("Feature (enabled) = %d %q", rec.Code, rec.Body.String())
	}
	featureXEnabled = false
}