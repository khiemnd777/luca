package service

import (
	"context"
	"errors"
	"testing"

	"entgo.io/ent/dialect/sql/schema"
	_ "github.com/mattn/go-sqlite3"

	"github.com/khiemnd777/noah_api/modules/photo/repository"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/enttest"
)

func newTestService(t *testing.T) (*PhotoService, *generated.Client) {
	t.Helper()

	db := enttest.Open(t, "sqlite3", "file:photo_service_test?mode=memory&cache=shared&_fk=1",
		enttest.WithMigrateOptions(schema.WithGlobalUniqueID(false)))
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Fatalf("close ent client: %v", err)
		}
	})

	repo := repository.NewPhotoRepository(db, nil)
	return NewPhotoService(repo, nil), db
}

func createServiceTestUser(t *testing.T, ctx context.Context, db *generated.Client, email string) *generated.User {
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

func createServiceTestFolder(t *testing.T, ctx context.Context, db *generated.Client, userID int, name string) *generated.Folder {
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

func createServiceTestPhoto(t *testing.T, ctx context.Context, db *generated.Client, userID int, folderID *int, name string) *generated.Photo {
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

func requireServicePhotoState(t *testing.T, ctx context.Context, db *generated.Client, photoID int, deleted bool, folderID *int) {
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

func TestDeleteManyRejectsMixedOwnershipWithoutMutation(t *testing.T) {
	ctx := context.Background()
	svc, db := newTestService(t)
	userA := createServiceTestUser(t, ctx, db, "a@example.com")
	userB := createServiceTestUser(t, ctx, db, "b@example.com")
	own := createServiceTestPhoto(t, ctx, db, userA.ID, nil, "own")
	other := createServiceTestPhoto(t, ctx, db, userB.ID, nil, "other")

	err := svc.DeleteMany(ctx, []int{own.ID, other.ID}, userA.ID, nil)
	if !errors.Is(err, repository.ErrPhotoNotFound) {
		t.Fatalf("delete many mixed ownership: expected ErrPhotoNotFound, got %v", err)
	}

	requireServicePhotoState(t, ctx, db, own.ID, false, nil)
	requireServicePhotoState(t, ctx, db, other.ID, false, nil)
}

func TestUpdateFolderPassesOwnerAndOldFolderConstraint(t *testing.T) {
	ctx := context.Background()
	svc, db := newTestService(t)
	userA := createServiceTestUser(t, ctx, db, "a@example.com")
	target := createServiceTestFolder(t, ctx, db, userA.ID, "target")
	own := createServiceTestPhoto(t, ctx, db, userA.ID, nil, "own")
	oldFolderID := -1

	if err := svc.UpdateFolder(ctx, userA.ID, []int{own.ID}, &target.ID, &oldFolderID); err != nil {
		t.Fatalf("move from null folder: %v", err)
	}

	requireServicePhotoState(t, ctx, db, own.ID, false, &target.ID)
}
