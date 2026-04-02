import { Box, Chip } from "@mui/material";
import { registerSearchRenderer } from "@core/search";
import SearchItem from "@root/core/search/search-item";
import BuildIcon from "@mui/icons-material/Build";

registerSearchRenderer("technique", "Kỹ thuật",
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
  <BuildIcon color="primary" />,
  (_) => "/technique",
);
