import * as React from "react";
import {
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import type { AuditLog, AuditRenderer } from "./types";
import { defaultValue, pickRenderer } from "./auditlog-registry";

export type AuditLogDetailDrawerProps = {
  open: boolean;
  onClose: () => void;
  row: AuditLog | null;
  renderers: AuditRenderer[];
};

function getActionTitle(renderer: AuditRenderer, row: AuditLog): string {
  return renderer.actionLabel ? renderer.actionLabel(row.action, row) : row.action;
}

function extractDataObject(row: AuditLog): Record<string, unknown> {
  if (row.data && typeof row.data === "object" && !Array.isArray(row.data)) {
    return row.data;
  }
  return {};
}

export function AuditLogDetailDrawer({
  open,
  onClose,
  row,
  renderers,
}: AuditLogDetailDrawerProps): React.ReactElement {
  if (!row) {
    return (
      <Drawer anchor="right" open={open} onClose={onClose}>
        <Box sx={{ width: { xs: "100vw", sm: 520 }, p: 2 }}>
          <Typography variant="h6">Audit Detail</Typography>
          <Typography variant="body2" color="text.secondary">
            No audit log selected.
          </Typography>
        </Box>
      </Drawer>
    );
  }

  const renderer = pickRenderer(renderers, row);
  const moduleLabel = renderer.moduleLabel ?? row.module;
  const actionLabel = getActionTitle(renderer, row);
  const data = extractDataObject(row);
  const allDataKeys = Object.keys(data);
  const visibleFields = [...(renderer.fields ?? [])]
    .filter((field) => !field.hidden)
    .sort((a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER));
  const fieldKeys = new Set(visibleFields.map((f) => f.key));
  const remainingKeys = allDataKeys.filter((key) => !fieldKeys.has(key));

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: 520 }, p: 2, overflowY: "auto" }}>
        <Stack spacing={0.5}>
          <Typography variant="h6">
            {moduleLabel} · {actionLabel}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date(row.created_at).toLocaleString()}
          </Typography>
          <Typography variant="body2">User ID: {defaultValue(row.user_id)}</Typography>
          <Typography variant="body2">Target ID: {defaultValue(row.target_id)}</Typography>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {renderer.renderDetail ? (
          renderer.renderDetail(row)
        ) : (
          <List disablePadding>
            {visibleFields.map((field) => (
              <ListItem key={field.key} disableGutters sx={{ alignItems: "flex-start", py: 1 }}>
                <ListItemText
                  primary={field.label ?? field.key}
                  secondary={defaultValue(data[field.key] ?? (row as unknown as Record<string, unknown>)[field.key])}
                  secondaryTypographyProps={{ component: "div" }}
                />
              </ListItem>
            ))}

            {remainingKeys.map((key) => (
              <ListItem key={key} disableGutters sx={{ alignItems: "flex-start", py: 1 }}>
                <ListItemText
                  primary={key}
                  secondary={defaultValue(data[key])}
                  secondaryTypographyProps={{ component: "div" }}
                />
              </ListItem>
            ))}

            {!visibleFields.length && !remainingKeys.length ? (
              <ListItem disableGutters>
                <ListItemText primary="Data" secondary="—" />
              </ListItem>
            ) : null}
          </List>
        )}
      </Box>
    </Drawer>
  );
}

export default AuditLogDetailDrawer;
