import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  pointerWithin,
  type DragStartEvent,
  DragOverlay,
  rectIntersection,
} from "@dnd-kit/core";
import { Box } from "@mui/material";
import StatusColumn from "./status-column";
import type { BoardItem, StatusOption } from "./types";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import StatusCard from "./status-card";

interface Props<T> {
  items: BoardItem<T>[];
  statuses: StatusOption[];
  onStatusChange?: (
    id: number,
    newStatus: string,
    oldStatus: string,
    obj: T,
  ) => void;
  renderCard: (id: number, status: string, item: T) => React.ReactNode;
  onCardClick?: (id: number, status: string, obj: T) => void;
  priorityToColor?: (priority?: string) => string;
}

export default function StatusBoard<T>({
  items,
  statuses,
  onStatusChange,
  renderCard,
  onCardClick,
  priorityToColor,
}: Props<T>) {
  const [data, setData] = useState<BoardItem<T>[]>(() => items);

  useEffect(() => {
    setData(items);
  }, [items]);

  const sensors = useSensors(useSensor(PointerSensor));

  const [activeItem, setActiveItem] = useState<BoardItem<T> | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const id = Number(event.active.id);
    const item = data.find((x) => x.id === id) || null;
    setActiveItem(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over) return;

    const id = Number(active.id);
    const newStatus = over.data.current?.status as string;
    if (!newStatus) return;

    const oldItem = data.find((x) => x.id === id);
    if (!oldItem) return;

    const oldStatus = oldItem.status;

    setData(prev =>
      prev.map(it => (it.id === id ? { ...it, status: newStatus } : it))
    );

    onStatusChange?.(id, newStatus, oldStatus, oldItem.obj);
  };


  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={(args) => {
        const collisions = pointerWithin(args);
        return collisions.length > 0 ? collisions : rectIntersection(args);
      }}
    >
      <Box display="flex" gap={2}>
        {statuses.map((st) => {
          const columnItems = data
            .filter((it) => it.status === st.value)
            .map((it) => it.id);

          return (
            <SortableContext
              key={st.value}
              id={st.value}
              items={columnItems}
              strategy={verticalListSortingStrategy}
            >
              <StatusColumn
                label={st.label}
                statusValue={st.value}
                items={data.filter(it => it.status === st.value)}
                renderCard={renderCard}
                onCardClick={onCardClick}
                activeId={activeItem?.id}
                priorityToColor={priorityToColor}
              />
            </SortableContext>
          );
        })}
      </Box>

      <DragOverlay>
        {activeItem ? (
          <StatusCard item={activeItem} render={renderCard} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
