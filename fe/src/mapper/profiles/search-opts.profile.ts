import { mapper } from "@root/core/mapper/auto-mapper";

mapper.register({
  name: "SearchOpts",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
});