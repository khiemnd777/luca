package service

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"errors"
	"slices"
	"strconv"
	"sync"
	"testing"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"

	deptmodel "github.com/khiemnd777/noah_api/modules/main/department/model"
	deptrepo "github.com/khiemnd777/noah_api/modules/main/department/repository"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	brandservice "github.com/khiemnd777/noah_api/modules/main/features/brand/service"
	categoryrepo "github.com/khiemnd777/noah_api/modules/main/features/category/repository"
	categoryservice "github.com/khiemnd777/noah_api/modules/main/features/category/service"
	materialservice "github.com/khiemnd777/noah_api/modules/main/features/material/service"
	processservice "github.com/khiemnd777/noah_api/modules/main/features/process/service"
	productservice "github.com/khiemnd777/noah_api/modules/main/features/product/service"
	rawmaterialservice "github.com/khiemnd777/noah_api/modules/main/features/raw_material/service"
	restorationservice "github.com/khiemnd777/noah_api/modules/main/features/restoration_type/service"
	sectionservice "github.com/khiemnd777/noah_api/modules/main/features/section/service"
	techniqueservice "github.com/khiemnd777/noah_api/modules/main/features/technique/service"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	collectionutils "github.com/khiemnd777/noah_api/shared/metadata/collection"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

func TestDepartmentSyncerPreviewFromParentClassifiesCreateUpdateSkip(t *testing.T) {
	t.Parallel()

	syncer := &departmentSyncer{
		deptRepo: fakeDepartmentRepo{
			items: map[int]*deptmodel.DepartmentDTO{
				1: {ID: 1, Name: "Parent"},
				2: {ID: 2, Name: "Child", ParentID: intPtr(1)},
			},
		},
		syncRepo: fakeSyncRepo{
			sourceProcesses: []deptrepo.DepartmentSyncProcessRecord{
				{Name: "Wax", Code: stringPtr("WAX")},
				{Name: "CAD", Code: stringPtr("CAD")},
				{Name: "Polish", Code: stringPtr("POL")},
			},
			targetProcesses: []deptrepo.DepartmentSyncProcessRecord{
				{ID: 11, Name: "CAD", Code: stringPtr("CAD-OLD")},
				{ID: 12, Name: "Polish", Code: stringPtr("POL")},
			},
		},
	}

	preview, err := syncer.PreviewFromParent(context.Background(), 2)
	if err != nil {
		t.Fatalf("PreviewFromParent() error = %v", err)
	}

	if preview.SourceDepartmentID != 1 || preview.TargetDepartmentID != 2 {
		t.Fatalf("unexpected preview departments: %+v", preview)
	}
	if preview.TotalCreate != 1 || preview.TotalUpdate != 1 || preview.TotalSkip != 1 {
		t.Fatalf("unexpected preview totals: %+v", preview)
	}

	processModule := findModuleDiff(t, preview.Modules, string(moduleProcess))
	if processModule.Create != 1 || processModule.Update != 1 || processModule.Skip != 1 {
		t.Fatalf("unexpected process module totals: %+v", processModule)
	}
	if got := findItemChangeType(t, processModule.Items, normalizeKey("Wax")); got != "create" {
		t.Fatalf("Wax change type = %q, want create", got)
	}
	if got := findItemChangeType(t, processModule.Items, normalizeKey("CAD")); got != "update" {
		t.Fatalf("CAD change type = %q, want update", got)
	}
	if got := findItemChangeType(t, processModule.Items, normalizeKey("Polish")); got != "skip" {
		t.Fatalf("Polish change type = %q, want skip", got)
	}
}

func TestDepartmentSyncerPreviewFromParentRejectsDepartmentWithoutParent(t *testing.T) {
	t.Parallel()

	syncer := &departmentSyncer{
		deptRepo: fakeDepartmentRepo{
			items: map[int]*deptmodel.DepartmentDTO{
				2: {ID: 2, Name: "Standalone"},
			},
		},
		syncRepo: fakeSyncRepo{},
	}

	_, err := syncer.PreviewFromParent(context.Background(), 2)
	if !errors.Is(err, ErrDepartmentSyncNoParent) {
		t.Fatalf("PreviewFromParent() error = %v, want ErrDepartmentSyncNoParent", err)
	}
}

func TestDepartmentSyncerApplyFromParentRejectsStaleToken(t *testing.T) {
	t.Parallel()

	syncer := &departmentSyncer{
		deptRepo: fakeDepartmentRepo{
			items: map[int]*deptmodel.DepartmentDTO{
				1: {ID: 1, Name: "Parent"},
				2: {ID: 2, Name: "Child", ParentID: intPtr(1)},
			},
		},
		syncRepo: fakeSyncRepo{
			sourceProcesses: []deptrepo.DepartmentSyncProcessRecord{{Name: "Wax", Code: stringPtr("WAX")}},
		},
	}

	_, err := syncer.ApplyFromParent(context.Background(), 2, "stale-token")
	if !errors.Is(err, ErrDepartmentSyncStale) {
		t.Fatalf("ApplyFromParent() error = %v, want ErrDepartmentSyncStale", err)
	}
}

