import * as React from "react";
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import PersonRemoveAlt1OutlinedIcon from "@mui/icons-material/PersonRemoveAlt1Outlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import { IfPermission } from "@core/auth/if-permission";
import {
  assignCorporateAdminToDepartment,
  id as getStaffByUserId,
  search as searchStaff,
  unassignCorporateAdminFromDepartment,
} from "@features/staff/api/staff.api";
import type { StaffModel } from "@features/staff/model/staff.model";

type CorporateAdminAssignmentPanelProps = {
  departmentId: number;
  corporateAdministratorId?: number | null;
  onChanged?: () => Promise<void> | void;
};

function optionLabel(option: StaffModel): string {
  const contact = option.email || option.phone || `#${option.id}`;
  return `${option.name || "Không tên"} - ${contact}`;
}

export function CorporateAdminAssignmentPanel({
  departmentId,
  corporateAdministratorId,
  onChanged,
}: CorporateAdminAssignmentPanelProps) {
  const [currentAdmin, setCurrentAdmin] = React.useState<StaffModel | null>(null);
  const [options, setOptions] = React.useState<StaffModel[]>([]);
  const [selected, setSelected] = React.useState<StaffModel | null>(null);
  const [keyword, setKeyword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    if (!corporateAdministratorId) {
      setCurrentAdmin(null);
      return;
    }
    void getStaffByUserId(corporateAdministratorId)
      .then((staff) => {
        if (active) setCurrentAdmin(staff);
      })
      .catch(() => {
        if (active) setCurrentAdmin(null);
      });
    return () => {
      active = false;
    };
  }, [corporateAdministratorId]);

  React.useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void searchStaff({ keyword, limit: 20, page: 1, orderBy: "name" })
        .then((result) => {
          if (active) setOptions(result.items ?? []);
        })
        .catch(() => {
          if (active) setOptions([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [keyword]);

  const resolveErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      return (err.response?.data as { message?: string } | undefined)?.message ?? err.message;
    }
    return err instanceof Error ? err.message : fallback;
  };

  const handleAssign = async () => {
    if (!selected || !departmentId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await assignCorporateAdminToDepartment(selected.id, departmentId);
      setSelected(null);
      await onChanged?.();
    } catch (err: unknown) {
      setError(resolveErrorMessage(err, "Không thể gán quản trị chi nhánh"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    if (!corporateAdministratorId || !departmentId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await unassignCorporateAdminFromDepartment(corporateAdministratorId, departmentId);
      setSelected(null);
      await onChanged?.();
    } catch (err: unknown) {
      setError(resolveErrorMessage(err, "Không thể bỏ quản trị chi nhánh"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 2 }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <AdminPanelSettingsOutlinedIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={700}>
                Corp-admin
              </Typography>
              {currentAdmin ? <Chip size="small" color="primary" label="Quản trị chi nhánh" /> : null}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {currentAdmin ? optionLabel(currentAdmin) : "Chưa gán corp-admin cho chi nhánh này"}
            </Typography>
          </Box>

          <IfPermission permissions={["department.update"]}>
            <Button
              color="warning"
              variant="outlined"
              startIcon={<PersonRemoveAlt1OutlinedIcon />}
              onClick={handleUnassign}
              disabled={!corporateAdministratorId || submitting}
            >
              Bỏ corp-admin
            </Button>
          </IfPermission>
        </Stack>

        <IfPermission permissions={["department.update"]}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "flex-start" }}>
            <Autocomplete
              fullWidth
              size="small"
              options={options}
              value={selected}
              loading={loading}
              getOptionLabel={optionLabel}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, value) => setSelected(value)}
              onInputChange={(_, value) => setKeyword(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tìm nhân sự / corp-admin"
                  placeholder="Nhập tên, email hoặc số điện thoại"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <SearchOutlinedIcon color="action" fontSize="small" sx={{ mr: 1 }} />,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <Button variant="contained" onClick={handleAssign} disabled={!selected || submitting} sx={{ minWidth: 140 }}>
              {submitting ? "Đang lưu..." : "Gán"}
            </Button>
          </Stack>
        </IfPermission>

        {error && (
          <Alert severity="error" variant="filled">
            {error}
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
