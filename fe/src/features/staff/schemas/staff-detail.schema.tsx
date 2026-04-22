import { registerForm } from "@core/form/form-registry";
import { buildStaffSchemaShared } from "./staff.schema.shared";

export function buildStaffDetailSchema() {
  return buildStaffSchemaShared({ withPassword: true, passwordRequired: true });
}

registerForm("staff-detail", buildStaffDetailSchema);