func TestDepartmentSyncerApplySnapshotRemapsProductRelations(t *testing.T) {
	t.Parallel()

	processSvc := &fakeProcessService{createIDs: []int{101}}
	categorySvc := &fakeCategoryService{createIDs: []int{201}}
	brandSvc := &fakeBrandService{createIDs: []int{301}}
	rawSvc := &fakeRawMaterialService{createIDs: []int{401}}
	techSvc := &fakeTechniqueService{createIDs: []int{501}}
	restSvc := &fakeRestorationTypeService{createIDs: []int{601}}
	productSvc := &fakeProductService{createIDs: []int{701, 702}}

	syncer := &departmentSyncer{
		syncRepo:         fakeSyncRepo{},
		processSvc:       processSvc,
		categoryMetaRepo: &fakeCategoryImportRepo{},
		categorySvc:      categorySvc,
		brandSvc:         brandSvc,
		rawMaterialSvc:   rawSvc,
		techniqueSvc:     techSvc,
		restorationSvc:   restSvc,
		productSvc:       productSvc,
	}

	snapshot := &syncSnapshot{
		sourceDeptID: 1,
		targetDeptID: 2,
		sourceProcesses: []deptrepo.DepartmentSyncProcessRecord{
			{Name: "Wax", Code: stringPtr("WAX")},
		},
		sourceCategories: []deptrepo.DepartmentSyncCategoryRecord{
			{ID: 10, Name: "Crown", Level: 1, Active: true, ProcessNames: []string{"Wax"}},
		},
		sourceRefs: map[syncModuleKey][]deptrepo.DepartmentSyncSimpleRefRecord{
			moduleBrand:           {{Name: "Ivoclar", CategoryName: "Crown", CategoryPath: "Crown"}},
			moduleRawMaterial:     {{Name: "Zirconia", CategoryName: "Crown", CategoryPath: "Crown"}},
			moduleTechnique:       {{Name: "CAD/CAM", CategoryName: "Crown", CategoryPath: "Crown"}},
			moduleRestorationType: {{Name: "Full Contour", CategoryName: "Crown", CategoryPath: "Crown"}},
		},
		targetRefs: map[syncModuleKey][]deptrepo.DepartmentSyncSimpleRefRecord{
			moduleBrand:           {},
			moduleRawMaterial:     {},
			moduleTechnique:       {},
			moduleRestorationType: {},
		},
		sourceProducts: []deptrepo.DepartmentSyncProductRecord{
			{
				Code:                 stringPtr("TPL-1"),
				Name:                 stringPtr("Template 1"),
				CategoryName:         stringPtr("Crown"),
				CategoryLV1:          stringPtr("Crown"),
				ProcessNames:         []string{"Wax"},
				BrandNameNames:       []string{"Ivoclar"},
				RawMaterialNames:     []string{"Zirconia"},
				TechniqueNames:       []string{"CAD/CAM"},
				RestorationTypeNames: []string{"Full Contour"},
				IsTemplate:           true,
			},
			{
				Code:                 stringPtr("VAR-1"),
				Name:                 stringPtr("Variant 1"),
				CategoryName:         stringPtr("Crown"),
				CategoryLV1:          stringPtr("Crown"),
				ProcessNames:         []string{"Wax"},
				BrandNameNames:       []string{"Ivoclar"},
				RawMaterialNames:     []string{"Zirconia"},
				TechniqueNames:       []string{"CAD/CAM"},
				RestorationTypeNames: []string{"Full Contour"},
				TemplateCode:         stringPtr("TPL-1"),
				IsTemplate:           false,
			},
		},
	}

	if err := syncer.applySnapshot(context.Background(), snapshot); err != nil {
		t.Fatalf("applySnapshot() error = %v", err)
	}

	if len(productSvc.createInputs) != 2 {
		t.Fatalf("product create calls = %d, want 2", len(productSvc.createInputs))
	}

	templateInput := productSvc.createInputs[0]
	if templateInput.DTO.TemplateID != nil {
		t.Fatalf("template product should not have TemplateID, got %v", *templateInput.DTO.TemplateID)
	}
	if templateInput.DTO.CategoryID == nil || *templateInput.DTO.CategoryID != 201 {
		t.Fatalf("template category id = %v, want 201", templateInput.DTO.CategoryID)
	}
	if !slices.Equal(templateInput.DTO.ProcessIDs, []int{101}) {
		t.Fatalf("template process ids = %v, want [101]", templateInput.DTO.ProcessIDs)
	}
	if !slices.Equal(templateInput.DTO.BrandNameIDs, []int{301}) {
		t.Fatalf("template brand ids = %v, want [301]", templateInput.DTO.BrandNameIDs)
	}
	if !slices.Equal(templateInput.DTO.RawMaterialIDs, []int{401}) {
		t.Fatalf("template raw material ids = %v, want [401]", templateInput.DTO.RawMaterialIDs)
	}
	if !slices.Equal(templateInput.DTO.TechniqueIDs, []int{501}) {
		t.Fatalf("template technique ids = %v, want [501]", templateInput.DTO.TechniqueIDs)
	}
	if !slices.Equal(templateInput.DTO.RestorationTypeIDs, []int{601}) {
		t.Fatalf("template restoration ids = %v, want [601]", templateInput.DTO.RestorationTypeIDs)
	}

	variantInput := productSvc.createInputs[1]
	if variantInput.DTO.TemplateID == nil || *variantInput.DTO.TemplateID != 701 {
		t.Fatalf("variant template id = %v, want 701", variantInput.DTO.TemplateID)
	}
	if variantInput.DTO.CategoryID == nil || *variantInput.DTO.CategoryID != 201 {
		t.Fatalf("variant category id = %v, want 201", variantInput.DTO.CategoryID)
	}
	if !slices.Equal(variantInput.DTO.ProcessIDs, []int{101}) {
		t.Fatalf("variant process ids = %v, want [101]", variantInput.DTO.ProcessIDs)
	}
}

func TestDepartmentSyncerApplySnapshotCopiesCategoryCollectionFields(t *testing.T) {
	t.Parallel()

	categorySvc := &fakeCategoryService{
		createIDs:           []int{201},
		createCollectionIDs: []int{901},
	}
	categoryMetaRepo := &fakeCategoryImportRepo{
		collectionIDsByCategory: map[int]int{201: 901},
	}

	syncer := &departmentSyncer{
		syncRepo:         fakeSyncRepo{collectionFields: map[int][]categoryrepo.CategoryFieldSpec{801: {{Name: "shade", Label: "Shade", Type: "text", Form: true, Table: true, OrderIndex: 1}}}},
		categoryMetaRepo: categoryMetaRepo,
		categorySvc:      categorySvc,
		processSvc:       &fakeProcessService{},
		brandSvc:         &fakeBrandService{},
		rawMaterialSvc:   &fakeRawMaterialService{},
		techniqueSvc:     &fakeTechniqueService{},
		restorationSvc:   &fakeRestorationTypeService{},
		sectionSvc:       &fakeSectionService{},
		materialSvc:      &fakeMaterialService{},
		productSvc:       &fakeProductService{},
	}

	snapshot := &syncSnapshot{
		sourceDeptID: 1,
		targetDeptID: 2,
		sourceCategories: []deptrepo.DepartmentSyncCategoryRecord{
			{ID: 10, CollectionID: intPtr(801), Name: "Crown", Level: 1, Active: true},
		},
		sourceRefs: map[syncModuleKey][]deptrepo.DepartmentSyncSimpleRefRecord{
			moduleBrand:           {},
			moduleRawMaterial:     {},
			moduleTechnique:       {},
			moduleRestorationType: {},
		},
		targetRefs: map[syncModuleKey][]deptrepo.DepartmentSyncSimpleRefRecord{
			moduleBrand:           {},
			moduleRawMaterial:     {},
			moduleTechnique:       {},
			moduleRestorationType: {},
		},
	}

	if err := syncer.applySnapshot(context.Background(), snapshot); err != nil {
		t.Fatalf("applySnapshot() error = %v", err)
	}

	if len(categoryMetaRepo.upsertFieldsCalls) != 1 {
		t.Fatalf("upsert field calls = %d, want 1", len(categoryMetaRepo.upsertFieldsCalls))
	}
	call := categoryMetaRepo.upsertFieldsCalls[0]
	if call.collectionID != 901 {
		t.Fatalf("target collection id = %d, want 901", call.collectionID)
	}
	if len(call.fields) != 1 || call.fields[0].Name != "shade" {
		t.Fatalf("unexpected copied fields: %+v", call.fields)
	}
}

