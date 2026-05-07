package service

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"entgo.io/ent/dialect/sql/schema"
	_ "github.com/mattn/go-sqlite3"
	"golang.org/x/crypto/bcrypt"

	"github.com/khiemnd777/noah_api/modules/auth/repository"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/enttest"
	"github.com/khiemnd777/noah_api/shared/utils"
)

func TestLoginWithMultipleDepartmentsReturnsSelectionResponse(t *testing.T) {
	ctx := context.Background()
	secret := "test-secret"
	db := newAuthServiceTestDB(t)
	password := "valid-password"
	userEnt := createAuthServiceTestUser(t, db, "multi-login", password)
	dept1 := createAuthServiceTestDepartment(t, db, "Dept 1")
	dept2 := createAuthServiceTestDepartment(t, db, "Dept 2")
	addAuthServiceTestMembership(t, db, userEnt.ID, dept1.ID)
	addAuthServiceTestMembership(t, db, userEnt.ID, dept2.ID)

	svc := NewAuthService(repository.NewAuthRepository(db), secret)
	resp, err := svc.Login(ctx, userEnt.Email, password)
	if err != nil {
		t.Fatalf("Login() error = %v", err)
	}

	if !resp.RequiresDepartmentSelection {
		t.Fatal("RequiresDepartmentSelection should be true")
	}
	if resp.AccessToken != "" || resp.RefreshToken != "" {
		t.Fatal("selection response should not include app tokens")
	}
	if resp.SelectionToken == "" {
		t.Fatal("selection response should include selection token")
	}
	if len(resp.Departments) != 2 {
		t.Fatalf("department count = %d, want 2", len(resp.Departments))
	}

	claims, ok, err := utils.GetJWTClaimsFromToken(secret, resp.SelectionToken)
	if !ok || err != nil {
		t.Fatalf("GetJWTClaimsFromToken() ok=%v err=%v", ok, err)
	}
	if purpose, _ := claims["purpose"].(string); purpose != departmentSelectionPurpose {
		t.Fatalf("selection token purpose = %q, want %q", purpose, departmentSelectionPurpose)
	}
}

func TestSelectDepartmentRejectsWrongPurposeSelectionToken(t *testing.T) {
	secret := "test-secret"
	token, err := utils.GenerateJWTToken(secret, utils.JWTTokenPayload{
		UserID:  1,
		Purpose: "not_department_selection",
		Exp:     time.Now().Add(time.Minute),
	})
	if err != nil {
		t.Fatalf("GenerateJWTToken() error = %v", err)
	}

	svc := NewAuthService(nil, secret)
	_, err = svc.SelectDepartment(context.Background(), token, 1)
	if !errors.Is(err, ErrInvalidSelectionToken) {
		t.Fatalf("expected ErrInvalidSelectionToken, got %v", err)
	}
}

func newAuthServiceTestDB(t *testing.T) *generated.Client {
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

func createAuthServiceTestUser(t *testing.T, db *generated.Client, name string, password string) *generated.User {
	t.Helper()
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	userEnt, err := db.User.Create().
		SetName(name).
		SetEmail(fmt.Sprintf("%s@example.test", name)).
		SetPassword(string(hashedPassword)).
		Save(context.Background())
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	return userEnt
}

func createAuthServiceTestDepartment(t *testing.T, db *generated.Client, name string) *generated.Department {
	t.Helper()
	dept, err := db.Department.Create().
		SetName(name).
		Save(context.Background())
	if err != nil {
		t.Fatalf("create department: %v", err)
	}
	return dept
}

func addAuthServiceTestMembership(t *testing.T, db *generated.Client, userID, departmentID int) {
	t.Helper()
	if err := db.DepartmentMember.Create().
		SetUserID(userID).
		SetDepartmentID(departmentID).
		Exec(context.Background()); err != nil {
		t.Fatalf("create department membership: %v", err)
	}
}
