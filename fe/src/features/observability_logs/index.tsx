import type { ModuleDescriptor } from "@core/module/types";
import { registerModule } from "@core/module/registry";
import TerminalRoundedIcon from "@mui/icons-material/TerminalRounded";
import SystemLogsPage from "@features/observability_logs/pages/system-logs-page";

const mod: ModuleDescriptor = {
  id: "observability_logs",
  routes: [
    {
      key: "system-logs",
      permissions: ["system_log.read"],
      label: "System Logs",
      title: "System Logs",
      subtitle: "Tra cứu logs vận hành và lỗi hệ thống",
      path: "/admin/system-logs",
      element: <SystemLogsPage />,
      icon: <TerminalRoundedIcon />,
      priority: -1,
    },
  ],
};

registerModule(mod);
