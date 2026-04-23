import { Box, Chip } from "@mui/material";
import { registerSearchRenderer, type SearchRenderer } from "@core/search";
import type { SearchModel } from "@core/search/search.model";
import SearchItem from "@root/core/search/search-item";
import { Badge } from "@shared/components/ui/badge";
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';

function buildSubtitle(option: SearchModel) {
  const code = String(option.attributes?.["code"] ?? "").trim();
  const subtitle = option.subtitle?.trim() ?? "";
  const keywords = (option.keywords ?? "")
    .split("|")
    .map((kw) => kw.trim())
    .filter((kw) => kw.length > 0 && kw !== code);

  return { code, subtitle, keywords };
}

const brandNameRenderer: SearchRenderer = (o, { highlight }) => {
  const { code, subtitle, keywords } = buildSubtitle(o);

  return (
    <SearchItem
      title={highlight(o.title)}
      subtitle={
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {code ? <Chip key={`${o.entityType}-${o.entityId}-code`} size="small" label={highlight(code)} /> : null}
          {subtitle ? <span>{highlight(subtitle)}</span> : null}
          {keywords.map((kw) => <Chip key={kw} size="small" label={highlight(kw)} />)}
        </Box>
      }
      right={<Badge badge={{ avatar: o.attributes?.["logo"] }} />}
    />
  );
};

registerSearchRenderer("brand_name", "Thương hiệu", brandNameRenderer, <BrandingWatermarkIcon color="primary" />, (_) => "/brand-name");
registerSearchRenderer("brand", "Thương hiệu", brandNameRenderer, <BrandingWatermarkIcon color="primary" />, (_) => "/brand-name");