func TestDepartmentSyncerApplySimpleRefsMatchesByCategoryPath(t *testing.T) {
	t.Parallel()

	rawSvc := &fakeRawMaterialService{}
	syncer := &departmentSyncer{
		syncRepo:       fakeSyncRepo{},
		rawMaterialSvc: rawSvc,
		brandSvc:       &fakeBrandService{},
		techniqueSvc:   &fakeTechniqueService{},
		restorationSvc: &fakeRestorationTypeService{},
	}

	snapshot := &syncSnapshot{
		sourceRefs: map[syncModuleKey][]deptrepo.DepartmentSyncSimpleRefRecord{
			moduleBrand: {},
			moduleRawMaterial: {
				{ID: 1, CategoryName: "Bar", CategoryPath: "Implant > Bar", Name: "Bar Kim Loại"},
			},
			moduleTechnique:       {},
			moduleRestorationType: {},
		},
		targetRefs: map[syncModuleKey][]deptrepo.DepartmentSyncSimpleRefRecord{
			moduleBrand: {},
			moduleRawMaterial: {
				{ID: 10, CategoryName: "Bar", CategoryPath: "Cố Định > Bar", Name: "Bar Kim Loại"},
				{ID: 11, CategoryName: "Bar", CategoryPath: "Implant > Bar", Name: "Bar Kim Loại"},
			},
			moduleTechnique:       {},
			moduleRestorationType: {},
		},
		targetDeptID: 2,
	}

	targetCategoryIDs := map[string]int{
		normalizeKey("Implant > Bar"): 163,
		normalizeKey("Cố Định > Bar"): 164,
	}

	if _, err := syncer.applySimpleRefs(context.Background(), snapshot, targetCategoryIDs); err != nil {
		t.Fatalf("applySimpleRefs() error = %v", err)
	}

	if len(rawSvc.updateInputs) != 1 {
		t.Fatalf("raw material update calls = %d, want 1", len(rawSvc.updateInputs))
	}
	if rawSvc.updateInputs[0].ID != 11 {
		t.Fatalf("updated raw material id = %d, want 11", rawSvc.updateInputs[0].ID)
	}
	if rawSvc.updateInputs[0].CategoryID == nil || *rawSvc.updateInputs[0].CategoryID != 163 {
		t.Fatalf("updated raw material category id = %v, want 163", rawSvc.updateInputs[0].CategoryID)
	}
}

func TestDepartmentSyncerApplySimpleRefsPrefersExistingUniqueRow(t *testing.T) {
	t.Parallel()

	rawSvc := &fakeRawMaterialService{}
	syncer := &departmentSyncer{
		syncRepo: fakeSyncRepo{
			simpleRefByUnique: map[string]int{
				"raw_materials|2|163|Bar Kim Loại": 97,
			},
		},
		rawMaterialSvc: rawSvc,
		brandSvc:       &fakeBrandService{},
		techniqueSvc:   &fakeTechniqueService{},
		restorationSvc: &fakeRestorationTypeService{},
	}

	snapshot := &syncSnapshot{
		sourceRefs: map[syncModuleKey][]deptrepo.DepartmentSyncSimpleRefRecord{
			moduleBrand: {},
			moduleRawMaterial: {
				{ID: 1, CategoryName: "Implant", CategoryPath: "Implant", Name: "Bar Kim Loại"},
			},
			moduleTechnique:       {},
			moduleRestorationType: {},
		},
		targetRefs: map[syncModuleKey][]deptrepo.DepartmentSyncSimpleRefRecord{
			moduleBrand: {},
			moduleRawMaterial: {
				{ID: 88, CategoryName: "Implant", CategoryPath: "Implant", Name: "Bar Kim Loại"},
			},
			moduleTechnique:       {},
			moduleRestorationType: {},
		},
		targetDeptID: 2,
	}

	targetCategoryIDs := map[string]int{
		normalizeKey("Implant"): 163,
	}

	if _, err := syncer.applySimpleRefs(context.Background(), snapshot, targetCategoryIDs); err != nil {
		t.Fatalf("applySimpleRefs() error = %v", err)
	}

	if len(rawSvc.updateInputs) != 1 {
		t.Fatalf("raw material update calls = %d, want 1", len(rawSvc.updateInputs))
	}
	if rawSvc.updateInputs[0].ID != 97 {
		t.Fatalf("updated raw material id = %d, want 97", rawSvc.updateInputs[0].ID)
	}
}

func TestDepartmentSyncerPreviewMaterialsMatchesByImplantFlag(t *testing.T) {
	t.Parallel()

	syncer := &departmentSyncer{}
	snapshot := &syncSnapshot{
		sourceMaterials: []deptrepo.DepartmentSyncMaterialRecord{
			{Name: "Ốc Labo", IsImplant: true},
			{Name: "Ốc Labo", IsImplant: false},
		},
		targetMaterials: []deptrepo.DepartmentSyncMaterialRecord{
			{ID: 11, Name: "Ốc Labo", IsImplant: false},
		},
	}

	mod := syncer.previewMaterials(snapshot)

	if mod.Create != 1 || mod.Update != 0 || mod.Skip != 1 {
		t.Fatalf("preview counts = create:%d update:%d skip:%d, want 1/0/1", mod.Create, mod.Update, mod.Skip)
	}
	if len(mod.Items) != 2 {
		t.Fatalf("preview item count = %d, want 2", len(mod.Items))
	}
	if got := mod.Items[0].Key; got != "implant::ốc labo" {
		t.Fatalf("implant material key = %q, want %q", got, "implant::ốc labo")
	}
	if got := mod.Items[0].Label; got != "Implant / Ốc Labo" {
		t.Fatalf("implant material label = %q, want %q", got, "Implant / Ốc Labo")
	}
	if got := mod.Items[0].ChangeType; got != "create" {
		t.Fatalf("implant material change type = %q, want create", got)
	}
	if got := mod.Items[1].Key; got != "không implant::ốc labo" {
		t.Fatalf("non-implant material key = %q, want %q", got, "không implant::ốc labo")
	}
	if got := mod.Items[1].Label; got != "Không Implant / Ốc Labo" {
		t.Fatalf("non-implant material label = %q, want %q", got, "Không Implant / Ốc Labo")
	}
	if got := mod.Items[1].ChangeType; got != "skip" {
		t.Fatalf("non-implant material change type = %q, want skip", got)
	}
}

