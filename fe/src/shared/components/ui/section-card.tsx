// SectionCard.tsx
import * as React from "react";
import { Paper, Stack, Typography, Divider, Box, type PaperProps } from "@mui/material";

type SectionCardProps = React.PropsWithChildren<{
  title?: React.ReactNode;
  extra?: React.ReactNode;
  dense?: boolean;
  noDivider?: boolean;
  footer?: React.ReactNode;
}> & Omit<PaperProps, "title">;

export function SectionCard({
  title,
  extra,
  children,
  dense,
  noDivider,
  footer,
  sx,
  ...paperProps
}: SectionCardProps) {
  const pad = dense ? 1.5 : 2;
  return (
    <Paper sx={{ p: 0, ...sx }} {...paperProps}>
      {(title || extra) && (
        <>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: pad, py: 1.25 }}
          >
            {typeof title === "string"
              ? <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
              : title}
            <Stack direction="row" spacing={1}>{extra}</Stack>
          </Stack>
          {!noDivider && <Divider />}
        </>
      )}
      <Box sx={{ p: pad }}>{children}</Box>
      {footer && (
        <>
          {!noDivider && <Divider />}
          <Box sx={{ px: pad, py: 1.25 }}>{footer}</Box>
        </>
      )}
    </Paper>
  );
}
