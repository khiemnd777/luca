import { Box, Typography } from "@mui/material";
import { useDisplayUrl } from "@core/photo/use-display-url";

type Props = {
  src?: string | undefined | null;
  name?: string | null;
  size?: number;
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  border?: boolean;
};

export function Logo({
  src,
  name,
  size = 40,
  width,
  height,
  radius = 10,
  border = true,
}: Props) {
  const displayLogoUrl = useDisplayUrl(src);
  const resolvedWidth = width ?? size;
  const resolvedHeight = height ?? size;
  const initials =
    (name?.trim()?.split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "🏷️");

  if (src) {
    return (
      <Box
        component="img"
        src={displayLogoUrl}
        alt={name ?? "logo"}
        sx={{
          width: resolvedWidth,
          height: resolvedHeight,
          borderRadius: radius,
          objectFit: "contain",
          objectPosition: "left center",
          bgcolor: "background.paper",
          border: border ? (t) => `1px solid ${t.palette.divider}` : "none",
          display: "block",
        }}
      />
    );
  }

  // Fallback khi chưa có ảnh logo
  return (
    <Box
      sx={{
        width: resolvedWidth,
        height: resolvedHeight,
        borderRadius: radius,
        bgcolor: "primary.main",
        color: "primary.contrastText",
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        userSelect: "none",
      }}
      aria-label="Department Logo Fallback"
    >
      <Typography variant="subtitle2" fontWeight={700} lineHeight={1}>
        {initials}
      </Typography>
    </Box>
  );
}
