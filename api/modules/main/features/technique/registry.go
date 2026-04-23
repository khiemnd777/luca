package technique

import (
	"github.com/gofiber/fiber/v2"

	"github.com/khiemnd777/noah_api/modules/main/config"
	catalogrefcode "github.com/khiemnd777/noah_api/modules/main/features/catalog_ref_code"
	"github.com/khiemnd777/noah_api/modules/main/features/technique/handler"
	"github.com/khiemnd777/noah_api/modules/main/features/technique/repository"
	"github.com/khiemnd777/noah_api/modules/main/features/technique/service"
	"github.com/khiemnd777/noah_api/modules/main/registry"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/metadata/customfields"
	"github.com/khiemnd777/noah_api/shared/module"
)

type feature struct{}

func (feature) ID() string    { return "technique" }
func (feature) Priority() int { return 90 }

func (feature) Register(router fiber.Router, deps *module.ModuleDeps[config.ModuleConfig], cfMgr *customfields.Manager) error {
	codeSvc := catalogrefcode.NewService()
	repo := repository.NewTechniqueRepository(deps.Ent.(*generated.Client), deps, codeSvc)
	svc := service.NewTechniqueService(repo, deps)
	h := handler.NewTechniqueHandler(svc, deps)
	h.RegisterRoutes(router)

	importRepo := repository.NewTechniqueImportRepository(deps.DB, codeSvc)
	importSvc := service.NewTechniqueImportService(importRepo, deps.DB)
	importHandler := handler.NewTechniqueImportHandler(importSvc, deps)
	importHandler.RegisterRoutes(router)
	return nil
}

func init() { registry.Register(feature{}) }
