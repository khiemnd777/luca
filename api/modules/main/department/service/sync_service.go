package service

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/khiemnd777/noah_api/modules/main/config"
	deptmodel "github.com/khiemnd777/noah_api/modules/main/department/model"
	deptrepo "github.com/khiemnd777/noah_api/modules/main/department/repository"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	brandrepo "github.com/khiemnd777/noah_api/modules/main/features/brand/repository"
	brandservice "github.com/khiemnd777/noah_api/modules/main/features/brand/service"
	categoryrepo "github.com/khiemnd777/noah_api/modules/main/features/category/repository"
	categoryservice "github.com/khiemnd777/noah_api/modules/main/features/category/service"
	materialrepo "github.com/khiemnd777/noah_api/modules/main/features/material/repository"
	materialservice "github.com/khiemnd777/noah_api/modules/main/features/material/service"
	processrepo "github.com/khiemnd777/noah_api/modules/main/features/process/repository"
	processservice "github.com/khiemnd777/noah_api/modules/main/features/process/service"
	productrepo "github.com/khiemnd777/noah_api/modules/main/features/product/repository"
	productservice "github.com/khiemnd777/noah_api/modules/main/features/product/service"
	rawmaterialrepo "github.com/khiemnd777/noah_api/modules/main/features/raw_material/repository"
	rawmaterialservice "github.com/khiemnd777/noah_api/modules/main/features/raw_material/service"
	restorationrepo "github.com/khiemnd777/noah_api/modules/main/features/restoration_type/repository"
	restorationservice "github.com/khiemnd777/noah_api/modules/main/features/restoration_type/service"
	sectionrepo "github.com/khiemnd777/noah_api/modules/main/features/section/repository"
	sectionservice "github.com/khiemnd777/noah_api/modules/main/features/section/service"
	techniquerepo "github.com/khiemnd777/noah_api/modules/main/features/technique/repository"
	techniqueservice "github.com/khiemnd777/noah_api/modules/main/features/technique/service"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/metadata/customfields"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils"
)

var (
	ErrDepartmentSyncNoParent = errors.New("department does not have a parent")
	ErrDepartmentSyncStale    = errors.New("sync preview is stale, please review again")
)

type DepartmentSyncer interface {
	PreviewFromParent(ctx context.Context, targetDeptID int) (*deptmodel.DepartmentSyncPreviewDTO, error)
	ApplyFromParent(ctx context.Context, targetDeptID int, previewToken string) (*deptmodel.DepartmentSyncApplyResultDTO, error)
	BootstrapFromSource(ctx context.Context, sourceDeptID int, targetDeptID int) error
}

type departmentSyncer struct {
	db               *generated.Client
	deptRepo         deptrepo.DepartmentRepository
	syncRepo         deptrepo.DepartmentSyncRepository
	categoryMetaRepo categoryrepo.CategoryImportRepository
	categorySvc      categoryservice.CategoryService
	brandSvc         brandservice.BrandNameService
	rawMaterialSvc   rawmaterialservice.RawMaterialService
	techniqueSvc     techniqueservice.TechniqueService
	restorationSvc   restorationservice.RestorationTypeService
	processSvc       processservice.ProcessService
	sectionSvc       sectionservice.SectionService
	materialSvc      materialservice.MaterialService
	productSvc       productservice.ProductService
}

func NewDepartmentSyncer(
	deptRepo deptrepo.DepartmentRepository,
	deps *module.ModuleDeps[config.ModuleConfig],
) DepartmentSyncer {
	cfStore := &customfields.PGStore{DB: deps.DB}
	cfMgr := customfields.NewManager(cfStore)

	return &departmentSyncer{
		db:               deps.Ent.(*generated.Client),
		deptRepo:         deptRepo,
		syncRepo:         deptrepo.NewDepartmentSyncRepository(deps.DB),
		categoryMetaRepo: categoryrepo.NewCategoryImportRepository(deps.Ent.(*generated.Client)),
		categorySvc:      categoryservice.NewCategoryService(categoryrepo.NewCategoryRepository(deps.Ent.(*generated.Client), deps, cfMgr), deps, cfMgr),
		brandSvc:         brandservice.NewBrandNameService(brandrepo.NewBrandNameRepository(deps.Ent.(*generated.Client), deps), deps),
		rawMaterialSvc:   rawmaterialservice.NewRawMaterialService(rawmaterialrepo.NewRawMaterialRepository(deps.Ent.(*generated.Client), deps), deps),
		techniqueSvc:     techniqueservice.NewTechniqueService(techniquerepo.NewTechniqueRepository(deps.Ent.(*generated.Client), deps), deps),
		restorationSvc:   restorationservice.NewRestorationTypeService(restorationrepo.NewRestorationTypeRepository(deps.Ent.(*generated.Client), deps), deps),
		processSvc:       processservice.NewProcessService(processrepo.NewProcessRepository(deps.Ent.(*generated.Client), deps, cfMgr), deps, cfMgr),
		sectionSvc:       sectionservice.NewSectionService(sectionrepo.NewSectionRepository(deps.Ent.(*generated.Client), deps, cfMgr), deps, cfMgr),
		materialSvc:      materialservice.NewMaterialService(materialrepo.NewMaterialRepository(deps.Ent.(*generated.Client), deps, cfMgr), deps, cfMgr),
		productSvc:       productservice.NewProductService(productrepo.NewProductRepository(deps.Ent.(*generated.Client), deps, cfMgr), deps, cfMgr),
	}
}

type syncModuleKey string

const (
	moduleCategory        syncModuleKey = "category"
	moduleBrand           syncModuleKey = "brand_name"
	moduleRawMaterial     syncModuleKey = "raw_material"
	moduleTechnique       syncModuleKey = "technique"
	moduleRestorationType syncModuleKey = "restoration_type"
	moduleProduct         syncModuleKey = "product"
	moduleMaterial        syncModuleKey = "material"
	moduleSection         syncModuleKey = "section"
	moduleProcess         syncModuleKey = "process"
)

