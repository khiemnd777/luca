import { Chip } from "@mui/material";
import { formatBadgeCount } from "@root/shared/utils/badge.utils";

type NotifierChipProps = {
  count: number | null;
  collapsed?: boolean;
};

export function NotifierChip({ count, collapsed = false }: NotifierChipProps) {
  // const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const isCompact = collapsed;
  const badgeMax = 9 // isSmall ? 9 : 99;

  if (!count || count <= 0) return null;

  if (isCompact) {
    return (
      <Chip
        size="small"
        color="warning"
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          p: 0,
          "& .MuiChip-label": {
            display: "none",
          },
        }}
      />
    );
  }

  return (
    <Chip
      label={formatBadgeCount(count, badgeMax)}
      size="small"
      color="warning"
      sx={{ height: 20 }}
    />
  );
}
