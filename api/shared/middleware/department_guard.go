package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/department"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/departmentmember"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/role"
	"github.com/khiemnd777/noah_api/shared/db/ent/generated/user"
	"github.com/khiemnd777/noah_api/shared/utils"
)

func RequireDepartmentMember(deptIDFromPathParam string, dbEnt ...*generated.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := utils.GetUserIDInt(c)
		if !ok || userID <= 0 {
			return fiber.NewError(fiber.StatusUnauthorized, "unauthorized")
		}

		deptID, ok := utils.GetDeptIDInt(c)
		if !ok || deptID <= 0 {
			return fiber.NewError(fiber.StatusUnauthorized, "unauthorized")
		}

		paramDeptID, err := utils.GetParamAsInt(c, deptIDFromPathParam)
		if err != nil || paramDeptID <= 0 {
			return fiber.NewError(fiber.StatusBadRequest, "invalid department id")
		}

		isAdmin, err := hasSystemAdminRole(c, userID, dbEnt...)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "failed to verify role scope")
		}
		if isAdmin {
			return c.Next()
		}

		ok = paramDeptID == deptID

		if !ok {
			return fiber.NewError(fiber.StatusForbidden, "forbidden: not a member of department")
		}
		if len(dbEnt) > 0 && dbEnt[0] != nil {
			member, err := hasActiveDepartmentMembership(c, dbEnt[0], userID, paramDeptID)
			if err != nil {
				return fiber.NewError(fiber.StatusInternalServerError, "failed to verify department membership")
			}
			if !member {
				return fiber.NewError(fiber.StatusForbidden, "forbidden: not a member of department")
			}
		}
		return c.Next()
	}
}

func hasActiveDepartmentMembership(c *fiber.Ctx, db *generated.Client, userID, departmentID int) (bool, error) {
	return db.DepartmentMember.Query().
		Where(
			departmentmember.UserIDEQ(userID),
			departmentmember.DepartmentIDEQ(departmentID),
			departmentmember.HasDepartmentWith(
				department.ActiveEQ(true),
				department.DeletedEQ(false),
			),
		).
		Exist(c.UserContext())
}

func hasSystemAdminRole(c *fiber.Ctx, userID int, dbEnt ...*generated.Client) (bool, error) {
	if roleSet, ok := getRoleSetFromContext(c); ok {
		_, isAdmin := roleSet["admin"]
		return isAdmin, nil
	}

	if len(dbEnt) == 0 || dbEnt[0] == nil {
		return false, nil
	}

	return dbEnt[0].User.Query().
		Where(
			user.IDEQ(userID),
			user.DeletedAtIsNil(),
			user.HasRolesWith(role.RoleNameEQ("admin")),
		).
		Exist(c.UserContext())
}

func getRoleSetFromContext(c *fiber.Ctx) (map[string]struct{}, bool) {
	if v := c.Locals("roleSet"); v != nil {
		switch vv := v.(type) {
		case map[string]struct{}:
			if len(vv) > 0 {
				return vv, true
			}
		case *map[string]struct{}:
			if vv != nil && len(*vv) > 0 {
				return *vv, true
			}
		}
	}

	if v := c.Locals("roles"); v != nil {
		set := make(map[string]struct{})
		switch vv := v.(type) {
		case []string:
			for _, roleName := range vv {
				if roleName = normalizeRoleName(roleName); roleName != "" {
					set[roleName] = struct{}{}
				}
			}
		case []any:
			for _, roleName := range vv {
				if s, ok := roleName.(string); ok {
					if s = normalizeRoleName(s); s != "" {
						set[s] = struct{}{}
					}
				}
			}
		case map[string]struct{}:
			for roleName := range vv {
				if roleName = normalizeRoleName(roleName); roleName != "" {
					set[roleName] = struct{}{}
				}
			}
		case map[string]any:
			for roleName := range vv {
				if roleName = normalizeRoleName(roleName); roleName != "" {
					set[roleName] = struct{}{}
				}
			}
		case map[string]bool:
			for roleName, enabled := range vv {
				if enabled {
					if roleName = normalizeRoleName(roleName); roleName != "" {
						set[roleName] = struct{}{}
					}
				}
			}
		case string:
			for _, roleName := range strings.FieldsFunc(vv, func(r rune) bool {
				return r == ',' || r == ' '
			}) {
				if roleName = normalizeRoleName(roleName); roleName != "" {
					set[roleName] = struct{}{}
				}
			}
		}
		if len(set) > 0 {
			c.Locals("roleSet", set)
			return set, true
		}
	}

	return nil, false
}

func normalizeRoleName(roleName string) string {
	return strings.ToLower(strings.TrimSpace(roleName))
}
