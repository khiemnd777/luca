import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { Box } from "@mui/material";
import { navigate } from "@root/core/navigation/navigate";

export default function SettingIcon() {
  return (
    <Box
      onClick={() => navigate("/settings")}
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <SettingsRoundedIcon />
    </Box>
  );
}
