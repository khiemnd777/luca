import { registerSlot } from "@root/core/module/registry";
import SearchIcon from "../components/search-icon.component";


function SearchToolbarWidget() {
  return (
    <>
      <SearchIcon />
    </>
  );
}

registerSlot({
  id: "search",
  name: "toolbar",
  render: () => <SearchToolbarWidget />,
  priority: 98,
});