type syncSnapshot struct {
	sourceDeptID int
	targetDeptID int

	sourceCategories []deptrepo.DepartmentSyncCategoryRecord
	targetCategories []deptrepo.DepartmentSyncCategoryRecord
	sourceRefs       map[syncModuleKey][]deptrepo.DepartmentSyncSimpleRefRecord
	targetRefs       map[syncModuleKey][]deptrepo.DepartmentSyncSimpleRefRecord
	sourceProcesses  []deptrepo.DepartmentSyncProcessRecord
	targetProcesses  []deptrepo.DepartmentSyncProcessRecord
	sourceSections   []deptrepo.DepartmentSyncSectionRecord
	targetSections   []deptrepo.DepartmentSyncSectionRecord
	sourceMaterials  []deptrepo.DepartmentSyncMaterialRecord
	targetMaterials  []deptrepo.DepartmentSyncMaterialRecord
	sourceProducts   []deptrepo.DepartmentSyncProductRecord
	targetProducts   []deptrepo.DepartmentSyncProductRecord
}

type syncPlan struct {
	preview *deptmodel.DepartmentSyncPreviewDTO
}

func (s *departmentSyncer) PreviewFromParent(ctx context.Context, targetDeptID int) (*deptmodel.DepartmentSyncPreviewDTO, error) {
	preview, _, err := s.buildPreview(ctx, targetDeptID)
	if err != nil {
		return nil, err
	}
	return preview, nil
}

func (s *departmentSyncer) ApplyFromParent(ctx context.Context, targetDeptID int, previewToken string) (*deptmodel.DepartmentSyncApplyResultDTO, error) {
	preview, snapshot, err := s.buildPreview(ctx, targetDeptID)
	if err != nil {
		return nil, err
	}
	if preview.PreviewToken != previewToken {
		return nil, ErrDepartmentSyncStale
	}
	if _, err := dbutils.WithTx(ctx, s.db, func(tx *generated.Tx) (struct{}, error) {
		txCtx := dbutils.WithExistingTx(ctx, tx)
		if err := s.applySnapshot(txCtx, snapshot); err != nil {
			return struct{}{}, err
		}
		return struct{}{}, nil
	}); err != nil {
		return nil, err
	}

	return &deptmodel.DepartmentSyncApplyResultDTO{
		PreviewToken:       preview.PreviewToken,
		SourceDepartmentID: preview.SourceDepartmentID,
		TargetDepartmentID: preview.TargetDepartmentID,
		Modules:            preview.Modules,
		TotalCreate:        preview.TotalCreate,
		TotalUpdate:        preview.TotalUpdate,
		TotalSkip:          preview.TotalSkip,
	}, nil
}

func (s *departmentSyncer) BootstrapFromSource(ctx context.Context, sourceDeptID int, targetDeptID int) error {
	snapshot, err := s.loadSnapshot(ctx, sourceDeptID, targetDeptID)
	if err != nil {
		return err
	}
	return s.applySnapshot(ctx, snapshot)
}

func (s *departmentSyncer) buildPreview(ctx context.Context, targetDeptID int) (*deptmodel.DepartmentSyncPreviewDTO, *syncSnapshot, error) {
	target, err := s.deptRepo.GetByID(ctx, targetDeptID)
	if err != nil {
		return nil, nil, err
	}
	if target.ParentID == nil || *target.ParentID <= 0 {
		return nil, nil, ErrDepartmentSyncNoParent
	}
	parent, err := s.deptRepo.GetByID(ctx, *target.ParentID)
	if err != nil {
		return nil, nil, err
	}

	snapshot, err := s.loadSnapshot(ctx, parent.ID, target.ID)
	if err != nil {
		return nil, nil, err
	}

	modules := make([]deptmodel.DepartmentSyncModuleDiffDTO, 0, 9)
	modules = append(modules, s.previewProcesses(snapshot))
	modules = append(modules, s.previewCategories(snapshot))
	modules = append(modules, s.previewSimpleRefs(snapshot, moduleBrand, "Thương hiệu"))
	modules = append(modules, s.previewSimpleRefs(snapshot, moduleRawMaterial, "Vật liệu"))
	modules = append(modules, s.previewSimpleRefs(snapshot, moduleTechnique, "Công nghệ"))
	modules = append(modules, s.previewSimpleRefs(snapshot, moduleRestorationType, "Kiểu phục hình"))
	modules = append(modules, s.previewSections(snapshot))
	modules = append(modules, s.previewMaterials(snapshot))
	modules = append(modules, s.previewProducts(snapshot))

	preview := &deptmodel.DepartmentSyncPreviewDTO{
		SourceDepartmentID: parent.ID,
		TargetDepartmentID: target.ID,
		Modules:            modules,
	}
	for _, mod := range modules {
		preview.TotalCreate += mod.Create
		preview.TotalUpdate += mod.Update
		preview.TotalSkip += mod.Skip
	}
	preview.PreviewToken = buildPreviewToken(preview)
	return preview, snapshot, nil
}

