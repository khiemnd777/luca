import type { ModuleDescriptor } from "@core/module/types";
import { registerModule } from "@core/module/registry";
import ClassIcon from '@mui/icons-material/Class';
import OneColumnPage from "@root/core/pages/one-column-page";
import BrandingWatermarkIcon from '@mui/icons-material/BrandingWatermark';
import ScienceIcon from '@mui/icons-material/Science';
import BuildIcon from '@mui/icons-material/Build';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

const mod: ModuleDescriptor = {
  id: "category",
  routes: [
    {
      key: "category",
      permissions: ["product.view"],
      element: <OneColumnPage />,
      label: "Danh mục",
      title: "Danh mục",
      path: "/category",
      icon: <ClassIcon />,
      priority: 98,
      children: [
        {
          key: "restoration_type",
          permissions: ["product.view"],
          element: <OneColumnPage />,
          label: "Kiểu phục hình",
          title: "Kiểu phục hình",
          path: "/restoration-type",
          icon: <AutoFixHighIcon />,
          priority: 95,
        },
        {
          key: "technique",
          permissions: ["product.view"],
          element: <OneColumnPage />,
          label: "Công nghệ",
          title: "Công nghệ",
          path: "/technique",
          icon: <BuildIcon />,
          priority: 96,
        },
        {
          key: "raw_material",
          permissions: ["product.view"],
          element: <OneColumnPage />,
          label: "Vật liệu",
          title: "Vật liệu",
          path: "/raw-material",
          icon: <ScienceIcon />,
          priority: 97,
        },
        {
          key: "brand_name",
          permissions: ["product.view"],
          element: <OneColumnPage />,
          label: "Thương hiệu",
          title: "Thương hiệu",
          path: "/brand-name",
          icon: <BrandingWatermarkIcon />,
          priority: 98,
        },
        {
          hidden: true,
          key: "category-detail",
          permissions: ["product.view"],
          element: <OneColumnPage />,
          label: "Chi tiết danh mục",
          title: "Chi tiết danh mục",
          path: "/category/:id",
          priority: 99,
        }
      ]
    },
  ],
};

registerModule(mod);
