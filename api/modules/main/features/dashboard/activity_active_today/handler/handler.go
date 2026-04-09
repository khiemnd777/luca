package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/khiemnd777/noah_api/modules/main/config"
	"github.com/khiemnd777/noah_api/modules/main/features/dashboard/activity_active_today/service"
	dashboardshared "github.com/khiemnd777/noah_api/modules/main/features/dashboard/shared"
	"github.com/khiemnd777/noah_api/shared/app"
	"github.com/khiemnd777/noah_api/shared/app/client_error"
	"github.com/khiemnd777/noah_api/shared/module"
)

type ActiveTodayHandler struct {
	svc  service.ActiveTodayService
	deps *module.ModuleDeps[config.ModuleConfig]
}

func NewActiveTodayHandler(svc service.ActiveTodayService, deps *module.ModuleDeps[config.ModuleConfig]) *ActiveTodayHandler {
	return &ActiveTodayHandler{svc: svc, deps: deps}
}

func (h *ActiveTodayHandler) RegisterRoutes(router fiber.Router) {
	app.RouterGet(router, "/:dept_id<int>/dashboard/active-today", h.ActiveToday)
}

func (h *ActiveTodayHandler) ActiveToday(c *fiber.Ctx) error {
	deptID, err := dashboardshared.ResolveAuthorizedDepartmentID(c, h.deps)
	if err != nil {
		return client_error.ResponseError(c, dashboardshared.ErrorStatus(err, fiber.StatusBadRequest), err, err.Error())
	}

	res, err := h.svc.ActiveToday(
		c.UserContext(),
		deptID,
	)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, err.Error())
	}
	return c.Status(fiber.StatusOK).JSON(res)
}
