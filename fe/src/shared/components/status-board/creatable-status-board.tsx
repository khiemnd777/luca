import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";

import StatusCard from "./status-card";
import type { BoardItem } from "./types";

const BOARD_MIN_WIDTH = 320;
const BOARD_MAX_WIDTH = 400;

const getStickyHeaderSx = (backgroundColor: string, top: number | string = 0) => ({
  position: "sticky" as const,
  top,
  zIndex: 10,
  backgroundColor,
  backdropFilter: "blur(6px)",
});

export interface CreatableBoard<TBoard = unknown> {
  id: number;
  title: string;
  data: TBoard;
}

export interface CreatableCard<TCard = unknown> {
  id: number;
  boardId: number;
  title?: string;
  priority?: string;
  data: TCard;
}

interface CreatableStatusBoardProps<TBoard, TCard> {
  boards: CreatableBoard<TBoard>[];
  cards: CreatableCard<TCard>[];
  renderCard: (card: CreatableCard<TCard>, board: CreatableBoard<TBoard>) => React.ReactNode;
  renderBoardHeader?: (board: CreatableBoard<TBoard>, cardCount: number) => React.ReactNode;
  onCreateBoard?: (title: string) => Promise<CreatableBoard<TBoard>>;
  onCreateCard?: (
    boardId: number,
    title?: string
  ) => Promise<CreatableCard<TCard> | void> | CreatableCard<TCard> | void;
  onCardMove?: (
    cardId: number,
    targetBoardId: number,
    fromBoardId: number,
    card: CreatableCard<TCard>
  ) => void | Promise<void>;
  onCardClick?: (card: CreatableCard<TCard>, board: CreatableBoard<TBoard>) => void;
  onBoardClick?: (board: CreatableBoard<TBoard>) => void;
  priorityToColor?: (priority?: string) => string;
  addBoardPlaceholder?: string;
  addBoardButtonText?: string;
  addCardPlaceholder?: string;
  addCardButtonText?: string;
}
export default function CreatableStatusBoard<TBoard, TCard>({
  boards,
  cards,
  renderCard,
  renderBoardHeader,
  onCreateBoard,
  onCreateCard,
  onCardMove,
  onCardClick,
  onBoardClick,
  priorityToColor,
  addBoardPlaceholder = "Tên board",
  addBoardButtonText = "Thêm board",
  addCardPlaceholder = "Thêm thẻ...",
}: CreatableStatusBoardProps<TBoard, TCard>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const columnBackground = isDark ? theme.palette.grey[800] : theme.palette.grey[100];
  const mobileHeaderOffset = `-${theme.spacing(3)}`;
  const mobileStickyHeaderSx = getStickyHeaderSx(columnBackground, mobileHeaderOffset);
  const [boardState, setBoardState] = useState<CreatableBoard<TBoard>[]>(boards);
  const [cardState, setCardState] = useState<CreatableCard<TCard>[]>(cards);
  const [activeCard, setActiveCard] = useState<CreatableCard<TCard> | null>(null);
  const [expanded, setExpanded] = useState<string | false>(
    () => (boards[0] ? String(boards[0].id) : false)
  );

  useEffect(() => {
    setBoardState(boards);
  }, [boards]);

  useEffect(() => {
    setCardState(cards);
  }, [cards]);

  useEffect(() => {
    if (!boardState.length) {
      if (expanded) setExpanded(false);
      return;
    }

    const hasExpanded = expanded && boardState.some((b) => String(b.id) === expanded);
    if (!hasExpanded) {
      setExpanded(String(boardState[0].id));
    }
  }, [boardState, expanded]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (event: DragStartEvent) => {
    const id = Number(event.active.id);
    const card = cardState.find((c) => c.id === id) || null;
    setActiveCard(card);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const id = Number(active.id);
    const newBoardRaw = over.data.current?.status;
    if (!newBoardRaw) return;

    const newBoardId = Number(newBoardRaw);
    const card = cardState.find((c) => c.id === id);
    if (!card) return;

    const oldBoardId = card.boardId;
    if (newBoardId === oldBoardId) return;

    setCardState((prev) =>
      prev.map((c) => (c.id === id ? { ...c, boardId: newBoardId } : c))
    );

    await onCardMove?.(id, newBoardId, oldBoardId, card);
  };

  const handleCreateBoard = async (title: string) => {
    if (!onCreateBoard) return;
    const created = await onCreateBoard(title);
    if (created) {
      setBoardState((prev) =>
        prev.some((board) => board.id === created.id) ? prev : [...prev, created]
      );
    }
  };

  const handleCreateCard = async (boardId: number, title?: string) => {
    if (!onCreateCard) return;
    const created = await onCreateCard(boardId, title);
    if (created) {
      setCardState((prev) =>
        prev.some((card) => card.id === created.id) ? prev : [...prev, created]
      );
    }
  };

  const renderOverlay = () => {
    if (!activeCard) return null;
    const board = boardState.find((b) => b.id === activeCard.boardId);
    const overlayItem: BoardItem<CreatableCard<TCard>> = {
      id: activeCard.id,
      status: String(activeCard.boardId),
      priority: activeCard.priority,
      obj: activeCard,
    };

    return (
      <StatusCard
        item={overlayItem}
        render={() => (board ? renderCard(activeCard, board) : null)}
        dragHandleColor={priorityToColor?.(activeCard.priority)}
        disableDragHandle={isMobile}
      />
    );
  };

  const renderHeader = (board: CreatableBoard<TBoard>, count: number) => {
    const content = renderBoardHeader ? (
      renderBoardHeader(board, count)
    ) : (
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: "100%" }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {board.title}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          {count}
        </Typography>
      </Stack>
    );

    if (!onBoardClick) return content;

    return (
      <Box
        sx={{ width: "100%", cursor: "pointer" }}
        onClick={() => onBoardClick(board)}
      >
        {content}
      </Box>
    );
  };

  const renderBoard = (board: CreatableBoard<TBoard>) => {
    const boardCards = cardState.filter((c) => c.boardId === board.id);
    const sortableIds = boardCards.map((c) => c.id);
    const header = renderHeader(board, boardCards.length);
    const column = (
      <CreatableColumn
        board={board}
        cards={boardCards}
        renderCard={(card) => renderCard(card, board)}
        renderBoardHeader={renderBoardHeader}
        onCreateCard={onCreateCard ? () => handleCreateCard(board.id) : undefined}
        onCardClick={onCardClick}
        onBoardClick={onBoardClick}
        activeId={activeCard?.id}
        priorityToColor={priorityToColor}
        addCardPlaceholder={addCardPlaceholder}
        hideHeader={isMobile}
        fullWidth={isMobile}
      />
    );

    return (
      <SortableContext
        key={board.id}
        id={String(board.id)}
        items={sortableIds}
        strategy={verticalListSortingStrategy}
      >
        {isMobile ? (
          <Accordion
            expanded={expanded === String(board.id)}
            onChange={() => setExpanded((prev) => (prev === String(board.id) ? false : String(board.id)))}
            disableGutters
            elevation={0}
            sx={{
              mb: 1,
              background: isDark ? theme.palette.grey[900] : theme.palette.grey[100],
              borderRadius: 2,
              overflow: "visible",
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                px: 2,
                ...mobileStickyHeaderSx,
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                transition: "box-shadow 0.2s ease",
              }}
            >
              {header}
            </AccordionSummary>

            <AccordionDetails sx={{ p: 0 }}>
              {column}
            </AccordionDetails>
          </Accordion>
        ) : (
          column
        )}
      </SortableContext>
    );
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
      {isMobile ? (
        <Stack spacing={1.5} sx={{ pb: 2 }}>
          {boardState.map(renderBoard)}
          {onCreateBoard && (
            <AddBoardCard
              placeholder={addBoardPlaceholder}
              buttonText={addBoardButtonText}
              onCreate={handleCreateBoard}
              fullWidth
            />
          )}
        </Stack>
      ) : (
        <Box display="flex" gap={2} alignItems="flex-start" sx={{ overflowX: "auto", pb: 2 }}>
          {boardState.map(renderBoard)}

          {onCreateBoard && (
            <AddBoardCard
              placeholder={addBoardPlaceholder}
              buttonText={addBoardButtonText}
              onCreate={handleCreateBoard}
            />
          )}
        </Box>
      )}

      <DragOverlay>{renderOverlay()}</DragOverlay>
    </DndContext>
  );
}

