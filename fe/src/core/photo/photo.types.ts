export interface PhotoModel {
  id?: number;
  userId?: number;
  folderId?: number | null;
  url?: string;
  provider?: string;
  name?: string;
  deleted?: boolean;
  metaDevice?: string;
  metaOs?: string;
  metaLat?: number;
  metaLng?: number;
  metaWidth?: number;
  metaHeight?: number;
  metaCapturedAt?: string | null; // ISO datetime string
  createdAt?: string;
  updatedAt?: string;
}

export type PhotoSize = "original" | "hd" | "medium" | "thumbnail";
