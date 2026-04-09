package shared

import (
	"io"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/khiemnd777/noah_api/modules/main/config"
	"github.com/khiemnd777/noah_api/shared/module"
)

func TestResolveAuthorizedDepartmentID(t *testing.T) {
	type testCase struct {
		name        string
		query       string
		permissions []string
		wantStatus  int
		wantBody    string
	}

	testCases := []testCase{
		{
			name:        "uses current department without query",
			permissions: []string{"order.view"},
			wantStatus:  fiber.StatusOK,
			wantBody:    "7",
		},
		{
			name:        "allows cross department with department view",
			query:       "?department_id=9",
			permissions: []string{"order.view", "department.view"},
			wantStatus:  fiber.StatusOK,
			wantBody:    "9",
		},
		{
			name:        "rejects cross department without department view",
			query:       "?department_id=9",
			permissions: []string{"order.view"},
			wantStatus:  fiber.StatusForbidden,
			wantBody:    "forbidden",
		},
		{
			name:        "rejects without order view",
			permissions: []string{"department.view"},
			wantStatus:  fiber.StatusForbidden,
			wantBody:    "forbidden",
		},
		{
			name:        "rejects invalid department id",
			query:       "?department_id=abc",
			permissions: []string{"order.view", "department.view"},
			wantStatus:  fiber.StatusBadRequest,
			wantBody:    "invalid department_id",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			app := fiber.New()
			deps := &module.ModuleDeps[config.ModuleConfig]{}

			app.Get("/", func(c *fiber.Ctx) error {
				c.Locals("userID", 1)
				c.Locals("deptID", 7)
				c.Locals("permissions", tc.permissions)

				departmentID, err := ResolveAuthorizedDepartmentID(c, deps)
				if err != nil {
					return c.Status(ErrorStatus(err, fiber.StatusInternalServerError)).SendString(err.Error())
				}

				return c.SendString(strconv.Itoa(departmentID))
			})

			req := httptest.NewRequest(fiber.MethodGet, "/"+tc.query, nil)
			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("app.Test() error = %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tc.wantStatus {
				t.Fatalf("status = %d, want %d", resp.StatusCode, tc.wantStatus)
			}

			body, err := io.ReadAll(resp.Body)
			if err != nil {
				t.Fatalf("read body: %v", err)
			}
			if string(body) != tc.wantBody {
				t.Fatalf("body = %q, want %q", string(body), tc.wantBody)
			}
		})
	}
}
