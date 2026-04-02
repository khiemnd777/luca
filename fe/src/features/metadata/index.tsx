import type { ModuleDescriptor } from "@root/core/module/types";
import { registerModule } from "@root/core/module/registry";
import OneColumnPage from "@root/core/pages/one-column-page";
import DataObjectIcon from '@mui/icons-material/DataObject';
import ImportExportIcon from '@mui/icons-material/ImportExport';

const mod: ModuleDescriptor = {
  id: "metadata",
  routes: [
    {
      key: "metadata-collections",
      permissions: ["privilege.metadata"],
      label: "Metadata",
      title: "Metadata",
      path: "/metadata",
      element: <OneColumnPage />,
      icon: <DataObjectIcon />,
      priority: 1,
      children: [
        {
          hidden: true,
          key: "metadata-fields",
          permissions: ["privilege.metadata"],
          title: "Collection & Fields",
          path: "/metadata/collection/:id",
          element: <OneColumnPage />,
          icon: <DataObjectIcon />,
          priority: 1,
        },
        {
          key: "import-profiles",
          permissions: ["privilege.metadata"],
          title: "Import Profiles",
          label: "Import mapping",
          path: "/import-profiles/",
          element: <OneColumnPage />,
          icon: <ImportExportIcon />,
          priority: 2,
          children: [
            {
              hidden: true,
              key: "import-mapping",
              permissions: ["privilege.metadata"],
              title: "Import Mapping",
              path: "/import-profiles/mapping/:id",
              element: <OneColumnPage />,
              icon: <ImportExportIcon />,
              priority: 1,
            }
          ]
        }
      ],
    },
  ],
};

registerModule(mod);