interface ColumnProps<TBoard, TCard> {
  board: CreatableBoard<TBoard>;
  cards: CreatableCard<TCard>[];
  renderCard: (card: CreatableCard<TCard>) => React.ReactNode;
  renderBoardHeader?: (board: CreatableBoard<TBoard>, cardCount: number) => React.ReactNode;
  onCreateCard?: (title?: string) => Promise<void> | void;
  onCardClick?: (card: CreatableCard<TCard>, board: CreatableBoard<TBoard>) => void;
  onBoardClick?: (board: CreatableBoard<TBoard>) => void;
  activeId?: number | null;
  priorityToColor?: (priority?: string) => string;
  addCardPlaceholder?: string;
  hideHeader?: boolean;
  fullWidth?: boolean;
}

function CreatableColumn<TBoard, TCard>({
  board,
  cards,
  renderCard,
  renderBoardHeader,
  onCreateCard,
  onCardClick,
  onBoardClick,
  activeId,
  priorityToColor,
  addCardPlaceholder,
  hideHeader,
  fullWidth,
}: ColumnProps<TBoard, TCard>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const columnBg = isDark ? theme.palette.grey[800] : theme.palette.grey[100];

  const { setNodeRef } = useDroppableArea(board.id);

  return (
    <Box
      ref={setNodeRef}
      sx={{
        width: fullWidth ? "100%" : "auto",
        minWidth: fullWidth ? undefined : BOARD_MIN_WIDTH,
        maxWidth: fullWidth ? undefined : BOARD_MAX_WIDTH,
        flex: fullWidth ? "1 1 100%" : `1 1 ${BOARD_MIN_WIDTH}px`,
        backgroundColor: columnBg,
        borderRadius: isMobile
          ? "0 0 8px 8px"
          : 2,
        p: 2,
      }}
    >
      {!hideHeader && (
        <Box
          sx={{
            mb: 2,
            ...getStickyHeaderSx(columnBg),
          }}
        >
          {(() => {
            const headerContent = renderBoardHeader ? (
              renderBoardHeader(board, cards.length)
            ) : (
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle1" fontWeight={700}>
                  {board.title}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  {cards.length}
                </Typography>
              </Stack>
            );

            if (!onBoardClick) return headerContent;

            return (
              <Box sx={{ cursor: "pointer" }} onClick={() => onBoardClick(board)}>
                {headerContent}
              </Box>
            );
          })()}
        </Box>
      )}

      <Stack spacing={1.5}>
        {cards.map((card) => {
          const item: BoardItem<CreatableCard<TCard>> = {
            id: card.id,
            status: String(board.id),
            priority: card.priority,
            obj: card,
          };

          return (
            <StatusCard
              key={card.id}
              item={item}
              render={() => renderCard(card)}
              activeId={activeId}
              onClick={(_id, _status, obj) => onCardClick?.(obj, board)}
              dragHandleColor={priorityToColor?.(card.priority)}
              disableDragHandle={isMobile}
            />
          );
        })}
      </Stack>

      {onCreateCard && (
        <Button
          onClick={() => onCreateCard()}
          variant="text"
          color="inherit"
          fullWidth
          sx={{
            mt: 2,
            justifyContent: "flex-start",
            textTransform: "none",
            color: "text.secondary",
          }}
        >
          (+) {addCardPlaceholder}
        </Button>
      )}
    </Box>
  );
}

