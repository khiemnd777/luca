import { Grid } from "@mui/material";
import type { TwoColumnsProps } from "@core/skeleton/types";
import { SlotHost } from "@core/module/slot-host";

export function TwoColumns({
  name,
  left,
  right,
  gap = 3,
  leftWidth = { xs: 12, md: 7, lg: 8 },
  rightWidth = { xs: 12, md: 5, lg: 4 },
}: TwoColumnsProps) {
  const leftNode = left ?? (name ? <SlotHost name={`${name}:left`} /> : null);
  const rightNode = right ?? (name ? <SlotHost name={`${name}:right`} /> : null);

  return (
    <Grid container spacing={gap} sx={{ width: "100%" }}>
      <Grid {...leftWidth}>{leftNode}</Grid>
      <Grid {...rightWidth}>{rightNode}</Grid>
    </Grid>
  );
}
