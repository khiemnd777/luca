import type { RouteMeta } from "@core/module/route-meta";

export function resolveBackTarget(meta: RouteMeta): string | undefined {
  if (!meta.isDetail) return undefined;
  return meta.parentPath;
}
