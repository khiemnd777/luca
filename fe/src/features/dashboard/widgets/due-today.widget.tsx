import { useDueToday } from "@features/dashboard/api/dashboard.api";
import type { DueTodayItem } from "@features/dashboard/model/dashboard.model";
import { registerSlot } from "@root/core/module/registry";
import { DueTodayCard } from "../components/due-today-card";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { useEffect } from "react";
import { invalidate } from "@root/core/hooks/use-async";
import { registerWS } from "@root/core/network/websocket/ws-widgets";

const mockDueToday: DueTodayItem[] = [
  {
    id: 0,
    code: "–",
    dentist: "",
    patient: "",
    deliveryAt: "",
    ageDays: 0,
    dueType: "today",
    priority: "–",
    status: "received",
    deliveryStatus: "pending",
  },
];

function DueTodayWidget() {
  const { data: dueTodayData } = useDueToday();
  const dueToday = dueTodayData && dueTodayData.length > 0 ? dueTodayData : mockDueToday;
  return (
    <DueTodayCard items={dueToday} />
  );
}

registerSlot({
  id: "dashboard-due-today",
  name: "dashboard:line2",
  render: () => <DueTodayWidget />,
  priority: 1,
});

// registerSlot({
//   id: "order-due-today",
//   name: "order:top",
//   render: () => <DueTodayWidget />,
//   priority: 98,
// });

// WS
function DueTodayWSWidget() {
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === "dashboard:due_today") {
      invalidate("dashboard:due-today");
    }
  }, [lastMessage]);

  return null;
}

registerWS(<DueTodayWSWidget />);