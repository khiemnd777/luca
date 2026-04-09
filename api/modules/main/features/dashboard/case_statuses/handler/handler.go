package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/khiemnd777/noah_api/modules/main/config"
	"github.com/khiemnd777/noah_api/modules/main/features/dashboard/case_statuses/service"
	dashboardshared "github.com/khiemnd777/noah_api/modules/main/features/dashboard/shared"
	"github.com/khiemnd777/noah_api/shared/app"
	"github.com/khiemnd777/noah_api/shared/app/client_error"
	"github.com/khiemnd777/noah_api/shared/module"
)

type CaseStatusesHandler struct {
	svc  service.CaseStatusesService
	deps *module.ModuleDeps[config.ModuleConfig]
}

func NewCaseStatusesHandler(svc service.CaseStatusesService, deps *module.ModuleDeps[config.ModuleConfig]) *CaseStatusesHandler {
	return &CaseStatusesHandler{svc: svc, deps: deps}
}

func (h *CaseStatusesHandler) RegisterRoutes(router fiber.Router) {
	app.RouterGet(router, "/:dept_id<int>/dashboard/case-statuses", h.CaseStatuses)
}

func (h *CaseStatusesHandler) CaseStatuses(c *fiber.Ctx) error {
	deptID, err := dashboardshared.ResolveAuthorizedDepartmentID(c, h.deps)
	if err != nil {
		return client_error.ResponseError(c, dashboardshared.ErrorStatus(err, fiber.StatusBadRequest), err, err.Error())
	}

	res, err := h.svc.CaseStatuses(c.UserContext(), deptID)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, err.Error())
	}

	return c.Status(fiber.StatusOK).JSON(res)
}
