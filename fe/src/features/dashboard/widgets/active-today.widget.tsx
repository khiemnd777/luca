/* eslint-disable react-refresh/only-export-components */
import { useActiveToday } from "@features/dashboard/api/dashboard.api";
import { useDashboardContext } from "@features/dashboard/context/dashboard-context";
import type { ActiveTodayItem } from "@features/dashboard/model/dashboard.model";
import { registerSlot } from "@root/core/module/registry";
import { ActiveTodayCard } from "../components/active-today-card";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { useEffect } from "react";
import { invalidate } from "@root/core/hooks/use-async";
import { registerWS } from "@root/core/network/websocket/ws-widgets";

export const mockActiveToday: ActiveTodayItem[] = [
  {
    id: 0,
    code: "",
    dentist: "",
    patient: "",
    deliveryAt: "",
    createdAt: "",
    ageDays: -1,
    priority: "high",
    status: "received",
  },
];


function ActiveTodayWidget() {
  const { departmentId, cacheNamespace } = useDashboardContext();
  const { data: activeTodayData } = useActiveToday({ departmentId, cacheNamespace });
  const activeToday = activeTodayData && activeTodayData.length > 0 ? activeTodayData : mockActiveToday;
  return (
    <ActiveTodayCard items={activeToday} />
  );
}

registerSlot({
  id: "dashboard-active-today",
  name: "dashboard:line2",
  render: () => <ActiveTodayWidget />,
  priority: 1,
});

// registerSlot({
//   id: "dashboard-active-today",
//   name: "order:top",
//   render: () => <ActiveTodayWidget />,
//   priority: 1,
// });

// WS
function ActiveTodayWSWidget() {
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === "dashboard:active_today") {
      invalidate("dashboard:active-today");
    }
  }, [lastMessage]);

  return null;
}

registerWS(<ActiveTodayWSWidget />);
