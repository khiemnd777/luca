import { mapper } from "@root/core/mapper/auto-mapper";
import type { ClinicModel } from "@features/clinic/model/clinic.model";

mapper.register<ClinicModel>({
  name: "Clinic",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    name: "",
    address: "",
    phoneNumber: "",
    active: true,
    brief: "",
    logo: "",
    dentistIds: null,
    patientIds: null,
    customFields: null,
  }),
});
