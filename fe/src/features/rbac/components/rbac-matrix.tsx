import {
  Box, Paper, Table, TableHead, TableRow, TableCell, TableBody, Checkbox, CircularProgress, Typography,
  debounce,
  TableContainer
} from "@mui/material";
import type { MatrixPermission } from "@root/core/network/rbac.types";
import { fetchRBACMatrix, replaceRBAC } from "@features/rbac/api/rbac.api";
import { EV_RBAC_MATRIX_INVALIDATE } from "@features/rbac/model/rbac.events";
import { useEventInvalidation } from "@root/core/module/event-invalidation";

const ROLE_COL_W = 160;
const PERM_COL_W = 220;

export function RBACMatrix() {

  const { data: matrix, setData, loading, error } = useEventInvalidation<MatrixPermission | null>({
    fetcher: () => fetchRBACMatrix(),
    invalidateEvent: EV_RBAC_MATRIX_INVALIDATE,
    initial: null,
    errorText: "Không thể tải dữ liệu phân quyền",
  });

  const saveRolePermissions = debounce(async (roleId: number, permIds: number[]) => {
    try {
      await replaceRBAC({ roleId, permIds });
    } catch (err) {
      console.error("Failed to update RBAC:", err);
    }
  }, 500);

  const toggle = (rIdx: number, pIdx: number) => {
    setData((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const row = next.roles[rIdx];

      row.flags[pIdx] = !row.flags[pIdx];

      const enabledPermIds = next.permissions
        .map((p, idx) => (row.flags[idx] ? p.id : null))
        .filter((id): id is number => id !== null);

      saveRolePermissions(row.roleId, enabledPermIds);

      return next;
    });
  };

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (error) return <Box p={4}><Typography color="error">{error}</Typography></Box>;
  if (!matrix) return <Box p={4}><Typography>Không có dữ liệu RBAC Matrix.</Typography></Box>;

  return (
    <Paper>
      <TableContainer sx={{ overflowX: "auto", maxWidth: "100%" }}>
        <Table
          size="small"
          stickyHeader
          sx={{
            minWidth: PERM_COL_W + ROLE_COL_W * matrix.roles.length,
            tableLayout: "fixed",
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: "bold",
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                  bgcolor: "background.paper",
                  minWidth: PERM_COL_W,
                  width: PERM_COL_W,
                  whiteSpace: "nowrap",
                }}
              >
                Quyền hạn / Vai trò
              </TableCell>

              {matrix.roles.map((role) => (
                <TableCell
                  key={role.roleId}
                  align="center"
                  sx={{
                    fontWeight: "bold",
                    minWidth: ROLE_COL_W,
                    width: ROLE_COL_W,
                    whiteSpace: "nowrap",
                  }}
                >
                  {role.displayName}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {matrix.permissions.map((perm, pIdx) => (
              <TableRow key={perm.id} hover>
                {/* Permission name - sticky left */}
                <TableCell
                  sx={{
                    fontWeight: 500,
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    bgcolor: "background.paper",
                    minWidth: PERM_COL_W,
                    width: PERM_COL_W,
                    whiteSpace: "nowrap",
                  }}
                >
                  {perm.name}
                </TableCell>

                {/* Role columns */}
                {matrix.roles.map((_, rIdx) => (
                  <TableCell key={rIdx} align="center" sx={{ minWidth: ROLE_COL_W, width: ROLE_COL_W }}>
                    <Checkbox
                      size="small"
                      checked={matrix.roles[rIdx].flags[pIdx]}
                      onChange={() => toggle(rIdx, pIdx)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>

  );
}
