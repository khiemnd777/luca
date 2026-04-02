import { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  Stack,
  useTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { BoardItem, StatusOption } from "./types";
import StatusListItem from "./status-list-item";

interface Props<T> {
  items: BoardItem<T>[];
  statuses: StatusOption[];
  renderCard: (id: number, status: string, obj: T) => React.ReactNode;
  onCardClick?: (id: number, status: string, obj: T) => void;
}

export default function StatusListView<T>({
  items,
  statuses,
  renderCard,
  onCardClick,
}: Props<T>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [expanded, setExpanded] = useState<string | false>(statuses[0]?.value || false);

  const handleExpand = (status: string) => {
    setExpanded((prev) => (prev === status ? false : status));
  };

  return (
    <Box sx={{ width: "100%" }}>

      {statuses.map((st) => {
        const filtered = items.filter((it) => it.status === st.value);

        return (
          <Accordion
            key={st.value}
            expanded={expanded === st.value}
            onChange={() => handleExpand(st.value)}
            disableGutters
            elevation={0}
            sx={{
              mb: 1,
              background: isDark ? theme.palette.grey[900] : theme.palette.grey[100],
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                px: 2,
                bgcolor: isDark ? theme.palette.grey[800] : theme.palette.grey[200],

                position: "sticky",
                top: -24,
                zIndex: 10,

                backdropFilter: "blur(6px)",
                backgroundColor: isDark
                  ? "rgba(30,30,30,0.85)"
                  : "rgba(255,255,255,0.85)",

                transition: "box-shadow 0.2s ease",
              }}
            >
              <Typography fontWeight={700}>
                {st.label} ({filtered.length})
              </Typography>
            </AccordionSummary>


            <AccordionDetails sx={{ p: 0 }}>
              <Stack spacing={1} sx={{ p: 1 }}>
                {filtered.map((it) => (
                  <StatusListItem
                    key={it.id}
                    item={it}
                    render={renderCard}
                    onClick={onCardClick}
                    color={it.color}
                  />
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}

    </Box>
  );
}
