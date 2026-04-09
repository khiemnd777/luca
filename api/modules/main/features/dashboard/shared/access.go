package shared

import (
	"errors"
	"github.com/gofiber/fiber/v2"

	"github.com/khiemnd777/noah_api/modules/main/config"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/middleware/rbac"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils"
)

func ErrorStatus(err error, fallback int) int {
	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) {
		return fiberErr.Code
	}

	return fallback
}

func requireAnyPermission(
	c *fiber.Ctx,
	deps *module.ModuleDeps[config.ModuleConfig],
	permission string,
) error {
	var entClient *generated.Client
	if deps != nil && deps.Ent != nil {
		client, ok := deps.Ent.(*generated.Client)
		if !ok {
			return fiber.NewError(fiber.StatusInternalServerError, "invalid ent client")
		}
		entClient = client
	}

	allowed, err := rbac.HasAnyPermission(c, entClient, permission)
	if err != nil {
		return err
	}
	if !allowed {
		return fiber.NewError(fiber.StatusForbidden, "forbidden")
	}

	return nil
}

func ResolveAuthorizedDepartmentID(
	c *fiber.Ctx,
	deps *module.ModuleDeps[config.ModuleConfig],
) (int, error) {
	if err := requireAnyPermission(c, deps, "order.view"); err != nil {
		return 0, err
	}

	currentDeptID, ok := utils.GetDeptIDInt(c)
	if !ok || currentDeptID <= 0 {
		return 0, fiber.NewError(fiber.StatusUnauthorized, "unauthorized")
	}

	targetDepartmentID, err := utils.GetQueryAsNillableInt(c, "department_id")
	if err != nil {
		return 0, fiber.NewError(fiber.StatusBadRequest, "invalid department_id")
	}
	if targetDepartmentID != nil && *targetDepartmentID <= 0 {
		return 0, fiber.NewError(fiber.StatusBadRequest, "invalid department_id")
	}

	if targetDepartmentID == nil {
		targetDepartmentID = &currentDeptID
	}

	if *targetDepartmentID != currentDeptID {
		if err := requireAnyPermission(c, deps, "department.view"); err != nil {
			return 0, err
		}
	}

	return *targetDepartmentID, nil
}
