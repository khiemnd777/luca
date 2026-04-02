import { type SearchRenderer } from "@core/search/search-renderer";
import SearchItem from "./search-item";

const DefaultRenderer: SearchRenderer = (o, { highlight }) => (
  <SearchItem
    title={highlight(o.title)}
    subtitle={o.subtitle ? highlight(o.subtitle) : null}
  />
);

export default DefaultRenderer;