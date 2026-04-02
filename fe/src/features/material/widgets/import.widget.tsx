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
  id: "import-material",
  name: "_material:actions",
  priority: 2,
  render: () => <ImportWidget />,
});
