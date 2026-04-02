import type { ModuleDescriptor } from "@core/module/types";
import { registerModule } from "@core/module/registry";
import FactCheckIcon from '@mui/icons-material/FactCheck';
import OneColumnPage from "@root/core/pages/one-column-page";

const mod: ModuleDescriptor = {
  id: "process",
  routes: [
    {
      key: "process",
      permissions: ["process.view"],
      label: "Công đoạn",
      title: "Công đoạn",
      path: "/process",
      icon: <FactCheckIcon />,
      element: <OneColumnPage />,
      priority: 94,
    },
  ],
};

registerModule(mod);
