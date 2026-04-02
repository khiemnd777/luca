import type { ModuleDescriptor } from "@root/core/module/types";
import { registerModule } from "@root/core/module/registry";
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';

const mod: ModuleDescriptor = {
  id: "search",
  routes: [
    {
      key: "search",
      label: "Tìm kiếm",
      title: "Tìm kiếm",
      path: "/search",
      icon: <SearchOutlinedIcon />,
      hidden: true,
      priority: 9999,
    },
  ],
};

registerModule(mod);
