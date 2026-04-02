import { useMediaQuery, useTheme } from "@mui/material";
import StatusBoard from "./status-board";
import StatusList from "./status-list";
import type { BoardItem, StatusOption } from "./types";

interface Props<T> {
  items: BoardItem<T>[];
  statuses: StatusOption[];
  renderCard: (id: number, status: string, obj: T) => React.ReactNode;
  onCardClick?: (id: number, status: string, obj: T) => void;
  onStatusChange?: (
    id: number,
    newStatus: string,
    oldStatus: string,
    obj: T
  ) => void;
  priorityToColor?: (priority?: string) => string;
}

export default function ResponsiveStatusBoard<T>({
  items,
  statuses,
  renderCard,
  onCardClick,
  onStatusChange,
}: Props<T>) {

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // sm = 600px
  // or useMediaQuery("(max-width: 768px)");

  if (isMobile) {
    return (
      <StatusList
        items={items}
        statuses={statuses}
        renderCard={renderCard}
        onCardClick={onCardClick}
      />
    );
  }

  return (
    <StatusBoard
      items={items}
      statuses={statuses}
      renderCard={renderCard}
      onCardClick={onCardClick}
      onStatusChange={onStatusChange}
    />
  );
}
