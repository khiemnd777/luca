import type { ModuleDescriptor } from "@core/module/types";
import { registerModule } from "@core/module/registry";
import OneColumnPage from "@root/core/pages/one-column-page";
import ChecklistIcon from '@mui/icons-material/Checklist';
import RepeatOnIcon from '@mui/icons-material/RepeatOn';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';

const mod: ModuleDescriptor = {
  id: "order",
  routes: [
    {
      key: "order",
      permissions: ["order.view"],
      element: <OneColumnPage />,
      label: "Đơn hàng",
      title: "Đơn hàng",
      path: "/order",
      icon: <ChecklistIcon />,
      priority: 99,
      children: [
        {
          hidden: true,
          key: "order-detail",
          permissions: ["order.view", "order.edit"],
          label: "Chi tiết đơn hàng",
          title: "Chi tiết đơn hàng",
          path: "/order/:orderId",
          icon: <ChecklistIcon />,
          priority: 99,
        },
        {
          hidden: true,
          key: "order-detail-historical",
          permissions: ["order.view", "order.edit"],
          label: "Chi tiết đơn hàng",
          title: "Chi tiết đơn hàng",
          path: "/order/:orderId/historical/:orderItemId",
          icon: <ChecklistIcon />,
          priority: 99,
        },
        // {
        //   hidden: true,
        //   key: "order-process-check-code",
        //   permissions: ["order.view", "order.edit"],
        //   label: "Check in / Check out",
        //   title: "Check in / Check out",
        //   element: <OneColumnPage />,
        //   path: "/order/check",
        //   icon: <ChecklistIcon />,
        //   priority: 99,
        // },
        // {
        //   hidden: true,
        //   key: "order-inprogress",
        //   permissions: ["order.view", "order.edit"],
        //   label: "Công đoạn gia công",
        //   title: "Công đoạn gia công",
        //   path: "/order/:orderId/historical/:orderItemId/process/in-progresses",
        //   icon: <ChecklistIcon />,
        //   priority: 99,
        // }
      ],
    },
    {
      key: "order-process-check-code",
      permissions: ["order.development"],
      label: "Gia công",
      title: "Gia công",
      path: "/check-code",
      icon: <RepeatOnIcon />,
      priority: 96,
    },
    {
      key: "order-inprogress",
      permissions: ["order.development"],
      label: "Tiến trình",
      title: "Tiến trình",
      path: "/in-progresses",
      icon: <EventRepeatIcon />,
      priority: 96,
      children:[
        {
          hidden: true,
          key: "order-inprogress-detail",
          permissions: ["order.development"],
          label: "Công đoạn gia công",
          title: "Công đoạn gia công",
          path: "/in-progresses/:orderId/:orderItemId",
          icon: <ChecklistIcon />,
          priority: 99,
        }
      ]
    }
    // {
    //   key: "order-process",
    //   permissions: ["order.view"],
    //   element: <OneColumnPage />,
    //   label: "Gia công",
    //   title: "Gia công",
    //   path: "/order/processing",
    //   icon: <DeveloperBoardIcon />,
    //   priority: 96,
    // }
  ],
};

registerModule(mod);
