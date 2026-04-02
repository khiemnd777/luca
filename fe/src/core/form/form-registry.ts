import type { FormSchema } from "@core/form/form.types";

type SchemaBuilder = () => FormSchema;

const registry = new Map<string, SchemaBuilder>();
const cache = new Map<string, FormSchema>();

export function registerForm(name: string, build: SchemaBuilder) {
  registry.set(name, build);
  cache.delete(name);
}

export function getFormSchema(name: string): FormSchema | null {
  const cached = cache.get(name);
  if (cached) return cached;

  const build = registry.get(name);
  if (!build) return null;

  const schema = build();
  cache.set(name, schema);
  return schema;
}
