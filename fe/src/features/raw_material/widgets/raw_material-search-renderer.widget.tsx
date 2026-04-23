import { Box, Chip } from "@mui/material";
import { registerSearchRenderer } from "@core/search";
import type { SearchModel } from "@core/search/search.model";
import SearchItem from "@root/core/search/search-item";
import ScienceIcon from '@mui/icons-material/Science';

function buildSubtitle(option: SearchModel) {
  const code = String(option.attributes?.["code"] ?? "").trim();
  const subtitle = option.subtitle?.trim() ?? "";
  const keywords = (option.keywords ?? "")
    .split("|")
    .map((kw) => kw.trim())
    .filter((kw) => kw.length > 0 && kw !== code);

  return { code, subtitle, keywords };
}

registerSearchRenderer("raw_material", "Nguyên liệu",
  (o, { highlight }) => {
    const { code, subtitle, keywords } = buildSubtitle(o);

    return (
      <SearchItem
        title={highlight(o.title)}
        subtitle={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {code ? <Chip size="small" label={highlight(code)} /> : null}
            {subtitle ? <span>{highlight(subtitle)}</span> : null}
            {keywords.map((kw) => <Chip key={kw} size="small" label={highlight(kw)} />)}
          </Box>
        }
      />
    );
  },
  <ScienceIcon color="primary" />,
  (_) => "/raw-material",
);
