// scripts/create_module/templates/repository_repo.go.tmpl
package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/photo"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/predicate"
	"github.com/khiemnd777/noah_api/shared/logger"

	"github.com/khiemnd777/noah_api/modules/photo/config"
	"github.com/khiemnd777/noah_api/shared/module"
)

var ErrPhotoNotFound = errors.New("photo not found")

type PhotoRepository struct {
	db   *generated.Client
	deps *module.ModuleDeps[config.ModuleConfig]
}

func NewPhotoRepository(db *generated.Client, deps *module.ModuleDeps[config.ModuleConfig]) *PhotoRepository {
	return &PhotoRepository{
		db:   db,
		deps: deps,
	}
}

func (r *PhotoRepository) Create(ctx context.Context, input *generated.Photo) (*generated.Photo, error) {
	created, err := r.db.Photo.Create().
		SetUserID(input.UserID).
		SetNillableFolderID(input.FolderID).
		SetURL(input.URL).
		SetProvider(input.Provider).
		SetName(input.Name).
		SetMetaDevice(input.MetaDevice).
		SetMetaOs(input.MetaOs).
		SetMetaLat(input.MetaLat).
		SetMetaLng(input.MetaLng).
		SetMetaWidth(input.MetaWidth).
		SetMetaHeight(input.MetaHeight).
		SetNillableMetaCapturedAt(input.MetaCapturedAt).
		Save(ctx)
	if err != nil {
		logger.Error(fmt.Sprintf("Failed to create photo: %v", err))
		return nil, err
	}
	return created, nil
}

func applyFolderPredicate(query *generated.PhotoQuery, folderID *int) *generated.PhotoQuery {
	if folderID == nil {
		return query
	}
	if *folderID == -1 {
		return query.Where(photo.FolderIDIsNil())
	}
	return query.Where(photo.FolderID(*folderID))
}

func folderPredicates(folderID *int) []predicate.Photo {
	if folderID == nil {
		return nil
	}
	if *folderID == -1 {
		return []predicate.Photo{photo.FolderIDIsNil()}
	}
	return []predicate.Photo{photo.FolderID(*folderID)}
}

func uniqueInts(ids []int) []int {
	if len(ids) == 0 {
		return nil
	}
	seen := make(map[int]struct{}, len(ids))
	unique := make([]int, 0, len(ids))
	for _, id := range ids {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		unique = append(unique, id)
	}
	return unique
}

func (r *PhotoRepository) countOwnedActive(ctx context.Context, ids []int, userID int, folderID *int) (int, error) {
	query := r.db.Photo.Query().
		Where(photo.IDIn(ids...), photo.UserID(userID), photo.Deleted(false))
	query = applyFolderPredicate(query, folderID)
	return query.Count(ctx)
}

func (r *PhotoRepository) UpdateFolder(ctx context.Context, userID int, photoIDs []int, folderID *int, oldFolderID *int) error {
	photoIDs = uniqueInts(photoIDs)
	if len(photoIDs) == 0 {
		return nil
	}

	count, err := r.countOwnedActive(ctx, photoIDs, userID, oldFolderID)
	if err != nil {
		logger.Error("Failed to count owned active photos for folder update: ", err)
		return err
	}
	if count != len(photoIDs) {
		return ErrPhotoNotFound
	}

	update := r.db.Photo.
		Update().
		Where(append([]predicate.Photo{
			photo.IDIn(photoIDs...),
			photo.UserID(userID),
			photo.Deleted(false),
		}, folderPredicates(oldFolderID)...)...)
	if folderID == nil {
		update = update.ClearFolderID()
	} else {
		update = update.SetFolderID(*folderID)
	}

	affected, err := update.Save(ctx)
	if err != nil {
		logger.Error("Failed to update photo folder: ", err)
		return err
	}
	if affected != len(photoIDs) {
		return ErrPhotoNotFound
	}
	return nil
}

func (r *PhotoRepository) GetByID(ctx context.Context, id int, folderID *int) (*generated.Photo, error) {
	query := r.db.Photo.Query().
		Where(photo.ID(id), photo.Deleted(false))

	query = applyFolderPredicate(query, folderID)

	return query.Only(ctx)
}

