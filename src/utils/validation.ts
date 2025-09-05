import { MetaInfo } from '../types/PhotoUpload';

export const validateMetaInfo = (metaInfo: MetaInfo): Partial<MetaInfo> => {
  const errors: Partial<MetaInfo> = {};

  if (!metaInfo.photographerName.trim()) {
    errors.photographerName = 'カメラマン名は必須です';
  }

  if (!metaInfo.shootingDate) {
    errors.shootingDate = '撮影日は必須です';
  }

  if (!metaInfo.receptionNumber.trim()) {
    errors.receptionNumber = '受付番号は必須です';
  } else if (!/^\d+$/.test(metaInfo.receptionNumber)) {
    errors.receptionNumber = '受付番号は数字で入力してください';
  }

  if (!metaInfo.customerName.trim()) {
    errors.customerName = 'お客様氏名は必須です';
  }

  return errors;
};