import * as React from "react";
import { Avatar, Box, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import type { MeModel, UserModel } from "@core/auth/auth.types";
import { useAuth } from "@core/auth/use-auth";
import { useDisplayUrl } from "@core/photo/use-display-url";

type AnyUser = UserModel | MeModel | null | undefined;

type ToProp = string | ((u: NonNullable<AnyUser>) => string);

function resolveTo(
  user: AnyUser,
  meId?: number,
  to?: ToProp
): string | undefined {
  if (!user) return undefined;
  if (typeof to === "string") return to;
  if (typeof to === "function") return to(user);

  // Mặc định: nếu là chính mình → /me, ngược lại → /users/:id
  if (meId && user.id === meId) return "/me";
  return `/users/${user.id}`;
}

export function AccountBadge({
  user,
  collapsed,
  avatarSize = 40,
  to,                 // <-- NEW: điều khiển đường dẫn
  onNavigate,         // <-- NEW: callback sau khi navigate (optional)
  tabIndex = 0,       // <-- a11y khi cần focus
}: {
  user: AnyUser;
  collapsed: boolean;
  avatarSize?: number;
  to?: ToProp;
  onNavigate?: (href: string, user: NonNullable<AnyUser>) => void;
  tabIndex?: number;
}) {
  const avatarUrl = useDisplayUrl(user?.avatar);
  const initialsSeed = user?.name || user?.email || "User";
  const fallbackUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(initialsSeed)}`;

  // href có thể undefined nếu chưa có user
  const href = React.useMemo(() => resolveTo(user, undefined, to), [user, to]);

  const clickableProps =
    user && href
      ? {
        component: RouterLink,
        to: href,
        onClick: () => {
          if (href && user && onNavigate) onNavigate(href, user);
        },
        role: "link" as const,
        tabIndex,
      }
      : {
        role: "button" as const,
        tabIndex,
      };

  return (
    <Stack
      direction={collapsed ? "column" : "row"}
      alignItems="center"
      justifyContent={collapsed ? "center" : "flex-start"}
      spacing={collapsed ? 0 : 1.5}
      px={collapsed ? 0 : 1.5}
      py={1}
      sx={{
        borderRadius: 1,
        mx: 1,
        transition: (t) =>
          t.transitions.create(["all"], {
            duration: t.transitions.duration.shortest,
          }),
        "&:hover": {
          bgcolor: "action.hover",
          cursor: user && href ? "pointer" : "default",
        },
        textDecoration: "none", // để RouterLink không có gạch chân
        color: "inherit",
      }}
      {...clickableProps}
    >
      <Avatar
        src={avatarUrl || fallbackUrl}
        alt={user?.name ?? "User"}
        sx={{
          width: avatarSize,
          height: avatarSize,
          flexShrink: 0,
          mx: collapsed ? "auto" : 0, // căn giữa khi collapse
          transition: (t) =>
            t.transitions.create(["margin"], {
              duration: t.transitions.duration.shortest,
            }),
        }}
      />

      {!collapsed && (
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            noWrap
            title={user?.name || user?.email || "User"}
          >
            {user?.name || "Unknown User"}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            title={user?.email || undefined}
          >
            {user?.email ?? "—"}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}

/** Container — tùy chọn dùng useAuth nếu không truyền user */
export default function MyAccountBadge({
  collapsed,
  user: overrideUser,
  avatarSize,
  to,
  onNavigate,
  tabIndex,
}: {
  collapsed: boolean;
  user?: MeModel | null;
  avatarSize?: number;
  to?: ToProp; // cho phép override đường dẫn
  onNavigate?: (href: string, user: NonNullable<AnyUser>) => void;
  tabIndex?: number;
}) {
  const { user: authUser } = useAuth();
  const finalUser = overrideUser ?? authUser;

  // Suy luận mặc định /me vs /users/:id nếu dev không truyền "to"
  const meId = authUser?.id;
  const finalTo: ToProp | undefined =
    to ??
    ((u) => {
      if (meId && u.id === meId) return "/me";
      return `/users/${u.id}`;
    });

  return (
    <AccountBadge
      user={finalUser}
      collapsed={collapsed}
      avatarSize={avatarSize}
      to={finalTo}
      onNavigate={onNavigate}
      tabIndex={tabIndex}
    />
  );
}

/* =========================
 * CÁCH DÙNG
 * =========================
 * 1) Dùng mặc định với useAuth, tự điều hướng:
 * <MyAccountBadge collapsed={collapsed} />
 *
 * 2) Ép đường dẫn tùy ý (string):
 * <MyAccountBadge collapsed={false} to="/profile" />
 *
 * 3) Ép đường dẫn theo user (function):
 * <MyAccountBadge
 *   collapsed={false}
 *   to={(u) => `/staff/${u.id}`}
 * />
 *
 * 4) Presentational-only (không useAuth):
 * <AccountBadge collapsed user={someUser} to={(u) => `/users/${u.id}`} />
 *
 * 5) Bắt sự kiện sau khi navigate:
 * <MyAccountBadge onNavigate={(href, u) => console.log("navigated:", href, u)} />
 */
