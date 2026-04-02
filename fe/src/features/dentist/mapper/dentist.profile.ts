import { mapper } from "@root/core/mapper/auto-mapper";
import type { DentistModel } from "@features/dentist/model/dentist.model";

mapper.register<DentistModel>({
  name: "Dentist",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    name: "",
    phoneNumber: "",
    active: true,
    brief: "",
    clinicIds: [],
  }),
});
