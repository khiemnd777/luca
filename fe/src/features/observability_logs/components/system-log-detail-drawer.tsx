import * as React from "react";
import {
  Box,
  Divider,
  Drawer,
  Stack,
  Typography,
} from "@mui/material";
import type { SystemLogModel } from "@features/observability_logs/model/system-log.model";
import { formatDateTime } from "@shared/utils/datetime.utils";

type SystemLogDetailDrawerProps = {
  open: boolean;
  row: SystemLogModel | null;
  onClose: () => void;
};

function renderValue(value: unknown) {
  if (value == null || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function DetailField({ label, value, mono = false }: { label: string; value: unknown; mono?: boolean }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box
        component={mono ? "pre" : "div"}
        sx={{
          m: 0,
          p: 1.5,
          borderRadius: 1,
          backgroundColor: "grey.100",
          overflowX: "auto",
          whiteSpace: mono ? "pre-wrap" : "normal",
          wordBreak: "break-word",
          fontFamily: mono ? "monospace" : undefined,
          fontSize: mono ? 12 : 14,
        }}
      >
        {renderValue(value)}
      </Box>
    </Stack>
  );
}

export function SystemLogDetailDrawer({
  open,
  row,
  onClose,
}: SystemLogDetailDrawerProps): React.ReactElement {
  const metadataEntries = Object.entries(row?.metadata ?? {});

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 560 }, p: 2, overflowY: "auto" }}>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6">System Log Detail</Typography>
            <Typography variant="body2" color="text.secondary">
              {row ? `${formatDateTime(row.ts)} · ${(row.level || "unknown").toUpperCase()}` : "No log selected"}
            </Typography>
          </Stack>

          {!row ? (
            <Typography variant="body2" color="text.secondary">
              Chọn một log để xem chi tiết.
            </Typography>
          ) : (
            <>
              <DetailField label="Message" value={row.message} />
              <DetailField label="Error" value={row.error} />
              <DetailField label="Stacktrace" value={row.stacktrace} mono />

              <Divider />

              <Stack spacing={1}>
                <Typography variant="subtitle2">Metadata</Typography>
                <Stack spacing={1}>
                  <DetailField label="Request ID" value={row.requestId} />
                  <DetailField label="User ID" value={row.userId} />
                  <DetailField label="Department ID" value={row.departmentId} />
                  <DetailField label="Module" value={row.module} />
                  <DetailField label="Service" value={row.service} />
                  <DetailField label="Environment" value={row.env} />
                  {metadataEntries.map(([key, value]) => (
                    <DetailField key={key} label={key} value={value} />
                  ))}
                </Stack>
              </Stack>

              <Divider />

              <DetailField label="Raw" value={row.raw} mono />
            </>
          )}
        </Stack>
      </Box>
    </Drawer>
  );
}
