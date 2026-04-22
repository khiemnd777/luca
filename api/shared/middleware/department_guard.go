package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/khiemnd777/noah_api/shared/middleware/rbac"
	"github.com/khiemnd777/noah_api/shared/utils"
)

var crossDepartmentAdminPerms = []string{
	"department.view",
	"department.create",
	"department.update",
	"department.delete",
}

func RequireDepartmentMember(deptIDFromPathParam string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := utils.GetUserIDInt(c)
		if !ok || userID <= 0 {
			return fiber.NewError(fiber.StatusUnauthorized, "unauthorized")
		}

		deptID, ok := utils.GetDeptIDInt(c)
		if !ok || deptID <= 0 {
			return fiber.NewError(fiber.StatusUnauthorized, "unauthorized")
		}

		paramDeptID, err := utils.GetParamAsInt(c, deptIDFromPathParam)
		if err != nil || paramDeptID <= 0 {
			return fiber.NewError(fiber.StatusBadRequest, "invalid department id")
		}

		if permSet, ok := utils.GetPermSetFromClaims(c); ok {
			if rbac.HasAnyPerm(permSet, "department.*") || rbac.HasAllPerms(permSet, crossDepartmentAdminPerms...) {
				return c.Next()
			}
		}

		ok = paramDeptID == deptID

		if !ok {
			return fiber.NewError(fiber.StatusForbidden, "forbidden: not a member of department")
		}
		return c.Next()
	}
}
