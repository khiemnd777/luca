import * as React from "react";
import { Avatar, Box, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useInRouterContext } from "react-router-dom";
import { useDisplayUrl } from "@core/photo/use-display-url";

type BadgeParams = {
  name?: string;
  avatar?: string;
};

type ToProp = string | ((u: BadgeParams) => string);

function resolveTo(badge: BadgeParams, to?: ToProp): string | undefined {
  if (!to) return undefined; // không trả "/" để có thể falsy thật sự
  return typeof to === "string" ? to : to(badge);
}

export function Badge({
  badge,
  collapsed,
  avatarSize = 40,
  to,
  onNavigate,
  tabIndex = 0,
}: {
  badge: BadgeParams;
  collapsed?: boolean;
  avatarSize?: number;
  to?: ToProp;
  onNavigate?: (href: string, user: BadgeParams) => void;
  tabIndex?: number;
}) {
  const avatarUrl = useDisplayUrl(badge?.avatar);
  const initialsSeed = badge?.name || "User";
  const fallbackUrl = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(initialsSeed)}`;

  const href = React.useMemo(() => resolveTo(badge, to), [badge, to]);
  const inRouter = useInRouterContext();

  const handleClick = React.useCallback(() => {
    if (href && onNavigate) onNavigate(href, badge);
  }, [href, onNavigate, badge]);

  // chỉ set props khi thật sự có href
  const clickableProps =
    href !== undefined
      ? inRouter
        ? {
          component: RouterLink,
          to: href,
          onClick: handleClick,
          role: "link" as const,
          tabIndex,
        }
        : {
          component: "a" as const,
          href,
          onClick: handleClick,
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
          cursor: href ? "pointer" : "default",
        },
        textDecoration: "none",
        color: "inherit",
      }}
      {...(clickableProps as any)}
    >
      <Avatar
        src={avatarUrl || fallbackUrl}
        alt={badge?.name ?? "..."}
        sx={{
          width: avatarSize,
          height: avatarSize,
          flexShrink: 0,
          mx: collapsed ? "auto" : 0,
          transition: (t) =>
            t.transitions.create(["margin"], {
              duration: t.transitions.duration.shortest,
            }),
        }}
      />

      {(!collapsed && badge?.name) && (
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            noWrap
            title={badge?.name || "..."}
          >
            {badge?.name || "Unknown User"}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