func (r *PhotoRepository) GetByFileName(ctx context.Context, filename string, folderID *int) (*generated.Photo, error) {
	query := r.db.Photo.Query().
		Where(photo.URL(filename), photo.Deleted(false))

	query = applyFolderPredicate(query, folderID)

	return query.Only(ctx)
}

func (r *PhotoRepository) GetAll(ctx context.Context, userID int, folderID *int) ([]*generated.Photo, error) {
	query := r.db.Photo.Query().
		Where(photo.UserID(userID), photo.Deleted(false)).
		Order(generated.Desc(photo.FieldUpdatedAt))

	query = applyFolderPredicate(query, folderID)

	return query.All(ctx)
}

func (r *PhotoRepository) GetPaginated(ctx context.Context, userID int, folderID *int, limit, offset int) ([]*generated.Photo, bool, error) {
	query := r.db.Photo.
		Query().
		Where(photo.UserID(userID), photo.Deleted(false))

	query = applyFolderPredicate(query, folderID)

	var results []struct {
		ID             int        `json:"id"`
		Name           string     `json:"name"`
		Url            string     `json:"url"`
		MetaCapturedAt *time.Time `json:"meta_captured_at,omitempty"`
		CreatedAt      time.Time  `json:"created_at"`
	}

	err := query.
		Order(generated.Desc(photo.FieldUpdatedAt)).
		Limit(limit+1).
		Offset(offset).
		Select(photo.FieldID, photo.FieldName, photo.FieldURL, photo.FieldMetaCapturedAt, photo.FieldCreatedAt).
		Scan(ctx, &results)

	if err != nil {
		return nil, false, err
	}

	hasMore := len(results) > limit
	if hasMore {
		results = results[:limit]
	}

	photos := make([]*generated.Photo, len(results))
	for i, p := range results {
		photos[i] = &generated.Photo{
			ID:             p.ID,
			Name:           p.Name,
			URL:            p.Url,
			MetaCapturedAt: p.MetaCapturedAt,
			CreatedAt:      p.CreatedAt,
		}
	}

	return photos, hasMore, nil
}

func (r *PhotoRepository) SoftDelete(ctx context.Context, id int, userID int, folderID *int) error {
	affected, err := r.db.Photo.Update().
		Where(append([]predicate.Photo{
			photo.ID(id),
			photo.UserID(userID),
			photo.Deleted(false),
		}, folderPredicates(folderID)...)...).
		SetDeleted(true).
		Save(ctx)
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrPhotoNotFound
	}
	return nil
}

func (r *PhotoRepository) SoftDeleteMany(ctx context.Context, ids []int, userID int, folderID *int) error {
	ids = uniqueInts(ids)
	if len(ids) == 0 {
		return nil
	}

	count, err := r.countOwnedActive(ctx, ids, userID, folderID)
	if err != nil {
		logger.Error("Failed to count owned active photos for batch delete: ", err)
		return err
	}
	if count != len(ids) {
		return ErrPhotoNotFound
	}

	affected, err := r.db.Photo.
		Update().
		Where(append([]predicate.Photo{
			photo.IDIn(ids...),
			photo.UserID(userID),
			photo.Deleted(false),
		}, folderPredicates(folderID)...)...).
		SetDeleted(true).
		Save(ctx)
	if err != nil {
		return err
	}
	if affected != len(ids) {
		return ErrPhotoNotFound
	}
	return nil
}

func (r *PhotoRepository) DeletePermanently(ctx context.Context, id int) error {
	return r.db.Photo.DeleteOneID(id).Exec(ctx)
}

func (r *PhotoRepository) DeleteManyPermanently(ctx context.Context, ids []int) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := r.db.Photo.
		Delete().
		Where(photo.IDIn(ids...)).
		Exec(ctx)
	return err
}

func (r *PhotoRepository) ListDeleted(ctx context.Context) ([]*generated.Photo, error) {
	return r.db.Photo.
		Query().
		Where(photo.Deleted(true)).
		All(ctx)
}
