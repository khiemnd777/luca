import { Box, ListItemText, Stack, Typography } from "@mui/material";
import { formatTimeAgo } from "@root/shared/utils/datetime.utils";

function NotificationItem({
  title,
  body,
  unread,
  createdAt,
  onClick,
  icon,
}: {
  title: React.ReactNode;
  body?: React.ReactNode;
  unread?: boolean;
  createdAt?: string | number | Date;
  onClick?: () => void;
  icon?: React.ReactNode;
}) {
  const timeAgo = formatTimeAgo(createdAt);
  const secondary =
    body || timeAgo ? (
      <Stack spacing={0.25}>
        {timeAgo ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            {unread ? (<Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: "warning.main",
              }}
            />) : null}
            <Typography variant="caption" color="text.secondary">
              {timeAgo}
            </Typography>
          </Stack>
        ) : null}
        {body ? <Box>{body}</Box> : null}
      </Stack>
    ) : undefined;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onClick?.();
  };

  const iconSlotSx = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    minWidth: 24,
    height: 24,
  };

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      onClick={onClick ? handleClick : undefined}
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 1,
        bgcolor: unread ? "action.hover" : "transparent",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <ListItemText
        primary={
          <>
            <Stack direction="row" spacing={0.75} alignItems="center">
              {icon ? <Box sx={iconSlotSx}>{icon}</Box> : null}
              <Typography component="span" sx={{ fontWeight: unread ? 700 : 500 }}>
                {title}
              </Typography>
            </Stack>
          </>
        }
        secondary={
          <>
            <Stack direction="row" spacing={0.75} alignItems="center">
              {icon ? <Box sx={iconSlotSx} /> : null}
              {secondary}
            </Stack>
          </>
        }
      />
    </Stack>
  );
}

export default NotificationItem;
