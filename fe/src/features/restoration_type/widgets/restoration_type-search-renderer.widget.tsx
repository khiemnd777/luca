import { Box, Chip } from "@mui/material";
import { registerSearchRenderer } from "@core/search";
import SearchItem from "@root/core/search/search-item";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";

registerSearchRenderer("restoration_type", "Kiểu phục hình",
  (o, { highlight }) => (
    <SearchItem
      title={highlight(o.title)}
      subtitle={
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {o.subtitle ? <span>{highlight(o.subtitle)}</span> : null}
          {o.keywords ? o.keywords.split("|")
            .map((kw) => kw.trim())
            .filter((kw) => kw.length > 0)
            .map((kw) => <Chip size="small" label={highlight(kw)} />) : null
          }
        </Box>
      }
    />
  ),
  <AutoFixHighIcon color="primary" />,
  (_) => "/restoration-type",
);
