import type { SectionModel } from "@features/section/model/section.model";
import { mapper } from "@core/mapper/auto-mapper";

mapper.register<SectionModel>({
  name: "Section",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel: () => ({
    id: 0,
    leaderId: null,
    leaderName: null,
    name: "",
    code: "",
    color: "",
    customFields: null,
    processIds: null,
    processNames: null,
    description: "",
    active: true,
  }),
});
