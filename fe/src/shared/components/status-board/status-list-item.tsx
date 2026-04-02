import { Box, Stack, useTheme } from "@mui/material";
import type { BoardItem } from "./types";

interface Props<T> {
  item: BoardItem<T>;
  render: (id: number, status: string, obj: T) => React.ReactNode;
  onClick?: (id: number, status: string, obj: T) => void;
  color?: string | null;
}

export default function StatusListItem<T>({
  item,
  render,
  onClick,
  color,
}: Props<T>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      onClick={() => onClick?.(item.id, item.status, item.obj)}
      sx={{
        borderRadius: 2,
        bgcolor: isDark ? theme.palette.grey[800] : theme.palette.background.paper,
        boxShadow: isDark
          ? "0 2px 6px rgba(0,0,0,0.4)"
          : "0 1px 4px rgba(0,0,0,0.08)",
        cursor: "pointer",
        overflow: "hidden",
      }}
    >
      {/* COLOR STRIP */}
      {color && (
        <Box
          sx={{
            height: 4,
            width: "100%",
            bgcolor: color,
          }}
        />
      )}

      {/* BODY */}
      <Stack sx={{ p: 2 }}>
        {render(item.id, item.status, item.obj)}
      </Stack>
    </Box>
  );
}
