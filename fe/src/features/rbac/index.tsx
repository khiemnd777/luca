import type { ModuleDescriptor } from "@root/core/module/types";
import { registerModule } from "@root/core/module/registry";
import KeyIcon from '@mui/icons-material/Key';
import OneColumnPage from "@root/core/pages/one-column-page";

const mod: ModuleDescriptor = {
  id: "rbac",
  routes: [
    {
      key: "rbac",
      permissions: ["rbac.manage"],
      label: "Quyền hạn",
      title:"Quyền hạn",
      subtitle:"Quản lý vai trò và phân quyền.",
      path: "/rbac",
      element: <OneColumnPage />,
      icon: <KeyIcon />,
      priority: 1,
    },
  ],
};

registerModule(mod);
