export type PrescriptionUploadState = "success" | "pending" | "error";

export type OrderPrescriptionFileModel = {
  id: number;
  orderId: number;
  orderItemId: number;
  fileName: string;
  fileUrl: string;
  fileType: string;
  format: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type LocalPrescriptionQueueItem = {
  localId: string;
  file: File;
  fileName: string;
  format: string;
  mimeType: string;
  sizeBytes: number;
  uploadState: PrescriptionUploadState;
  errorMessage?: string | null;
};
