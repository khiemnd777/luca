export interface MyRoleDto {
  id: number;
  roleName: string;
  displayName?: string | null;
  brief?: string | null;
}

export interface PermissionMeta {
  id: number;
  name: string;
  value: string;
}

export interface MatrixRow {
  roleId: number;
  roleName: string;
  displayName?: string;
  flags: boolean[]; // theo thứ tự Permissions
}

export interface MatrixPermission {
  permissions: PermissionMeta[];
  roles: MatrixRow[];
}
