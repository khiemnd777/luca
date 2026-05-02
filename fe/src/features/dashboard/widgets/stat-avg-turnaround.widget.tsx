import SpeedIcon from "@mui/icons-material/Speed";
import { StatCard } from "@features/dashboard/components/stat-card";
import { useAvgTurnaround } from "@features/dashboard/api/dashboard.api";
import { useDashboardContext } from "@features/dashboard/context/dashboard-context";
import type { SalesReportRange } from "@features/dashboard/model/dashboard.model";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { useEffect } from "react";
import { invalidate } from "@root/core/hooks/use-async";
import { registerWS } from "@root/core/network/websocket/ws-widgets";

type Props = {
  range: SalesReportRange;
};

export function AvgTurnaroundStatWidget({ range }: Props) {
  const { departmentId, cacheNamespace } = useDashboardContext();
  const { data } = useAvgTurnaround(range, { departmentId, cacheNamespace });

  return (
    <StatCard
      title="TB. Xong Một Đơn"
      value={data?.value ?? "––"}
      delta={data?.delta}
      caption={data?.caption}
      tone="success"
      icon={<SpeedIcon fontSize="small" />}
    />
  );
}

// WS
function AvgTurnaroundWSWidget() {
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === "dashboard:daily:turnaround:stats") {
      invalidate("dashboard:avg-turnaround");
    }
  }, [lastMessage]);

  return null;
}

registerWS(<AvgTurnaroundWSWidget />);
