import type { RouteMeta } from "@core/module/route-meta";

export type BackNavigationState = {
  backTarget?: string;
};

function sanitizeBackTarget(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/")) return undefined;
  return value;
}

export function createBackNavigationState(backTarget?: string): BackNavigationState | undefined {
  const resolvedBackTarget =
    sanitizeBackTarget(backTarget) ??
    (typeof window === "undefined"
      ? undefined
      : sanitizeBackTarget(`${window.location.pathname}${window.location.search}`));

  if (!resolvedBackTarget) return undefined;
  return { backTarget: resolvedBackTarget };
}

export function resolveBackTarget(meta: RouteMeta, state?: unknown): string | undefined {
  if (!meta.isDetail) return undefined;

  const stateBackTarget = sanitizeBackTarget((state as BackNavigationState | null)?.backTarget);
  if (stateBackTarget) return stateBackTarget;

  return meta.parentPath;
}
