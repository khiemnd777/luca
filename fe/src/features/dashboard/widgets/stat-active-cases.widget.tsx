import PendingActionsIcon from "@mui/icons-material/PendingActions";
import { StatCard } from "@features/dashboard/components/stat-card";
import { useActiveCasesToday } from "@features/dashboard/api/dashboard.api";
import { useDashboardContext } from "@features/dashboard/context/dashboard-context";
import type { SalesReportRange } from "@features/dashboard/model/dashboard.model";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { useEffect } from "react";
import { invalidate } from "@root/core/hooks/use-async";
import { registerWS } from "@root/core/network/websocket/ws-widgets";

type Props = {
  range: SalesReportRange;
};

export function ActiveCasesStatWidget({ range }: Props) {
  const { departmentId, cacheNamespace } = useDashboardContext();
  const { data } = useActiveCasesToday(range, { departmentId, cacheNamespace });

  return (
    <StatCard
      title="Đơn Đang Làm"
      value={data?.value ?? "––"}
      delta={data?.delta}
      tone="success"
      icon={<PendingActionsIcon fontSize="small" />}
    />
  );
}

// WS
function ActiveCasesWSWidget() {
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === "dashboard:daily:active:stats") {
      invalidate("dashboard:active-cases-today");
    }
  }, [lastMessage]);

  return null;
}

registerWS(<ActiveCasesWSWidget />);
