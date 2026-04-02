export interface PatientModel {
  id: number;
  name: string;
  phoneNumber?: string;
  brief?: string;
  active: boolean;
  clinicIds?: number[];
  createdAt?: string | null;
  updatedAt?: string | null;
}
