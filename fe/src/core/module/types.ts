import type { ReactNode, LazyExoticComponent, JSX } from "react";
import type { Perm } from "@core/auth/rbac-utils";

export type SlotName = string;

export type SlotConfig = {
  id: string;
  name: SlotName;
  priority?: number;
  render: () => ReactNode;
};

export type RouteNode = {
  key: string;
  label?: string;
  title?: string;                 // Page title
  subtitle?: string;              // Page subtitle
  path: string;                   // dùng cho router + menu
  element?: ReactNode | LazyExoticComponent<() => JSX.Element> | undefined; // nếu bỏ trống → GeneralPage
  icon?: ReactNode;
  chip?: ReactNode;
  priority?: number;
  roles?: string[];
  requireAll?: boolean;
  permissions?: Perm[];
  hidden?: boolean;
  children?: RouteNode[];         // thay cho lồng subItems/menu
  extra?: Record<string, unknown>;
};

export type RouteConfig = {
  path: string;
  permissions?: Perm[];
  element: ReactNode | LazyExoticComponent<() => JSX.Element>;
  meta: import("@core/module/route-meta").RouteMeta;
};

export type MenuItem = {
  key: string;
  label?: string;
  to: string;
  icon?: ReactNode;
  chip?: ReactNode;
  priority?: number;
  roles?: string[];
  requireAll?: boolean;
  permissions?: Perm[];
  subItems?: MenuItem[];
  extra?: Record<string, unknown>;
};

export type ModuleDescriptor = {
  id: string;
  routes?: RouteNode[];
  slots?: SlotConfig[];
  onEvents?: Record<string, (payload?: unknown) => void>;
  emitEvents?: string[];
};
