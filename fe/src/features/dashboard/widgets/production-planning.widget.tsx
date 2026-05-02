/* eslint-disable react-refresh/only-export-components */
import { useEffect } from "react";
import { invalidate } from "@root/core/hooks/use-async";
import { useDebounce } from "@root/core/hooks/use-debounce";
import { registerSlot } from "@root/core/module/registry";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { registerWS } from "@root/core/network/websocket/ws-widgets";
import { useDashboardContext } from "@features/dashboard/context/dashboard-context";
import { useProductionPlanningOverview } from "@features/dashboard/api/dashboard.api";
import { ProductionPlanningOverviewCard } from "../components/production-planning-overview-card";

function ProductionPlanningWidget() {
  const { departmentId, cacheNamespace } = useDashboardContext();
  const { data, loading } = useProductionPlanningOverview({ departmentId, cacheNamespace });

  return <ProductionPlanningOverviewCard overview={data} loading={loading} />;
}

registerSlot({
  id: "dashboard-production-planning",
  name: "dashboard:top",
  render: () => <ProductionPlanningWidget />,
  priority: 0,
});

function ProductionPlanningWSWidget() {
  const { lastMessage } = useWebSocket();
  const invalidatePlanning = useDebounce(() => {
    invalidate("dashboard:production-planning");
  }, 1500);

  useEffect(() => {
    if (lastMessage?.type === "dashboard:production_planning") {
      invalidatePlanning();
    }
  }, [invalidatePlanning, lastMessage]);

  return null;
}

registerWS(<ProductionPlanningWSWidget />);
