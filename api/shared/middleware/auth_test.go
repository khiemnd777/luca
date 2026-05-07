package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/khiemnd777/noah_api/shared/utils"
)

func TestRequireAuthRejectsSelectionTokenPurpose(t *testing.T) {
	t.Setenv("JWT_TOKEN_SECRET", "test-secret")
	token, err := utils.GenerateJWTToken("test-secret", utils.JWTTokenPayload{
		UserID:  10,
		Purpose: "department_selection",
		Exp:     time.Now().Add(time.Minute),
	})
	if err != nil {
		t.Fatalf("GenerateJWTToken() error = %v", err)
	}

	app := fiber.New()
	app.Use(RequireAuth())
	app.Get("/protected", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected %d, got %d", fiber.StatusUnauthorized, res.StatusCode)
	}
}

func TestRequireAuthRejectsTokenWithoutDepartmentID(t *testing.T) {
	t.Setenv("JWT_TOKEN_SECRET", "test-secret")
	token, err := utils.GenerateJWTToken("test-secret", utils.JWTTokenPayload{
		UserID: 10,
		Email:  "user@example.test",
		Exp:    time.Now().Add(time.Minute),
	})
	if err != nil {
		t.Fatalf("GenerateJWTToken() error = %v", err)
	}

	app := fiber.New()
	app.Use(RequireAuth())
	app.Get("/protected", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}
	if res.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected %d, got %d", fiber.StatusUnauthorized, res.StatusCode)
	}
}
