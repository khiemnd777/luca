# Usage

## Agent Note

Before changing form submit shape, inspect these files together:

- `fe/src/core/form/auto-form.tsx`
- `fe/src/core/form/auto-form-package.tsx`
- current schema `submit.run(...)` consumers

## Submit Pipeline Contract

Authoritative runtime flow:

`useAutoForm` field state -> `packageData(metadataBlocks, values)` -> `hooks.mapToDto(packaged)` -> `btn.submit({ values: dto, ... })` -> `schema.afterSaved(result, ctx)`

Rules:

- `packageData(...)` always returns a packaged object with root `{ dto, collections }`.
- `hooks.mapToDto(packaged)` receives that packaged object as input.
- `submit.run(values)` and custom `submitButtons[].submit({ values })` receive the exact return value of `mapToDto`.
- If `mapToDto` is absent, submit handlers receive the packaged object from `packageData(...)`.
- `schema.afterSaved(result, ctx)` sees the same `ctx.values` that was passed to submit.
- `packageData(...)` is a framework detail. Once `mapToDto` runs, the final submit shape is whatever `mapToDto` returned.

Canonical cases:

1. Flat form, no metadata

```ts
useAutoForm values
// { name: "Alpha", active: true }

packageData(...)
// { dto: { name: "Alpha", active: true }, collections: [] }

// no mapToDto
submit.run(values)
// values === { dto: { name: "Alpha", active: true }, collections: [] }
```

2. Metadata/custom-fields packaging

```ts
useAutoForm values
// { name: "North Branch", "customFields.favoriteColor": "Blue" }

packageData(...)
// {
//   dto: {
//     name: "North Branch",
//     custom_fields: { favorite_color: "Blue" },
//   },
//   collections: ["department"],
// }

// no mapToDto
submit.run(values)
// values === packaged output above
```

3. `mapToDto` overrides submit shape

```ts
hooks: {
  mapToDto: mapPackagedDto((dto) => ({
    ...dto,
    slug: slugify(String(dto.name ?? "")),
  })),
}

submit.run(values)
// values === { name: "Alpha", slug: "alpha" }
```

Non-obvious boundaries:

- `submit.run(values)` does not automatically receive `{ dto, collections }` once `mapToDto` is present.
- If a schema reads `values.dto`, `mapToDto` must preserve that container shape.
- If a schema wants a flat DTO payload, `submit.run` must consume the flat shape directly and not access `values.dto`.
- Do not assume `camel_to_snake` handles numeric suffixes the way backend wire contracts expect. Example: `phoneNumber2` packages as `phone_number2`, not necessarily `phone_number_2`.
- Nested metadata blocks package under `dto.<prop>_upsert = { dto, collections }`; trace the real packaged object before flattening or remapping it.

Recommended patterns:

1. Packaged/container submit

```ts
import { expectSubmitDtoContainer } from "@core/form/submit-contract";

submit: {
  type: "fn",
  run: async (values) => {
    const { dto, collections } = expectSubmitDtoContainer(values);
    return api.save({ dto, collections });
  },
}
```

2. Flat DTO submit

```ts
import { mapPackagedDto } from "@core/form/submit-contract";

hooks: {
  mapToDto: mapPackagedDto((dto) => mapper.map("Common", dto, "model_to_dto")),
},
submit: {
  type: "fn",
  run: async (values) => api.save(values),
}
```

3. Flat DTO plus API-layer wire normalization

```ts
hooks: {
  mapToDto: mapPackagedDto((dto) => dto),
},
submit: {
  type: "fn",
  run: async (values) => api.update(buildDepartmentWirePayload(values)),
}
```

Safe defaults:

- Keep `mapToDto` focused on form-to-submit-shape transformation.
- Move backend-specific wire normalization into feature `api/*.ts` or a nearby feature utility when field naming is tricky.
- Add a contract test when changing `mapToDto` shape or when `submit.run` depends on `values.dto`.

Unsafe patterns:

- Changing `mapToDto` output shape without updating `submit.run`.
- Assuming `values.dto` always exists.
- Relying on generic naming mappers for numeric-suffixed fields without checking the serialized keys.
- Hiding transport-shape fixes inside widgets instead of the schema or API boundary.

- How to use `<AutoFormFields />`

