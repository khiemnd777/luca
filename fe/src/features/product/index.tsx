import type { ModuleDescriptor } from "@core/module/types";
import { registerModule } from "@core/module/registry";
import InventoryIcon from '@mui/icons-material/Inventory';
import OneColumnPage from "@root/core/pages/one-column-page";

const mod: ModuleDescriptor = {
  id: "product",
  routes: [
    {
      key: "product",
      permissions: ["product.view"],
      element: <OneColumnPage />,
      label: "Sản phẩm",
      title: "Sản phẩm",
      path: "/product",
      icon: <InventoryIcon />,
      priority: 98,
      children: [
        {
          hidden: true,
          key: "product-detail",
          permissions: ["product.update"],
          element: <OneColumnPage />,
          path: "/product/:id",
          priority: 99,
        }
      ]
    },
  ],
};

registerModule(mod);
