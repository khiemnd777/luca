import { Box, Chip } from "@mui/material";
import { registerSearchRenderer } from "@core/search";
import SearchItem from "@root/core/search/search-item";
import InventoryIcon from '@mui/icons-material/Inventory';

registerSearchRenderer("product", "Sản phẩm",
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
      // right={<Badge badge={{ avatar: o.attributes?.["logo"] }} />}
    />
  ),
  <InventoryIcon color="primary" />,
  (d) => `/product/${d.entityId}`,
);
