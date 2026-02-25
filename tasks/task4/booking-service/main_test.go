package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPing(t *testing.T) {
	t.Setenv("ENABLE_FEATURE_X", "false")
	handler := newHandler()

	req := httptest.NewRequest(http.MethodGet, "/ping", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("ожидался статус %d, получен %d", http.StatusOK, rec.Code)
	}

	if rec.Body.String() != "pong" {
		t.Fatalf("ожидалось тело pong, получено %q", rec.Body.String())
	}
}

func TestReady(t *testing.T) {
	t.Setenv("ENABLE_FEATURE_X", "false")
	handler := newHandler()

	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("ожидался статус %d, получен %d", http.StatusOK, rec.Code)
	}

	if rec.Body.String() != "ready" {
		t.Fatalf("ожидалось тело ready, получено %q", rec.Body.String())
	}
}

func TestFeatureEnabled(t *testing.T) {
	t.Setenv("ENABLE_FEATURE_X", "true")
	handler := newHandler()

	req := httptest.NewRequest(http.MethodGet, "/feature", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("ожидался статус %d, получен %d", http.StatusOK, rec.Code)
	}
}

func TestFeatureDisabled(t *testing.T) {
	t.Setenv("ENABLE_FEATURE_X", "false")
	handler := newHandler()

	req := httptest.NewRequest(http.MethodGet, "/feature", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("ожидался статус %d, получен %d", http.StatusNotFound, rec.Code)
	}
}
