import * as React from "react";
import type { ReactNode } from "react";
import { listMenuItems } from "@core/module/registry";
import type { MenuItem } from "@core/module/types";
import { useMenuByAccess } from "@core/auth/use-menu-by-access";

export type SidebarItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  chip?: ReactNode;
  href?: string;
  onClick?: () => void;
  subItems?: SidebarItem[];
};

type Options = {
  flattenChildren?: boolean;
  flattenLabelWithParent?: boolean;
};

export function useModuleMenu(opts?: Options): SidebarItem[] {
  const { flattenChildren = false, flattenLabelWithParent = true } = opts ?? {};

  const all = listMenuItems();
  const filtered = useMenuByAccess(all);

  const sortMenu = React.useCallback((items: MenuItem[]) => {
    return [...items].sort((a, b) => {
      const pa = a.priority ?? 0;
      const pb = b.priority ?? 0;
      if (pa !== pb) return pb - pa;
      return (a.label ?? "").localeCompare(b.label ?? "");
    });
  }, []);

  const mapNode = React.useCallback(
    (it: MenuItem, parent?: MenuItem): SidebarItem => {
      const label =
        parent && flattenChildren && flattenLabelWithParent
          ? `${parent.label} / ${it.label}`
          : it.label;

      const node: SidebarItem = {
        key: parent ? `${parent.key}:${it.key}` : it.key,
        label: label ?? "",
        icon: it.icon,
        chip: it.chip,
        href: it.to,
        onClick:
          typeof it.extra?.onClick === "function"
            ? (it.extra.onClick as () => void)
            : undefined,
      };

      if (!flattenChildren && it.subItems?.length) {
        node.subItems = sortMenu(it.subItems).map((c) => mapNode(c, it));
      }

      return node;
    },
    [flattenChildren, flattenLabelWithParent, sortMenu]
  );

  const build = React.useCallback(
    (items: MenuItem[]): SidebarItem[] => {
      const sorted = sortMenu(items);
      if (flattenChildren) {
        const flat: SidebarItem[] = [];
        const walk = (arr: MenuItem[], parent?: MenuItem) => {
          for (const it of arr) {
            const mapped = mapNode(it, parent);
            if (it.to) flat.push(mapped);
            if (it.subItems?.length) walk(it.subItems, it);
            else if (!it.to) flat.push(mapped);
          }
        };
        walk(sorted);
        return flat;
      }
      return sorted.map((it) => mapNode(it));
    },
    [flattenChildren, mapNode, sortMenu]
  );

  return React.useMemo(() => build(filtered), [build, filtered]);
}
