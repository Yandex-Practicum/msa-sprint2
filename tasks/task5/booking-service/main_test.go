package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPingDefaultV1(t *testing.T) {
	t.Setenv("ENABLE_FEATURE_X", "false")
	t.Setenv("APP_VERSION", "v1")
	handler := newHandler()

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	if rec.Body.String() != "pong-v1" {
		t.Fatalf("expected body %q, got %q", "pong-v1", rec.Body.String())
	}
}

func TestFeatureEnabledInV2ByHeader(t *testing.T) {
	t.Setenv("ENABLE_FEATURE_X", "false")
	t.Setenv("APP_VERSION", "v2")
	handler := newHandler()

	req := httptest.NewRequest(http.MethodGet, "/feature", nil)
	req.Header.Set("X-Feature-Enabled", "true")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	if rec.Body.String() != "feature-x-enabled-v2" {
		t.Fatalf("expected body %q, got %q", "feature-x-enabled-v2", rec.Body.String())
	}
}

func TestFeatureDisabledWithoutFlag(t *testing.T) {
	t.Setenv("ENABLE_FEATURE_X", "false")
	t.Setenv("APP_VERSION", "v2")
	handler := newHandler()

	req := httptest.NewRequest(http.MethodGet, "/feature", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d", http.StatusNotFound, rec.Code)
	}
}

func TestV1SimulatedError(t *testing.T) {
	t.Setenv("ENABLE_FEATURE_X", "false")
	t.Setenv("APP_VERSION", "v1")
	handler := newHandler()

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	req.Header.Set("X-Simulate-Error", "true")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status %d, got %d", http.StatusServiceUnavailable, rec.Code)
	}
}
