import { useState } from "react";
import CreatableStatusBoard, {
  type CreatableBoard,
  type CreatableCard,
} from "@shared/components/status-board/creatable-status-board";
import { Stack, Typography } from "@mui/material";

type BoardData = { owner: string };
type CardData = { description: string };

const normalizeTitle = (value: string) => value.trim().toLowerCase();

export default function CreatableBoardDemo() {
  const [boards, setBoards] = useState<CreatableBoard<BoardData>[]>([
    { id: 1, title: "Ý tưởng", data: { owner: "Alice" } },
    { id: 2, title: "Đang làm", data: { owner: "Bob" } },
    { id: 3, title: "Hoàn tất", data: { owner: "Team" } },
    { id: 4, title: "Hoàn tất", data: { owner: "Team" } },
    { id: 5, title: "Hoàn tất", data: { owner: "Team" } },
    { id: 6, title: "Hoàn tất", data: { owner: "Team" } },
    { id: 7, title: "Hoàn tất", data: { owner: "Team" } },
  ]);

  const [cards, setCards] = useState<CreatableCard<CardData>[]>([
    { id: 101, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 102, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 103, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 104, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 105, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 106, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 107, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 108, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 109, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 110, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 111, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 112, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 113, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 114, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 115, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 116, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 117, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },
    { id: 118, boardId: 1, title: "Tính năng A", data: { description: "Mô tả A" } },

    { id: 119, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 120, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 121, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 122, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 123, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 124, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 125, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 126, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 127, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 128, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 129, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 130, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 131, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 132, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 133, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 134, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 135, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 136, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
    { id: 137, boardId: 2, title: "Tính năng B", data: { description: "Mô tả B" } },
  ]);

  return (
    <CreatableStatusBoard
      boards={boards}
      cards={cards}
      renderBoardHeader={(board, count) => (
        <Stack direction="row" justifyContent="space-between">
          <Typography fontWeight={700}>{board.title}</Typography>
          <Typography color="text.secondary">{count}</Typography>
        </Stack>
      )}
      renderCard={(card) => (
        <Stack spacing={0.5}>
          <Typography fontWeight={700}>{card.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {card.data.description}
          </Typography>
        </Stack>
      )}
      onCreateBoard={async (title) => {
        const normalizedTitle = normalizeTitle(title);
        const existing = boards.find((board) => normalizeTitle(board.title) === normalizedTitle);
        if (existing) {
          return existing;
        }

        const newBoard = { id: Date.now(), title: title.trim(), data: { owner: "Bạn" } };
        setBoards((prev) => [...prev, newBoard]);
        return newBoard;
      }}
      onCreateCard={async (boardId, title) => {
        const normalizedTitle = normalizeTitle(title ?? '');
        const existing = cards.find(
          (card) =>
            card.boardId === boardId && normalizeTitle(card.title ?? "") === normalizedTitle
        );
        if (existing) {
          return existing;
        }

        const newCard = {
          id: Date.now(),
          boardId,
          title: title?.trim(),
          data: { description: "Mô tả mới" },
        };
        setCards((prev) => [...prev, newCard]);
        return newCard;
      }}
      onCardMove={async (cardId, targetBoardId) => {
        setCards((prev) =>
          prev.map((c) => (c.id === cardId ? { ...c, boardId: targetBoardId } : c))
        );
        // Persist to API here if needed
      }}
      onCardClick={(card, board) => {
        console.log("Clicked", card.title, "in", board.title);
      }}
      onBoardClick={(board) =>  {
        console.log("Clicked", board);

      }}
    />
  );
}
