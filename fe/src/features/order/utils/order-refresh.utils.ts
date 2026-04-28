import { reloadTable } from "@core/table/table-reload";

import { useOrderAdvancedSearchStore } from "./order-advanced-search.store";

export function refreshOrderResults() {
  reloadTable("orders");
  useOrderAdvancedSearchStore.getState().refreshResults();
}
