import type { ModuleDescriptor } from "@root/core/module/types";
import { registerModule } from "@root/core/module/registry";
import BadgeIcon from '@mui/icons-material/Badge';
import OneColumnPage from "@root/core/pages/one-column-page";

const mod: ModuleDescriptor = {
  id: "staff",
  routes: [
    {
      key: "staff",
      permissions: ["staff.view"],
      label: "Nhân sự",
      title: "Nhân sự",
      subtitle: "Quản lý nhân sự",
      path: "/staff",
      element: <OneColumnPage />,
      icon: <BadgeIcon />,
      priority: 94,
      children: [
        {
          hidden: true,
          key: "staff-detail",
          permissions: ["staff.view", "staff.update"],
          label: "Chi tiết nhân sự",
          title: "Chi tiết Nhân sự",
          subtitle: "Thay đổi thông tin, mật khẩu, và theo dõi tiến độ gia công.",
          path: "/staff/:staffId",
          icon: <BadgeIcon />,
          element: <OneColumnPage />,
          priority: 99,
        },
      ],
    },
  ],
};

registerModule(mod);