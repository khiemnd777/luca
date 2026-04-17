import type { ModuleDescriptor } from "@core/module/types";
import { registerModule } from "@core/module/registry";
import OneColumnPage from "@root/core/pages/one-column-page";
import CategoryIcon from '@mui/icons-material/Category';
// import LocalShippingIcon from '@mui/icons-material/LocalShipping';

const mod: ModuleDescriptor = {
  id: "material",
  routes: [
    {
      key: "material",
      permissions: ["material.view"],
      element: <OneColumnPage />,
      label: "Vật tư",
      title: "Vật tư",
      path: "/material",
      icon: <CategoryIcon />,
      priority: 97,
      children: [
        {
          hidden: true,
          key: "material-detail",
          permissions: ["material.view"],
          element: <OneColumnPage />,
          path: "/material/:id",
          priority: 98,
        },
      ],
      // children: [
      //   {
      //     key: "supplier",
      //     permissions: ["supplier.view"],
      //     element: <OneColumnPage />,
      //     label: "Nhà cung cấp",
      //     title: "Nhà cung cấp",
      //     path: "/supplier",
      //     icon: <LocalShippingIcon />,
      //     priority: 94,
      //   }
      // ]
    },
  ],
};

registerModule(mod);