func (s *departmentSyncer) loadSnapshot(ctx context.Context, sourceDeptID int, targetDeptID int) (*syncSnapshot, error) {
	sourceCategories, err := s.syncRepo.ListCategories(ctx, sourceDeptID)
	if err != nil {
		return nil, err
	}
	targetCategories, err := s.syncRepo.ListCategories(ctx, targetDeptID)
	if err != nil {
		return nil, err
	}

	loadRef := func(key syncModuleKey, table string) ([]deptrepo.DepartmentSyncSimpleRefRecord, []deptrepo.DepartmentSyncSimpleRefRecord, error) {
		source, err := s.syncRepo.ListSimpleRefs(ctx, table, sourceDeptID)
		if err != nil {
			return nil, nil, err
		}
		target, err := s.syncRepo.ListSimpleRefs(ctx, table, targetDeptID)
		if err != nil {
			return nil, nil, err
		}
		return source, target, nil
	}

	sourceBrand, targetBrand, err := loadRef(moduleBrand, "brand_names")
	if err != nil {
		return nil, err
	}
	sourceRaw, targetRaw, err := loadRef(moduleRawMaterial, "raw_materials")
	if err != nil {
		return nil, err
	}
	sourceTechnique, targetTechnique, err := loadRef(moduleTechnique, "techniques")
	if err != nil {
		return nil, err
	}
	sourceRestoration, targetRestoration, err := loadRef(moduleRestorationType, "restoration_types")
	if err != nil {
		return nil, err
	}

	sourceProcesses, err := s.syncRepo.ListProcesses(ctx, sourceDeptID)
	if err != nil {
		return nil, err
	}
	targetProcesses, err := s.syncRepo.ListProcesses(ctx, targetDeptID)
	if err != nil {
		return nil, err
	}
	sourceSections, err := s.syncRepo.ListSections(ctx, sourceDeptID)
	if err != nil {
		return nil, err
	}
	targetSections, err := s.syncRepo.ListSections(ctx, targetDeptID)
	if err != nil {
		return nil, err
	}
	sourceMaterials, err := s.syncRepo.ListMaterials(ctx, sourceDeptID)
	if err != nil {
		return nil, err
	}
	targetMaterials, err := s.syncRepo.ListMaterials(ctx, targetDeptID)
	if err != nil {
		return nil, err
	}
	sourceProducts, err := s.syncRepo.ListProducts(ctx, sourceDeptID)
	if err != nil {
		return nil, err
	}
	targetProducts, err := s.syncRepo.ListProducts(ctx, targetDeptID)
	if err != nil {
		return nil, err
	}

	return &syncSnapshot{
		sourceDeptID:     sourceDeptID,
		targetDeptID:     targetDeptID,
		sourceCategories: sourceCategories,
		targetCategories: targetCategories,
		sourceRefs:       map[syncModuleKey][]deptrepo.DepartmentSyncSimpleRefRecord{moduleBrand: sourceBrand, moduleRawMaterial: sourceRaw, moduleTechnique: sourceTechnique, moduleRestorationType: sourceRestoration},
		targetRefs:       map[syncModuleKey][]deptrepo.DepartmentSyncSimpleRefRecord{moduleBrand: targetBrand, moduleRawMaterial: targetRaw, moduleTechnique: targetTechnique, moduleRestorationType: targetRestoration},
		sourceProcesses:  sourceProcesses,
		targetProcesses:  targetProcesses,
		sourceSections:   sourceSections,
		targetSections:   targetSections,
		sourceMaterials:  sourceMaterials,
		targetMaterials:  targetMaterials,
		sourceProducts:   sourceProducts,
		targetProducts:   targetProducts,
	}, nil
}

func (s *departmentSyncer) previewProcesses(snapshot *syncSnapshot) deptmodel.DepartmentSyncModuleDiffDTO {
	targetByName := make(map[string]deptrepo.DepartmentSyncProcessRecord, len(snapshot.targetProcesses))
	for _, rec := range snapshot.targetProcesses {
		targetByName[normalizeKey(rec.Name)] = rec
	}
	items := make([]deptmodel.DepartmentSyncItemDiffDTO, 0, len(snapshot.sourceProcesses))
	mod := deptmodel.DepartmentSyncModuleDiffDTO{Key: string(moduleProcess), Label: "Công đoạn"}
	for _, src := range snapshot.sourceProcesses {
		key := normalizeKey(src.Name)
		item := deptmodel.DepartmentSyncItemDiffDTO{Key: key, Label: src.Name}
		if target, ok := targetByName[key]; ok {
			fields := diffFields(
				fieldDiff("Mã", safeString(target.Code), safeString(src.Code)),
				fieldDiff("Tên", target.Name, src.Name),
				fieldDiff("Custom fields", stableJSON(target.CustomFields), stableJSON(src.CustomFields)),
			)
			if len(fields) == 0 {
				item.ChangeType = "skip"
				mod.Skip++
			} else {
				item.ChangeType = "update"
				item.Fields = fields
				mod.Update++
			}
		} else {
			item.ChangeType = "create"
			item.Fields = diffFields(
				fieldDiff("Mã", "", safeString(src.Code)),
				fieldDiff("Tên", "", src.Name),
			)
			mod.Create++
		}
		items = append(items, item)
	}
	mod.Items = items
	return mod
}

func (s *departmentSyncer) previewCategories(snapshot *syncSnapshot) deptmodel.DepartmentSyncModuleDiffDTO {
	sourcePaths := buildCategoryPaths(snapshot.sourceCategories)
	targetPaths := buildCategoryPaths(snapshot.targetCategories)
	targetByPath := make(map[string]deptrepo.DepartmentSyncCategoryRecord, len(snapshot.targetCategories))
	for _, rec := range snapshot.targetCategories {
		targetByPath[normalizeKey(targetPaths.byID[rec.ID])] = rec
	}
	mod := deptmodel.DepartmentSyncModuleDiffDTO{Key: string(moduleCategory), Label: "Danh mục"}
	items := make([]deptmodel.DepartmentSyncItemDiffDTO, 0, len(snapshot.sourceCategories))
	for _, src := range snapshot.sourceCategories {
		path := sourcePaths.byID[src.ID]
		item := deptmodel.DepartmentSyncItemDiffDTO{Key: path, Label: path}
		if target, ok := targetByPath[normalizeKey(path)]; ok {
			fields := diffFields(
				fieldDiff("Kích hoạt", formatBool(target.Active), formatBool(src.Active)),
				fieldDiff("Process", strings.Join(target.ProcessNames, ", "), strings.Join(src.ProcessNames, ", ")),
				fieldDiff("Custom fields", stableJSON(target.CustomFields), stableJSON(src.CustomFields)),
			)
			if len(fields) == 0 {
				item.ChangeType = "skip"
				mod.Skip++
			} else {
				item.ChangeType = "update"
				item.Fields = fields
				mod.Update++
			}
		} else {
			item.ChangeType = "create"
			item.Fields = diffFields(fieldDiff("Path", "", path))
			mod.Create++
		}
		items = append(items, item)
	}
	mod.Items = items
	return mod
}

func (s *departmentSyncer) previewSimpleRefs(snapshot *syncSnapshot, key syncModuleKey, label string) deptmodel.DepartmentSyncModuleDiffDTO {
	targetByKey := make(map[string]deptrepo.DepartmentSyncSimpleRefRecord, len(snapshot.targetRefs[key]))
	for _, rec := range snapshot.targetRefs[key] {
		targetByKey[simpleRefKey(rec.CategoryPath, rec.Name)] = rec
	}
	mod := deptmodel.DepartmentSyncModuleDiffDTO{Key: string(key), Label: label}
	items := make([]deptmodel.DepartmentSyncItemDiffDTO, 0, len(snapshot.sourceRefs[key]))
	for _, src := range snapshot.sourceRefs[key] {
		k := simpleRefKey(src.CategoryPath, src.Name)
		item := deptmodel.DepartmentSyncItemDiffDTO{Key: k, Label: fmt.Sprintf("%s / %s", src.CategoryPath, src.Name)}
		if target, ok := targetByKey[k]; ok {
			fields := diffFields(
				fieldDiff("Danh mục", target.CategoryPath, src.CategoryPath),
				fieldDiff("Tên", target.Name, src.Name),
			)
			if len(fields) == 0 {
				item.ChangeType = "skip"
				mod.Skip++
			} else {
				item.ChangeType = "update"
				item.Fields = fields
				mod.Update++
			}
		} else {
			item.ChangeType = "create"
			item.Fields = diffFields(
				fieldDiff("Danh mục", "", src.CategoryPath),
				fieldDiff("Tên", "", src.Name),
			)
			mod.Create++
		}
		items = append(items, item)
	}
	mod.Items = items
	return mod
}

