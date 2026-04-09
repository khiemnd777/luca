package handler

import (
	"github.com/gofiber/fiber/v2"

	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/modules/main/features/dashboard/case_daily_sales_stats/service"
	dashboardshared "github.com/khiemnd777/noah_api/modules/main/features/dashboard/shared"
	"github.com/khiemnd777/noah_api/shared/app"
	"github.com/khiemnd777/noah_api/shared/app/client_error"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils"
)

type CaseDailySalesStatsHandler struct {
	svc  service.CaseDailySalesStatsService
	deps *module.ModuleDeps[config.ModuleConfig]
}

func NewCaseDailySalesStatsHandler(svc service.CaseDailySalesStatsService, deps *module.ModuleDeps[config.ModuleConfig]) *CaseDailySalesStatsHandler {
	return &CaseDailySalesStatsHandler{svc: svc, deps: deps}
}

func (h *CaseDailySalesStatsHandler) RegisterRoutes(router fiber.Router) {
	app.RouterGet(router, "/:dept_id<int>/dashboard/case-daily-sales-stats/summary", h.Summary)
	app.RouterGet(router, "/:dept_id<int>/dashboard/case-daily-sales-stats/daily", h.Daily)
	app.RouterGet(router, "/:dept_id<int>/dashboard/case-daily-sales-stats/report", h.GetReport)
}

func (h *CaseDailySalesStatsHandler) Summary(c *fiber.Ctx) error {
	deptID, err := dashboardshared.ResolveAuthorizedDepartmentID(c, h.deps)
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

	res, err := h.svc.Summary(
		c.UserContext(),
		deptID,
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

func (h *CaseDailySalesStatsHandler) Daily(c *fiber.Ctx) error {
	deptID, err := dashboardshared.ResolveAuthorizedDepartmentID(c, h.deps)
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

	res, err := h.svc.Daily(c.UserContext(), deptID, fromDate, toDate)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, err.Error())
	}

	return c.Status(fiber.StatusOK).JSON(res)
}

func (h *CaseDailySalesStatsHandler) GetReport(c *fiber.Ctx) error {
	deptID, err := dashboardshared.ResolveAuthorizedDepartmentID(c, h.deps)
	if err != nil {
		return client_error.ResponseError(c, dashboardshared.ErrorStatus(err, fiber.StatusBadRequest), err, err.Error())
	}

	rangeRaw := utils.GetQueryAsString(c, "range")
	if rangeRaw == "" {
		return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid range")
	}

	r := model.Range(rangeRaw)
	switch r {
	case model.RangeToday, model.Range7d, model.Range30d:
	default:
		return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid range")
	}

	res, err := h.svc.GetReport(c.UserContext(), deptID, r)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusInternalServerError, err, err.Error())
	}

	return c.Status(fiber.StatusOK).JSON(res)
}
