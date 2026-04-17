import * as React from "react";
import { Button, Stack } from "@mui/material";
import { SectionCard } from "@root/shared/components/ui/section-card";
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { openFormDialog } from "@core/form/form-dialog.service";
import { AutoTable } from "@core/table/auto-table";
import { registerSlot } from "@root/core/module/registry";
import { IfPermission } from "@root/core/auth/if-permission";
import { UploadDialog } from "@root/shared/components/dialog/upload-dialog";
import toast from "react-hot-toast";
import { importExcel } from "@features/product/api/product.api";
import { reloadTable } from "@core/table/table-reload";
import { TabContainer } from "@root/shared/components/ui/tab-container";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { ProductInsightWidget } from "@features/product/widgets/product-insight.widget";

function SampleWidget() {
  const [openUpload, setOpenUpload] = React.useState(false);

  const handleUpload = async (files: File[]) => {
    try {
      for (const file of files) {
        const res = await importExcel(file);
        reloadTable("products");
        toast.success(
          `Import ${res.totalRows} dòng. Thêm ${res.added}, cập nhật ${res.updated}, bỏ qua ${res.skipped}.`,
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
    <TabContainer
      defaultValue="insight"
      tabSx={{ mb: 2, borderBottom: 0 }}
      contentSx={{ mt: 0 }}
      tabs={[
        {
          label: "Insight",
          icon: <InsightsOutlinedIcon />,
          value: "insight",
          content: <ProductInsightWidget />,
        },
        {
          label: "Danh sách products",
          icon: <Inventory2OutlinedIcon />,
          value: "products",
          content: (
            <SectionCard extra={
              <Stack direction="row" spacing={1}>
                <IfPermission permissions={["product.create"]}>
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={() => {
                    openFormDialog("product");
                  }} >Thêm Sản phẩm</Button>
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
            }>
              <IfPermission permissions={["product.create"]}>
                <UploadDialog
                  open={openUpload}
                  onClose={() => setOpenUpload(false)}
                  title="Import sản phẩm"
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
              <AutoTable name="products" />
            </SectionCard>
          ),
        },
      ]}
    />
  );
}

registerSlot({
  id: "product",
  name: "product:left",
  render: () => <SampleWidget />,
})
