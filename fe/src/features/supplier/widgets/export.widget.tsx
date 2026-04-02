import { SafeButton } from "@shared/components/button/safe-button";
import { registerSlot } from "@core/module/registry";
import FileUploadIcon from '@mui/icons-material/FileUpload';

function ExportWidget() {
  return (
    <>
      <SafeButton variant="contained" color="info" startIcon={<FileUploadIcon />}>
        Export Excel
      </SafeButton>
    </>
  );
}

registerSlot({
  id: "export-supplier",
  name: "_supplier:actions",
  priority: 1,
  render: () => <ExportWidget />,
});
