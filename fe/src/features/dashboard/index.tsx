import React from "react";
import type { ModuleDescriptor } from "@root/core/module/types";
import { registerModule } from "@root/core/module/registry";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";

const DashboardPage = React.lazy(() => import("@features/dashboard/presentation/pages/dashboard-page"));
const SamplePage = React.lazy(() => import("@features/dashboard/presentation/pages/sample-page"));
const SampleCreatableStatusBoardPage = React.lazy(() => import("@features/dashboard/presentation/pages/sample-status-board"));
const SampleTablePage = React.lazy(() => import("@features/dashboard/presentation/pages/sample-table-page"));

const mod: ModuleDescriptor = {
  id: "dashboard",
  routes: [
    {
      key: "dashboard",
      label: "Dashboard",
      title: "Dashboard",
      path: "/",
      element: <DashboardPage />,
      icon: <LeaderboardIcon />,
      priority: 100,
      children: [
        {
          hidden: true,
          key: "sample",
          title: "Sample",
          path: "/sample",
          element: <SamplePage />,
        },
        {
          hidden: true,
          key: "status-board",
          title: "Creatable Status Board",
          path: "/status-board",
          element: <SampleCreatableStatusBoardPage />,
        },
        {
          hidden: true,
          key: "sampleTable",
          title: "Sample Table",
          path: "/sample-table",
          element: <SampleTablePage />,
        },
      ],
    },
  ],
};

registerModule(mod);
