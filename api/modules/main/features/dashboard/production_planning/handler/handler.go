package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	planningservice "github.com/khiemnd777/noah_api/modules/main/features/dashboard/production_planning/service"
	dashboardshared "github.com/khiemnd777/noah_api/modules/main/features/dashboard/shared"
	"github.com/khiemnd777/noah_api/shared/app"
	"github.com/khiemnd777/noah_api/shared/app/client_error"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/middleware/rbac"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils"
)

type ProductionPlanningHandler struct {
	svc  planningservice.ProductionPlanningService
	deps *module.ModuleDeps[config.ModuleConfig]
}

func NewProductionPlanningHandler(
	svc planningservice.ProductionPlanningService,
	deps *module.ModuleDeps[config.ModuleConfig],
) *ProductionPlanningHandler {
	return &ProductionPlanningHandler{svc: svc, deps: deps}
}

func (h *ProductionPlanningHandler) RegisterRoutes(router fiber.Router) {
	app.RouterGet(router, "/:dept_id<int>/dashboard/production-planning/overview", h.Overview)
	app.RouterGet(router, "/:dept_id<int>/dashboard/production-planning/config", h.GetConfig)
	app.RouterPut(router, "/:dept_id<int>/dashboard/production-planning/config", h.SaveConfig)
	app.RouterPost(router, "/:dept_id<int>/dashboard/production-planning/recommendations/:id/apply", h.ApplyRecommendation)
}

func (h *ProductionPlanningHandler) Overview(c *fiber.Ctx) error {
	deptID, err := dashboardshared.ResolveAuthorizedDepartmentID(c, h.deps)
	if err != nil {
		return client_error.ResponseError(c, dashboardshared.ErrorStatus(err, fiber.StatusBadRequest), err, err.Error())
	}
	res, err := h.svc.Overview(c.UserContext(), deptID)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, err.Error())
	}
	return c.Status(fiber.StatusOK).JSON(res)
}

func (h *ProductionPlanningHandler) GetConfig(c *fiber.Ctx) error {
	deptID, err := dashboardshared.ResolveAuthorizedDepartmentID(c, h.deps)
	if err != nil {
		return client_error.ResponseError(c, dashboardshared.ErrorStatus(err, fiber.StatusBadRequest), err, err.Error())
	}
	res, err := h.svc.GetConfig(c.UserContext(), deptID)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, err.Error())
	}
	return c.Status(fiber.StatusOK).JSON(res)
}

func (h *ProductionPlanningHandler) SaveConfig(c *fiber.Ctx) error {
	if err := rbac.GuardAnyPermission(c, h.deps.Ent.(*generated.Client), "production_planning.manage"); err != nil {
		return client_error.ResponseError(c, fiber.StatusForbidden, err, err.Error())
	}
	deptID, ok := utils.GetDeptIDInt(c)
	if !ok || deptID <= 0 {
		return client_error.ResponseError(c, fiber.StatusUnauthorized, nil, "unauthorized")
	}
	payload, err := app.ParseBody[model.ProductionPlanningConfigDTO](c)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, "invalid body")
	}
	res, err := h.svc.SaveConfig(c.UserContext(), deptID, payload)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, err.Error())
	}
	return c.Status(fiber.StatusOK).JSON(res)
}

func (h *ProductionPlanningHandler) ApplyRecommendation(c *fiber.Ctx) error {
	if err := rbac.GuardAnyPermission(c, h.deps.Ent.(*generated.Client), "order.development", "order.edit"); err != nil {
		return client_error.ResponseError(c, fiber.StatusForbidden, err, err.Error())
	}
	deptID, ok := utils.GetDeptIDInt(c)
	if !ok || deptID <= 0 {
		return client_error.ResponseError(c, fiber.StatusUnauthorized, nil, "unauthorized")
	}
	userID, ok := utils.GetUserIDInt(c)
	if !ok || userID <= 0 {
		return client_error.ResponseError(c, fiber.StatusUnauthorized, nil, "unauthorized")
	}
	recommendationID := c.Params("id")
	payload, err := app.ParseBody[model.ProductionPlanningApplyRecommendationRequestDTO](c)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, "invalid body")
	}
	res, err := h.svc.ApplyRecommendation(c.UserContext(), deptID, userID, recommendationID, *payload)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, err.Error())
	}
	return c.Status(fiber.StatusOK).JSON(res)
}
