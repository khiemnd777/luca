import { Box, useTheme } from "@mui/material";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardItem } from "./types";

interface Props<T> {
  item: BoardItem<T>;
  render: (id: number, status: string, obj: T) => React.ReactNode;
  activeId?: number | null;
  onClick?: (id: number, status: string, obj: T) => void;
  dragHandleColor?: string;
  disableDragHandle?: boolean;
}

export default function StatusCard<T>({
  item,
  render,
  activeId,
  onClick,
  dragHandleColor,
  disableDragHandle,
}: Props<T>) {
  const sortable = useSortable({
    id: item.id,
    data: { oldStatus: item.status },
  });

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const isDragging = activeId === item.id;
  const dragAttributes = disableDragHandle ? {} : sortable.attributes;
  const dragListeners = disableDragHandle ? {} : sortable.listeners;

  // CLICK detection (no conflict)
  const handleClick = () => {
    if (!isDragging) onClick?.(item.id, item.status, item.obj);
  };

  return (
    <Box
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: isDragging ? 0 : 1,
      }}
      sx={{
        mb: 1.5,
        borderRadius: 2,
        backgroundColor: isDark
          ? theme.palette.grey[700]
          : theme.palette.background.paper,
        boxShadow: isDark
          ? "0 2px 8px rgba(0,0,0,0.5)"
          : "0 2px 6px rgba(0,0,0,0.08)",
      }}
    >
      {!disableDragHandle && (
        <Box
          {...dragListeners}
          {...dragAttributes}
          sx={{
            width: "100%",
            height: 24,
            cursor: "grab",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            background: dragHandleColor ?? (isDark ? "#555" : "#ddd"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* 3 dots */}
          <Box
            sx={{
              display: "flex",
              gap: "4px",
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: isDark ? "#aaa" : "#555",
              }}
            />
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: isDark ? "#aaa" : "#555",
              }}
            />
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: isDark ? "#aaa" : "#555",
              }}
            />
          </Box>
        </Box>
      )}

      {/* CARD BODY - CLICKABLE */}
      <Box
        sx={{ p: 2, cursor: "pointer" }}
        onClick={handleClick}
      >
        {render(item.id, item.status, item.obj)}
      </Box>
    </Box>
  );
}
