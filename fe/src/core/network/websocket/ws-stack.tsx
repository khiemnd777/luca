import React from "react";
import { Box, IconButton, Paper, Stack } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

type StackItem = {
  id: string;
  element: React.ReactNode;
  timeoutId: ReturnType<typeof setTimeout> | null;
};

const wsStackItems: StackItem[] = [];
const listeners = new Set<() => void>();
let wsStackId = 0;

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function unregisterStack(id: string) {
  const idx = wsStackItems.findIndex((item) => item.id === id);
  if (idx < 0) return;
  const [removed] = wsStackItems.splice(idx, 1);
  if (removed?.timeoutId) clearTimeout(removed.timeoutId);
  notifyListeners();
}

export function stack(element: React.ReactNode, ttlMs = 10000) {
  const id = `ws-stack:${wsStackId++}`;
  const item: StackItem = { id, element, timeoutId: null };
  wsStackItems.unshift(item);
  notifyListeners();

  item.timeoutId = setTimeout(() => unregisterStack(id), ttlMs);
  return () => unregisterStack(id);
}

function useWSStackItems() {
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    const onChange = () => setTick((tick) => tick + 1);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  return wsStackItems;
}

export function StackMessage() {
  const items = useWSStackItems();

  if (!items.length) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1400,
        pointerEvents: "none",
      }}
    >
      <Stack spacing={1} alignItems="center">
        {items.map((item) => (
          <Paper
            key={item.id}
            elevation={3}
            sx={{
              position: "relative",
              minWidth: 280,
              maxWidth: "min(90vw, 520px)",
              p: 2,
              pointerEvents: "auto",
            }}
          >
            <IconButton
              size="small"
              onClick={() => unregisterStack(item.id)}
              sx={{ position: "absolute", top: 4, right: 4 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            {item.element}
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
