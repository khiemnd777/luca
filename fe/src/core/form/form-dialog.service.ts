import { nanoid } from "nanoid";

export type ModeText = string | ((ctx: { mode: "create" | "edit"; values: any; initial: any }) => React.ReactNode);

export type OpenOptions = {
  /** initial thô (có thể partial); sẽ đi qua initialResolver của schema nếu có */
  initial?: Record<string, any> | null | undefined;
  /** cho phép override title/confirm/cancel theo mode */
  title?: ModeText;
  confirmText?: ModeText;
  cancelText?: string;
  /** MUI Dialog maxWidth, mặc định "sm" */
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  /** callback sau khi submit thành công; nhận values đã submit */
  onSaved?: (values: Record<string, any>) => Promise<void> | void;
};

export type Payload = {
  id: string;
  name: string;
  options?: OpenOptions;
  /** resolve/reject của promise trả về từ openFormDialog */
  resolve?: (values: any) => void;
  reject?: (err: any) => void;
};

// -------------------- store --------------------

let dialogs: Payload[] = [];
const listeners = new Set<(list: Payload[]) => void>();

function emit() {
  for (const cb of listeners) cb(dialogs);
}

/** Đăng ký lắng nghe danh sách dialogs; trả về hàm hủy đăng ký */
export function subscribe(cb: (list: Payload[]) => void): () => void {
  listeners.add(cb);
  // emit ngay trạng thái hiện tại để đồng bộ lần đầu
  cb(dialogs);
  return () => {
    listeners.delete(cb);
  };
}

/** Mở một dialog; trả về promise resolve với form values khi submit */
export function openFormDialog(name: string, options?: OpenOptions): Promise<any> {
  const id = nanoid();
  return new Promise((resolve, reject) => {
    const payload: Payload = { id, name, options, resolve, reject };
    dialogs = [...dialogs, payload];
    emit();
  });
}

/** Đóng một dialog theo id; nếu không truyền id, đóng dialog trên cùng (last) */
export function closeFormDialog(id?: string) {
  if (!dialogs.length) return;
  if (!id) {
    dialogs = dialogs.slice(0, -1);
  } else {
    dialogs = dialogs.filter((d) => d.id !== id);
  }
  emit();
}

/** Đóng tất cả dialog */
export function closeAllFormDialogs() {
  if (!dialogs.length) return;
  dialogs = [];
  emit();
}

/** Cập nhật options cho một dialog (ví dụ đổi title động…) */
export function updateFormDialog(id: string, patch: Partial<OpenOptions>) {
  dialogs = dialogs.map((d) => (d.id === id ? { ...d, options: { ...(d.options ?? {}), ...patch } } : d));
  emit();
}

/** Tiện ích: lấy danh sách hiện tại (đọc-only) */
export function getOpenDialogs(): ReadonlyArray<Payload> {
  return dialogs;
}
