package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/khiemnd777/noah_api/modules/main/config"
	"github.com/khiemnd777/noah_api/modules/main/features/dashboard/case_daily_remake_stats/service"
	dashboardshared "github.com/khiemnd777/noah_api/modules/main/features/dashboard/shared"
	"github.com/khiemnd777/noah_api/shared/app"
	"github.com/khiemnd777/noah_api/shared/app/client_error"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils"
)

type CaseDailyRemakeStatsHandler struct {
	svc  service.CaseDailyRemakeStatsService
	deps *module.ModuleDeps[config.ModuleConfig]
}

func NewCaseDailyRemakeStatsHandler(svc service.CaseDailyRemakeStatsService, deps *module.ModuleDeps[config.ModuleConfig]) *CaseDailyRemakeStatsHandler {
	return &CaseDailyRemakeStatsHandler{svc: svc, deps: deps}
}

func (h *CaseDailyRemakeStatsHandler) RegisterRoutes(router fiber.Router) {
	app.RouterGet(router, "/:dept_id<int>/dashboard/case-daily-remake-stats/avg-remake-rate", h.RemakeRate)
}

func (h *CaseDailyRemakeStatsHandler) RemakeRate(c *fiber.Ctx) error {
	departmentID, err := dashboardshared.ResolveAuthorizedDepartmentID(c, h.deps)
	if err != nil {
		return client_error.ResponseError(c, dashboardshared.ErrorStatus(err, fiber.StatusBadRequest), err, err.Error())
	}

	fromDateRaw := utils.GetQueryAsString(c, "from_date")
	if fromDateRaw == "" {
		return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid from_date")
	}
	fromDate, err := utils.ParseDate(fromDateRaw)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, "invalid from_date")
	}

	toDateRaw := utils.GetQueryAsString(c, "to_date")
	if toDateRaw == "" {
		return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid to_date")
	}
	toDate, err := utils.ParseDate(toDateRaw)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, "invalid to_date")
	}

	previousFromRaw := utils.GetQueryAsString(c, "previous_from_date")
	if previousFromRaw == "" {
		return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid previous_from_date")
	}
	previousFrom, err := utils.ParseDate(previousFromRaw)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, "invalid previous_from_date")
	}

	previousToRaw := utils.GetQueryAsString(c, "previous_to_date")
	if previousToRaw == "" {
		return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid previous_to_date")
	}
	previousTo, err := utils.ParseDate(previousToRaw)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, "invalid previous_to_date")
	}

	res, err := h.svc.AvgRemakeRate(
		c.UserContext(),
		&departmentID,
		fromDate,
		toDate,
		previousFrom,
		previousTo,
	)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, err.Error())
	}
	return c.Status(fiber.StatusOK).JSON(res)
}