func (s *departmentSyncer) previewSections(snapshot *syncSnapshot) deptmodel.DepartmentSyncModuleDiffDTO {
	targetByName := make(map[string]deptrepo.DepartmentSyncSectionRecord, len(snapshot.targetSections))
	for _, rec := range snapshot.targetSections {
		targetByName[normalizeKey(rec.Name)] = rec
	}
	mod := deptmodel.DepartmentSyncModuleDiffDTO{Key: string(moduleSection), Label: "Phòng ban"}
	items := make([]deptmodel.DepartmentSyncItemDiffDTO, 0, len(snapshot.sourceSections))
	for _, src := range snapshot.sourceSections {
		k := normalizeKey(src.Name)
		item := deptmodel.DepartmentSyncItemDiffDTO{Key: k, Label: src.Name}
		if target, ok := targetByName[k]; ok {
			fields := diffFields(
				fieldDiff("Màu", safeString(target.Color), safeString(src.Color)),
				fieldDiff("Mô tả", target.Description, src.Description),
				fieldDiff("Kích hoạt", formatBool(target.Active), formatBool(src.Active)),
				fieldDiff("Công đoạn", strings.Join(target.ProcessNames, ", "), strings.Join(src.ProcessNames, ", ")),
				fieldDiff("Custom fields", stableJSON(target.CustomFields), stableJSON(src.CustomFields)),
			)
			if len(fields) == 0 {
				item.ChangeType = "skip"
				mod.Skip++
			} else {
				item.ChangeType = "update"
				item.Fields = fields
				mod.Update++
			}
		} else {
			item.ChangeType = "create"
			item.Fields = diffFields(fieldDiff("Tên", "", src.Name))
			mod.Create++
		}
		items = append(items, item)
	}
	mod.Items = items
	return mod
}

func (s *departmentSyncer) previewMaterials(snapshot *syncSnapshot) deptmodel.DepartmentSyncModuleDiffDTO {
	targetByKey := make(map[string]deptrepo.DepartmentSyncMaterialRecord, len(snapshot.targetMaterials))
	for _, rec := range snapshot.targetMaterials {
		targetByKey[materialKey(rec.Name, rec.IsImplant)] = rec
	}
	mod := deptmodel.DepartmentSyncModuleDiffDTO{Key: string(moduleMaterial), Label: "Vật tư"}
	items := make([]deptmodel.DepartmentSyncItemDiffDTO, 0, len(snapshot.sourceMaterials))
	for _, src := range snapshot.sourceMaterials {
		k := materialKey(src.Name, src.IsImplant)
		item := deptmodel.DepartmentSyncItemDiffDTO{Key: k, Label: materialLabel(src.Name, src.IsImplant)}
		if target, ok := targetByKey[k]; ok {
			fields := diffFields(
				fieldDiff("Mã", safeString(target.Code), safeString(src.Code)),
				fieldDiff("Loại", safeString(target.Type), safeString(src.Type)),
				fieldDiff("Implant", formatBool(target.IsImplant), formatBool(src.IsImplant)),
				fieldDiff("Custom fields", stableJSON(target.CustomFields), stableJSON(src.CustomFields)),
			)
			if len(fields) == 0 {
				item.ChangeType = "skip"
				mod.Skip++
			} else {
				item.ChangeType = "update"
				item.Fields = fields
				mod.Update++
			}
		} else {
			item.ChangeType = "create"
			item.Fields = diffFields(fieldDiff("Tên", "", src.Name))
			mod.Create++
		}
		items = append(items, item)
	}
	mod.Items = items
	return mod
}

func (s *departmentSyncer) previewProducts(snapshot *syncSnapshot) deptmodel.DepartmentSyncModuleDiffDTO {
	targetByKey := make(map[string]deptrepo.DepartmentSyncProductRecord, len(snapshot.targetProducts))
	for _, rec := range snapshot.targetProducts {
		targetByKey[productKey(rec)] = rec
	}
	mod := deptmodel.DepartmentSyncModuleDiffDTO{Key: string(moduleProduct), Label: "Sản phẩm"}
	items := make([]deptmodel.DepartmentSyncItemDiffDTO, 0, len(snapshot.sourceProducts))
	for _, src := range snapshot.sourceProducts {
		k := productKey(src)
		item := deptmodel.DepartmentSyncItemDiffDTO{Key: k, Label: productLabel(src)}
		if target, ok := targetByKey[k]; ok {
			fields := diffFields(
				fieldDiff("Tên", safeString(target.Name), safeString(src.Name)),
				fieldDiff("Danh mục", safeString(target.CategoryName), safeString(src.CategoryName)),
				fieldDiff("Giá bán", formatFloat(target.RetailPrice), formatFloat(src.RetailPrice)),
				fieldDiff("Process", strings.Join(target.ProcessNames, ", "), strings.Join(src.ProcessNames, ", ")),
				fieldDiff("Thương hiệu", strings.Join(target.BrandNameNames, ", "), strings.Join(src.BrandNameNames, ", ")),
				fieldDiff("Vật liệu", strings.Join(target.RawMaterialNames, ", "), strings.Join(src.RawMaterialNames, ", ")),
				fieldDiff("Công nghệ", strings.Join(target.TechniqueNames, ", "), strings.Join(src.TechniqueNames, ", ")),
				fieldDiff("Kiểu phục hình", strings.Join(target.RestorationTypeNames, ", "), strings.Join(src.RestorationTypeNames, ", ")),
				fieldDiff("Custom fields", stableJSON(target.CustomFields), stableJSON(src.CustomFields)),
			)
			if len(fields) == 0 {
				item.ChangeType = "skip"
				mod.Skip++
			} else {
				item.ChangeType = "update"
				item.Fields = fields
				mod.Update++
			}
		} else {
			item.ChangeType = "create"
			item.Fields = diffFields(
				fieldDiff("Mã", "", safeString(src.Code)),
				fieldDiff("Tên", "", safeString(src.Name)),
				fieldDiff("Danh mục", "", safeString(src.CategoryName)),
			)
			mod.Create++
		}
		items = append(items, item)
	}
	mod.Items = items
	return mod
}

