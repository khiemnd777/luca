package middleware

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/khiemnd777/noah_api/shared/app/client_error"
	"github.com/khiemnd777/noah_api/shared/logger"
	"github.com/khiemnd777/noah_api/shared/utils"
)

func RequireAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			return client_error.ResponseError(c, fiber.StatusUnauthorized, nil, "Missing or invalid Authorization header")
		}

		tokenStr := strings.TrimPrefix(header, "Bearer ")

		claims, ok, err := utils.GetJWTClaims(c)

		if !ok || err != nil {
			return client_error.ResponseError(c, fiber.StatusUnauthorized, err, "Invalid token claims")
		}

		if purpose, _ := claims["purpose"].(string); purpose != "" {
			return client_error.ResponseError(c, fiber.StatusUnauthorized, nil, "Invalid token purpose")
		}

		userID, userOK := jwtClaimInt(claims["user_id"])
		deptID, deptOK := jwtClaimInt(claims["dept_id"])
		if !userOK || userID <= 0 || !deptOK || deptID <= 0 {
			return client_error.ResponseError(c, fiber.StatusUnauthorized, nil, "Invalid token claims")
		}

		c.Locals("userID", userID)
		c.Locals("deptID", deptID)

		// Inject token into context for downstream access
		ctxWithToken := utils.SetAccessTokenIntoContext(c.UserContext(), tokenStr)
		ctxWithToken = logger.ContextWithFields(ctxWithToken, map[string]any{
			"user_id":       userID,
			"department_id": deptID,
		})
		c.SetUserContext(ctxWithToken)

		return c.Next()
	}
}

func jwtClaimInt(raw any) (int, bool) {
	switch v := raw.(type) {
	case float64:
		return int(v), true
	case int:
		return v, true
	case int64:
		return int(v), true
	case string:
		var out int
		if _, err := fmt.Sscanf(v, "%d", &out); err != nil {
			return 0, false
		}
		return out, true
	default:
		return 0, false
	}
}

func RequireInternal() fiber.Handler {
	// Only use for internal audit, trace, impersonate, và trust-based routing.
	return func(c *fiber.Ctx) error {
		token := c.Get("X-Internal-Token")
		baseIntrTkn := utils.GetInternalToken()
		if token != baseIntrTkn {
			return c.Status(401).SendString("Unauthorized internal call")
		}
		return c.Next()
	}
}
