# Usage

```ts
import * as React from "react";
import { registerModule } from "@/core/module/registry";
import type { ModuleDescriptor } from "@/core/module/types";
import { emit, emitAsync } from "@/core/module/event-bus";
import { IfRole } from "@/core/guard/if-role";

const Page = React.lazy(() => import("./presentation/pages/example-page"));

registerModule({
  id: "example",
  routes: [
    { path: "/example", element: <IfRole roles={["user"]}><Page /></IfRole> },
  ],
  slots: [
    {
      id: "notif-bell",
      name: "app:topbar:right",
      priority: 10,
      render: () => (
        <React.Suspense fallback={null}>
          <IfRole roles={["user", "admin"]}>
            <NotificationBell />
          </IfRole>
        </React.Suspense>
      ),
    },
  ],
  onEvents: {
    // sync handler: có thể return
    "example:pure": (n: number) => n + 1,
    // async handler: có thể await
    "example:load": async (q: string) => {
      const res = await fetch(`/search?q=${encodeURIComponent(q)}`).then(r => r.json());
      return res;
    },
  },
  emitEvents: ["example:refresh", "example:request-data"], // chỉ là metadata
});
```
