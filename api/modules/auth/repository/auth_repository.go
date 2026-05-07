package repository

import (
	"context"
	"database/sql"
	"errors"
	"sync"
	"time"

	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/department"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/departmentmember"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/refreshtoken"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/user"
)

type AuthRepository struct {
	db    *generated.Client
	sqlDB *sql.DB
}

type memorySelectionToken struct {
	UserID    int
	ExpiresAt time.Time
	Consumed  bool
}

var memorySelectionTokens sync.Map

func NewAuthRepository(db *generated.Client, sqlDB ...*sql.DB) *AuthRepository {
	var raw *sql.DB
	if len(sqlDB) > 0 {
		raw = sqlDB[0]
	}
	return &AuthRepository{db: db, sqlDB: raw}
}

func (r *AuthRepository) GetUserByEmail(ctx context.Context, email string) (*generated.User, error) {
	return r.db.User.Query().Where(user.Email(email)).Only(ctx)
}

func (r *AuthRepository) GetUserByPhone(ctx context.Context, phone string) (*generated.User, error) {
	return r.db.User.Query().Where(user.Phone(phone)).Only(ctx)
}

func (r *AuthRepository) CreateNewUser(ctx context.Context, phone, email *string, password, name string, avatar *string, refCode *string, qrCode *string) (*generated.User, error) {
	return r.db.User.Create().
		SetNillablePhone(phone).
		SetNillableEmail(email).
		SetName(name).
		SetPassword(password).
		SetNillableAvatar(avatar).
		SetNillableQrCode(qrCode).
		SetNillableRefCode(refCode).
		SetProvider("system").
		Save(ctx)
}

func (r *AuthRepository) CheckPhoneExists(ctx context.Context, phone string) (bool, error) {
	return r.db.User.Query().
		Where(user.PhoneEQ(phone)).
		Exist(ctx)
}

func (r *AuthRepository) CheckEmailExists(ctx context.Context, email string) (bool, error) {
	return r.db.User.Query().
		Where(user.EmailEQ(email)).
		Exist(ctx)
}

func (r *AuthRepository) ListActiveDepartmentMemberships(ctx context.Context, userID int) ([]*generated.Department, error) {
	memberships, err := r.db.DepartmentMember.
		Query().
		Where(
			departmentmember.UserIDEQ(userID),
			departmentmember.HasDepartmentWith(
				department.ActiveEQ(true),
				department.DeletedEQ(false),
			),
		).
		Order(departmentmember.ByCreatedAt()).
		WithDepartment().
		All(ctx)
	if err != nil {
		return nil, err
	}

	departments := make([]*generated.Department, 0, len(memberships))
	for _, membership := range memberships {
		if membership == nil || membership.Edges.Department == nil {
			continue
		}
		departments = append(departments, membership.Edges.Department)
	}
	return departments, nil
}

func (r *AuthRepository) IsActiveDepartmentMember(ctx context.Context, userID, departmentID int) (bool, error) {
	return r.db.DepartmentMember.
		Query().
		Where(
			departmentmember.UserIDEQ(userID),
			departmentmember.DepartmentIDEQ(departmentID),
			departmentmember.HasDepartmentWith(
				department.ActiveEQ(true),
				department.DeletedEQ(false),
			),
		).
		Exist(ctx)
}

func (r *AuthRepository) StoreDepartmentSelectionToken(ctx context.Context, jti string, userID int, expiresAt time.Time) error {
	if jti == "" || userID <= 0 || expiresAt.IsZero() {
		return errors.New("invalid department selection token")
	}

	if r.sqlDB == nil {
		memorySelectionTokens.Store(jti, memorySelectionToken{UserID: userID, ExpiresAt: expiresAt})
		return nil
	}

	_, err := r.sqlDB.ExecContext(ctx, `
		INSERT INTO auth_department_selection_tokens (jti, user_id, expires_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (jti) DO NOTHING
	`, jti, userID, expiresAt)
	return err
}

func (r *AuthRepository) ConsumeDepartmentSelectionToken(ctx context.Context, jti string, userID int) (bool, error) {
	if jti == "" || userID <= 0 {
		return false, nil
	}

	if r.sqlDB == nil {
		raw, ok := memorySelectionTokens.Load(jti)
		if !ok {
			return false, nil
		}
		token, ok := raw.(memorySelectionToken)
		if !ok || token.UserID != userID || token.Consumed || time.Now().After(token.ExpiresAt) {
			return false, nil
		}
		token.Consumed = true
		memorySelectionTokens.Store(jti, token)
		return true, nil
	}

	result, err := r.sqlDB.ExecContext(ctx, `
		UPDATE auth_department_selection_tokens
		SET consumed_at = NOW()
		WHERE jti = $1
		  AND user_id = $2
		  AND consumed_at IS NULL
		  AND expires_at > NOW()
	`, jti, userID)
	if err != nil {
		return false, err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	return affected == 1, nil
}

func (r *AuthRepository) CreateRefreshToken(ctx context.Context, userID int, token string, expiresAt time.Time) error {
	_, err := r.db.RefreshToken.Create().
		SetUserID(userID).
		SetToken(token).
		SetExpiresAt(expiresAt).
		Save(ctx)
	return err
}

func (r *AuthRepository) DeleteRefreshToken(ctx context.Context, token string) error {
	_, err := r.db.RefreshToken.Delete().
		Where(refreshtoken.Token(token)).
		Exec(ctx)
	return err
}

func (r *AuthRepository) IsRefreshTokenValid(ctx context.Context, token string) (bool, int, string, error) {
	t, err := r.db.RefreshToken.Query().
		Where(refreshtoken.TokenEQ(token)).
		WithUser().
		Only(ctx)
	if err != nil {
		return false, 0, "", err
	}
	if time.Now().After(t.ExpiresAt) {
		return false, 0, "", nil
	}
	return true, t.Edges.User.ID, t.Edges.User.Email, nil
}
