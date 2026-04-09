import { create } from "zustand";
import type { DeparmentModel } from "@features/department/model/department.model";

type DepartmentDashboardDialogState = {
  open: boolean;
  departmentId?: number | null;
  departmentName: string;
  openDialog: (department: DeparmentModel) => void;
  closeDialog: () => void;
};

export const useDepartmentDashboardDialogStore = create<DepartmentDashboardDialogState>((set) => ({
  open: false,
  departmentId: undefined,
  departmentName: "",
  openDialog: (department) =>
    set({
      open: true,
      departmentId: department.id,
      departmentName: department.name,
    }),
  closeDialog: () =>
    set({
      open: false,
      departmentId: undefined,
      departmentName: "",
    }),
}));
