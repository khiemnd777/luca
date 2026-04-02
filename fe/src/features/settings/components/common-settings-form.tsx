import { ThemeToggle } from "@features/settings/components/theme-toggle";
import { Typography } from "@mui/material";
import { AutoGrid } from "@root/shared/components/ui/auto-grid";

export default function SettingsForm() {
  return (
    <>
      <AutoGrid scheme="equal">
        <Typography fontWeight={500}>Hiển thị:</Typography>
        <ThemeToggle />
      </AutoGrid>
    </>
  );
}
