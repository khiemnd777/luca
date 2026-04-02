import * as React from "react";
import { Box, type BoxProps } from "@mui/material";

type SectionProps = React.PropsWithChildren<{
}> & BoxProps;

export function Section({
  children,
  sx,
  ...boxProps
}: SectionProps) {
  return (
    <Box sx={{ p: 0, ...sx }} {...boxProps}>
      {children}
    </Box>
  );
}
