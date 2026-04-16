package app

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/khiemnd777/noah_api/shared/config"
)

func TestHttpClientPostDoesNotRetryByDefault(t *testing.T) {
	setupAppConfigForTests()

	attempts := 0
	client := &HttpClient{client: &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		attempts++
		return jsonResponse(http.StatusInternalServerError, "boom"), nil
	})}}
	setHTTPClientConfigForTests("example.test")

	err := client.CallRequestWithPort(context.Background(), http.MethodPost, "test", 8080, "/resource", "", "", map[string]any{"name": "demo"}, nil)
	if err == nil {
		t.Fatal("expected error")
	}
	if attempts != 1 {
		t.Fatalf("expected 1 attempt, got %d", attempts)
	}
}

func TestHttpClientGetRetriesByDefault(t *testing.T) {
	setupAppConfigForTests()

	attempts := 0
	client := &HttpClient{client: &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		attempts++
		if attempts < 3 {
			return jsonResponse(http.StatusInternalServerError, "boom"), nil
		}
		return jsonResponse(http.StatusOK, map[string]string{"status": "ok"}), nil
	})}}
	setHTTPClientConfigForTests("example.test")

	var out map[string]string
	err := client.CallRequestWithPort(context.Background(), http.MethodGet, "test", 8080, "/resource", "", "", nil, &out)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if attempts != 3 {
		t.Fatalf("expected 3 attempts, got %d", attempts)
	}
	if out["status"] != "ok" {
		t.Fatalf("expected decoded success payload, got %#v", out)
	}
}

func TestHttpClientPostCanRetryWithExplicitOptionsAndRebuildBody(t *testing.T) {
	setupAppConfigForTests()

	attempts := 0
	bodies := make([]map[string]any, 0, 3)
	client := &HttpClient{client: &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		attempts++
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode body: %v", err)
		}
		bodies = append(bodies, payload)
		if attempts < 3 {
			return jsonResponse(http.StatusInternalServerError, "boom"), nil
		}
		return jsonResponse(http.StatusCreated, nil), nil
	})}}
	setHTTPClientConfigForTests("example.test")

	err := client.CallRequestWithPort(context.Background(), http.MethodPost, "test", 8080, "/resource", "", "", map[string]any{"name": "demo"}, nil, RetryOptions{
		MaxAttempts: 3,
		Delay:       time.Millisecond,
	})
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}
	if attempts != 3 {
		t.Fatalf("expected 3 attempts, got %d", attempts)
	}
	for i, body := range bodies {
		if body["name"] != "demo" {
			t.Fatalf("expected request body to be rebuilt on attempt %d, got %#v", i+1, body)
		}
	}
}

func setHTTPClientConfigForTests(host string) {
	config.SetForTests(&config.AppConfig{
		Server: config.ServerConfig{
			Host: host,
		},
		CircuitBreaker: config.CircuitBreakerConfig{
			Interval:            time.Second,
			Timeout:             time.Second,
			ConsecutiveFailures: 5,
		},
	})
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return fn(r)
}

func jsonResponse(statusCode int, body any) *http.Response {
	var payload []byte
	switch v := body.(type) {
	case nil:
		payload = []byte{}
	case string:
		payload = []byte(v)
	default:
		payload, _ = json.Marshal(v)
	}

	return &http.Response{
		StatusCode: statusCode,
		Body:       io.NopCloser(bytes.NewReader(payload)),
		Header:     make(http.Header),
	}
}