func (s *departmentSyncer) applySnapshot(ctx context.Context, snapshot *syncSnapshot) error {
	targetProcessIDs, err := s.applyProcesses(ctx, snapshot)
	if err != nil {
		return err
	}
	targetCategoryIDs, err := s.applyCategories(ctx, snapshot, targetProcessIDs)
	if err != nil {
		return err
	}
	targetRefIDs, err := s.applySimpleRefs(ctx, snapshot, targetCategoryIDs)
	if err != nil {
		return err
	}
	if err := s.applySections(ctx, snapshot, targetProcessIDs); err != nil {
		return err
	}
	if err := s.applyMaterials(ctx, snapshot); err != nil {
		return err
	}
	return s.applyProducts(ctx, snapshot, targetCategoryIDs, targetProcessIDs, targetRefIDs)
}

func (s *departmentSyncer) applyProcesses(ctx context.Context, snapshot *syncSnapshot) (map[string]int, error) {
	targetByName := make(map[string]deptrepo.DepartmentSyncProcessRecord, len(snapshot.targetProcesses))
	for _, rec := range snapshot.targetProcesses {
		targetByName[normalizeKey(rec.Name)] = rec
	}
	result := make(map[string]int, len(snapshot.sourceProcesses))
	for _, src := range snapshot.sourceProcesses {
		k := normalizeKey(src.Name)
		payload := model.ProcessDTO{
			Name:         utils.Ptr(src.Name),
			Code:         src.Code,
			CustomFields: src.CustomFields,
		}
		if target, ok := targetByName[k]; ok {
			payload.ID = target.ID
			dto, err := s.processSvc.Update(ctx, snapshot.targetDeptID, payload)
			if err != nil {
				return nil, err
			}
			result[k] = dto.ID
			continue
		}
		dto, err := s.processSvc.Create(ctx, snapshot.targetDeptID, payload)
		if err != nil {
			return nil, err
		}
		result[k] = dto.ID
	}
	return result, nil
}

func (s *departmentSyncer) applyCategories(ctx context.Context, snapshot *syncSnapshot, targetProcessIDs map[string]int) (map[string]int, error) {
	targetPaths := buildCategoryPaths(snapshot.targetCategories)
	sourcePaths := buildCategoryPaths(snapshot.sourceCategories)
	targetByPath := make(map[string]deptrepo.DepartmentSyncCategoryRecord, len(snapshot.targetCategories))
	targetCollectionIDByPath := make(map[string]int, len(snapshot.targetCategories))
	for _, rec := range snapshot.targetCategories {
		path := targetPaths.byID[rec.ID]
		targetByPath[normalizeKey(path)] = rec
		if rec.CollectionID != nil && *rec.CollectionID > 0 {
			targetCollectionIDByPath[normalizeKey(path)] = *rec.CollectionID
		}
	}
	targetIDByPath := make(map[string]int, len(snapshot.targetCategories))
	for _, rec := range snapshot.targetCategories {
		path := targetPaths.byID[rec.ID]
		targetIDByPath[normalizeKey(path)] = rec.ID
	}
	collections := []string{"category"}

	for _, src := range snapshot.sourceCategories {
		path := sourcePaths.byID[src.ID]
		var parentID *int
		if src.ParentID != nil {
			parentPath := sourcePaths.byID[*src.ParentID]
			if mapped, ok := targetIDByPath[normalizeKey(parentPath)]; ok {
				parentID = utils.Ptr(mapped)
			}
		}
		dto := model.CategoryDTO{
			Name:         utils.Ptr(src.Name),
			Level:        src.Level,
			ParentID:     parentID,
			Active:       src.Active,
			CustomFields: src.CustomFields,
		}
		upsert := &model.CategoryUpsertDTO{DTO: dto, Collections: &collections}
		if target, ok := targetByPath[normalizeKey(path)]; ok {
			upsert.DTO.ID = target.ID
			res, err := s.categorySvc.Update(ctx, snapshot.targetDeptID, upsert)
			if err != nil {
				return nil, err
			}
			targetIDByPath[normalizeKey(path)] = res.ID
			if res.CollectionID != nil && *res.CollectionID > 0 {
				targetCollectionIDByPath[normalizeKey(path)] = *res.CollectionID
			}
			continue
		}
		res, err := s.categorySvc.Create(ctx, snapshot.targetDeptID, upsert)
		if err != nil {
			return nil, err
		}
		targetIDByPath[normalizeKey(path)] = res.ID
		if res.CollectionID != nil && *res.CollectionID > 0 {
			targetCollectionIDByPath[normalizeKey(path)] = *res.CollectionID
		}
	}

	for _, src := range snapshot.sourceCategories {
		path := sourcePaths.byID[src.ID]
		targetID, ok := targetIDByPath[normalizeKey(path)]
		if !ok {
			continue
		}
		var parentID *int
		if src.ParentID != nil {
			parentPath := sourcePaths.byID[*src.ParentID]
			if mapped, exists := targetIDByPath[normalizeKey(parentPath)]; exists {
				parentID = utils.Ptr(mapped)
			}
		}
		dto := model.CategoryDTO{
			ID:           targetID,
			Name:         utils.Ptr(src.Name),
			Level:        src.Level,
			ParentID:     parentID,
			Active:       src.Active,
			CustomFields: src.CustomFields,
		}
		fillCategoryBranch(&dto, path, targetIDByPath)
		for _, processName := range src.ProcessNames {
			if processID, exists := targetProcessIDs[normalizeKey(processName)]; exists {
				dto.ProcessIDs = append(dto.ProcessIDs, processID)
			}
		}
		if _, err := s.categorySvc.Update(ctx, snapshot.targetDeptID, &model.CategoryUpsertDTO{
			DTO:         dto,
			Collections: &collections,
		}); err != nil {
			return nil, err
		} else if refreshed, err := s.categoryMetaRepo.GetCollectionID(s.categoryMetaCtx(ctx), snapshot.targetDeptID, targetID); err != nil {
			return nil, err
		} else if refreshed != nil && *refreshed > 0 {
			targetCollectionIDByPath[normalizeKey(path)] = *refreshed
		}
	}

	if err := s.syncCategoryCollectionFields(ctx, snapshot, sourcePaths, targetCollectionIDByPath); err != nil {
		return nil, err
	}

	return targetIDByPath, nil
}

