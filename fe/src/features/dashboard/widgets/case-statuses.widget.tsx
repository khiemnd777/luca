import { useCaseStatuses } from "@features/dashboard/api/dashboard.api";
import { registerSlot } from "@root/core/module/registry";
import { CaseStatusCard } from "../components/case-status-card";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { useEffect } from "react";
import { invalidate } from "@root/core/hooks/use-async";
import { registerWS } from "@root/core/network/websocket/ws-widgets";

function CaseStatusesWidget() {
  const { data } = useCaseStatuses();
  const items = data ?? [];
  return <CaseStatusCard items={items} />;
}

registerSlot({
  id: "dashboard-case-statuses",
  name: "dashboard:line3",
  render: () => <CaseStatusesWidget />,
  priority: 99,
});

// WS
function CaseStatusesWSWidget() {
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === "dashboard:statuses") {
      invalidate("dashboard:case-statuses");
    }
  }, [lastMessage]);

  return null;
}

registerWS(<CaseStatusesWSWidget />);