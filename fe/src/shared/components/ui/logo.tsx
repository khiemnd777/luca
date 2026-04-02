import { Box, Typography } from "@mui/material";
import { useDisplayUrl } from "@core/photo/use-display-url";

type Props = {
  src?: string | undefined | null;
  name?: string | null;
  size?: number;          // cạnh vuông (px)
  radius?: number | string;
};

export function Logo({ src, name, size = 40, radius = 10 }: Props) {
  const displayLogoUrl = useDisplayUrl(src);
  const initials =
    (name?.trim()?.split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "🏷️");

  if (src) {
    return (
      <Box
        component="img"
        src={displayLogoUrl}
        alt={name ?? "logo"}
        sx={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: "contain",
          bgcolor: "background.paper",
          border: (t) => `1px solid ${t.palette.divider}`,
          // p: 0.5,
          display: "block",
        }}
      />
    );
  }

  // Fallback khi chưa có ảnh logo
  return (
    <Box
      sx={{
        width: size,
        height: size,
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
