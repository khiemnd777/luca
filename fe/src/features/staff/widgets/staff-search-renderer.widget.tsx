import { Box, Chip } from "@mui/material";
import { registerSearchRenderer, type SearchRenderer } from "@core/search";
import SearchItem from "@root/core/search/search-item";
import { Badge } from "@shared/components/ui/badge";
import BadgeIcon from '@mui/icons-material/Badge';

const StaffSearchRenderer: SearchRenderer = (o, { highlight }) => (
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
    right={<Badge badge={{ avatar: o.attributes?.["avatar"] }} />}
  />
);

registerSearchRenderer("staff",
  "Nhân sự",
  StaffSearchRenderer,
  <BadgeIcon color="primary" />,
  (i) => `/staff/${i.entityId}`
);
