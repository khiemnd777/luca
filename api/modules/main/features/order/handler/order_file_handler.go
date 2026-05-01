package handler

import (
	"errors"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/khiemnd777/noah_api/modules/main/config"
	"github.com/khiemnd777/noah_api/modules/main/features/order/service"
	"github.com/khiemnd777/noah_api/shared/app"
	"github.com/khiemnd777/noah_api/shared/app/client_error"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/middleware/rbac"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils"
)

type OrderFileHandler struct {
	svc  service.OrderFileService
	deps *module.ModuleDeps[config.ModuleConfig]
}

func NewOrderFileHandler(
	svc service.OrderFileService,
	deps *module.ModuleDeps[config.ModuleConfig],
) *OrderFileHandler {
	return &OrderFileHandler{svc: svc, deps: deps}
}

func (h *OrderFileHandler) RegisterRoutes(router fiber.Router) {
	app.RouterGet(router, "/:dept_id<int>/order/:order_id<int>/prescription-files", h.List)
	app.RouterGet(router, "/:dept_id<int>/order/:order_id<int>/prescription-files/:file_id<int>/content", h.Content)
	app.RouterPost(router, "/:dept_id<int>/order/:order_id<int>/prescription-files", h.Upload)
	app.RouterDelete(router, "/:dept_id<int>/order/:order_id<int>/prescription-files/:file_id<int>", h.Delete)
}

func (h *OrderFileHandler) List(c *fiber.Ctx) error {
	if err := rbac.GuardAnyPermission(c, h.deps.Ent.(*generated.Client), "order.view", "order.development"); err != nil {
		return client_error.ResponseError(c, fiber.StatusForbidden, err, err.Error())
	}

	deptID, orderID, err := getPrescriptionRouteIDs(c)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, err.Error())
	}

	files, err := h.svc.List(c.UserContext(), deptID, orderID)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusNotFound, err, err.Error())
	}
	return c.Status(fiber.StatusOK).JSON(files)
}

func (h *OrderFileHandler) Upload(c *fiber.Ctx) error {
	if err := rbac.GuardAnyPermission(c, h.deps.Ent.(*generated.Client), "order.create", "order.update"); err != nil {
		return client_error.ResponseError(c, fiber.StatusForbidden, err, err.Error())
	}

	deptID, orderID, err := getPrescriptionRouteIDs(c)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, err.Error())
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, "file is required")
	}

	dto, err := h.svc.Upload(c.UserContext(), deptID, orderID, fileHeader)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, err.Error())
	}
	return c.Status(fiber.StatusCreated).JSON(dto)
}

func (h *OrderFileHandler) Delete(c *fiber.Ctx) error {
	if err := rbac.GuardAnyPermission(c, h.deps.Ent.(*generated.Client), "order.update"); err != nil {
		return client_error.ResponseError(c, fiber.StatusForbidden, err, err.Error())
	}

	deptID, orderID, err := getPrescriptionRouteIDs(c)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, err.Error())
	}

	fileID, _ := utils.GetParamAsInt(c, "file_id")
	if fileID <= 0 {
		return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid file id")
	}

	if err := h.svc.Delete(c.UserContext(), deptID, orderID, int64(fileID)); err != nil {
		return client_error.ResponseError(c, fiber.StatusNotFound, err, err.Error())
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *OrderFileHandler) Content(c *fiber.Ctx) error {
	if err := rbac.GuardAnyPermission(c, h.deps.Ent.(*generated.Client), "order.view", "order.development"); err != nil {
		return client_error.ResponseError(c, fiber.StatusForbidden, err, err.Error())
	}

	deptID, orderID, err := getPrescriptionRouteIDs(c)
	if err != nil {
		return client_error.ResponseError(c, fiber.StatusBadRequest, err, err.Error())
	}

	fileID, _ := utils.GetParamAsInt(c, "file_id")
	if fileID <= 0 {
		return client_error.ResponseError(c, fiber.StatusBadRequest, nil, "invalid file id")
	}

	filePath, mimeType, fileName, err := h.svc.GetFilePath(c.UserContext(), deptID, orderID, int64(fileID))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return client_error.ResponseError(c, fiber.StatusNotFound, err, "file not found")
		}
		return client_error.ResponseError(c, fiber.StatusNotFound, err, err.Error())
	}

	c.Set(fiber.HeaderContentType, mimeType)
	c.Set("Content-Disposition", "inline; filename=\""+fileName+"\"")
	return c.SendFile(filePath)
}

func getPrescriptionRouteIDs(c *fiber.Ctx) (int, int64, error) {
	deptID, _ := utils.GetDeptIDInt(c)
	orderID, _ := utils.GetParamAsInt(c, "order_id")
	if deptID <= 0 || orderID <= 0 {
		return 0, 0, fiber.NewError(fiber.StatusBadRequest, "invalid order id")
	}
	return deptID, int64(orderID), nil
}
