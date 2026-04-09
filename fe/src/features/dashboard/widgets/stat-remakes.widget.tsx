import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { StatCard } from "@features/dashboard/components/stat-card";
import { useAvgRemakeRate } from "@features/dashboard/api/dashboard.api";
import { useDashboardContext } from "@features/dashboard/context/dashboard-context";
import type { SalesReportRange } from "@features/dashboard/model/dashboard.model";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { useEffect } from "react";
import { invalidate } from "@root/core/hooks/use-async";
import { registerWS } from "@root/core/network/websocket/ws-widgets";

type Props = {
  range: SalesReportRange;
};

export function RemakesStatWidget({ range }: Props) {
  const { departmentId, cacheNamespace } = useDashboardContext();
  const { data } = useAvgRemakeRate(range, { departmentId, cacheNamespace });

  return (
    <StatCard
      title="Tỷ Lệ Làm Lại"
      value={data?.value ?? "––"}
      delta={data?.delta}
      caption={data?.caption}
      tone="warning"
      icon={<WarningAmberIcon fontSize="small" />}
    />
  );
}

// WS
function RemakeCasesWSWidget() {
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === "dashboard:daily:remake:stats") {
      invalidate("dashboard:avg-remake-rate");
    }
  }, [lastMessage]);

  return null;
}

registerWS(<RemakeCasesWSWidget />);