func TestDepartmentSyncerApplyMaterialsMatchesByImplantFlag(t *testing.T) {
	t.Parallel()

	materialSvc := &fakeMaterialService{createIDs: []int{31}}
	syncer := &departmentSyncer{materialSvc: materialSvc}
	snapshot := &syncSnapshot{
		targetDeptID: 2,
		sourceMaterials: []deptrepo.DepartmentSyncMaterialRecord{
			{Name: "Ốc Labo", IsImplant: true},
			{Name: "Ốc Labo", IsImplant: false},
		},
		targetMaterials: []deptrepo.DepartmentSyncMaterialRecord{
			{ID: 21, Name: "Ốc Labo", IsImplant: false},
		},
	}

	if err := syncer.applyMaterials(context.Background(), snapshot); err != nil {
		t.Fatalf("applyMaterials() error = %v", err)
	}

	if len(materialSvc.updateInputs) != 1 {
		t.Fatalf("material update calls = %d, want 1", len(materialSvc.updateInputs))
	}
	if got := materialSvc.updateInputs[0].ID; got != 21 {
		t.Fatalf("updated material id = %d, want 21", got)
	}
	if got := materialSvc.updateInputs[0].IsImplant; got {
		t.Fatalf("updated material implant flag = %v, want false", got)
	}
	if len(materialSvc.createInputs) != 1 {
		t.Fatalf("material create calls = %d, want 1", len(materialSvc.createInputs))
	}
	if got := materialSvc.createInputs[0].IsImplant; !got {
		t.Fatalf("created material implant flag = %v, want true", got)
	}
	if got := safeString(materialSvc.createInputs[0].Name); got != "Ốc Labo" {
		t.Fatalf("created material name = %q, want %q", got, "Ốc Labo")
	}
}

func TestDepartmentSyncerApplyFromParentRollsBackTransactionOnFailure(t *testing.T) {
	driverName := registerTestTxDriver()
	statsKey := t.Name()
	stats := getTestTxStats(statsKey)

	db, err := sql.Open(driverName, statsKey)
	if err != nil {
		t.Fatalf("sql.Open() error = %v", err)
	}
	defer db.Close()

	client := generated.NewClient(generated.Driver(entsql.OpenDB(dialect.Postgres, db)))
	defer client.Close()

	sentinel := errors.New("process create failed")
	syncer := &departmentSyncer{
		db: client,
		deptRepo: fakeDepartmentRepo{
			items: map[int]*deptmodel.DepartmentDTO{
				1: {ID: 1, Name: "Parent"},
				2: {ID: 2, Name: "Child", ParentID: intPtr(1)},
			},
		},
		syncRepo: fakeSyncRepo{
			sourceProcesses: []deptrepo.DepartmentSyncProcessRecord{
				{Name: "Wax", Code: stringPtr("WAX")},
			},
		},
		processSvc: &fakeProcessService{createErr: sentinel},
	}

	preview, err := syncer.PreviewFromParent(context.Background(), 2)
	if err != nil {
		t.Fatalf("PreviewFromParent() error = %v", err)
	}

	_, err = syncer.ApplyFromParent(context.Background(), 2, preview.PreviewToken)
	if !errors.Is(err, sentinel) {
		t.Fatalf("ApplyFromParent() error = %v, want sentinel", err)
	}
	if stats.beginCount != 1 {
		t.Fatalf("begin count = %d, want 1", stats.beginCount)
	}
	if stats.rollbackCount != 1 {
		t.Fatalf("rollback count = %d, want 1", stats.rollbackCount)
	}
	if stats.commitCount != 0 {
		t.Fatalf("commit count = %d, want 0", stats.commitCount)
	}
}

func findModuleDiff(t *testing.T, modules []deptmodel.DepartmentSyncModuleDiffDTO, key string) deptmodel.DepartmentSyncModuleDiffDTO {
	t.Helper()

	for _, mod := range modules {
		if mod.Key == key {
			return mod
		}
	}
	t.Fatalf("module %q not found", key)
	return deptmodel.DepartmentSyncModuleDiffDTO{}
}

func findItemChangeType(t *testing.T, items []deptmodel.DepartmentSyncItemDiffDTO, key string) string {
	t.Helper()

	for _, item := range items {
		if item.Key == key {
			return item.ChangeType
		}
	}
	t.Fatalf("item %q not found", key)
	return ""
}

type fakeDepartmentRepo struct {
	items map[int]*deptmodel.DepartmentDTO
}

func (f fakeDepartmentRepo) Create(context.Context, deptmodel.DepartmentDTO) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to Create")
}

func (f fakeDepartmentRepo) Update(context.Context, deptmodel.DepartmentDTO) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to Update")
}

func (f fakeDepartmentRepo) GetByID(_ context.Context, id int) (*deptmodel.DepartmentDTO, error) {
	item, ok := f.items[id]
	if !ok {
		return nil, errors.New("department not found")
	}
	copy := *item
	return &copy, nil
}

func (f fakeDepartmentRepo) GetBySlug(context.Context, string) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to GetBySlug")
}

func (f fakeDepartmentRepo) List(context.Context, table.TableQuery) (table.TableListResult[deptmodel.DepartmentDTO], error) {
	panic("unexpected call to List")
}

func (f fakeDepartmentRepo) Search(context.Context, dbutils.SearchQuery) (dbutils.SearchResult[deptmodel.DepartmentDTO], error) {
	panic("unexpected call to Search")
}

func (f fakeDepartmentRepo) ChildrenList(context.Context, int, table.TableQuery) (table.TableListResult[deptmodel.DepartmentDTO], error) {
	panic("unexpected call to ChildrenList")
}

func (f fakeDepartmentRepo) Delete(context.Context, int) error {
	panic("unexpected call to Delete")
}

func (f fakeDepartmentRepo) ExistsMembership(context.Context, int, int) (bool, error) {
	panic("unexpected call to ExistsMembership")
}

