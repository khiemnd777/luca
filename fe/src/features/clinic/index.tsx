import type { ModuleDescriptor } from "@core/module/types";
import { registerModule } from "@core/module/registry";
import EmergencyIcon from '@mui/icons-material/Emergency';
import ContactEmergencyIcon from '@mui/icons-material/ContactEmergency';
import OneColumnPage from "@root/core/pages/one-column-page";

const mod: ModuleDescriptor = {
  id: "clinic",
  routes: [
    {
      key: "clinic",
      permissions: ["clinic.view"],
      element: <OneColumnPage />,
      label: "Nha khoa",
      title: "Nha khoa",
      subtitle: "Cơ sở y tế chuyên khám, chẩn đoán và điều trị các vấn đề về răng, nướu và khoang miệng.",
      path: "/clinic",
      icon: <EmergencyIcon />,
      priority: 94,
      children: [
        {
          key: "dentist",
          permissions: ["clinic.view"],
          label: "Nha sĩ",
          title: "Nha sĩ",
          subtitle: "Bác sĩ chuyên ngành răng hàm mặt, thực hiện việc khám, tư vấn và điều trị các bệnh lý răng miệng cho bệnh nhân.",
          path: "/dentist",
          icon: <ContactEmergencyIcon />,
          priority: 2,
        },
        {
          key: "patient",
          permissions: ["clinic.view"],
          label: "Bệnh nhân",
          title: "Bệnh nhân",
          path: "/patient",
          priority: 1,
        },
      ]
    },
  ],
};

registerModule(mod);
