import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import { StatCard } from "@features/dashboard/components/stat-card";
import { useCasesCompletedThisWeek } from "@features/dashboard/api/dashboard.api";
import type { SalesReportRange } from "@features/dashboard/model/dashboard.model";
import { useWebSocket } from "@root/core/network/websocket/use-web-socket";
import { useEffect } from "react";
import { invalidate } from "@root/core/hooks/use-async";
import { registerWS } from "@root/core/network/websocket/ws-widgets";

type Props = {
  range: SalesReportRange;
};

export function CasesCompletedStatWidget({ range }: Props) {
  const { data } = useCasesCompletedThisWeek(range);

  return (
    <StatCard
      title="Ca Hoàn Thành"
      value={data?.value ?? "––"}
      delta={data?.delta}
      tone="info"
      icon={<AssignmentTurnedInIcon fontSize="small" />}
    />
  );
}

// WS
function CompletedStatCasesWSWidget() {
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === "dashboard:daily:completed:stats") {
      invalidate("dashboard:cases-completed-week");
    }
  }, [lastMessage]);

  return null;
}

registerWS(<CompletedStatCasesWSWidget />);
