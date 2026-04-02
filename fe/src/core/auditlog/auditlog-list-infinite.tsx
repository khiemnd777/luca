import * as React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { getAuditRenderers } from "./auditlog-registrar";
import { defaultSummary, pickRenderer } from "./auditlog-registry";
import { useAuditLogInfinite } from "./use-auditlog-infinite";
import { formatDateTime } from "@root/shared/utils/datetime.utils";

export type AuditLogListInfiniteProps = {
  http: {
    get<T>(url: string, config?: { params?: Record<string, unknown> }): Promise<{ data: T } | T>;
  };
  module?: string;
  targetId?: number;
  limit?: number;
};

export function AuditLogListInfinite({
  http,
  module,
  targetId,
  limit = 10,
}: AuditLogListInfiniteProps): React.ReactElement {
  const renderers = React.useMemo(() => getAuditRenderers(), []);
  const { items, hasMore, loading, error, loadMore, refresh } = useAuditLogInfinite(http, {
    module,
    target_id: targetId,
    limit,
  });
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      { root: null, rootMargin: "200px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore]);

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Button size="small" onClick={refresh} disabled={loading}>
          Làm mới
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      ) : null}

      <List disablePadding>
        {items.map((row) => {
          const renderer = pickRenderer(renderers, row);
          const summary = renderer.summary ? renderer.summary(row) : defaultSummary(row);
          const createdAtDate = new Date(row.created_at);
          const createdAt = Number.isNaN(createdAtDate.getTime())
            ? row.created_at
            : formatDateTime(createdAtDate);

          return (
            <ListItem key={String(row.id)} disablePadding divider>
              <Box sx={{ width: "100%", px: 2, py: 1.25 }}>
                <ListItemText
                  primary={<Stack spacing={0.5} sx={{ mt: 0.25 }}>
                      <Typography variant="caption" color="text.primary ">
                        {createdAt}
                      </Typography>
                      <Typography variant="body2" color="text.primary">
                        {summary}
                      </Typography>
                    </Stack>}
                  secondaryTypographyProps={{ component: "div" }}
                />
              </Box>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ pt: 1.5, textAlign: "center" }}>
        {loading ? <CircularProgress size={24} /> : null}

        {!loading && hasMore ? (
          <Button size="small" onClick={loadMore} sx={{ mt: 1 }}>
            Load more
          </Button>
        ) : null}
      </Box>

      <div ref={sentinelRef} />
    </Paper>
  );
}

export default AuditLogListInfinite;
