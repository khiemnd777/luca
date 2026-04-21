import type {
  MenuItem,
  ModuleDescriptor,
  RouteConfig,
  RouteNode,
  SlotConfig,
  SlotName,
} from "@core/module/types";
import { on } from "@core/module/event-bus";
import { RouteMetaProvider, type RouteMeta } from "@core/module/route-meta";
import { flattenRouteNodes } from "@core/module/route-flatten";
import React from "react";
import GeneralPage from "@core/pages/general-page";

type RegisteredModule = {
  meta: ModuleDescriptor;
  unsubscribers: Array<() => void>;
  slots: SlotConfig[];
  /** giữ raw nodes để suy ra router/menu khi cần */
  routeNodes: RouteNode[];
};

const modules = new Map<string, RegisteredModule>();
const slotRegistry = new Map<SlotName, SlotConfig[]>();

let routesCache: RouteConfig[] | null = null;
let menuCache: MenuItem[] | null = null;

export function registerModule(mod: ModuleDescriptor) {
  if (modules.has(mod.id)) {
    console.warn(`[module] duplicate id "${mod.id}" — overriding previous registration`);
    unregisterModule(mod.id);
  }

  const unsubscribers: Array<() => void> = [];

  // slots
  const slots = [...(mod.slots ?? [])];
  for (const cfg of slots) {
    const arr = slotRegistry.get(cfg.name) ?? [];
    arr.push(cfg);
    arr.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    slotRegistry.set(cfg.name, arr);
  }

  // events
  if (mod.onEvents) {
    for (const [evt, handler] of Object.entries(mod.onEvents)) {
      const off = on(evt, handler);
      unsubscribers.push(off);
    }
  }

  modules.set(mod.id, {
    meta: mod,
    unsubscribers,
    slots,
    routeNodes: mod.routes ?? [],
  });

  // invalidate caches
  routesCache = null;
  menuCache = null;
}

export function unregisterModule(id: string) {
  const reg = modules.get(id);
  if (!reg) return;

  reg.unsubscribers.forEach((off) => { try { off(); } catch { /* noop */ } });

  for (const cfg of reg.slots) {
    const arr = slotRegistry.get(cfg.name);
    if (!arr) continue;
    const next = arr.filter((x) => x !== cfg);
    if (next.length === 0) slotRegistry.delete(cfg.name);
    else slotRegistry.set(cfg.name, next);
  }

  modules.delete(id);
  routesCache = null;
  menuCache = null;
}

/** ===== Helpers ===== */

function sortByPriority<T extends { priority?: number; label?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pa !== pb) return pb - pa;
    return (a.label ?? "").localeCompare(b.label ?? "");
  });
}

type AnyComponent =
  | React.ComponentType<any>
  | React.LazyExoticComponent<React.ComponentType<any>>;

function toElement(input?: React.ReactNode | AnyComponent) {
  if (!input) return <GeneralPage />;
  return React.isValidElement(input)
    ? input
    : React.createElement(input as React.ComponentType<any>);
}

export function withMeta(
  element: React.ReactNode | AnyComponent | undefined,
  meta: RouteMeta
): React.ReactElement {
  const child = toElement(element);
  return (
    <RouteMetaProvider meta={meta}>
      <React.Suspense fallback={null}>{child}</React.Suspense>
    </RouteMetaProvider>
  );
}

/** Flatten RouteNode -> RouteConfig[] (cho react-router) */
export function flattenRoutes(nodes: RouteNode[]): RouteConfig[] {
  return flattenRouteNodes(nodes, (node, meta) => ({
    path: node.path,
    permissions: node.permissions,
    element: withMeta(node.element, meta),
    meta,
  }));
}

function toMenu(nodes: RouteNode[]): MenuItem[] {
  const mapNode = (n: RouteNode): MenuItem | null => {
    if (n.hidden) return null;

    const sub = n.children
      ?.map(mapNode)
      .filter((x): x is MenuItem => x !== null);

    return {
      key: n.key,
      label: n.label,
      to: n.path,
      icon: n.icon,
      chip: n.chip,
      priority: n.priority ?? 0,
      roles: n.roles,
      requireAll: n.requireAll,
      permissions: n.permissions,
      extra: n.extra,
      subItems: sub && sub.length > 0 ? sub : undefined,
    };
  };


  const rootItems = nodes
    .map(mapNode)
    .filter((x): x is MenuItem => x !== null);

  const sortDeep = (items: MenuItem[]): MenuItem[] =>
    sortByPriority(items).map((it) => ({
      ...it,
      subItems: it.subItems ? sortDeep(it.subItems) : undefined,
    }));

  return sortDeep(rootItems);
}

export function listRoutes(): RouteConfig[] {
  if (routesCache) return routesCache;
  const allNodes: RouteNode[] = [];
  for (const { routeNodes } of modules.values()) {
    if (routeNodes?.length) allNodes.push(...routeNodes);
  }
  routesCache = flattenRoutes(allNodes);
  return routesCache;
}

export function listMenuItems(): MenuItem[] {
  if (menuCache) return menuCache;
  const allNodes: RouteNode[] = [];
  for (const { routeNodes } of modules.values()) {
    if (routeNodes?.length) allNodes.push(...routeNodes);
  }
  menuCache = toMenu(allNodes);
  return menuCache;
}

export function listSlots(name: SlotName) {
  return slotRegistry.get(name) ?? [];
}

export function registerSlot(cfg: SlotConfig): () => void {
  const arr = slotRegistry.get(cfg.name) ?? [];

  const dupIdx = arr.findIndex((x) => x.id === cfg.id);
  if (dupIdx >= 0) {
    console.warn(`[slot] duplicate id "${cfg.id}" in "${cfg.name}" — overriding previous`);
    arr.splice(dupIdx, 1); // ghi đè
  }

  arr.push(cfg);
  arr.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  slotRegistry.set(cfg.name, arr);

  return () => unregisterSlot(cfg.name, cfg.id);
}

export function unregisterSlot(name: SlotName, id: string): void {
  const arr = slotRegistry.get(name);
  if (!arr) return;
  const next = arr.filter((x) => x.id !== id);
  if (next.length === 0) slotRegistry.delete(name);
  else slotRegistry.set(name, next);
}
