export interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  originalName: string;
  number: number;
}

export interface MetaInfo {
  photographerName: string;
  shootingDate: string;
  receptionNumber: string;
  customerName: string;
}

export interface UploadedPhoto extends MetaInfo {
  id: string;
  number: number;
  originalName: string;
  storageUrl: string;
  deliveryDate: Date;
}