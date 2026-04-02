import { Box, Typography, Button } from "@mui/material";
import { useAuthStore } from "@root/store/auth-store";
import { Link as RouterLink } from "react-router-dom";

export default function ForbiddenPage() {
  const logout = useAuthStore((s) => s.logout);
  return (
    <Box
      minHeight="100vh"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={2}
    >
      <Typography variant="h3" fontWeight={600} color="error.main">
        403
      </Typography>
      <Typography variant="h6">
        Không có quyền truy cập vào trang này.
      </Typography>
      <Button component={RouterLink} to="/" variant="outlined">
        Trở về trang chủ
      </Button>
      <Button
        variant="contained"
        color="error"
        onClick={logout}
      >
        Đăng xuất
      </Button>
    </Box>
  );
}
