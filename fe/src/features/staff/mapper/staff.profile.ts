import type { StaffModel } from "@features/staff/model/staff.model";
import { mapper } from "@core/mapper/auto-mapper";

mapper.register<StaffModel>({
  name: "Staff",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    departmentId: null,
    name: "",
    email: "",
    phone: "",
    avatar: "",
    qrCode: "",
    sectionIds: [],
    sectionNames: [],
    roleIds: [],
    active: false,
    customFields: null,
  }),
});
