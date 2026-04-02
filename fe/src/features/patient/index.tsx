import type { ModuleDescriptor } from "@core/module/types";
import { registerModule } from "@core/module/registry";

const mod: ModuleDescriptor = {
  id: "patient",
};

registerModule(mod);