func (s *departmentSyncer) syncCategoryCollectionFields(
	ctx context.Context,
	snapshot *syncSnapshot,
	sourcePaths categoryPathIndex,
	targetCollectionIDByPath map[string]int,
) error {
	metaCtx := s.categoryMetaCtx(ctx)
	for _, src := range snapshot.sourceCategories {
		if src.CollectionID == nil || *src.CollectionID <= 0 {
			continue
		}
		fields, err := s.syncRepo.ListCollectionFieldSpecs(ctx, *src.CollectionID)
		if err != nil {
			return err
		}
		if len(fields) == 0 {
			continue
		}
		path := normalizeKey(sourcePaths.byID[src.ID])
		targetCollectionID, ok := targetCollectionIDByPath[path]
		if !ok || targetCollectionID <= 0 {
			continue
		}
		if _, err := s.categoryMetaRepo.UpsertFields(metaCtx, targetCollectionID, fields); err != nil {
			return err
		}
	}
	return nil
}

func (s *departmentSyncer) categoryMetaCtx(ctx context.Context) context.Context {
	tx := dbutils.TxFromContext(ctx)
	if tx == nil {
		return ctx
	}
	return categoryrepo.WithTx(ctx, tx)
}

func fillCategoryBranch(dto *model.CategoryDTO, path string, ids map[string]int) {
	parts := strings.Split(path, " > ")
	if len(parts) >= 1 {
		dto.CategoryNameLv1 = utils.Ptr(parts[0])
		if id, ok := ids[normalizeKey(parts[0])]; ok {
			dto.CategoryIDLv1 = utils.Ptr(id)
		}
	}
	if len(parts) >= 2 {
		lv2Path := strings.Join(parts[:2], " > ")
		dto.CategoryNameLv2 = utils.Ptr(parts[1])
		if id, ok := ids[normalizeKey(lv2Path)]; ok {
			dto.CategoryIDLv2 = utils.Ptr(id)
		}
	}
	if len(parts) >= 3 {
		dto.CategoryNameLv3 = utils.Ptr(parts[2])
		if id, ok := ids[normalizeKey(path)]; ok {
			dto.CategoryIDLv3 = utils.Ptr(id)
		}
	}
}

func (s *departmentSyncer) applySimpleRefs(ctx context.Context, snapshot *syncSnapshot, targetCategoryIDs map[string]int) (map[syncModuleKey]map[string]int, error) {
	targetRefIDs := map[syncModuleKey]map[string]int{
		moduleBrand:           {},
		moduleRawMaterial:     {},
		moduleTechnique:       {},
		moduleRestorationType: {},
	}
	targetByKey := map[syncModuleKey]map[string]deptrepo.DepartmentSyncSimpleRefRecord{}
	for _, key := range []syncModuleKey{moduleBrand, moduleRawMaterial, moduleTechnique, moduleRestorationType} {
		targetByKey[key] = make(map[string]deptrepo.DepartmentSyncSimpleRefRecord, len(snapshot.targetRefs[key]))
		for _, rec := range snapshot.targetRefs[key] {
			targetByKey[key][simpleRefKey(rec.CategoryPath, rec.Name)] = rec
			targetRefIDs[key][simpleRefKey(rec.CategoryPath, rec.Name)] = rec.ID
		}
	}

	for _, key := range []syncModuleKey{moduleBrand, moduleRawMaterial, moduleTechnique, moduleRestorationType} {
		for _, src := range snapshot.sourceRefs[key] {
			categoryID, ok := targetCategoryIDs[normalizeKey(src.CategoryPath)]
			if !ok {
				continue
			}
			refKey := simpleRefKey(src.CategoryPath, src.Name)
			existingID, err := s.syncRepo.FindSimpleRefID(ctx, tableForSimpleRef(key), snapshot.targetDeptID, categoryID, src.Name)
			if err != nil {
				return nil, err
			}
			switch key {
			case moduleBrand:
				dto := model.BrandNameDTO{Name: utils.Ptr(src.Name), CategoryID: utils.Ptr(categoryID), CategoryName: utils.Ptr(src.CategoryName)}
				if existingID != nil {
					dto.ID = *existingID
					res, err := s.brandSvc.Update(ctx, snapshot.targetDeptID, dto)
					if err != nil {
						return nil, err
					}
					targetRefIDs[key][refKey] = res.ID
				} else if target, exists := targetByKey[key][refKey]; exists {
					dto.ID = target.ID
					res, err := s.brandSvc.Update(ctx, snapshot.targetDeptID, dto)
					if err != nil {
						return nil, err
					}
					targetRefIDs[key][refKey] = res.ID
				} else {
					res, err := s.brandSvc.Create(ctx, snapshot.targetDeptID, dto)
					if err != nil {
						return nil, err
					}
					targetRefIDs[key][refKey] = res.ID
				}
			case moduleRawMaterial:
				dto := model.RawMaterialDTO{Name: utils.Ptr(src.Name), CategoryID: utils.Ptr(categoryID), CategoryName: utils.Ptr(src.CategoryName)}
				if existingID != nil {
					dto.ID = *existingID
					res, err := s.rawMaterialSvc.Update(ctx, snapshot.targetDeptID, dto)
					if err != nil {
						return nil, err
					}
					targetRefIDs[key][refKey] = res.ID
				} else if target, exists := targetByKey[key][refKey]; exists {
					dto.ID = target.ID
					res, err := s.rawMaterialSvc.Update(ctx, snapshot.targetDeptID, dto)
					if err != nil {
						return nil, err
					}
					targetRefIDs[key][refKey] = res.ID
				} else {
					res, err := s.rawMaterialSvc.Create(ctx, snapshot.targetDeptID, dto)
					if err != nil {
						return nil, err
					}
					targetRefIDs[key][refKey] = res.ID
				}
			case moduleTechnique:
				dto := model.TechniqueDTO{Name: utils.Ptr(src.Name), CategoryID: utils.Ptr(categoryID), CategoryName: utils.Ptr(src.CategoryName)}
				if existingID != nil {
					dto.ID = *existingID
					res, err := s.techniqueSvc.Update(ctx, snapshot.targetDeptID, dto)
					if err != nil {
						return nil, err
					}
					targetRefIDs[key][refKey] = res.ID
				} else if target, exists := targetByKey[key][refKey]; exists {
					dto.ID = target.ID
					res, err := s.techniqueSvc.Update(ctx, snapshot.targetDeptID, dto)
					if err != nil {
						return nil, err
					}
					targetRefIDs[key][refKey] = res.ID
				} else {
					res, err := s.techniqueSvc.Create(ctx, snapshot.targetDeptID, dto)
					if err != nil {
						return nil, err
					}
					targetRefIDs[key][refKey] = res.ID
				}
			case moduleRestorationType:
				dto := model.RestorationTypeDTO{Name: utils.Ptr(src.Name), CategoryID: utils.Ptr(categoryID), CategoryName: utils.Ptr(src.CategoryName)}
				if existingID != nil {
					dto.ID = *existingID
					res, err := s.restorationSvc.Update(ctx, snapshot.targetDeptID, dto)
					if err != nil {
						return nil, err
					}
					targetRefIDs[key][refKey] = res.ID
				} else if target, exists := targetByKey[key][refKey]; exists {
					dto.ID = target.ID
					res, err := s.restorationSvc.Update(ctx, snapshot.targetDeptID, dto)
					if err != nil {
						return nil, err
					}
					targetRefIDs[key][refKey] = res.ID
				} else {
					res, err := s.restorationSvc.Create(ctx, snapshot.targetDeptID, dto)
					if err != nil {
						return nil, err
					}
					targetRefIDs[key][refKey] = res.ID
				}
			}
		}
	}
	return targetRefIDs, nil
}

