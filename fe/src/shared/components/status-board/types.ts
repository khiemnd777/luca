export interface StatusOption {
  label: string;
  value: string;
  disableDrop?: boolean;
  disableDrag?: boolean;
}

export interface BoardItem<T = any> {
  id: number;
  status: string;
  priority?: string;
  color?: string | null;
  obj: T;
}
