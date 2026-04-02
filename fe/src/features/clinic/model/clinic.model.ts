export interface ClinicModel {
  id: number;
  name: string;
  address?: string;
  phoneNumber?: string;
  brief?: string;
  logo?: string;
  active: boolean;
  dentistIds?: number[] | null;
  patientIds?: number[] | null;
  customFields?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}
