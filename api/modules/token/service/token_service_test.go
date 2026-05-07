package service

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"entgo.io/ent/dialect/sql/schema"
	_ "github.com/mattn/go-sqlite3"

	"github.com/khiemnd777/noah_api/modules/token/repository"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/enttest"
	"github.com/khiemnd777/noah_api/shared/utils"
)

func TestUserPermissionCacheKeyIncludesUserID(t *testing.T) {
	if got := userPermissionCacheKey(1); got != "user:1:perms" {
		t.Fatalf("unexpected permission cache key: %s", got)
	}
	if userPermissionCacheKey(1) == userPermissionCacheKey(2) {
		t.Fatal("permission cache keys should differ per user")
	}
}

func TestGenerateTokensRequiresActiveDepartmentMembership(t *testing.T) {
	ctx := context.Background()
	db := newTokenServiceTestDB(t)
	userEnt := createTokenTestUser(t, db, "missing-member")
	dept := createTokenTestDepartment(t, db, "Dept")

	svc := NewTokenService(repository.NewTokenRepository(db), "test-secret")

	_, err := svc.GenerateTokens(ctx, userEnt.ID, dept.ID)
	if !errors.Is(err, ErrInvalidDepartmentMembership) {
		t.Fatalf("expected ErrInvalidDepartmentMembership, got %v", err)
	}
}

func TestRefreshTokenPreservesRefreshTokenDepartmentID(t *testing.T) {
	ctx := context.Background()
	secret := "test-secret"
	db := newTokenServiceTestDB(t)
	userEnt := createTokenTestUser(t, db, "multi-member")
	dept1 := createTokenTestDepartment(t, db, "Dept 1")
	dept2 := createTokenTestDepartment(t, db, "Dept 2")
	addTokenTestMembership(t, db, userEnt.ID, dept1.ID)
	addTokenTestMembership(t, db, userEnt.ID, dept2.ID)

	svc := NewTokenService(repository.NewTokenRepository(db), secret)
	initialTokens, err := svc.GenerateTokens(ctx, userEnt.ID, dept2.ID)
	if err != nil {
		t.Fatalf("GenerateTokens() error = %v", err)
	}

	refreshedTokens, err := svc.RefreshToken(ctx, initialTokens.RefreshToken)
	if err != nil {
		t.Fatalf("RefreshToken() error = %v", err)
	}

	claims, ok, err := utils.GetJWTClaimsFromToken(secret, refreshedTokens.AccessToken)
	if !ok || err != nil {
		t.Fatalf("GetJWTClaimsFromToken() ok=%v err=%v", ok, err)
	}
	if got := int(claims["dept_id"].(float64)); got != dept2.ID {
		t.Fatalf("refreshed access token dept_id = %d, want %d", got, dept2.ID)
	}
}

func TestRefreshTokenRejectsInactiveDepartmentMembership(t *testing.T) {
	ctx := context.Background()
	secret := "test-secret"
	db := newTokenServiceTestDB(t)
	userEnt := createTokenTestUser(t, db, "inactive-member")
	dept := createTokenTestDepartment(t, db, "Inactive Dept")
	addTokenTestMembership(t, db, userEnt.ID, dept.ID)

	refreshToken, err := utils.GenerateJWTToken(secret, utils.JWTTokenPayload{
		UserID:       userEnt.ID,
		Email:        userEnt.Email,
		DepartmentID: dept.ID,
		Exp:          time.Now().Add(24 * time.Hour),
	})
	if err != nil {
		t.Fatalf("GenerateJWTToken() error = %v", err)
	}
	if err := db.RefreshToken.Create().
		SetUserID(userEnt.ID).
		SetToken(refreshToken).
		SetExpiresAt(time.Now().Add(24 * time.Hour)).
		Exec(ctx); err != nil {
		t.Fatalf("create refresh token: %v", err)
	}
	if _, err := db.Department.UpdateOneID(dept.ID).SetActive(false).Save(ctx); err != nil {
		t.Fatalf("deactivate department: %v", err)
	}

	svc := NewTokenService(repository.NewTokenRepository(db), secret)
	_, err = svc.RefreshToken(ctx, refreshToken)
	if !errors.Is(err, ErrInvalidDepartmentMembership) {
		t.Fatalf("expected ErrInvalidDepartmentMembership, got %v", err)
	}
}

func newTokenServiceTestDB(t *testing.T) *generated.Client {
	t.Helper()
	db := enttest.Open(t, "sqlite3", fmt.Sprintf("file:%s?mode=memory&cache=shared&_fk=1", t.Name()),
		enttest.WithMigrateOptions(schema.WithGlobalUniqueID(false)))
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Fatalf("close db: %v", err)
		}
	})
	return db
}

func createTokenTestUser(t *testing.T, db *generated.Client, name string) *generated.User {
	t.Helper()
	userEnt, err := db.User.Create().
		SetName(name).
		SetEmail(fmt.Sprintf("%s@example.test", name)).
		SetPassword("hashed-password").
		Save(context.Background())
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	return userEnt
}

func createTokenTestDepartment(t *testing.T, db *generated.Client, name string) *generated.Department {
	t.Helper()
	dept, err := db.Department.Create().
		SetName(name).
		Save(context.Background())
	if err != nil {
		t.Fatalf("create department: %v", err)
	}
	return dept
}

func addTokenTestMembership(t *testing.T, db *generated.Client, userID, departmentID int) {
	t.Helper()
	if err := db.DepartmentMember.Create().
		SetUserID(userID).
		SetDepartmentID(departmentID).
		Exec(context.Background()); err != nil {
		t.Fatalf("create department membership: %v", err)
	}
}
