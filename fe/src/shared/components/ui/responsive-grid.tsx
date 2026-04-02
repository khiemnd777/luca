import * as React from "react";
import { Box } from "@mui/material";

type ResponsiveGridProps = React.PropsWithChildren<{
  gap?: number;
  xs?: number; sm?: number; md?: number; lg?: number; xl?: number;
}>;

// xs/sm/md... là số cột, mặc định 1/2/2/3/4
export function ResponsiveGrid({
  children,
  gap = 2,
  xs = 1, sm = 2, md = 2, lg = 3, xl = 4,
}: ResponsiveGridProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gap,
        gridTemplateColumns: {
          xs: `repeat(${xs}, 1fr)`,
          sm: `repeat(${sm}, 1fr)`,
          md: `repeat(${md}, 1fr)`,
          lg: `repeat(${lg}, 1fr)`,
          xl: `repeat(${xl}, 1fr)`,
        },
      }}
    >
      {children}
    </Box>
  );
}
