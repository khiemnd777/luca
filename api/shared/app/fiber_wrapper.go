package app

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/khiemnd777/noah_api/shared/circuitbreaker"
	"github.com/khiemnd777/noah_api/shared/config"
	"github.com/khiemnd777/noah_api/shared/logger"
	"github.com/sony/gobreaker"
)

// RetryOptions configures retry behavior for a route
type RetryOptions struct {
	MaxAttempts int
	Delay       time.Duration
	ShouldRetry func(error) bool
}

func isSafeRetryMethod(method string) bool {
	switch strings.ToUpper(method) {
	case fiber.MethodGet, fiber.MethodHead, fiber.MethodOptions:
		return true
	default:
		return false
	}
}

func defaultMaxAttemptsForMethod(method string, configured int) int {
	if !isSafeRetryMethod(method) {
		return 1
	}
	if configured <= 0 {
		return 1
	}
	return configured
}

func responseWasWritten(c *fiber.Ctx) bool {
	if c == nil {
		return false
	}
	return c.Response().StatusCode() != fiber.StatusOK || len(c.Response().Body()) > 0
}

func buildRouteRetryOptions(method string, opts []RetryOptions) RetryOptions {
	cfgRetry := config.Get().Retry
	defaultRetry := RetryOptions{
		MaxAttempts: defaultMaxAttemptsForMethod(method, cfgRetry.MaxAttempts),
		Delay:       cfgRetry.Delay,
		ShouldRetry: func(err error) bool {
			if errors.Is(err, circuitbreaker.ErrClientResponse) || errors.Is(err, gobreaker.ErrOpenState) {
				return false
			}
			if ferr, ok := err.(*fiber.Error); ok && ferr.Code >= 400 && ferr.Code < 500 {
				return false
			}
			return err != nil
		},
	}

	if len(opts) == 0 {
		return defaultRetry
	}

	merged := opts[0]
	if merged.ShouldRetry == nil {
		merged.ShouldRetry = defaultRetry.ShouldRetry
	}
	if merged.MaxAttempts <= 0 {
		merged.MaxAttempts = defaultRetry.MaxAttempts
	}
	if merged.Delay == 0 {
		merged.Delay = defaultRetry.Delay
	}
	return merged
}

func isWebSocketRequest(c *fiber.Ctx) bool {
	// RFC 6455
	if c.Method() != fiber.MethodGet {
		return false
	}
	if strings.ToLower(c.Get("Upgrade")) != "websocket" {
		return false
	}
	if !strings.Contains(strings.ToLower(c.Get("Connection")), "upgrade") {
		return false
	}
	return true
}

// WrapHandler applies Circuit Breaker + Retry logic to a single handler
func WrapHandler(name string, h fiber.Handler, opts ...RetryOptions) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if isWebSocketRequest(c) {
			logger.Info("🔌 WS bypass circuit: " + name)
			return h(c)
		}

		method := c.Method()
		callName := fmt.Sprintf("%s %s", method, name)
		retry := buildRouteRetryOptions(method, opts)

		var err error
		for i := 0; i < retry.MaxAttempts; i++ {
			if i > 0 {
				c.Response().Reset()
			}

			_, err = circuitbreaker.Run(callName, func(ctx context.Context) (interface{}, error) {
				handleErr := h(c)

				if ferr, ok := handleErr.(*fiber.Error); ok && ferr.Code >= 400 && ferr.Code < 500 {
					return nil, circuitbreaker.ErrClientResponse
				}

				if handleErr == nil {
					statusCode := c.Response().StatusCode()
					if statusCode >= fiber.StatusBadRequest && statusCode < fiber.StatusInternalServerError {
						return nil, circuitbreaker.ErrClientResponse
					}
				}

				return nil, handleErr
			})

			if errors.Is(err, circuitbreaker.ErrClientResponse) {
				return nil
			}

			if err == nil || !retry.ShouldRetry(err) {
				return err
			}

			if !isSafeRetryMethod(method) && responseWasWritten(c) {
				return err
			}

			if i == retry.MaxAttempts-1 {
				break
			}

			logger.Warn(fmt.Sprintf("🔁 Retry [%s] #%d failed: %v", callName, i+1, err))
			time.Sleep(retry.Delay)
		}

		log.Printf("❌ Handler failed after retries: %s", callName)
		return err
	}
}

// WrapHandlers applies middleware(s) and wraps the final handler with CB + Retry
func WrapHandlers(name string, handlers []fiber.Handler, opts ...RetryOptions) []fiber.Handler {
	if len(handlers) == 0 {
		panic("no handlers provided")
	}
	last := handlers[len(handlers)-1]
	middlewares := handlers[:len(handlers)-1]
	wrapped := WrapHandler(name, last, opts...)
	return append(middlewares, wrapped)
}
