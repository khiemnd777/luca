package app

import (
	"errors"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/khiemnd777/noah_api/shared/config"
)

func setupAppConfigForTests() {
	config.SetForTests(&config.AppConfig{
		Server: config.ServerConfig{
			Host: "127.0.0.1",
			Port: 8080,
		},
		Retry: config.RetryConfig{
			MaxAttempts: 3,
			Delay:       time.Millisecond,
		},
		CircuitBreaker: config.CircuitBreakerConfig{
			Interval:            time.Second,
			Timeout:             time.Second,
			ConsecutiveFailures: 5,
		},
	})
}

func TestWrapHandlerPostDoesNotRetryByDefault(t *testing.T) {
	setupAppConfigForTests()

	app := fiber.New()
	attempts := 0

	RouterPost(app, "/resource", func(c *fiber.Ctx) error {
		attempts++
		return errors.New("post-processing failed")
	})

	req := httptest.NewRequest(fiber.MethodPost, "/resource", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", resp.StatusCode)
	}
	if attempts != 1 {
		t.Fatalf("expected 1 attempt, got %d", attempts)
	}
}

func TestWrapHandlerGetRetriesByDefault(t *testing.T) {
	setupAppConfigForTests()

	app := fiber.New()
	attempts := 0

	RouterGet(app, "/resource", func(c *fiber.Ctx) error {
		attempts++
		if attempts < 3 {
			return fiber.NewError(fiber.StatusInternalServerError, "transient")
		}
		return c.SendString("ok")
	})

	req := httptest.NewRequest(fiber.MethodGet, "/resource", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}
	if attempts != 3 {
		t.Fatalf("expected 3 attempts, got %d", attempts)
	}
}

func TestWrapHandlerPostCanRetryWithExplicitOptions(t *testing.T) {
	setupAppConfigForTests()

	app := fiber.New()
	attempts := 0

	RouterPostWithOptions(app, "/resource", RetryOptions{
		MaxAttempts: 3,
		Delay:       time.Millisecond,
	}, func(c *fiber.Ctx) error {
		attempts++
		if attempts < 3 {
			return fiber.NewError(fiber.StatusInternalServerError, "transient")
		}
		return c.SendStatus(fiber.StatusCreated)
	})

	req := httptest.NewRequest(fiber.MethodPost, "/resource", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusCreated {
		t.Fatalf("expected status 201, got %d", resp.StatusCode)
	}
	if attempts != 3 {
		t.Fatalf("expected 3 attempts, got %d", attempts)
	}
}

func TestWrapHandlerGetResetsResponseBeforeRetry(t *testing.T) {
	setupAppConfigForTests()

	app := fiber.New()
	attempts := 0

	RouterGet(app, "/resource", func(c *fiber.Ctx) error {
		attempts++
		if attempts < 3 {
			c.Status(fiber.StatusInternalServerError)
			return c.SendString("partial")
		}
		return c.SendString("ok")
	})

	req := httptest.NewRequest(fiber.MethodGet, "/resource", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusInternalServerError {
		t.Fatalf("expected final status 500 due to committed error response, got %d", resp.StatusCode)
	}
	if attempts != 1 {
		t.Fatalf("expected no retry after response commit, got %d attempts", attempts)
	}
}
