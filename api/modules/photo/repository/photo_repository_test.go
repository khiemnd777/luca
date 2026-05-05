package repository

import (
	"context"
	"errors"
	"testing"

	"entgo.io/ent/dialect/sql/schema"
	_ "github.com/mattn/go-sqlite3"

	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/enttest"
)

func newTestRepo(t *testing.T) (*PhotoRepository, *generated.Client) {
	t.Helper()

	db := enttest.Open(t, "sqlite3", "file:photo_repo_test?mode=memory&cache=shared&_fk=1",
		enttest.WithMigrateOptions(schema.WithGlobalUniqueID(false)))
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Fatalf("close ent client: %v", err)
		}
	})

	return NewPhotoRepository(db, nil), db
}

func createTestUser(t *testing.T, ctx context.Context, db *generated.Client, email string) *generated.User {
	t.Helper()

	user, err := db.User.Create().
		SetEmail(email).
		SetPassword("password").
		Save(ctx)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	return user
}

func createTestFolder(t *testing.T, ctx context.Context, db *generated.Client, userID int, name string) *generated.Folder {
	t.Helper()

	folder, err := db.Folder.Create().
		SetUserID(userID).
		SetFolderName(name).
		Save(ctx)
	if err != nil {
		t.Fatalf("create folder: %v", err)
	}
	return folder
}

func createTestPhoto(t *testing.T, ctx context.Context, db *generated.Client, userID int, folderID *int, name string) *generated.Photo {
	t.Helper()

	photo, err := db.Photo.Create().
		SetUserID(userID).
		SetNillableFolderID(folderID).
		SetURL(name + ".jpg").
		SetProvider("test").
		SetName(name).
		Save(ctx)
	if err != nil {
		t.Fatalf("create photo: %v", err)
	}
	return photo
}

func requirePhotoState(t *testing.T, ctx context.Context, db *generated.Client, photoID int, deleted bool, folderID *int) {
	t.Helper()

	item, err := db.Photo.Get(ctx, photoID)
	if err != nil {
		t.Fatalf("get photo %d: %v", photoID, err)
	}
	if item.Deleted != deleted {
		t.Fatalf("photo %d deleted: expected %v, got %v", photoID, deleted, item.Deleted)
	}
	if folderID == nil {
		if item.FolderID != nil {
			t.Fatalf("photo %d folder: expected nil, got %d", photoID, *item.FolderID)
		}
		return
	}
	if item.FolderID == nil || *item.FolderID != *folderID {
		t.Fatalf("photo %d folder: expected %d, got %v", photoID, *folderID, item.FolderID)
	}
}

func TestSoftDeleteOwnerBound(t *testing.T) {
	ctx := context.Background()
	repo, db := newTestRepo(t)
	userA := createTestUser(t, ctx, db, "a@example.com")
	userB := createTestUser(t, ctx, db, "b@example.com")
	own := createTestPhoto(t, ctx, db, userA.ID, nil, "own")
	other := createTestPhoto(t, ctx, db, userB.ID, nil, "other")

	if err := repo.SoftDelete(ctx, own.ID, userA.ID, nil); err != nil {
		t.Fatalf("delete own photo: %v", err)
	}
	requirePhotoState(t, ctx, db, own.ID, true, nil)

	err := repo.SoftDelete(ctx, other.ID, userA.ID, nil)
	if !errors.Is(err, ErrPhotoNotFound) {
		t.Fatalf("delete other user photo: expected ErrPhotoNotFound, got %v", err)
	}
	requirePhotoState(t, ctx, db, other.ID, false, nil)
}

func TestSoftDeleteManyMixedIDsMutatesNothing(t *testing.T) {
	ctx := context.Background()
	repo, db := newTestRepo(t)
	userA := createTestUser(t, ctx, db, "a@example.com")
	userB := createTestUser(t, ctx, db, "b@example.com")
	own := createTestPhoto(t, ctx, db, userA.ID, nil, "own")
	other := createTestPhoto(t, ctx, db, userB.ID, nil, "other")

	err := repo.SoftDeleteMany(ctx, []int{own.ID, other.ID, own.ID}, userA.ID, nil)
	if !errors.Is(err, ErrPhotoNotFound) {
		t.Fatalf("batch delete mixed ids: expected ErrPhotoNotFound, got %v", err)
	}

	requirePhotoState(t, ctx, db, own.ID, false, nil)
	requirePhotoState(t, ctx, db, other.ID, false, nil)
}

func TestUpdateFolderOwnerBound(t *testing.T) {
	ctx := context.Background()
	repo, db := newTestRepo(t)
	userA := createTestUser(t, ctx, db, "a@example.com")
	userB := createTestUser(t, ctx, db, "b@example.com")
	target := createTestFolder(t, ctx, db, userA.ID, "target")
	own := createTestPhoto(t, ctx, db, userA.ID, nil, "own")
	other := createTestPhoto(t, ctx, db, userB.ID, nil, "other")

	if err := repo.UpdateFolder(ctx, userA.ID, []int{own.ID}, &target.ID, nil); err != nil {
		t.Fatalf("move own photo: %v", err)
	}
	requirePhotoState(t, ctx, db, own.ID, false, &target.ID)

	err := repo.UpdateFolder(ctx, userA.ID, []int{other.ID}, &target.ID, nil)
	if !errors.Is(err, ErrPhotoNotFound) {
		t.Fatalf("move other user photo: expected ErrPhotoNotFound, got %v", err)
	}
	requirePhotoState(t, ctx, db, other.ID, false, nil)
}

func TestUpdateFolderMixedIDsMutatesNothing(t *testing.T) {
	ctx := context.Background()
	repo, db := newTestRepo(t)
	userA := createTestUser(t, ctx, db, "a@example.com")
	userB := createTestUser(t, ctx, db, "b@example.com")
	target := createTestFolder(t, ctx, db, userA.ID, "target")
	own := createTestPhoto(t, ctx, db, userA.ID, nil, "own")
	other := createTestPhoto(t, ctx, db, userB.ID, nil, "other")

	err := repo.UpdateFolder(ctx, userA.ID, []int{own.ID, other.ID}, &target.ID, nil)
	if !errors.Is(err, ErrPhotoNotFound) {
		t.Fatalf("move mixed ids: expected ErrPhotoNotFound, got %v", err)
	}

	requirePhotoState(t, ctx, db, own.ID, false, nil)
	requirePhotoState(t, ctx, db, other.ID, false, nil)
}

func TestUpdateFolderOldFolderMinusOneMatchesNullFolder(t *testing.T) {
	ctx := context.Background()
	repo, db := newTestRepo(t)
	userA := createTestUser(t, ctx, db, "a@example.com")
	target := createTestFolder(t, ctx, db, userA.ID, "target")
	own := createTestPhoto(t, ctx, db, userA.ID, nil, "own")
	oldFolderID := -1

	if err := repo.UpdateFolder(ctx, userA.ID, []int{own.ID}, &target.ID, &oldFolderID); err != nil {
		t.Fatalf("move from null folder: %v", err)
	}

	requirePhotoState(t, ctx, db, own.ID, false, &target.ID)
}
