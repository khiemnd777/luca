import * as React from "react";
import { Button, Stack } from "@mui/material";
import { SectionCard } from "@root/shared/components/ui/section-card";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { openFormDialog } from "@core/form/form-dialog.service";
import { AutoTable } from "@core/table/auto-table";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { UploadDialog } from "@root/shared/components/dialog/upload-dialog";
import toast from "react-hot-toast";
import { importExcel } from "@features/technique/api/technique.api";
import { reloadTable } from "@core/table/table-reload";

function TechniqueWidget() {
  const [openUpload, setOpenUpload] = React.useState(false);

  const handleUpload = async (files: File[]) => {
    try {
      for (const file of files) {
        const res = await importExcel(file);
        reloadTable("techniques");
        toast.success(`Import ${res.totalRows} dòng. Thêm ${res.added}. Bỏ qua ${res.skipped}.`);
        if (res.errors?.length) {
          toast.error(`Có lỗi: ${res.errors[0]}`);
        }
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Import thất bại";
      toast.error(message);
    }
  };

  return (
    <>
      <SectionCard extra={
        <>
          <Stack direction="row" spacing={1}>
            <IfPermission permissions={["product.create"]}>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
                openFormDialog("technique");
              }} >Thêm kỹ thuật</Button>
            </IfPermission>
            <IfPermission permissions={["product.create"]}>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => setOpenUpload(true)}
              >
                Import Excel
              </Button>
            </IfPermission>
          </Stack>
        </>
      }>
        <IfPermission permissions={["product.create"]}>
          <UploadDialog
            open={openUpload}
            onClose={() => setOpenUpload(false)}
            title="Import kỹ thuật"
            accept=".xlsx,.xls"
            onUpload={handleUpload}
            uploadLabel="Import Excel"
            uploadingLabel="Đang import..."
            addLabel="Thêm file"
            cancelLabel="Hủy"
            emptyText="Chưa có file Excel nào"
            clearOnUpload
          />
        </IfPermission>
        <AutoTable name="techniques" />
      </SectionCard>
    </>
  );
}

registerSlot({
  id: "technique",
  name: "technique:left",
  render: () => <TechniqueWidget />,
});
