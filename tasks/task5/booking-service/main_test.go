package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPing(t *testing.T) {
	server := httptest.NewServer(newRouter(false, "v1"))
	defer server.Close()

	response, err := http.Get(server.URL + "/ping")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.StatusCode)
	}

	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	if string(body) != "pong v1" {
		t.Fatalf("expected pong v1, got %q", string(body))
	}
}

func TestReady(t *testing.T) {
	server := httptest.NewServer(newRouter(false, "v1"))
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

func TestForcedV1Failure(t *testing.T) {
	server := httptest.NewServer(newRouter(false, "v1"))
	defer server.Close()

	request, err := http.NewRequest(http.MethodGet, server.URL+"/ping", nil)
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set("X-Force-Fail", "true")

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", response.StatusCode)
	}
}

func TestForcedFailureDoesNotAffectV2(t *testing.T) {
	server := httptest.NewServer(newRouter(true, "v2"))
	defer server.Close()

	request, err := http.NewRequest(http.MethodGet, server.URL+"/ping", nil)
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set("X-Force-Fail", "true")

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.StatusCode)
	}

	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	if string(body) != "pong v2" {
		t.Fatalf("expected pong v2, got %q", string(body))
	}
}

func TestFeatureFlagDisabled(t *testing.T) {
	server := httptest.NewServer(newRouter(false, "v1"))
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
	server := httptest.NewServer(newRouter(true, "v2"))
	defer server.Close()

	response, err := http.Get(server.URL + "/feature")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.StatusCode)
	}

	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatal(err)
	}
	if string(body) != "Feature X is enabled on v2" {
		t.Fatalf("expected feature response from v2, got %q", string(body))
	}
}
