export interface DepartmentSyncFieldDiffModel {
  label: string;
  before?: string | null;
  after?: string | null;
}

export interface DepartmentSyncItemDiffModel {
  key: string;
  label: string;
  changeType: "create" | "update" | "skip" | string;
  fields?: DepartmentSyncFieldDiffModel[];
}

export interface DepartmentSyncModuleDiffModel {
  key: string;
  label: string;
  create: number;
  update: number;
  skip: number;
  items?: DepartmentSyncItemDiffModel[];
}

export interface DepartmentSyncPreviewModel {
  previewToken: string;
  sourceDepartmentId: number;
  targetDepartmentId: number;
  modules: DepartmentSyncModuleDiffModel[];
  totalCreate: number;
  totalUpdate: number;
  totalSkip: number;
}

export interface DepartmentSyncApplyResultModel extends DepartmentSyncPreviewModel {}