```ts
import * as React from "react";
import { AutoFormFields } from "@core/form/auto-form-fields";
import { useAutoForm } from "@core/form/use-auto-form";
import type { FieldDef } from "@core/form/types";
import { FormDialog } from "@core/components/form-dialog";

const schema: FieldDef[] = [
  { name: "title", label: "Title", kind: "text", rules: { required: true, maxLength: 120 } },
  {
    name: "email",
    label: "Email",
    kind: "email",
    rules: { required: "Email is required" },
  },
  {
    name: "password",
    label: "Password",
    kind: "password",
    rules: { required: "Please enter password", minLength: 6, maxLength: 128 },
  },
  { name: "note", label: "Note", kind: "textarea", rows: 3 },
  {
    name: "category",
    label: "Category",
    kind: "select",
    rules: { required: "Please choose a category" },
    options: [
      { label: "Fruit", value: "fruit" },
      { label: "Vegetable", value: "vegetable" },
      { label: "Other", value: "other" },
    ],
  },
  {
    name: "tags",
    label: "Tags",
    kind: "multiselect",
    options: [
      { label: "Fruit", value: "fruit" },
      { label: "Vegetable", value: "veg" },
      { label: "Organic", value: "organic" },
    ],
    rules: { required: "Pick at least one" },
  },
  {
    name: "city",
    label: "City",
    kind: "autocomplete",
    freeSolo: true,
    loadOptions: async (q) => {
      // gọi API lấy danh sách city theo keyword q
      const data = await fetch(`/api/cities?q=${encodeURIComponent(q)}`).then(r => r.json());
      return data.map((c: any) => ({ label: c.name, value: c.id }));
    },
  },
  {
    name: "photos",
    label: "Upload photos",
    kind: "fileupload",
    accept: "image/*",
    maxFiles: 5,
    multipleFiles: true,
    uploader: async (files) => {
      // Tự viết upload → trả về mảng URL
      const urls: string[] = [];
      for (const f of files) {
        const url = await myUpload(f); // ví dụ S3/R2/your server
        urls.push(url);
      }
      return urls;
    },
    rules: { required: "At least one image" },
  },
  {
    name: "map_location",
    label: "Location",
    kind: "custom",
    render: ({ value, setValue, error }) => (
      <div>
        <MyMap value={value} onChange={setValue} />
        {error ? <p style={{ color: "red" }}>{error}</p> : null}
      </div>
    ),
    rules: { required: "Please drop a pin" },
  },
  {
    name: "role_name",
    label: "Role name",
    kind: "text",
    rules: {
      required: "Role name is required",
      minLength: 2,
      async: async (val) => {
        if (!val) return null;
        // Gọi API của bạn để kiểm tra trùng:
        // const ok = await api.rbac.checkRoleName(val);
        // if (!ok) return "Role name already exists";
        // Demo:
        await new Promise(r => setTimeout(r, 200));
        return val.toLowerCase() === "admin" ? "Role name already exists" : null;
      },
    },
    helperText: "Only letters, numbers, underscore, hyphen",
  },
  { name: "weight", label: "Weight (kg)", kind: "number", step: 0.1, rules: { min: 0, max: 999 } },
  { name: "start_at", label: "Start At", kind: "datetime" },
  { name: "theme_color", label: "Theme Color", kind: "color", defaultValue: "#8B1A1A" },
  { name: "budget", label: "Budget", kind: "currency", defaultValue: 2000000, rules: { min: 0 } },
  { name: "is_active", label: "Active", kind: "switch", defaultValue: true, rules: { required: "Must be ON" } },
  { name: "agree", label: "I agree to terms", kind: "checkbox", rules: { required: "You must agree" } },
];

export function ExampleDialog({ open, onClose, onSubmit }: any) {
  const { values, setValue, errors, validate, reset } = useAutoForm(schema);

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit(values);
    reset();
    onClose();
  };

  return (
    <FormDialog open={open} title="Example Form" onClose={() => { reset(); onClose(); }} onSubmit={handleSubmit}>
      <AutoFormFields schema={schema} values={values} setValue={setValue} errors={errors} />
    </FormDialog>
  );
}
```

- SearchSingle default input (example for a `code` field):

```ts
{
  name: "code",
  label: "Code",
  kind: "searchsingle",
  resolveDefaultInput: async () => {
    const code = await reserveOrderCode();
    return { inputValue: code, value: null };
  },
  search: async (kw) => fetch(`/api/codes?q=${encodeURIComponent(kw)}`).then(r => r.json()),
  getOptionLabel: (item) => item.label,
  getOptionValue: (item) => item.id,
}
```

- Validation

```ts
{
  kind: "searchsingle",
  name: "customerId",
  label: "Customer",
  search: ...,
  getOptionLabel: ...,
  getOptionValue: ...,
  validate: (input, matched) => {
    if (!input) return "Vui lòng nhập khách hàng";
    if (!matched) return "Vui lòng chọn từ danh sách";
    return null;
  },
  validateAsync: async (input, matched) => {
    // optional async check
    return null;
  },
  validateOn: ["blur", "select"], // default if omitted
  onValidate: (msg) => {
    // optional side-effects
  },
}
```

- `validateFieldAsync` ở `onBlur`:

```tsx
const { values, validateAll } = useAutoForm(
  schema, 
  validateFieldAsync
);
// ...
<TextField
  // ...
  onBlur={() => validateFieldAsync("role_name")}
/>
```

- `validateFieldAsyncDebounced` mỗi lần `onChange`:

```ts
const { values, validateAll } = useAutoForm(
  schema, 
  setValue,
  validateFieldAsyncDebounced
);
// ...
onChange={(e) => {
  setValue("role_name", e.target.value);
  validateFieldAsyncDebounced("role_name");
}}
```

- Global async (validate nhiều field cùng lúc trên server)

```ts
const { values, validateAll } = useAutoForm(
  schema, 
  initial, 
  {
    asyncValidate: async (vals) => {
      // Gọi API validate form tổng
      // const result = await api.form.validate(vals);
      // return { fieldA: "msg...", fieldB: null, ... }
      return {}; // hợp lệ
  },
});
```

Khi submit:

```ts
const ok = await validateAll();
if (!ok) return;
// submit tiếp...
```