func (f fakeDepartmentRepo) GetFirstDepartmentOfUser(context.Context, int) (*deptmodel.DepartmentDTO, error) {
	panic("unexpected call to GetFirstDepartmentOfUser")
}

type fakeSyncRepo struct {
	sourceCategories  []deptrepo.DepartmentSyncCategoryRecord
	targetCategories  []deptrepo.DepartmentSyncCategoryRecord
	sourceRefs        map[syncModuleKey][]deptrepo.DepartmentSyncSimpleRefRecord
	targetRefs        map[syncModuleKey][]deptrepo.DepartmentSyncSimpleRefRecord
	sourceProcesses   []deptrepo.DepartmentSyncProcessRecord
	targetProcesses   []deptrepo.DepartmentSyncProcessRecord
	sourceSections    []deptrepo.DepartmentSyncSectionRecord
	targetSections    []deptrepo.DepartmentSyncSectionRecord
	sourceMaterials   []deptrepo.DepartmentSyncMaterialRecord
	targetMaterials   []deptrepo.DepartmentSyncMaterialRecord
	sourceProducts    []deptrepo.DepartmentSyncProductRecord
	targetProducts    []deptrepo.DepartmentSyncProductRecord
	collectionFields  map[int][]categoryrepo.CategoryFieldSpec
	simpleRefByUnique map[string]int
}

func (f fakeSyncRepo) ListCategories(_ context.Context, deptID int) ([]deptrepo.DepartmentSyncCategoryRecord, error) {
	return append([]deptrepo.DepartmentSyncCategoryRecord(nil), f.pickCategories(deptID == 1)...), nil
}

func (f fakeSyncRepo) ListSimpleRefs(_ context.Context, table string, deptID int) ([]deptrepo.DepartmentSyncSimpleRefRecord, error) {
	keyByTable := map[string]syncModuleKey{
		"brand_names":       moduleBrand,
		"raw_materials":     moduleRawMaterial,
		"techniques":        moduleTechnique,
		"restoration_types": moduleRestorationType,
	}
	key := keyByTable[table]
	if deptID == 1 {
		return append([]deptrepo.DepartmentSyncSimpleRefRecord(nil), f.sourceRefs[key]...), nil
	}
	return append([]deptrepo.DepartmentSyncSimpleRefRecord(nil), f.targetRefs[key]...), nil
}

func (f fakeSyncRepo) ListProcesses(_ context.Context, deptID int) ([]deptrepo.DepartmentSyncProcessRecord, error) {
	return append([]deptrepo.DepartmentSyncProcessRecord(nil), f.pickProcesses(deptID == 1)...), nil
}

func (f fakeSyncRepo) ListSections(_ context.Context, deptID int) ([]deptrepo.DepartmentSyncSectionRecord, error) {
	return append([]deptrepo.DepartmentSyncSectionRecord(nil), f.pickSections(deptID == 1)...), nil
}

func (f fakeSyncRepo) ListMaterials(_ context.Context, deptID int) ([]deptrepo.DepartmentSyncMaterialRecord, error) {
	return append([]deptrepo.DepartmentSyncMaterialRecord(nil), f.pickMaterials(deptID == 1)...), nil
}

func (f fakeSyncRepo) ListProducts(_ context.Context, deptID int) ([]deptrepo.DepartmentSyncProductRecord, error) {
	return append([]deptrepo.DepartmentSyncProductRecord(nil), f.pickProducts(deptID == 1)...), nil
}

func (f fakeSyncRepo) ListCollectionFieldSpecs(_ context.Context, collectionID int) ([]categoryrepo.CategoryFieldSpec, error) {
	return append([]categoryrepo.CategoryFieldSpec(nil), f.collectionFields[collectionID]...), nil
}

func (f fakeSyncRepo) FindSimpleRefID(_ context.Context, table string, deptID int, categoryID int, name string) (*int, error) {
	key := simpleRefLookupKey(table, deptID, categoryID, name)
	if id, ok := f.simpleRefByUnique[key]; ok {
		return intPtr(id), nil
	}
	return nil, nil
}

func (f fakeSyncRepo) pickCategories(source bool) []deptrepo.DepartmentSyncCategoryRecord {
	if source {
		return f.sourceCategories
	}
	return f.targetCategories
}

func (f fakeSyncRepo) pickProcesses(source bool) []deptrepo.DepartmentSyncProcessRecord {
	if source {
		return f.sourceProcesses
	}
	return f.targetProcesses
}

func (f fakeSyncRepo) pickSections(source bool) []deptrepo.DepartmentSyncSectionRecord {
	if source {
		return f.sourceSections
	}
	return f.targetSections
}

func (f fakeSyncRepo) pickMaterials(source bool) []deptrepo.DepartmentSyncMaterialRecord {
	if source {
		return f.sourceMaterials
	}
	return f.targetMaterials
}

func (f fakeSyncRepo) pickProducts(source bool) []deptrepo.DepartmentSyncProductRecord {
	if source {
		return f.sourceProducts
	}
	return f.targetProducts
}

type fakeProcessService struct {
	createIDs    []int
	updateIDs    []int
	createErr    error
	updateErr    error
	createInputs []model.ProcessDTO
	updateInputs []model.ProcessDTO
}

func (f *fakeProcessService) Create(_ context.Context, _ int, input model.ProcessDTO) (*model.ProcessDTO, error) {
	f.createInputs = append(f.createInputs, input)
	if f.createErr != nil {
		return nil, f.createErr
	}
	dto := input
	dto.ID = nextID(&f.createIDs, 1)
	return &dto, nil
}

func (f *fakeProcessService) Update(_ context.Context, _ int, input model.ProcessDTO) (*model.ProcessDTO, error) {
	f.updateInputs = append(f.updateInputs, input)
	if f.updateErr != nil {
		return nil, f.updateErr
	}
	dto := input
	dto.ID = keepOrNextID(input.ID, &f.updateIDs, 1)
	return &dto, nil
}

func (f *fakeProcessService) GetByID(context.Context, int, int) (*model.ProcessDTO, error) {
	panic("unexpected call to GetByID")
}

func (f *fakeProcessService) List(context.Context, int, table.TableQuery) (table.TableListResult[model.ProcessDTO], error) {
	panic("unexpected call to List")
}

func (f *fakeProcessService) Search(context.Context, int, dbutils.SearchQuery) (dbutils.SearchResult[model.ProcessDTO], error) {
	panic("unexpected call to Search")
}

