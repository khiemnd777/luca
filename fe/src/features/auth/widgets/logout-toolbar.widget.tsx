import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { Box } from "@mui/material";
import { registerSlot } from "@root/core/module/registry";
import { useAuthStore } from "@store/auth-store";

export function LogoutToolbarWidget() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <Box
      onClick={async () => await logout()}
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <LogoutRoundedIcon />
    </Box>
  );
}

registerSlot({
  id: "logout-toolbar",
  name: "toolbar",
  render: () => <LogoutToolbarWidget />,
  priority: 96,
});
