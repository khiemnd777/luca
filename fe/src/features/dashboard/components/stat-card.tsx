import * as React from "react";
import { Box, Chip, Stack, Typography, type ChipProps } from "@mui/material";
import { SectionCard } from "@shared/components/ui/section-card";

export type StatCardProps = {
  title: string;
  value: string | number;
  delta?: string;
  caption?: string;
  tone?: ChipProps["color"];
  icon?: React.ReactNode;
};

export function StatCard({ title, value, delta, caption, tone = "info", icon }: StatCardProps) {
  return (
    <SectionCard dense noDivider sx={{ height: "100%" }}>
      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          {icon ? <Box sx={{ color: "text.secondary" }}>{icon}</Box> : null}
        </Stack>
        <Typography variant="h5" fontWeight={700}>{value}</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {delta ? <Chip size="small" color={tone} label={delta} /> : null}
          {caption ? (
            <Typography variant="caption" color="text.secondary">{caption}</Typography>
          ) : null}
        </Stack>
      </Stack>
    </SectionCard>
  );
}
