import { useAuthStore } from "@store/auth-store";
import { LogoutRounded } from "@mui/icons-material";
import { SafeButton } from "@shared/components/button/safe-button";
import { registerSlot } from "@core/module/registry";

function LogoutWidget() {
  const logout = useAuthStore((s) => s.logout);
  return (
    <>
      <SafeButton variant="contained" color="error" startIcon={<LogoutRounded />} onClick={async () => await logout()}>
        Đăng xuất
      </SafeButton>
    </>
  );
}

registerSlot({
  id: "logout",
  name: "auth:actions",
  priority: 2,
  render: () => <LogoutWidget />,
});
