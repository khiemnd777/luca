package service

import (
	"context"
	"fmt"

	"github.com/khiemnd777/noah_api/modules/main/config"
	model "github.com/khiemnd777/noah_api/modules/main/features/__model"
	"github.com/khiemnd777/noah_api/modules/main/features/technique/repository"
	"github.com/khiemnd777/noah_api/shared/cache"
	dbutils "github.com/khiemnd777/noah_api/shared/db/utils"
	"github.com/khiemnd777/noah_api/shared/module"
	"github.com/khiemnd777/noah_api/shared/utils/table"
)

type TechniqueService interface {
	Create(ctx context.Context, deptID int, input model.TechniqueDTO) (*model.TechniqueDTO, error)
	Update(ctx context.Context, deptID int, input model.TechniqueDTO) (*model.TechniqueDTO, error)
	GetByID(ctx context.Context, deptID int, id int) (*model.TechniqueDTO, error)
	List(ctx context.Context, deptID int, categoryID *int, query table.TableQuery) (table.TableListResult[model.TechniqueDTO], error)
	Search(ctx context.Context, deptID int, categoryID *int, query dbutils.SearchQuery) (dbutils.SearchResult[model.TechniqueDTO], error)
	Delete(ctx context.Context, deptID int, id int) error
}

type techniqueService struct {
	repo repository.TechniqueRepository
	deps *module.ModuleDeps[config.ModuleConfig]
}

func NewTechniqueService(repo repository.TechniqueRepository, deps *module.ModuleDeps[config.ModuleConfig]) TechniqueService {
	return &techniqueService{repo: repo, deps: deps}
}

func kTechniqueByID(deptID int, id int) string {
	return fmt.Sprintf("technique:dpt%d:id:%d", deptID, id)
}

func kTechniqueAll(deptID int) []string {
	return []string{
		kTechniqueListAll(deptID),
		kTechniqueSearchAll(deptID),
	}
}

func kTechniqueListAll(deptID int) string {
	return fmt.Sprintf("technique:list:dpt%d:*", deptID)
}

func kTechniqueSearchAll(deptID int) string {
	return fmt.Sprintf("technique:search:dpt%d:*", deptID)
}

func kTechniqueList(deptID int, categoryID *int, q table.TableQuery) string {
	orderBy := ""
	if q.OrderBy != nil {
		orderBy = *q.OrderBy
	}
	cid := 0
	if categoryID != nil {
		cid = *categoryID
	}
	return fmt.Sprintf("technique:list:dpt%d:c%d:l%d:p%d:o%s:d%s", deptID, cid, q.Limit, q.Page, orderBy, q.Direction)
}

func kTechniqueSearch(deptID int, categoryID *int, q dbutils.SearchQuery) string {
	orderBy := ""
	if q.OrderBy != nil {
		orderBy = *q.OrderBy
	}
	cid := 0
	if categoryID != nil {
		cid = *categoryID
	}
	return fmt.Sprintf("technique:search:dpt%d:c%d:k%s:l%d:p%d:o%s:d%s", deptID, cid, q.Keyword, q.Limit, q.Page, orderBy, q.Direction)
}

func (s *techniqueService) Create(ctx context.Context, deptID int, input model.TechniqueDTO) (*model.TechniqueDTO, error) {
	dto, err := s.repo.Create(ctx, deptID, input)
	if err != nil {
		return nil, err
	}

	if dto != nil && dto.ID > 0 {
		cache.InvalidateKeys(kTechniqueByID(deptID, dto.ID))
	}
	cache.InvalidateKeys(kTechniqueAll(deptID)...)

	s.upsertSearch(ctx, deptID, dto)

	return dto, nil
}

func (s *techniqueService) Update(ctx context.Context, deptID int, input model.TechniqueDTO) (*model.TechniqueDTO, error) {
	dto, err := s.repo.Update(ctx, deptID, input)
	if err != nil {
		return nil, err
	}

	if dto != nil {
		cache.InvalidateKeys(kTechniqueByID(deptID, dto.ID))
	}
	cache.InvalidateKeys(kTechniqueAll(deptID)...)

	s.upsertSearch(ctx, deptID, dto)

	return dto, nil
}

func (s *techniqueService) upsertSearch(ctx context.Context, deptID int, dto *model.TechniqueDTO) {
	publishTechniqueSearch(ctx, deptID, dto)
}

func (s *techniqueService) unlinkSearch(ctx context.Context, id int) {
	publishTechniqueUnlink(ctx, id)
}

func (s *techniqueService) GetByID(ctx context.Context, deptID int, id int) (*model.TechniqueDTO, error) {
	return cache.Get(kTechniqueByID(deptID, id), cache.TTLMedium, func() (*model.TechniqueDTO, error) {
		return s.repo.GetByID(ctx, deptID, id)
	})
}

func (s *techniqueService) List(ctx context.Context, deptID int, categoryID *int, q table.TableQuery) (table.TableListResult[model.TechniqueDTO], error) {
	type boxed = table.TableListResult[model.TechniqueDTO]
	key := kTechniqueList(deptID, categoryID, q)

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

func (s *techniqueService) Delete(ctx context.Context, deptID int, id int) error {
	if err := s.repo.Delete(ctx, deptID, id); err != nil {
		return err
	}
	cache.InvalidateKeys(kTechniqueAll(deptID)...)
	cache.InvalidateKeys(kTechniqueByID(deptID, id))

	s.unlinkSearch(ctx, id)
	return nil
}

func (s *techniqueService) Search(ctx context.Context, deptID int, categoryID *int, q dbutils.SearchQuery) (dbutils.SearchResult[model.TechniqueDTO], error) {
	type boxed = dbutils.SearchResult[model.TechniqueDTO]
	key := kTechniqueSearch(deptID, categoryID, q)

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