func (f *fakeProcessService) Delete(context.Context, int, int) error {
	panic("unexpected call to Delete")
}

type fakeCategoryService struct {
	createIDs           []int
	updateIDs           []int
	createCollectionIDs []int
	updateCollectionIDs []int
	createErr           error
	updateErr           error
	createInputs        []*model.CategoryUpsertDTO
	updateInputs        []*model.CategoryUpsertDTO
}

func (f *fakeCategoryService) Create(_ context.Context, _ int, input *model.CategoryUpsertDTO) (*model.CategoryDTO, error) {
	f.createInputs = append(f.createInputs, cloneCategoryUpsert(input))
	if f.createErr != nil {
		return nil, f.createErr
	}
	dto := input.DTO
	dto.ID = nextID(&f.createIDs, 1)
	if id := nextID(&f.createCollectionIDs, 0); id > 0 {
		dto.CollectionID = intPtr(id)
	}
	return &dto, nil
}

func (f *fakeCategoryService) Update(_ context.Context, _ int, input *model.CategoryUpsertDTO) (*model.CategoryDTO, error) {
	f.updateInputs = append(f.updateInputs, cloneCategoryUpsert(input))
	if f.updateErr != nil {
		return nil, f.updateErr
	}
	dto := input.DTO
	dto.ID = keepOrNextID(input.DTO.ID, &f.updateIDs, 1)
	if dto.CollectionID == nil {
		if id := nextID(&f.updateCollectionIDs, 0); id > 0 {
			dto.CollectionID = intPtr(id)
		}
	}
	return &dto, nil
}

func (f *fakeCategoryService) GetByID(context.Context, int, int) (*model.CategoryDTO, error) {
	panic("unexpected call to GetByID")
}

func (f *fakeCategoryService) List(context.Context, int, table.TableQuery) (table.TableListResult[model.CategoryDTO], error) {
	panic("unexpected call to List")
}

func (f *fakeCategoryService) Search(context.Context, int, dbutils.SearchQuery) (dbutils.SearchResult[model.CategoryDTO], error) {
	panic("unexpected call to Search")
}

func (f *fakeCategoryService) Delete(context.Context, int, int) error {
	panic("unexpected call to Delete")
}

type fakeBrandService struct {
	createIDs []int
	updateIDs []int
	createErr error
	updateErr error
}

func (f *fakeBrandService) Create(context.Context, int, model.BrandNameDTO) (*model.BrandNameDTO, error) {
	if f.createErr != nil {
		return nil, f.createErr
	}
	dto := model.BrandNameDTO{ID: nextID(&f.createIDs, 1)}
	return &dto, nil
}

func (f *fakeBrandService) Update(_ context.Context, _ int, input model.BrandNameDTO) (*model.BrandNameDTO, error) {
	if f.updateErr != nil {
		return nil, f.updateErr
	}
	dto := input
	dto.ID = keepOrNextID(input.ID, &f.updateIDs, 1)
	return &dto, nil
}

func (f *fakeBrandService) GetByID(context.Context, int, int) (*model.BrandNameDTO, error) {
	panic("unexpected call to GetByID")
}

func (f *fakeBrandService) List(context.Context, int, *int, table.TableQuery) (table.TableListResult[model.BrandNameDTO], error) {
	panic("unexpected call to List")
}

func (f *fakeBrandService) Search(context.Context, int, *int, dbutils.SearchQuery) (dbutils.SearchResult[model.BrandNameDTO], error) {
	panic("unexpected call to Search")
}

func (f *fakeBrandService) Delete(context.Context, int, int) error {
	panic("unexpected call to Delete")
}

type fakeRawMaterialService struct {
	createIDs    []int
	updateIDs    []int
	createErr    error
	updateErr    error
	createInputs []model.RawMaterialDTO
	updateInputs []model.RawMaterialDTO
}

func (f *fakeRawMaterialService) Create(_ context.Context, _ int, input model.RawMaterialDTO) (*model.RawMaterialDTO, error) {
	f.createInputs = append(f.createInputs, input)
	if f.createErr != nil {
		return nil, f.createErr
	}
	dto := input
	dto.ID = nextID(&f.createIDs, 1)
	return &dto, nil
}

func (f *fakeRawMaterialService) Update(_ context.Context, _ int, input model.RawMaterialDTO) (*model.RawMaterialDTO, error) {
	f.updateInputs = append(f.updateInputs, input)
	if f.updateErr != nil {
		return nil, f.updateErr
	}
	dto := input
	dto.ID = keepOrNextID(input.ID, &f.updateIDs, 1)
	return &dto, nil
}

func (f *fakeRawMaterialService) GetByID(context.Context, int, int) (*model.RawMaterialDTO, error) {
	panic("unexpected call to GetByID")
}

func (f *fakeRawMaterialService) List(context.Context, int, *int, table.TableQuery) (table.TableListResult[model.RawMaterialDTO], error) {
	panic("unexpected call to List")
}

func (f *fakeRawMaterialService) Search(context.Context, int, *int, dbutils.SearchQuery) (dbutils.SearchResult[model.RawMaterialDTO], error) {
	panic("unexpected call to Search")
}

func (f *fakeRawMaterialService) Delete(context.Context, int, int) error {
	panic("unexpected call to Delete")
}

type fakeTechniqueService struct {
	createIDs []int
	updateIDs []int
	createErr error
	updateErr error
}

func (f *fakeTechniqueService) Create(context.Context, int, model.TechniqueDTO) (*model.TechniqueDTO, error) {
	if f.createErr != nil {
		return nil, f.createErr
	}
	dto := model.TechniqueDTO{ID: nextID(&f.createIDs, 1)}
	return &dto, nil
}

func (f *fakeTechniqueService) Update(_ context.Context, _ int, input model.TechniqueDTO) (*model.TechniqueDTO, error) {
	if f.updateErr != nil {
		return nil, f.updateErr
	}
	dto := input
	dto.ID = keepOrNextID(input.ID, &f.updateIDs, 1)
	return &dto, nil
}

func (f *fakeTechniqueService) GetByID(context.Context, int, int) (*model.TechniqueDTO, error) {
	panic("unexpected call to GetByID")
}

func (f *fakeTechniqueService) List(context.Context, int, *int, table.TableQuery) (table.TableListResult[model.TechniqueDTO], error) {
	panic("unexpected call to List")
}

func (f *fakeTechniqueService) Search(context.Context, int, *int, dbutils.SearchQuery) (dbutils.SearchResult[model.TechniqueDTO], error) {
	panic("unexpected call to Search")
}

