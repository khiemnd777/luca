package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/khiemnd777/noah_api/modules/main/config"
	"github.com/khiemnd777/noah_api/modules/main/features/dashboard/activity_due_today/service"
	dashboardshared "github.com/khiemnd777/noah_api/modules/main/features/dashboard/shared"
	"github.com/khiemnd777/noah_api/shared/app"
	"github.com/khiemnd777/noah_api/shared/app/client_error"
	"github.com/khiemnd777/noah_api/shared/module"
)

type DueTodayHandler struct {
	svc  service.DueTodayService
	deps *module.ModuleDeps[config.ModuleConfig]
}

func NewDueTodayHandler(svc service.DueTodayService, deps *module.ModuleDeps[config.ModuleConfig]) *DueTodayHandler {
	return &DueTodayHandler{svc: svc, deps: deps}
}

func (h *DueTodayHandler) RegisterRoutes(router fiber.Router) {
	app.RouterGet(router, "/:dept_id<int>/dashboard/due-today", h.DueToday)
}

func (h *DueTodayHandler) DueToday(c *fiber.Ctx) error {
	deptID, err := dashboardshared.ResolveAuthorizedDepartmentID(c, h.deps)
	if err != nil {
		return client_error.ResponseError(c, dashboardshared.ErrorStatus(err, fiber.StatusBadRequest), err, err.Error())
	}

	res, err := h.svc.DueToday(
		c.UserContext(),
		deptID,
	)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, err.Error())
	}
	return c.Status(fiber.StatusOK).JSON(res)
}
