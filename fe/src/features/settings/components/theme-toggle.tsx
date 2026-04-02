import { Button, Tooltip } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import SettingsBrightnessRoundedIcon from "@mui/icons-material/SettingsBrightnessRounded";

export function ThemeToggle() {
  const { mode, setMode, systemMode } = useColorScheme();
  const effective = mode === "system" ? systemMode : mode; // light | dark

  const next =
    mode === "light" ? "dark" : mode === "dark" ? "system" : "light";

  const icon =
    effective === "dark" ? (
      <DarkModeRoundedIcon fontSize="small" />
    ) : effective === "light" ? (
      <LightModeRoundedIcon fontSize="small" />
    ) : (
      <SettingsBrightnessRoundedIcon fontSize="small" />
    );

  return (
    <Tooltip title={`Theme: ${mode}. Click to switch → ${next}`}>
      <Button
        size="small"
        variant="outlined"
        onClick={() => setMode(next as any)}
        startIcon={icon}
        sx={{ textTransform: "capitalize" }}
      >
        {mode}
      </Button>
    </Tooltip>
  );
}
