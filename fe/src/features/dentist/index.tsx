import type { ModuleDescriptor } from "@core/module/types";
import { registerModule } from "@core/module/registry";

const mod: ModuleDescriptor = {
  id: "dentist",
  // routes: [
  //   {
  //     key: "dentist",
  //     permissions: ["clinic.view"],
  //     label: "Nha sĩ",
  //     title: "Nha sĩ",
  //     subtitle: "Bác sĩ chuyên ngành răng hàm mặt, thực hiện việc khám, tư vấn và điều trị các bệnh lý răng miệng cho bệnh nhân.",
  //     path: "/dentist",
  //     icon: <ContactEmergencyIcon />,
  //     priority: 94,
  //   },
  // ],
};

registerModule(mod);
