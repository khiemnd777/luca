package brand

import (
	"github.com/gofiber/fiber/v2"

	"github.com/khiemnd777/noah_api/modules/main/config"
	"github.com/khiemnd777/noah_api/modules/main/features/brand/handler"
	"github.com/khiemnd777/noah_api/modules/main/features/brand/repository"
	"github.com/khiemnd777/noah_api/modules/main/features/brand/service"
	catalogrefcode "github.com/khiemnd777/noah_api/modules/main/features/catalog_ref_code"
	"github.com/khiemnd777/noah_api/modules/main/registry"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/metadata/customfields"
	"github.com/khiemnd777/noah_api/shared/module"
)

type feature struct{}

func (feature) ID() string    { return "brand" }
func (feature) Priority() int { return 90 }

func (feature) Register(router fiber.Router, deps *module.ModuleDeps[config.ModuleConfig], cfMgr *customfields.Manager) error {
	codeSvc := catalogrefcode.NewService()
	repo := repository.NewBrandNameRepository(deps.Ent.(*generated.Client), deps, codeSvc)
	svc := service.NewBrandNameService(repo, deps)
	h := handler.NewBrandNameHandler(svc, deps)
	h.RegisterRoutes(router)

	importRepo := repository.NewBrandNameImportRepository(deps.DB, codeSvc)
	importSvc := service.NewBrandNameImportService(importRepo, deps.DB)
	importHandler := handler.NewBrandNameImportHandler(importSvc, deps)
	importHandler.RegisterRoutes(router)
	return nil
}

func init() { registry.Register(feature{}) }
