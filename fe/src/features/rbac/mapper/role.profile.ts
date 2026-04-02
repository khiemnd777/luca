import { mapper } from "@core/mapper/auto-mapper";
import type { RoleModel } from "@features/rbac/model/role.model";

mapper.register<RoleModel>({
  name: "Role",
  dtoToModelNaming: "snake_to_camel",
  modelToDtoNaming: "camel_to_snake",
  defaultModel() {
    return { id: 0, roleName: "", displayName: "", brief: "" }
  },
});
