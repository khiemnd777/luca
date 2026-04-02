import type { UserModel } from "../auth/auth.types";

export interface NotificationModel<T = any> {
  id?: number;
  userId?: number;
  notifierId?: number;
  createdAt?: string;
  type?: string;
  read?: boolean;
  readAt?: string | null;
  body?: string;
  data?: T;
  notifier?: UserModel | null;
}
