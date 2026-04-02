import DefaultRenderer from "@core/search/default-renderer";
import { registerSearchRenderer } from "@core/search/search-renderer";
import MoreIcon from '@mui/icons-material/More';

registerSearchRenderer("__default__",
  "…",
  DefaultRenderer,
  <MoreIcon color="primary" />,
  (_) => "/"
);

export * from "@core/search/search-renderer";