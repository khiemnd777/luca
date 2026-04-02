# Usage ApiClient

- GET cache

```ts
await apiClient.get("/sample", {
  params: { page: 1, pageSize: 20 },
  cacheMode: "cache-first",
  cacheTTL: 30_000,
  cacheTags: ["sample:list"],
});
```

- Invalidate after POST/PUT/DELETE:

```ts
await apiClient.post("/sample", payload, {
  invalidateTagPrefixes: ["sample:"],
});

// or:
await apiClient.put(`/sample/${id}`, payload, {
  invalidateTags: ["sample:list"],
  invalidateTagPrefixes: [`sample:detail:${id}`],
});

// or directly:
import { invalidateApiCache } from "@core/network/api-client";

invalidateApiCache(["sample:list"], ["sample:"]);
```
