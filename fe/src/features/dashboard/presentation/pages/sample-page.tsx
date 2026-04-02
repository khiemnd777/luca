import * as React from "react";
import { Button, Typography } from "@mui/material";
import { BasePage } from "@core/pages/base-page";
import { PageContainer } from "@shared/components/ui/page-container";
import { SectionCard } from "@shared/components/ui/section-card";
import { ResponsiveGrid } from "@shared/components/ui/responsive-grid";
import { Loading } from "@shared/components/ui/loading";
import { ConfirmDialog } from "@shared/components/dialog/confirm-dialog";
import { FormDialog } from "@root/core/form/form-dialog";
import { EmptyState } from "@shared/components/ui/empty-state";
import { AutoGrid } from "@root/shared/components/ui/auto-grid";
import type { FieldDef } from "@core/form/types";
import { useAutoForm } from "@core/form/use-auto-form";
import { Spacer } from "@root/shared/components/ui/spacer";
import { ActionToolbar } from "@root/shared/components/ui/action-toolbar";

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
    loadOptions: async (_) => {
      // gọi API lấy danh sách city theo keyword q
      return [{ label: "Georgia", value: "GA" }, { label: "Florida", value: "FL" }];
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
      console.log("Uploading files:", files);
      return ["https://api.dicebear.com/9.x/initials/svg?seed=User"];
    },
    rules: { required: "At least one image" },
  },
  // {
  //   name: "map_location",
  //   label: "Location",
  //   kind: "custom",
  //   render: ({ value, setValue: _, error }) => (
  //     <div>
  //       <p>{value}</p>
  //       {error ? <p style={{ color: "red" }}>{error}</p> : null}
  //     </div>
  //   ),
  //   rules: { required: "Please drop a pin" },
  // },
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
  { name: "budget", label: "Budget", kind: "currency", defaultValue: 2_000_000, rules: { min: 0 } },
  { name: "is_active", label: "Active", kind: "switch", defaultValue: true, rules: { required: "Must be ON" } },
  { name: "agree", label: "I agree to terms", kind: "checkbox", rules: { required: "You must agree" } },
];

export default function SamplePage() {
  const [openConfirm, setOpenConfirm] = React.useState(false);
  const [openForm, setOpenForm] = React.useState(false);
  const { validate: _, validateAll, reset } = useAutoForm(schema);

  return (
    <BasePage>
      <PageContainer>
        <ActionToolbar
          actions={
            <>
              <Button variant="outlined" onClick={() => setOpenConfirm(true)}>Delete</Button>
              <Button variant="contained" onClick={() => setOpenForm(true)}>New Role</Button>
            </>
          }
        />

        {/* Khu chính 8/4 */}
        <AutoGrid>
          <SectionCard title="Role List" extra={<Button size="small">Refresh</Button>}>
            <Loading text="Fetching data..." />
            <EmptyState title="No roles" description="Create the first role." actionText="New Role" onAction={() => setOpenForm(true)} />
          </SectionCard>
          <SectionCard title="Summary" dense>
            <Typography variant="body2" color="text.secondary">
              Quick stats or helper content.
            </Typography>
          </SectionCard>
        </AutoGrid>

        <Spacer />

        {/* Lưới card responsive */}
        <ResponsiveGrid>
          {[1, 2, 3, 4].map((i) => (
            <SectionCard key={i} title={`Widget #${i}`} dense>
              Some content for widget {i}.
            </SectionCard>
          ))}
        </ResponsiveGrid>
      </PageContainer>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={openConfirm}
        title="Delete role"
        content="This action cannot be undone."
        confirmText="Delete"
        onClose={() => setOpenConfirm(false)}
        onConfirm={() => setOpenConfirm(false)}
      />

      {/* Form dialog */}
      <FormDialog
        open={openForm}
        title="Example Form"
        onClose={() => {
          setOpenForm(false);
          reset();
        }}
        onSubmit={async () => {
          const ok = await validateAll();
          if (!ok) return;
          setOpenForm(false);
          reset();
        }}
      >
        {/* <AutoFormFields schema={schema} values={values} setValue={setValue} errors={errors} /> */}
      </FormDialog>
    </BasePage>
  );
}
