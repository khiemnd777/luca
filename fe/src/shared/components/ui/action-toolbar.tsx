import * as React from "react";
import { Stack } from "@mui/material";

type ContentToolbarProps = {
  actions?: React.ReactNode;
};

export function ActionToolbar({ actions }: ContentToolbarProps) {
  return (
    actions != null ?
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <span></span>
        <Stack direction="row" spacing={1}>{actions}</Stack>
      </Stack> : null
  );
}