func (f *fakeTechniqueService) Delete(context.Context, int, int) error {
	panic("unexpected call to Delete")
}

type fakeRestorationTypeService struct {
	createIDs []int
	updateIDs []int
	createErr error
	updateErr error
}

func (f *fakeRestorationTypeService) Create(context.Context, int, model.RestorationTypeDTO) (*model.RestorationTypeDTO, error) {
	if f.createErr != nil {
		return nil, f.createErr
	}
	dto := model.RestorationTypeDTO{ID: nextID(&f.createIDs, 1)}
	return &dto, nil
}

func (f *fakeRestorationTypeService) Update(_ context.Context, _ int, input model.RestorationTypeDTO) (*model.RestorationTypeDTO, error) {
	if f.updateErr != nil {
		return nil, f.updateErr
	}
	dto := input
	dto.ID = keepOrNextID(input.ID, &f.updateIDs, 1)
	return &dto, nil
}

func (f *fakeRestorationTypeService) GetByID(context.Context, int, int) (*model.RestorationTypeDTO, error) {
	panic("unexpected call to GetByID")
}

func (f *fakeRestorationTypeService) List(context.Context, int, *int, table.TableQuery) (table.TableListResult[model.RestorationTypeDTO], error) {
	panic("unexpected call to List")
}

func (f *fakeRestorationTypeService) Search(context.Context, int, *int, dbutils.SearchQuery) (dbutils.SearchResult[model.RestorationTypeDTO], error) {
	panic("unexpected call to Search")
}

func (f *fakeRestorationTypeService) Delete(context.Context, int, int) error {
	panic("unexpected call to Delete")
}

type fakeSectionService struct{}

func (f *fakeSectionService) Create(context.Context, model.SectionDTO) (*model.SectionDTO, error) {
	panic("unexpected call to Create")
}

func (f *fakeSectionService) Update(context.Context, model.SectionDTO) (*model.SectionDTO, error) {
	panic("unexpected call to Update")
}

func (f *fakeSectionService) GetByID(context.Context, int) (*model.SectionDTO, error) {
	panic("unexpected call to GetByID")
}

func (f *fakeSectionService) List(context.Context, int, table.TableQuery) (table.TableListResult[model.SectionDTO], error) {
	panic("unexpected call to List")
}

func (f *fakeSectionService) ListByStaffID(context.Context, int, table.TableQuery) (table.TableListResult[model.SectionDTO], error) {
	panic("unexpected call to ListByStaffID")
}

func (f *fakeSectionService) Search(context.Context, int, dbutils.SearchQuery) (dbutils.SearchResult[model.SectionDTO], error) {
	panic("unexpected call to Search")
}

func (f *fakeSectionService) Delete(context.Context, int) error {
	panic("unexpected call to Delete")
}

type fakeMaterialService struct {
	createIDs    []int
	updateIDs    []int
	createErr    error
	updateErr    error
	createInputs []model.MaterialDTO
	updateInputs []model.MaterialDTO
}

func (f *fakeMaterialService) Create(_ context.Context, _ int, input model.MaterialDTO) (*model.MaterialDTO, error) {
	f.createInputs = append(f.createInputs, input)
	if f.createErr != nil {
		return nil, f.createErr
	}
	dto := input
	dto.ID = nextID(&f.createIDs, 1)
	return &dto, nil
}

func (f *fakeMaterialService) Update(_ context.Context, _ int, input model.MaterialDTO) (*model.MaterialDTO, error) {
	f.updateInputs = append(f.updateInputs, input)
	if f.updateErr != nil {
		return nil, f.updateErr
	}
	dto := input
	dto.ID = keepOrNextID(input.ID, &f.updateIDs, 1)
	return &dto, nil
}

func (f *fakeMaterialService) GetByID(context.Context, int, int) (*model.MaterialDTO, error) {
	panic("unexpected call to GetByID")
}

func (f *fakeMaterialService) List(context.Context, int, table.TableQuery) (table.TableListResult[model.MaterialDTO], error) {
	panic("unexpected call to List")
}

func (f *fakeMaterialService) Search(context.Context, int, *string, *bool, dbutils.SearchQuery) (dbutils.SearchResult[model.MaterialDTO], error) {
	panic("unexpected call to Search")
}

func (f *fakeMaterialService) Delete(context.Context, int, int) error {
	panic("unexpected call to Delete")
}

type fakeProductService struct {
	createIDs    []int
	updateIDs    []int
	createErr    error
	updateErr    error
	createInputs []*model.ProductUpsertDTO
	updateInputs []*model.ProductUpsertDTO
}

type fakeCategoryImportRepo struct {
	collectionIDsByCategory map[int]int
	upsertFieldsCalls       []fakeUpsertFieldsCall
}

type fakeUpsertFieldsCall struct {
	collectionID int
	fields       []categoryrepo.CategoryFieldSpec
}

func (f *fakeCategoryImportRepo) GetOrCreateLV1(context.Context, int, string) (int, bool, error) {
	panic("unexpected call to GetOrCreateLV1")
}

func (f *fakeCategoryImportRepo) GetOrCreateLV2(context.Context, int, int, string, string) (int, bool, error) {
	panic("unexpected call to GetOrCreateLV2")
}

func (f *fakeCategoryImportRepo) GetOrCreateLV3(context.Context, int, int, int, string, string, string) (int, bool, error) {
	panic("unexpected call to GetOrCreateLV3")
}

func (f *fakeCategoryImportRepo) GetTreeNode(context.Context, int, int) (*collectionutils.TreeNode, error) {
	panic("unexpected call to GetTreeNode")
}

func (f *fakeCategoryImportRepo) GetCollectionID(_ context.Context, _ int, id int) (*int, error) {
	if collectionID, ok := f.collectionIDsByCategory[id]; ok {
		return intPtr(collectionID), nil
	}
	return nil, nil
}

func (f *fakeCategoryImportRepo) UpsertFields(_ context.Context, collectionID int, fields []categoryrepo.CategoryFieldSpec) (int, error) {
	cloned := append([]categoryrepo.CategoryFieldSpec(nil), fields...)
	f.upsertFieldsCalls = append(f.upsertFieldsCalls, fakeUpsertFieldsCall{
		collectionID: collectionID,
		fields:       cloned,
	})
	return len(fields), nil
}

func (f *fakeProductService) Create(_ context.Context, _ int, input *model.ProductUpsertDTO) (*model.ProductDTO, error) {
	f.createInputs = append(f.createInputs, cloneProductUpsert(input))
	if f.createErr != nil {
		return nil, f.createErr
	}
	dto := input.DTO
	dto.ID = nextID(&f.createIDs, 1)
	return &dto, nil
}

