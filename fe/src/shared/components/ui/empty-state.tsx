import * as React from "react";
import { Stack, Typography, Button, Box } from "@mui/material";

type EmptyStateProps = {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
};

export function EmptyState({
  title = "No data",
  description = "There is nothing here yet.",
  actionText,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ py: 6, textAlign: "center" }}>
      <Box sx={{ fontSize: 56, lineHeight: 1 }}>{icon ?? "📭"}</Box>
      <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      <Typography variant="body2" color="text.secondary">{description}</Typography>
      {actionText && (
        <Button variant="contained" onClick={onAction}>{actionText}</Button>
      )}
    </Stack>
  );
}
