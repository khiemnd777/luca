import { Box, Chip } from "@mui/material";
import { registerSearchRenderer } from "@core/search";
import SearchItem from "@root/core/search/search-item";
import ScienceIcon from '@mui/icons-material/Science';

registerSearchRenderer("raw_material", "Nguyên liệu",
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
  <ScienceIcon color="primary" />,
  (_) => "/raw-material",
);
