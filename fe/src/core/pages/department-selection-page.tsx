import * as React from "react";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import {
  Alert,
  Box,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { hasUsableAccessToken } from "@core/network/auth-session";
import { useAuthStore } from "@store/auth-store";

export default function DepartmentSelectionPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const redirect = search.get("redirect") ?? "/";
  const selection = useAuthStore((state) => state.pendingDepartmentSelection);
  const selectDepartment = useAuthStore((state) => state.selectDepartment);
  const clearDepartmentSelection = useAuthStore((state) => state.clearDepartmentSelection);
  const [selectedId, setSelectedId] = React.useState<number | null>(
    selection?.departments?.[0]?.id ?? null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (selection?.selectionToken) return;

    if (hasUsableAccessToken()) {
      navigate(redirect, { replace: true });
      return;
    }

    navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
  }, [navigate, redirect, selection?.selectionToken]);

  React.useEffect(() => {
    setSelectedId((current) => current ?? selection?.departments?.[0]?.id ?? null);
  }, [selection?.departments]);

  const handleContinue = async () => {
    if (!selectedId || loading) return;
    setError(null);
    setLoading(true);
    try {
      await selectDepartment(selectedId);
      navigate(redirect, { replace: true });
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message ?? err.message
        : err instanceof Error
          ? err.message
          : "Department selection failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    clearDepartmentSelection();
    navigate(`/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="background.default" sx={{ p: 2 }}>
      <Paper elevation={3} sx={{ p: 4, width: "100%", maxWidth: 480 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h5" fontWeight={600}>
              Chọn chi nhánh làm việc
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Tài khoản của bạn thuộc nhiều chi nhánh.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" variant="filled">
              {error}
            </Alert>
          )}

          <List disablePadding sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
            {(selection?.departments ?? []).map((department) => {
              const selected = selectedId === department.id;
              return (
                <ListItemButton
                  key={department.id}
                  selected={selected}
                  onClick={() => setSelectedId(department.id)}
                  sx={{ borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 } }}
                >
                  <ListItemIcon>
                    {selected ? (
                      <CheckCircleOutlineOutlinedIcon color="primary" />
                    ) : (
                      <BusinessOutlinedIcon color="action" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={department.name}
                    secondary={department.address || department.email || "Không có thông tin địa chỉ"}
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                </ListItemButton>
              );
            })}
          </List>

          <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1.5} justifyContent="flex-end">
            <Button variant="text" onClick={handleBackToLogin} disabled={loading}>
              Quay lại đăng nhập
            </Button>
            <Button variant="contained" onClick={handleContinue} disabled={!selectedId || loading}>
              {loading ? "Đang vào..." : "Tiếp tục"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
