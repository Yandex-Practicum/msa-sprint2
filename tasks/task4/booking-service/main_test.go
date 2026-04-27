package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPing(t *testing.T) {
	server := httptest.NewServer(newRouter(false))
	defer server.Close()

	response, err := http.Get(server.URL + "/ping")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.StatusCode)
	}
}

func TestReady(t *testing.T) {
	server := httptest.NewServer(newRouter(false))
	defer server.Close()

	response, err := http.Get(server.URL + "/ready")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.StatusCode)
	}
}

func TestFeatureFlagDisabled(t *testing.T) {
	server := httptest.NewServer(newRouter(false))
	defer server.Close()

	response, err := http.Get(server.URL + "/feature")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", response.StatusCode)
	}
}

func TestFeatureFlagEnabled(t *testing.T) {
	server := httptest.NewServer(newRouter(true))
	defer server.Close()

	response, err := http.Get(server.URL + "/feature")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.StatusCode)
	}
}
