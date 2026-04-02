import * as React from "react";
import { Stack, Typography, Box, IconButton } from "@mui/material";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import { SlotHost } from "@root/core/module/slot-host";

type PageToolbarProps = {
  key: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  onBack?: () => void; // 👈 optional
};

export function PageToolbar({
  key,
  title,
  subtitle,
  actions,
  onBack,
}: PageToolbarProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={2}
      sx={{ width: "100%", minWidth: 0 }}
    >
      {/* LEFT: Back + Title */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ minWidth: 0 }}
      >
        {onBack && (
          <IconButton
            size="small"
            onClick={onBack}
            sx={{ color: "text.secondary" }}
          >
            <ArrowBackIosNewRoundedIcon fontSize="small" />
          </IconButton>
        )}

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h6"
            fontWeight={700}
            textTransform="capitalize"
            noWrap
          >
            {title}
          </Typography>

          {subtitle && (
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>

      {/* RIGHT: Actions */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2.5}
        flexShrink={0}
      >
        <SlotHost direction="row" name="toolbar" />
        <SlotHost direction="row" name={`${key}:toolbar`} />
        {actions}
      </Stack>
    </Stack>
  );
}
