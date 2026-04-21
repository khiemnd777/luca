import { Box, Chip } from "@mui/material";
import { registerSearchRenderer, type SearchRenderer } from "@core/search";
import SearchItem from "@root/core/search/search-item";
import { Badge } from "@shared/components/ui/badge";
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';

const brandNameRenderer: SearchRenderer = (o, { highlight }) => (
    <SearchItem
      title={highlight(o.title)}
      subtitle={
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {o.subtitle ? <span>{highlight(o.subtitle)}</span> : null}
          {o.keywords ? o.keywords.split("|")
            .map((kw) => kw.trim())
            .filter((kw) => kw.length > 0)
            .map((kw) => <Chip key={kw} size="small" label={highlight(kw)} />) : null
          }
        </Box>
      }
      right={<Badge badge={{ avatar: o.attributes?.["logo"] }} />}
    />
  );

registerSearchRenderer("brand_name", "Thương hiệu", brandNameRenderer, <BrandingWatermarkIcon color="primary" />, (_) => "/brand-name");
registerSearchRenderer("brand", "Thương hiệu", brandNameRenderer, <BrandingWatermarkIcon color="primary" />, (_) => "/brand-name");
