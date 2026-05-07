import * as React from "react";
import { Box, Button, Typography, Stack, TextField, Paper, Alert } from "@mui/material";
import { useAuthStore } from "@store/auth-store";
import { useNavigate, useSearchParams } from "react-router-dom";
import { hasUsableAccessToken } from "@core/network/auth-session";
import { EmailOrPhoneField } from "@shared/components/fields/email-or-phone-field";
import axios from "axios";

export default function LoginPage() {
  const { login } = useAuthStore();
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const redirect = search.get("redirect") ?? "/";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (hasUsableAccessToken()) {
      navigate(redirect, { replace: true });
    }
  }, [navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const result = await login?.(email, password);
      if (result?.requiresDepartmentSelection) {
        navigate(`/select-department?redirect=${encodeURIComponent(redirect)}`, { replace: true });
        return;
      }
      if (hasUsableAccessToken()) {
        navigate(redirect, { replace: true });
      }
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message ?? err.message
        : err instanceof Error
          ? err.message
          : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center" bgcolor="background.default">
      <Paper elevation={3} sx={{ p: 4, width: 360 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Typography textTransform="uppercase" variant="h5" fontWeight={600} align="center">
              Đăng nhập
            </Typography>

            <EmailOrPhoneField
              label="Email or phone"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
              required
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />

            {error && (
              <Alert severity="error" variant="filled">
                {error}
              </Alert>
            )}

            <Button type="submit" variant="contained" disabled={loading} fullWidth>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
