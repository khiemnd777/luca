import * as React from "react";
import { Button, Stack } from "@mui/material";
import { SectionCard } from "@root/shared/components/ui/section-card";
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { openFormDialog } from "@core/form/form-dialog.service";
import { AutoTable } from "@core/table/auto-table";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { importExcel } from "@features/category/api/category.api";
import toast from "react-hot-toast";
import { reloadTable } from "@core/table/table-reload";
import { UploadDialog } from "@root/shared/components/dialog/upload-dialog";

function CategoryWidget() {
  const [openUpload, setOpenUpload] = React.useState(false);

  const handleUpload = async (files: File[]) => {
    try {
      for (const file of files) {
        const res = await importExcel(file);
        reloadTable("categories");
        toast.success(
          `Import ${res.totalRows} dòng. Thêm: LV1 ${res.addedLV1}, LV2 ${res.addedLV2}, LV3 ${res.addedLV3}. Bỏ qua ${res.skipped}.`,
        );
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
                openFormDialog("category", {
                  maxWidth: "lg",
                });
              }} >Thêm Danh mục</Button>
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
            title="Import danh mục"
            accept=".xlsx,.xls"
            multiple={false}
            onUpload={handleUpload}
            uploadLabel="Import Excel"
            uploadingLabel="Đang import..."
            addLabel="Thêm file"
            cancelLabel="Hủy"
            emptyText="Chưa có file Excel nào"
            clearOnUpload
          />
        </IfPermission>
        <AutoTable name="categories" />
      </SectionCard>
    </>
  );
}

registerSlot({
  id: "category",
  name: "category:left",
  render: () => <CategoryWidget />,
})
