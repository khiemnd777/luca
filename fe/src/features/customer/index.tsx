import type { ModuleDescriptor } from "@core/module/types";
import { registerModule } from "@core/module/registry";
import OneColumnPage from "@root/core/pages/one-column-page";
import ContactEmergencyIcon from '@mui/icons-material/ContactEmergency';

const mod: ModuleDescriptor = {
  id: "customer",
  routes: [
    {
      hidden: true,
      key: "customer",
      permissions: ["customer.view"],
      element: <OneColumnPage />,
      label: "Khách hàng",
      title: "Khách hàng",
      path: "/customer",
      icon: <ContactEmergencyIcon />,
      priority: 93,
      children: [
        {
          hidden: true,
          key: "customer-detail",
          permissions: ["customer.view", "customer.update"],
          element: <OneColumnPage />,
          title: "Chi tiết khách hàng",
          label: "Chi tiết khách hàng",
          path: "/customer/:customerId",
          icon: <ContactEmergencyIcon />,
          priority: 0,
        },
      ]
    },
  ],
};

registerModule(mod);
