import { SafeButton } from "@shared/components/button/safe-button";
import { registerSlot } from "@core/module/registry";
import FileDownloadIcon from '@mui/icons-material/FileDownload';

function ImportWidget() {
  return (
    <>
      <SafeButton variant="contained" color="info" startIcon={<FileDownloadIcon />}>
        Import Excel
      </SafeButton>
    </>
  );
}

registerSlot({
  id: "import-supplier",
  name: "_supplier:actions",
  priority: 2,
  render: () => <ImportWidget />,
});
