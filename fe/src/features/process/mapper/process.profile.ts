import { mapper } from "@root/core/mapper/auto-mapper";
import type { ProcessModel } from "@features/process/model/process.model";

mapper.register<ProcessModel>({
  name: "Process",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    code: "",
    name: "",
    sectionId: null,
    sectionName: null,
    active: true,
    customFields: null,
  }),
});
