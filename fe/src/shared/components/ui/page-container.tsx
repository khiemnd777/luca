import * as React from "react";
import { Box } from "@mui/material";

type PageContainerProps = React.PropsWithChildren<{
  maxWidth?: number;
  padding?: number;
}>;

export function PageContainer({ children, maxWidth, padding = 0 }: PageContainerProps) {
  return (
    <Box sx={{ maxWidth, mx: "auto", width: "100%", p: padding }}>{children}</Box>
  );
}
