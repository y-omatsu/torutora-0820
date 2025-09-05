export interface PhotoSearchInfo {
  receptionNumber: string;
  shootingDate: string;
  customerName: string;
  password?: string;
}

export interface GalleryPhoto {
  id: string;
  number: number;
  photographerName: string;
  shootingDate: Date;
  receptionNumber: string;
  customerName: string;
  storageUrl: string;
  deliveryDate: Date;
}

export interface SelectedPhoto extends GalleryPhoto {
  selected: boolean;
}

export interface PurchaseData {
  customerName: string;
  deliveryDate: Date;
  id: string;
  number: number;
  photographerName: string;
  receptionNumber: string;
  shootingDate: Date;
  storageUrl: string;
  all_photo_flg: number;
}