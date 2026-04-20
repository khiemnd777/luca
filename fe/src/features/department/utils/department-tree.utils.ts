import type { DeparmentModel } from "@features/department/model/department.model";

export type DepartmentTreeNode = DeparmentModel & {
  id: number;
  children: DepartmentTreeNode[];
  depth: number;
  hasChildren: boolean;
};

function compareDepartments(a: DeparmentModel, b: DeparmentModel): number {
  const nameCompare = String(a.name ?? "").localeCompare(String(b.name ?? ""), undefined, {
    sensitivity: "base",
  });
  if (nameCompare !== 0) return nameCompare;
  return Number(a.id ?? 0) - Number(b.id ?? 0);
}

function normalizeItems(items: DeparmentModel[]): DeparmentModel[] {
  return items
    .filter((item): item is DeparmentModel & { id: number } => Number.isFinite(Number(item.id)) && Number(item.id) > 0)
    .map((item) => ({
      ...item,
      id: Number(item.id),
      parentId:
        item.parentId == null || Number(item.parentId) <= 0
          ? null
          : Number(item.parentId),
    }));
}

export function buildDepartmentTree(items: DeparmentModel[]): DepartmentTreeNode[] {
  const normalized = normalizeItems(items).sort(compareDepartments);
  const childrenByParent = new Map<number | null, DeparmentModel[]>();

  for (const item of normalized) {
    const parentId = item.parentId ?? null;
    const bucket = childrenByParent.get(parentId) ?? [];
    bucket.push(item);
    childrenByParent.set(parentId, bucket);
  }

  const availableIds = new Set(normalized.map((item) => Number(item.id)));
  const rootItems = normalized.filter((item) => item.parentId == null || !availableIds.has(Number(item.parentId)));

  const makeNode = (item: DeparmentModel, depth: number, visiting: Set<number>): DepartmentTreeNode => {
    const id = Number(item.id);
    const nextVisiting = new Set(visiting);
    nextVisiting.add(id);

    const childItems = (childrenByParent.get(id) ?? []).filter((child) => !nextVisiting.has(Number(child.id)));
    const children = childItems.map((child) => makeNode(child, depth + 1, nextVisiting));

    return {
      ...item,
      id,
      depth,
      children,
      hasChildren: children.length > 0,
    };
  };

  return rootItems.map((item) => makeNode(item, 0, new Set<number>()));
}

export function flattenDepartmentTree(
  nodes: DepartmentTreeNode[],
  expandedIds: Set<number>,
): DepartmentTreeNode[] {
  const result: DepartmentTreeNode[] = [];

  const visit = (node: DepartmentTreeNode) => {
    result.push(node);
    if (!node.hasChildren || !expandedIds.has(node.id)) return;
    for (const child of node.children) {
      visit(child);
    }
  };

  for (const node of nodes) {
    visit(node);
  }

  return result;
}

export function collectExpandableDepartmentIds(nodes: DepartmentTreeNode[]): number[] {
  const result: number[] = [];

  const visit = (node: DepartmentTreeNode) => {
    if (node.hasChildren) result.push(node.id);
    for (const child of node.children) {
      visit(child);
    }
  };

  for (const node of nodes) {
    visit(node);
  }

  return result;
}
