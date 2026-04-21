import type { RouteMeta } from "@core/module/route-meta";
import type { RouteConfig, RouteNode } from "@core/module/types";

type RouteConfigFactory = (node: RouteNode, meta: RouteMeta) => RouteConfig;

function sortByPriority<T extends { priority?: number; label?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pa !== pb) return pb - pa;
    return (a.label ?? "").localeCompare(b.label ?? "");
  });
}

export function flattenRouteNodes(nodes: RouteNode[], createConfig: RouteConfigFactory): RouteConfig[] {
  const out: RouteConfig[] = [];

  const walk = (arr: RouteNode[], parent?: RouteNode) => {
    for (const node of sortByPriority(arr)) {
      const meta: RouteMeta = {
        key: node.key,
        label: node.label,
        title: node.title,
        subtitle: node.subtitle,
        path: node.path,
        hidden: node.hidden,
        parentKey: parent?.key,
        parentPath: parent?.path,
        isDetail: Boolean(parent && node.hidden),
      };

      out.push(createConfig(node, meta));

      if (node.children?.length) walk(node.children, node);
    }
  };

  walk(nodes);
  return out;
}
