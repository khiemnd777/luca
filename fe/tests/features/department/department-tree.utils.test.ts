import { describe, expect, test } from "bun:test";
import {
  buildDepartmentTree,
  collectExpandableDepartmentIds,
  flattenDepartmentTree,
} from "../../../src/features/department/utils/department-tree.utils";

describe("department tree utils", () => {
  test("builds a parent-child tree from flat departments", () => {
    const tree = buildDepartmentTree([
      { id: 2, name: "Child A", parentId: 1 },
      { id: 1, name: "Root" },
      { id: 3, name: "Grandchild", parentId: 2 },
      { id: 4, name: "Sibling", parentId: 1 },
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe(1);
    expect(tree[0].children.map((node) => node.id)).toEqual([2, 4]);
    expect(tree[0].children[0].children.map((node) => node.id)).toEqual([3]);
  });

  test("treats missing parents as root nodes", () => {
    const tree = buildDepartmentTree([
      { id: 10, name: "Detached Child", parentId: 999 },
      { id: 1, name: "Root" },
    ]);

    expect(tree.map((node) => node.id)).toEqual([10, 1]);
    expect(tree[0].depth).toBe(0);
  });

  test("flattens only expanded branches", () => {
    const tree = buildDepartmentTree([
      { id: 1, name: "Root" },
      { id: 2, name: "Child", parentId: 1 },
      { id: 3, name: "Grandchild", parentId: 2 },
    ]);

    expect(flattenDepartmentTree(tree, new Set())).toHaveLength(1);
    expect(flattenDepartmentTree(tree, new Set([1])).map((node) => node.id)).toEqual([1, 2]);
    expect(flattenDepartmentTree(tree, new Set([1, 2])).map((node) => node.id)).toEqual([1, 2, 3]);
  });

  test("collects ids of expandable nodes", () => {
    const tree = buildDepartmentTree([
      { id: 1, name: "Root" },
      { id: 2, name: "Child", parentId: 1 },
      { id: 3, name: "Grandchild", parentId: 2 },
      { id: 4, name: "Leaf" },
    ]);

    expect(collectExpandableDepartmentIds(tree)).toEqual([1, 2]);
  });
});
