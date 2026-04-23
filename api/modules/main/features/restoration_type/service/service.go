package service

import (
	"context"
	"fmt"

	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	catalogrefcode "github.com/khiemnd777/noah_api/modules/main/features/catalog_ref_code"
	"github.com/khiemnd777/noah_api/modules/main/features/restoration_type/repository"
	"github.com/khiemnd777/noah_api/shared/cache"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

type RestorationTypeService interface {
	Create(ctx context.Context, deptID int, input model.RestorationTypeDTO) (*model.RestorationTypeDTO, error)
	Update(ctx context.Context, deptID int, input model.RestorationTypeDTO) (*model.RestorationTypeDTO, error)
	GetByID(ctx context.Context, deptID int, id int) (*model.RestorationTypeDTO, error)
	List(ctx context.Context, deptID int, categoryID *int, query table.TableQuery) (table.TableListResult[model.RestorationTypeDTO], error)
	Search(ctx context.Context, deptID int, categoryID *int, query dbutils.SearchQuery) (dbutils.SearchResult[model.RestorationTypeDTO], error)
	Delete(ctx context.Context, deptID int, id int) error
}

type restorationTypeService struct {
	repo repository.RestorationTypeRepository
	deps *module.ModuleDeps[config.ModuleConfig]
}

type ErrConflict string

func (e ErrConflict) Error() string { return string(e) }

func NewRestorationTypeService(repo repository.RestorationTypeRepository, deps *module.ModuleDeps[config.ModuleConfig]) RestorationTypeService {
	return &restorationTypeService{repo: repo, deps: deps}
}

func kRestorationTypeByID(deptID int, id int) string {
	return fmt.Sprintf("restoration_type:dpt%d:id:%d", deptID, id)
}

func kRestorationTypeAll(deptID int) []string {
	return []string{
		kRestorationTypeListAll(deptID),
		kRestorationTypeSearchAll(deptID),
	}
}

func kRestorationTypeListAll(deptID int) string {
	return fmt.Sprintf("restoration_type:list:dpt%d:*", deptID)
}

func kRestorationTypeSearchAll(deptID int) string {
	return fmt.Sprintf("restoration_type:search:dpt%d:*", deptID)
}

func kRestorationTypeList(deptID int, categoryID *int, q table.TableQuery) string {
	orderBy := ""
	if q.OrderBy != nil {
		orderBy = *q.OrderBy
	}
	cid := 0
	if categoryID != nil {
		cid = *categoryID
	}
	return fmt.Sprintf("restoration_type:list:dpt%d:c%d:l%d:p%d:o%s:d%s", deptID, cid, q.Limit, q.Page, orderBy, q.Direction)
}

func kRestorationTypeSearch(deptID int, categoryID *int, q dbutils.SearchQuery) string {
	orderBy := ""
	if q.OrderBy != nil {
		orderBy = *q.OrderBy
	}
	cid := 0
	if categoryID != nil {
		cid = *categoryID
	}
	return fmt.Sprintf("restoration_type:search:dpt%d:c%d:k%s:l%d:p%d:o%s:d%s", deptID, cid, q.Keyword, q.Limit, q.Page, orderBy, q.Direction)
}

func (s *restorationTypeService) Create(ctx context.Context, deptID int, input model.RestorationTypeDTO) (*model.RestorationTypeDTO, error) {
	dto, err := s.repo.Create(ctx, deptID, input)
	if err != nil {
		if catalogrefcode.NewService().IsUniqueViolation(err) {
			return nil, ErrConflict("restoration type code already exists")
		}
		return nil, err
	}

	if dto != nil && dto.ID > 0 {
		cache.InvalidateKeys(kRestorationTypeByID(deptID, dto.ID))
	}
	cache.InvalidateKeys(kRestorationTypeAll(deptID)...)

	s.upsertSearch(ctx, deptID, dto)

	return dto, nil
}

func (s *restorationTypeService) Update(ctx context.Context, deptID int, input model.RestorationTypeDTO) (*model.RestorationTypeDTO, error) {
	dto, err := s.repo.Update(ctx, deptID, input)
	if err != nil {
		if catalogrefcode.NewService().IsUniqueViolation(err) {
			return nil, ErrConflict("restoration type code already exists")
		}
		return nil, err
	}

	if dto != nil {
		cache.InvalidateKeys(kRestorationTypeByID(deptID, dto.ID))
	}
	cache.InvalidateKeys(kRestorationTypeAll(deptID)...)

	s.upsertSearch(ctx, deptID, dto)

	return dto, nil
}

func (s *restorationTypeService) upsertSearch(ctx context.Context, deptID int, dto *model.RestorationTypeDTO) {
	publishRestorationTypeSearch(ctx, deptID, dto)
}

func (s *restorationTypeService) unlinkSearch(ctx context.Context, id int) {
	publishRestorationTypeUnlink(ctx, id)
}

func (s *restorationTypeService) GetByID(ctx context.Context, deptID, id int) (*model.RestorationTypeDTO, error) {
	return cache.Get(kRestorationTypeByID(deptID, id), cache.TTLMedium, func() (*model.RestorationTypeDTO, error) {
		return s.repo.GetByID(ctx, deptID, id)
	})
}

func (s *restorationTypeService) List(ctx context.Context, deptID int, categoryID *int, q table.TableQuery) (table.TableListResult[model.RestorationTypeDTO], error) {
	type boxed = table.TableListResult[model.RestorationTypeDTO]
	key := kRestorationTypeList(deptID, categoryID, q)

	ptr, err := cache.Get(key, cache.TTLMedium, func() (*boxed, error) {
		res, e := s.repo.List(ctx, deptID, categoryID, q)
		if e != nil {
			return nil, e
		}
		return &res, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	return *ptr, nil
}

func (s *restorationTypeService) Delete(ctx context.Context, deptID int, id int) error {
	if err := s.repo.Delete(ctx, deptID, id); err != nil {
		return err
	}
	cache.InvalidateKeys(kRestorationTypeAll(deptID)...)
	cache.InvalidateKeys(kRestorationTypeByID(deptID, id))

	s.unlinkSearch(ctx, id)
	return nil
}

func (s *restorationTypeService) Search(ctx context.Context, deptID int, categoryID *int, q dbutils.SearchQuery) (dbutils.SearchResult[model.RestorationTypeDTO], error) {
	type boxed = dbutils.SearchResult[model.RestorationTypeDTO]
	key := kRestorationTypeSearch(deptID, categoryID, q)

	ptr, err := cache.Get(key, cache.TTLMedium, func() (*boxed, error) {
		res, e := s.repo.Search(ctx, deptID, categoryID, q)
		if e != nil {
			return nil, e
		}
		return &res, nil
	})
	if err != nil {
		var zero boxed
		return zero, err
	}
	return *ptr, nil
}