func (f *fakeProductService) Update(_ context.Context, _ int, input *model.ProductUpsertDTO) (*model.ProductDTO, error) {
	f.updateInputs = append(f.updateInputs, cloneProductUpsert(input))
	if f.updateErr != nil {
		return nil, f.updateErr
	}
	dto := input.DTO
	dto.ID = keepOrNextID(input.DTO.ID, &f.updateIDs, 1)
	return &dto, nil
}

func (f *fakeProductService) GetByID(context.Context, int, int) (*model.ProductDTO, error) {
	panic("unexpected call to GetByID")
}

func (f *fakeProductService) List(context.Context, int, table.TableQuery) (table.TableListResult[model.ProductDTO], error) {
	panic("unexpected call to List")
}

func (f *fakeProductService) VariantList(context.Context, int, int, table.TableQuery) (table.TableListResult[model.ProductDTO], error) {
	panic("unexpected call to VariantList")
}

func (f *fakeProductService) Search(context.Context, int, dbutils.SearchQuery) (dbutils.SearchResult[model.ProductDTO], error) {
	panic("unexpected call to Search")
}

func (f *fakeProductService) Delete(context.Context, int, int) error {
	panic("unexpected call to Delete")
}

func cloneCategoryUpsert(input *model.CategoryUpsertDTO) *model.CategoryUpsertDTO {
	if input == nil {
		return nil
	}
	out := *input
	if input.Collections != nil {
		collections := append([]string(nil), (*input.Collections)...)
		out.Collections = &collections
	}
	if input.DTO.ProcessIDs != nil {
		out.DTO.ProcessIDs = append([]int(nil), input.DTO.ProcessIDs...)
	}
	return &out
}

func cloneProductUpsert(input *model.ProductUpsertDTO) *model.ProductUpsertDTO {
	if input == nil {
		return nil
	}
	out := *input
	if input.Collections != nil {
		collections := append([]string(nil), (*input.Collections)...)
		out.Collections = &collections
	}
	out.DTO.ProcessIDs = append([]int(nil), input.DTO.ProcessIDs...)
	out.DTO.BrandNameIDs = append([]int(nil), input.DTO.BrandNameIDs...)
	out.DTO.RawMaterialIDs = append([]int(nil), input.DTO.RawMaterialIDs...)
	out.DTO.TechniqueIDs = append([]int(nil), input.DTO.TechniqueIDs...)
	out.DTO.RestorationTypeIDs = append([]int(nil), input.DTO.RestorationTypeIDs...)
	return &out
}

func nextID(ids *[]int, fallback int) int {
	if len(*ids) == 0 {
		return fallback
	}
	id := (*ids)[0]
	*ids = (*ids)[1:]
	return id
}

func keepOrNextID(current int, ids *[]int, fallback int) int {
	if current > 0 {
		return current
	}
	return nextID(ids, fallback)
}

func intPtr(v int) *int {
	return &v
}

func stringPtr(v string) *string {
	return &v
}

func simpleRefLookupKey(table string, deptID int, categoryID int, name string) string {
	return table + "|" + strconv.Itoa(deptID) + "|" + strconv.Itoa(categoryID) + "|" + name
}

type testTxStats struct {
	beginCount    int
	commitCount   int
	rollbackCount int
}

type testTxDriver struct{}

type testTxConn struct {
	stats *testTxStats
}

type testTx struct {
	stats *testTxStats
}

type testStmt struct{}

var (
	testTxDriverOnce sync.Once
	testTxStatsMu    sync.Mutex
	testTxStatsByDSN = map[string]*testTxStats{}
)

func registerTestTxDriver() string {
	const name = "department_sync_test_tx"
	testTxDriverOnce.Do(func() {
		sql.Register(name, testTxDriver{})
	})
	return name
}

func getTestTxStats(dsn string) *testTxStats {
	testTxStatsMu.Lock()
	defer testTxStatsMu.Unlock()

	stats := &testTxStats{}
	testTxStatsByDSN[dsn] = stats
	return stats
}

func (testTxDriver) Open(name string) (driver.Conn, error) {
	testTxStatsMu.Lock()
	defer testTxStatsMu.Unlock()

	stats, ok := testTxStatsByDSN[name]
	if !ok {
		stats = &testTxStats{}
		testTxStatsByDSN[name] = stats
	}
	return &testTxConn{stats: stats}, nil
}

func (c *testTxConn) Prepare(string) (driver.Stmt, error) {
	return testStmt{}, nil
}

func (c *testTxConn) Close() error {
	return nil
}

func (c *testTxConn) Begin() (driver.Tx, error) {
	c.stats.beginCount++
	return &testTx{stats: c.stats}, nil
}

func (c *testTxConn) BeginTx(context.Context, driver.TxOptions) (driver.Tx, error) {
	return c.Begin()
}

func (t *testTx) Commit() error {
	t.stats.commitCount++
	return nil
}

func (t *testTx) Rollback() error {
	t.stats.rollbackCount++
	return nil
}

func (testStmt) Close() error {
	return nil
}

func (testStmt) NumInput() int {
	return -1
}

func (testStmt) Exec([]driver.Value) (driver.Result, error) {
	return driver.RowsAffected(0), nil
}

func (testStmt) Query([]driver.Value) (driver.Rows, error) {
	return nil, errors.New("query not supported in test driver")
}

var (
	_ deptrepo.DepartmentRepository             = fakeDepartmentRepo{}
	_ deptrepo.DepartmentSyncRepository         = fakeSyncRepo{}
	_ categoryrepo.CategoryImportRepository     = (*fakeCategoryImportRepo)(nil)
	_ processservice.ProcessService             = (*fakeProcessService)(nil)
	_ categoryservice.CategoryService           = (*fakeCategoryService)(nil)
	_ brandservice.BrandNameService             = (*fakeBrandService)(nil)
	_ rawmaterialservice.RawMaterialService     = (*fakeRawMaterialService)(nil)
	_ techniqueservice.TechniqueService         = (*fakeTechniqueService)(nil)
	_ restorationservice.RestorationTypeService = (*fakeRestorationTypeService)(nil)
	_ sectionservice.SectionService             = (*fakeSectionService)(nil)
	_ materialservice.MaterialService           = (*fakeMaterialService)(nil)
	_ productservice.ProductService             = (*fakeProductService)(nil)
)
