import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { DashboardOverview } from "@features/dashboard/components/dashboard-overview";
import { DashboardProvider } from "@features/dashboard/context/dashboard-context";

type DepartmentDashboardDialogProps = {
  open: boolean;
  departmentId?: number | null;
  departmentName: string;
  onClose: () => void;
};

export function DepartmentDashboardDialog({
  open,
  departmentId,
  departmentName,
  onClose,
}: DepartmentDashboardDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>{`Dashboard chi nhánh: ${departmentName}`}</DialogTitle>
      <DialogContent dividers>
        <DashboardProvider
          departmentId={departmentId}
          cacheNamespace={`department-${departmentId ?? "unknown"}`}
        >
          <DashboardOverview />
        </DashboardProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}
