import * as React from "react";
import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  useMediaQuery,
  Collapse,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuOpenRoundedIcon from "@mui/icons-material/MenuOpenRounded";
import { ArrowRight } from "@mui/icons-material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { NavLink, useLocation } from "react-router-dom";
import { useModuleMenu, type SidebarItem } from "@core/navigation/use-module.menu";
import { useAuth } from "../auth/use-auth";
import { Logo } from "@root/shared/components/ui/logo";
import MyAccountBadge from "@root/shared/components/ui/account-badge";
import { PageToolbar } from "@root/shared/components/ui/page-toolbar";
import { useRouteMeta } from "../module/route-meta";
import { useNavigate } from "react-router-dom";

const SIDEBAR_W = 280;
const SIDEBAR_COLLAPSED_W = 76;

interface CollapsibleChipProps {
  collapsed?: boolean;
}

export function BasePage({ children }: { children: React.ReactNode }) {
  const { department } = useAuth();
  const { key, title, subtitle } = useRouteMeta();
  const reactNavigate = useNavigate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("md"));

  // Collapse khi màn hình nhỏ; cho phép toggle thủ công
  const [collapsed, setCollapsed] = React.useState<boolean>(isSmall);

  const { pathname } = useLocation();
  const menu = useModuleMenu({ flattenChildren: false });

  const renderChip = React.useCallback(
    (chip?: React.ReactNode) => {
      if (!chip) return null;
      if (React.isValidElement<CollapsibleChipProps>(chip)) {
        return React.cloneElement(chip, { collapsed });
      }
      return chip;
    },
    [collapsed]
  );

  const renderTopLabel = React.useCallback((label?: string, chip?: React.ReactNode) => {
    if (!chip) return label ?? "";
    return (
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
        <Typography variant="body1" noWrap sx={{ minWidth: 0, flex: 1 }}>
          {label ?? ""}
        </Typography>
        {chip}
      </Stack>
    );
  }, []);

  const renderSubLabel = React.useCallback(
    (label?: string, active?: boolean, chip?: React.ReactNode) => {
      if (!chip) {
        return (
          <Typography variant="body2" fontWeight={active ? 600 : 400}>
            {label ?? ""}
          </Typography>
        );
      }
      return (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={active ? 600 : 400}
            noWrap
            sx={{ minWidth: 0, flex: 1 }}
          >
            {label ?? ""}
          </Typography>
          {chip}
        </Stack>
      );
    },
    []
  );

  // --- Helpers: xác định active
  const isHrefActive = React.useCallback(
    (href?: string) => {
      if (!href) return false;
      if (href === "/") return pathname === "/";
      return pathname === href || pathname.startsWith(href + "/");
    },
    [pathname]
  );

  const isItemActive = React.useCallback(
    (item: SidebarItem): boolean => {
      if (isHrefActive(item.href)) return true;
      if (item.subItems?.length) return item.subItems.some(isItemActive);
      return false;
    },
    [isHrefActive]
  );

  // --- Open/Close state cho submenu
  const [openKeys, setOpenKeys] = React.useState<Set<string>>(new Set());

  const toggleOpen = React.useCallback((key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Tìm đường key tới item active để auto mở
  const findActiveKeyPath = React.useCallback(
    (items: SidebarItem[]): string[] | null => {
      for (const it of items) {
        if (isHrefActive(it.href)) return [it.key];
        if (it.subItems?.length) {
          const child = findActiveKeyPath(it.subItems);
          if (child) return [it.key, ...child];
        }
      }
      return null;
    },
    [isHrefActive]
  );

  // Auto-open các nhánh chứa route active (chỉ set khi thực sự đổi)
  React.useEffect(() => {
    const keys = findActiveKeyPath(menu) ?? [];
    setOpenKeys((prev) => {
      let changed = false;
      const next = new Set(prev);

      for (const k of keys) {
        if (!next.has(k)) {
          next.add(k);
          changed = true;
        }
      }

      // for (const k of Array.from(next)) {
      //   if (!keys.includes(k)) {
      //     next.delete(k);
      //     changed = true;
      //   }
      // }

      return changed ? next : prev; // cực kỳ quan trọng để tránh re-render lặp
    });
  }, [menu, pathname, findActiveKeyPath]);

  React.useEffect(() => {
    const raw = localStorage.getItem("menu.openKeys");
    if (raw) setOpenKeys(new Set(JSON.parse(raw)));
  }, []);

  React.useEffect(() => {
    localStorage.setItem("menu.openKeys", JSON.stringify([...openKeys]));
  }, [openKeys]);

  // Thu gọn sidebar khi màn hình nhỏ
  React.useEffect(() => {
    setCollapsed(isSmall);
  }, [isSmall]);

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100%",
        bgcolor: "background.default",
        color: "text.primary",
        display: "flex",
        overflow: "hidden",
      }}
    >
      {/* Left column (fixed width, no scroll) */}
      <Paper
        elevation={0}
        square
        sx={{
          width: collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W,
          borderRight: (t) => `1px solid ${t.palette.divider}`,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          py: 1,
          transition: (t) =>
            t.transitions.create("width", {
              duration: t.transitions.duration.shorter,
            }),
        }}
      >
        {/* Top: Logo + toggle */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-start"
          spacing={1}
          px={1.5}
          py={0}
          sx={{
            position: "relative",
            transition: theme.transitions.create(["all"], {
              duration: theme.transitions.duration.shortest,
            }),
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", justifyContent: collapsed ? "center" : "flex-start" }}>
            <Logo
              src={collapsed ? (department?.logo ?? department?.logoRect) : (department?.logoRect ?? department?.logo)}
              name={department?.name}
              width={collapsed ? 40 : "100%"}
              height={40}
              radius={0}
              border={false}
            />
          </Box>

          {/* Toggle button */}
          <Box
            sx={{
              flexShrink: 0,
              position: collapsed ? "absolute" : "static",
              right: collapsed ? -20 : 0,
              top: collapsed ? 5 : "auto",
              zIndex: collapsed ? 10 : "auto",
            }}
          >
            <Tooltip title={collapsed ? "Expand" : "Collapse"}>
              <IconButton
                size="small"
                onClick={() => setCollapsed(!collapsed)}
                sx={{ color: "text.secondary" }}
              >
                {collapsed ? <ArrowRight /> : <MenuOpenRoundedIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Stack>

        <Divider sx={{ my: 1 }} />

        {/* Menu (middle) */}
        <Box sx={{ overflowY: "auto", flex: 1, px: 1 }}>
          <List disablePadding>
            {menu.map((m) => {
              const active = isItemActive(m);
              const hasChildren = !!m.subItems?.length;
              const isOpen = openKeys.has(m.key) || active;

              const parentBtn = (
                <ListItemButton
                  key={m.key}
                  selected={active}
                  sx={{
                    width: "100%",
                    borderRadius: 1,
                    mx: 0,
                    my: 0.5,
                    justifyContent: collapsed ? "center" : "flex-start",
                    px: collapsed ? 1.625 : 1.5,
                    pr: hasChildren && !collapsed ? 0.5 : undefined, // chừa chỗ caret
                  }}
                  // Điều hướng bình thường nếu có href
                  component={m.href ? NavLink : "button"}
                  to={m.href ?? ""}
                  onClick={m.onClick}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: collapsed ? 0 : 1.5,
                      justifyContent: "center",
                      alignItems: "center",
                      display: "flex",
                    }}
                  >
                    {collapsed && m.chip ? (
                      <Box
                        sx={{
                          position: "relative",
                          width: 24,
                          height: 24,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {m.icon}
                        <Box
                          sx={{
                            position: "absolute",
                            top: -8,
                            right: -8,
                            pointerEvents: "none",
                          }}
                        >
                          {renderChip(m.chip)}
                        </Box>
                      </Box>
                    ) : (
                      m.icon
                    )}
                  </ListItemIcon>

                  {!collapsed && (
                    <ListItemText
                      primary={renderTopLabel(m.label, renderChip(m.chip))}
                      disableTypography={!!m.chip}
                    />
                  )}

                  {/* Caret toggle chỉ hiện khi có children & không collapsed */}
                  {!collapsed && hasChildren && (
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label={isOpen ? "Collapse" : "Expand"}
                      onClick={(e) => {
                        e.preventDefault(); // không điều hướng
                        e.stopPropagation(); // không trigger onClick của item
                        toggleOpen(m.key);
                      }}
                      sx={{ ml: 0.5 }}
                    >
                      {isOpen ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  )}
                </ListItemButton>
              );

              const wrappedTop = collapsed ? (
                <Tooltip key={m.key} title={m.label} placement="right">
                  <span>{parentBtn}</span>
                </Tooltip>
              ) : (
                parentBtn
              );

              const groupActive = active || (collapsed && hasChildren);

              const groupBg = collapsed && hasChildren
                ? "action.hover"
                : groupActive
                  ? "action.selected"
                  : "transparent";


              return (
                <Box
                  key={m.key}
                  sx={{
                    borderRadius: 1,
                    mx: 0.5,
                    mb: 0.5,
                    bgcolor: groupBg,
                    transition: "background-color 0.2s ease",
                  }}
                >
                  {wrappedTop}

                  {/* Submenu: chỉ hiển thị khi không collapsed */}
                  {hasChildren && (
                    <Collapse in={collapsed ? true : isOpen} unmountOnExit timeout="auto">
                      <List disablePadding sx={{ ml: collapsed ? 0 : 1.5, mr: collapsed ? 0 : 1.5 }}>
                        {m.subItems!.map((s) => {
                          const sActive = isItemActive(s);
                          return (
                            <ListItemButton
                              key={s.key}
                              selected={sActive}
                              component={s.href ? NavLink : "button"}
                              to={s.href ?? ""}
                              onClick={s.onClick}
                              sx={{
                                borderRadius: 1,
                                // mx: 0.5,
                                // my: 0.25,
                                // pl: collapsed ? 0 : 4.5,
                                // py: 0.75,
                              }}
                            >
                              {s.icon && (
                                <ListItemIcon
                                  sx={{
                                    minWidth: 0,
                                    mr: 1.25,
                                    color: sActive ? "primary.main" : "text.secondary",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {s.icon}
                                </ListItemIcon>
                              )}
                              {collapsed ? null :
                                <ListItemText
                                  disableTypography
                                  primary={renderSubLabel(s.label, sActive, renderChip(s.chip))}
                                />
                              }

                            </ListItemButton>
                          );
                        })}
                      </List>
                    </Collapse>
                  )}
                </Box>
              );
            })}
          </List>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Bottom: user info */}
        <MyAccountBadge collapsed={collapsed} to={(_) => "/account"} />

      </Paper>

      {/* Right column: scrollable content only */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Sticky PageToolbar */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            bgcolor: "background.default",
            borderBottom: (t) => `1px solid ${t.palette.divider}`,
            px: 3,
            py: 0,
            height: 57,
            display: "flex",
            alignItems: "center",
          }}
        >
          <PageToolbar
            key={key}
            title={title ?? ""}
            subtitle={subtitle ?? ""}
            onBack={history.length > 1 ? () => reactNavigate(-1) : undefined}
            actions={
              <>
              </>
            }
          />
        </Box>

        {/* Scrollable content */}
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            px: 3,
            py: 2,
          }}
        >
          {children}
        </Box>
      </Box>

    </Box>
  );
}