func tableForSimpleRef(key syncModuleKey) string {
	switch key {
	case moduleBrand:
		return "brand_names"
	case moduleRawMaterial:
		return "raw_materials"
	case moduleTechnique:
		return "techniques"
	case moduleRestorationType:
		return "restoration_types"
	default:
		return ""
	}
}

func (s *departmentSyncer) applySections(ctx context.Context, snapshot *syncSnapshot, targetProcessIDs map[string]int) error {
	targetByName := make(map[string]deptrepo.DepartmentSyncSectionRecord, len(snapshot.targetSections))
	for _, rec := range snapshot.targetSections {
		targetByName[normalizeKey(rec.Name)] = rec
	}
	for _, src := range snapshot.sourceSections {
		dto := model.SectionDTO{
			DepartmentID: snapshot.targetDeptID,
			Name:         src.Name,
			Code:         src.Code,
			Description:  src.Description,
			Active:       src.Active,
			Color:        src.Color,
			CustomFields: src.CustomFields,
		}
		for _, processName := range src.ProcessNames {
			if processID, ok := targetProcessIDs[normalizeKey(processName)]; ok {
				dto.ProcessIDs = append(dto.ProcessIDs, processID)
			}
		}
		if target, ok := targetByName[normalizeKey(src.Name)]; ok {
			dto.ID = target.ID
			if _, err := s.sectionSvc.Update(ctx, dto); err != nil {
				return err
			}
			continue
		}
		if _, err := s.sectionSvc.Create(ctx, dto); err != nil {
			return err
		}
	}
	return nil
}

func (s *departmentSyncer) applyMaterials(ctx context.Context, snapshot *syncSnapshot) error {
	targetByKey := make(map[string]deptrepo.DepartmentSyncMaterialRecord, len(snapshot.targetMaterials))
	for _, rec := range snapshot.targetMaterials {
		targetByKey[materialKey(rec.Name, rec.IsImplant)] = rec
	}
	for _, src := range snapshot.sourceMaterials {
		dto := model.MaterialDTO{
			Code:         src.Code,
			Name:         utils.Ptr(src.Name),
			Type:         src.Type,
			IsImplant:    src.IsImplant,
			CustomFields: src.CustomFields,
		}
		if target, ok := targetByKey[materialKey(src.Name, src.IsImplant)]; ok {
			dto.ID = target.ID
			if _, err := s.materialSvc.Update(ctx, snapshot.targetDeptID, dto); err != nil {
				return err
			}
			continue
		}
		if _, err := s.materialSvc.Create(ctx, snapshot.targetDeptID, dto); err != nil {
			return err
		}
	}
	return nil
}

