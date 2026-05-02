package bootstrap

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/khiemnd777/noah_api/shared/config"
	_ "github.com/lib/pq"
)

const (
	observabilityPermissionName  = "System Log Reader"
	observabilityPermissionValue = "system_log.read"
)

type roleSeed struct {
	RoleName    string
	DisplayName string
	Brief       string
}

func EnsureBaseRolesAndPermissions(dbCfg config.DatabaseConfig) error {
	if dbCfg.Provider != "postgres" {
		return nil
	}

	connStr := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		dbCfg.Postgres.Host, dbCfg.Postgres.Port, dbCfg.Postgres.User, dbCfg.Postgres.Password, dbCfg.Postgres.Name, dbCfg.Postgres.SSLMode,
	)
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return fmt.Errorf("cannot connect DB: %w", err)
	}
	defer db.Close()

	ctx := context.Background()
	roles := []roleSeed{
		{RoleName: "user", DisplayName: "User", Brief: "A normal user"},
		{RoleName: "admin", DisplayName: "Administrator", Brief: "Administrator"},
		{RoleName: "corporate_admin", DisplayName: "Quản trị chi nhánh", Brief: "Corporate department administrator"},
		{RoleName: "guest", DisplayName: "Guest", Brief: "Guest user with limited access"},
	}

	for _, role := range roles {
		if _, err := ensureRole(ctx, db, role); err != nil {
			return fmt.Errorf("ensure role %q failed: %w", role.RoleName, err)
		}
	}

	permID, err := ensurePermission(ctx, db, observabilityPermissionName, observabilityPermissionValue)
	if err != nil {
		return fmt.Errorf("ensure permission %q failed: %w", observabilityPermissionValue, err)
	}

	adminRoleID, err := getRoleIDByName(ctx, db, "admin")
	if err != nil {
		return fmt.Errorf("resolve admin role failed: %w", err)
	}

	if err := attachPermission(ctx, db, adminRoleID, permID); err != nil {
		return fmt.Errorf("attach permission %q failed: %w", observabilityPermissionValue, err)
	}

	return nil
}

func ensureRole(ctx context.Context, db *sql.DB, role roleSeed) (int, error) {
	var id int
	err := db.QueryRowContext(ctx, `
		INSERT INTO roles (role_name, display_name, brief)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''))
		ON CONFLICT (role_name) DO UPDATE
		SET display_name = EXCLUDED.display_name,
		    brief = EXCLUDED.brief
		RETURNING id
	`, role.RoleName, role.DisplayName, role.Brief).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func ensurePermission(ctx context.Context, db *sql.DB, name, value string) (int, error) {
	var id int
	err := db.QueryRowContext(ctx, `
		INSERT INTO permissions (permission_name, permission_value)
		VALUES ($1, $2)
		ON CONFLICT (permission_value) DO UPDATE
		SET permission_name = EXCLUDED.permission_name
		RETURNING id
	`, name, value).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func getRoleIDByName(ctx context.Context, db *sql.DB, roleName string) (int, error) {
	var id int
	err := db.QueryRowContext(ctx, `
		SELECT id
		FROM roles
		WHERE role_name = $1
	`, roleName).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func attachPermission(ctx context.Context, db *sql.DB, roleID, permID int) error {
	_, err := db.ExecContext(ctx, `
		INSERT INTO role_permissions (role_id, permission_id)
		VALUES ($1, $2)
		ON CONFLICT (role_id, permission_id) DO NOTHING
	`, roleID, permID)
	return err
}
