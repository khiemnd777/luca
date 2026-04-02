import * as React from "react";
import { Stack, Box, Grid } from "@mui/material";
import type { OneColumnProps } from "@core/skeleton/types";
import { SlotHost } from "@core/module/slot-host";

export function OneColumn({
  name,
  direction = "column",
  justifyContent,
  alignItems,
  gap = 2,
  grid = false,
  expandChildren = false,
  children,
}: OneColumnProps) {
  if (grid) {
    return (
      <Grid container spacing={gap}>
        {name && (
          <Grid container spacing={{ xs: 12 }}>
            <SlotHost name={name} />
          </Grid>
        )}
        {/* Nếu muốn các child tham gia grid, bọc mỗi child bằng <Grid item xs={...}> */}
        {React.Children.map(children, (child, i) => (
          <Grid container spacing={{ xs: 12 }} key={i}>
            {child}
          </Grid>
        ))}
      </Grid>
    );
  }

  const wrapped =
    expandChildren && React.Children.count(children) > 0
      ? React.Children.map(children, (child, i) => (
        <Box key={i} sx={{ flex: 1, minWidth: 0 }}>
          {child}
        </Box>
      ))
      : children;

  return (
    <Stack
      direction={direction}
      justifyContent={justifyContent}
      alignItems={alignItems}
      spacing={gap}
    >
      {name && <SlotHost name={name} />}
      {wrapped}
    </Stack>
  );
}
