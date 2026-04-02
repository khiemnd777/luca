export interface DentistModel {
  id: number;
  name: string;
  phoneNumber?: string;
  brief?: string;
  active: boolean;
  clinicIds?: number[];
  createdAt: string;
  updatedAt: string;
}