interface AddBoardCardProps {
  placeholder: string;
  buttonText: string;
  onCreate: (title: string) => Promise<void>;
  fullWidth?: boolean;
}

function AddBoardCard({ placeholder, buttonText, onCreate, fullWidth }: AddBoardCardProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [submitting, setSubmitting] = useState(false);
  const [nextIndex, setNextIndex] = useState(1);

  const handleCreate = async () => {
    if (submitting) return;
    const baseTitle = placeholder.trim() || "Board mới";
    const title = nextIndex > 1 ? `${baseTitle} ${nextIndex}` : baseTitle;

    setSubmitting(true);
    try {
      await onCreate(title);
      setNextIndex((prev) => prev + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        width: fullWidth ? "100%" : "auto",
        minWidth: fullWidth ? undefined : BOARD_MIN_WIDTH,
        maxWidth: fullWidth ? undefined : BOARD_MAX_WIDTH,
        flex: fullWidth ? "1 1 100%" : `1 1 ${BOARD_MIN_WIDTH}px`,
        p: 2,
        borderRadius: 2,
        backgroundColor: isDark ? theme.palette.grey[800] : theme.palette.grey[50],
        border: `1px dashed ${isDark ? theme.palette.grey[700] : theme.palette.grey[300]}`,
      }}
    >
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
        Tạo board mới
      </Typography>

      <Button
        onClick={handleCreate}
        variant="outlined"
        disableElevation
        fullWidth
        disabled={submitting}
      >
        {submitting ? "Đang lưu" : buttonText}
      </Button>
    </Box>
  );
}

function useDroppableArea(boardId: number) {
  const { setNodeRef } = useDroppable({
    id: `col-${boardId}`,
    data: { status: String(boardId) },
  });
  return { setNodeRef };
}