func (s *departmentSyncer) applyProducts(
	ctx context.Context,
	snapshot *syncSnapshot,
	targetCategoryIDs map[string]int,
	targetProcessIDs map[string]int,
	targetRefIDs map[syncModuleKey]map[string]int,
) error {
	targetByKey := make(map[string]deptrepo.DepartmentSyncProductRecord, len(snapshot.targetProducts))
	for _, rec := range snapshot.targetProducts {
		targetByKey[productKey(rec)] = rec
	}
	targetTemplateIDs := map[string]int{}
	collections := []string{"product"}

	sourceProducts := append([]deptrepo.DepartmentSyncProductRecord(nil), snapshot.sourceProducts...)
	sort.SliceStable(sourceProducts, func(i, j int) bool {
		if sourceProducts[i].IsTemplate == sourceProducts[j].IsTemplate {
			return productKey(sourceProducts[i]) < productKey(sourceProducts[j])
		}
		return sourceProducts[i].IsTemplate && !sourceProducts[j].IsTemplate
	})

	for _, src := range sourceProducts {
		categoryPath := buildProductCategoryPath(src)
		categoryID, ok := targetCategoryIDs[normalizeKey(categoryPath)]
		if !ok {
			continue
		}
		dto := model.ProductDTO{
			Code:         src.Code,
			Name:         src.Name,
			CategoryID:   utils.Ptr(categoryID),
			CategoryName: src.CategoryName,
			RetailPrice:  src.RetailPrice,
			CostPrice:    src.CostPrice,
			CustomFields: src.CustomFields,
		}
		dto.ProcessIDs = resolveRefIDs(src.ProcessNames, targetProcessIDs)
		dto.BrandNameIDs = resolveSimpleRefIDs(src.CategoryLV1, src.BrandNameNames, targetRefIDs[moduleBrand])
		dto.RawMaterialIDs = resolveSimpleRefIDs(src.CategoryLV1, src.RawMaterialNames, targetRefIDs[moduleRawMaterial])
		dto.TechniqueIDs = resolveSimpleRefIDs(src.CategoryLV1, src.TechniqueNames, targetRefIDs[moduleTechnique])
		dto.RestorationTypeIDs = resolveSimpleRefIDs(src.CategoryLV1, src.RestorationTypeNames, targetRefIDs[moduleRestorationType])

		if !src.IsTemplate && src.TemplateCode != nil {
			if templateID, exists := targetTemplateIDs[normalizeKey(*src.TemplateCode)]; exists {
				dto.TemplateID = utils.Ptr(templateID)
			}
		}

		payload := &model.ProductUpsertDTO{DTO: dto, Collections: &collections}
		key := productKey(src)
		if target, ok := targetByKey[key]; ok {
			payload.DTO.ID = target.ID
			payload.DTO.TemplateID = dto.TemplateID
			res, err := s.productSvc.Update(ctx, snapshot.targetDeptID, payload)
			if err != nil {
				return err
			}
			if src.IsTemplate && src.Code != nil {
				targetTemplateIDs[normalizeKey(*src.Code)] = res.ID
			}
			continue
		}
		res, err := s.productSvc.Create(ctx, snapshot.targetDeptID, payload)
		if err != nil {
			return err
		}
		if src.IsTemplate && src.Code != nil {
			targetTemplateIDs[normalizeKey(*src.Code)] = res.ID
		}
	}
	return nil
}

type categoryPathIndex struct {
	byID map[int]string
}

func buildCategoryPaths(categories []deptrepo.DepartmentSyncCategoryRecord) categoryPathIndex {
	byID := make(map[int]deptrepo.DepartmentSyncCategoryRecord, len(categories))
	for _, rec := range categories {
		byID[rec.ID] = rec
	}
	paths := make(map[int]string, len(categories))
	var walk func(id int) string
	walk = func(id int) string {
		if path, ok := paths[id]; ok {
			return path
		}
		rec := byID[id]
		path := rec.Name
		if rec.ParentID != nil {
			parentPath := walk(*rec.ParentID)
			if parentPath != "" {
				path = parentPath + " > " + rec.Name
			}
		}
		paths[id] = path
		return path
	}
	for _, rec := range categories {
		walk(rec.ID)
	}
	return categoryPathIndex{byID: paths}
}

func simpleRefKey(categoryName string, name string) string {
	return normalizeKey(categoryName + "::" + name)
}

func materialKey(name string, isImplant bool) string {
	return normalizeKey(materialImplantLabel(isImplant) + "::" + name)
}

func materialLabel(name string, isImplant bool) string {
	return materialImplantLabel(isImplant) + " / " + name
}

func materialImplantLabel(isImplant bool) string {
	if isImplant {
		return "Implant"
	}
	return "Không Implant"
}

func buildProductCategoryPath(rec deptrepo.DepartmentSyncProductRecord) string {
	parts := make([]string, 0, 3)
	for _, item := range []*string{rec.CategoryLV1, rec.CategoryLV2, rec.CategoryLV3} {
		if item == nil || strings.TrimSpace(*item) == "" {
			continue
		}
		parts = append(parts, strings.TrimSpace(*item))
	}
	if len(parts) == 0 && rec.CategoryName != nil {
		parts = append(parts, strings.TrimSpace(*rec.CategoryName))
	}
	return strings.Join(parts, " > ")
}

func productKey(rec deptrepo.DepartmentSyncProductRecord) string {
	if rec.Code != nil && strings.TrimSpace(*rec.Code) != "" {
		return "code:" + normalizeKey(*rec.Code)
	}
	return "name:" + normalizeKey(safeString(rec.Name)+"::"+buildProductCategoryPath(rec))
}

func productLabel(rec deptrepo.DepartmentSyncProductRecord) string {
	code := safeString(rec.Code)
	if code == "" {
		return safeString(rec.Name)
	}
	return code + " - " + safeString(rec.Name)
}

func resolveRefIDs(names []string, idMap map[string]int) []int {
	out := make([]int, 0, len(names))
	for _, name := range names {
		if id, ok := idMap[normalizeKey(name)]; ok {
			out = append(out, id)
		}
	}
	return dedupInts(out)
}

func resolveSimpleRefIDs(categoryName *string, names []string, idMap map[string]int) []int {
	category := safeString(categoryName)
	out := make([]int, 0, len(names))
	for _, name := range names {
		if id, ok := idMap[simpleRefKey(category, name)]; ok {
			out = append(out, id)
		}
	}
	return dedupInts(out)
}

func dedupInts(in []int) []int {
	seen := map[int]struct{}{}
	out := make([]int, 0, len(in))
	for _, item := range in {
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		out = append(out, item)
	}
	return out
}

func normalizeKey(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	return strings.Join(strings.Fields(value), " ")
}

func safeString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func formatBool(value bool) string {
	if value {
		return "Có"
	}
	return "Không"
}

func formatFloat(value *float64) string {
	if value == nil {
		return ""
	}
	return fmt.Sprintf("%.2f", *value)
}

func stableJSON(value any) string {
	data, err := json.Marshal(value)
	if err != nil {
		return ""
	}
	return string(data)
}

func fieldDiff(label, before, after string) deptmodel.DepartmentSyncFieldDiffDTO {
	return deptmodel.DepartmentSyncFieldDiffDTO{Label: label, Before: before, After: after}
}

func diffFields(fields ...deptmodel.DepartmentSyncFieldDiffDTO) []deptmodel.DepartmentSyncFieldDiffDTO {
	out := make([]deptmodel.DepartmentSyncFieldDiffDTO, 0, len(fields))
	for _, field := range fields {
		if strings.TrimSpace(field.Before) == strings.TrimSpace(field.After) {
			continue
		}
		out = append(out, field)
	}
	return out
}

func buildPreviewToken(preview *deptmodel.DepartmentSyncPreviewDTO) string {
	payload := *preview
	payload.PreviewToken = ""
	data, _ := json.Marshal(payload)
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}
