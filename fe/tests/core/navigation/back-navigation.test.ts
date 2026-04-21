import { describe, expect, test } from "bun:test";
import type { RouteNode } from "../../../src/core/module/types";
import { flattenRouteNodes } from "../../../src/core/module/route-flatten";
import { resolveBackTarget } from "../../../src/core/navigation/back-navigation";

describe("route metadata back navigation", () => {
  test("root list route does not receive a parentPath", () => {
    const routes: RouteNode[] = [
      {
        key: "order",
        title: "Đơn hàng",
        path: "/order",
      },
    ];

    const [route] = flattenRouteNodes(routes, (node, meta) => ({
      path: node.path,
      permissions: node.permissions,
      element: null,
      meta,
    }));

    expect(route.meta.parentPath).toBeUndefined();
    expect(route.meta.parentKey).toBeUndefined();
    expect(route.meta.isDetail).toBe(false);
  });

  test("detail child route receives direct parent metadata", () => {
    const routes: RouteNode[] = [
      {
        key: "order",
        title: "Đơn hàng",
        path: "/order",
        children: [
          {
            hidden: true,
            key: "order-detail",
            title: "Chi tiết đơn hàng",
            path: "/order/:orderId",
          },
        ],
      },
    ];

    const [, detailRoute] = flattenRouteNodes(routes, (node, meta) => ({
      path: node.path,
      permissions: node.permissions,
      element: null,
      meta,
    }));

    expect(detailRoute.meta.parentKey).toBe("order");
    expect(detailRoute.meta.parentPath).toBe("/order");
    expect(detailRoute.meta.isDetail).toBe(true);
  });

  test("nested detail route receives its direct parent metadata", () => {
    const routes: RouteNode[] = [
      {
        key: "metadata",
        title: "Metadata",
        path: "/metadata",
        children: [
          {
            key: "import-profiles",
            title: "Import Profiles",
            path: "/import-profiles/",
            children: [
              {
                hidden: true,
                key: "import-mapping",
                title: "Import Mapping",
                path: "/import-profiles/mapping/:id",
              },
            ],
          },
        ],
      },
    ];

    const flattened = flattenRouteNodes(routes, (node, meta) => ({
      path: node.path,
      permissions: node.permissions,
      element: null,
      meta,
    }));
    const importProfilesRoute = flattened.find((route) => route.meta.key === "import-profiles");
    const nestedDetailRoute = flattened.find((route) => route.meta.key === "import-mapping");

    expect(importProfilesRoute).toBeDefined();
    expect(importProfilesRoute?.meta.parentPath).toBe("/metadata");
    expect(importProfilesRoute?.meta.isDetail).toBe(false);
    expect(nestedDetailRoute).toBeDefined();
    expect(nestedDetailRoute?.meta.parentKey).toBe("import-profiles");
    expect(nestedDetailRoute?.meta.parentPath).toBe("/import-profiles/");
    expect(nestedDetailRoute?.meta.isDetail).toBe(true);
  });
});

describe("resolveBackTarget", () => {
  test("list routes do not expose a back target", () => {
    expect(
      resolveBackTarget({
        key: "settings",
        title: "Thiết lập",
        path: "/settings",
        hidden: true,
        isDetail: false,
      }),
    ).toBeUndefined();
  });

  test("detail routes navigate back to their direct parent path", () => {
    expect(
      resolveBackTarget({
        key: "clinic-detail",
        title: "Chi tiết nha khoa",
        path: "/clinic/:clinicId",
        hidden: true,
        parentKey: "clinic",
        parentPath: "/clinic",
        isDetail: true,
      }),
    ).toBe("/clinic");
  });

  test("detail routes without parentPath remain without back target", () => {
    expect(
      resolveBackTarget({
        key: "orphan-detail",
        title: "Detail",
        path: "/orphan/:id",
        hidden: true,
        isDetail: true,
      }),
    ).toBeUndefined();
  });
});
