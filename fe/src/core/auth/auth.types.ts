export interface UserModel {
  id: number;
  email: string;
  name?: string;
  phone?: string;
  active: boolean;
  avatar?: string;
  qrCode?: string | null;
}

export interface MeModel extends UserModel {
}
