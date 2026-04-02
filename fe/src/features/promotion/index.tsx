import type { ModuleDescriptor } from "@core/module/types";
import { registerModule } from "@core/module/registry";
import OneColumnPage from "@root/core/pages/one-column-page";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";

const mod: ModuleDescriptor = {
  id: "promotion",
  routes: [
    {
      key: "promotion",
      permissions: ["promotion.view"],
      element: <OneColumnPage />,
      label: "Khuyến mãi",
      title: "Khuyến mãi",
      path: "/promotion",
      icon: <LocalOfferIcon />,
      priority: 95,
      children: [
        {
          hidden: true,
          key: "promotion-detail",
          permissions: ["promotion.view", "promotion.update"],
          element: <OneColumnPage />,
          label: "Chi tiết khuyến mãi",
          title: "Chi tiết khuyến mãi",
          path: "/promotion/:id",
          priority: 99,
        },
      ],
    },
  ],
};

registerModule(mod);
