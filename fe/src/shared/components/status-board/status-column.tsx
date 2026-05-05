import { useDroppable } from "@dnd-kit/core";
import { Box, Typography, useTheme } from "@mui/material";

import type { BoardItem } from "./types";
import StatusCard from "./status-card";

interface Props<T> {
  label: string;
  statusValue: string;
  disableDrop?: boolean;
  disableDrag?: boolean;
  items: BoardItem<T>[];
  activeId?: number | null;
  renderCard: (id: number, status: string, obj: T) => React.ReactNode;
  onCardClick?: (id: number, status: string, obj: T) => void;
  priorityToColor?: (priority?: string) => string;
}

export default function StatusColumn<T>({
  label,
  statusValue,
  disableDrop,
  disableDrag,
  items,
  activeId,
  renderCard,
  onCardClick,
}: Props<T>) {
  const { setNodeRef } = useDroppable({
    id: `col-${statusValue}`,
    data: { status: statusValue },
    disabled: disableDrop,
  });

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      ref={setNodeRef}
      sx={{
        width: 280,
        backgroundColor: isDark ? theme.palette.grey[800] : theme.palette.grey[100],
        borderRadius: 2,
        p: 2,
      }}
    >
      <Typography variant="subtitle1" fontWeight={700}
        sx={{
          mb: 2,
          color: isDark ? theme.palette.grey[300] : theme.palette.grey[700],
        }}
      >
        {label}
      </Typography>
      {items.map((it) => (
        <StatusCard
          key={it.id}
          item={it}
          activeId={activeId}
          render={renderCard}
          dragHandleColor={it.color ?? undefined}
          disableDragHandle={disableDrag}
          onClick={onCardClick}
        />
      ))}
    </Box>
  );
}
