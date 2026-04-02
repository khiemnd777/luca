import { mapper } from "@root/core/mapper/auto-mapper";
import type { PatientModel } from "@features/patient/model/patient.model";

mapper.register<PatientModel>({
  name: "Patient",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    name: "",
    phoneNumber: "",
    active: true,
    brief: "",
    clinicIds: [],
    createdAt: null,
    updatedAt: null,
  }),
});
