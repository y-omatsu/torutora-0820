import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { storage, db } from '../firebase/config';
import { PhotoFile, MetaInfo, UploadedPhoto } from '../types/PhotoUpload';

export interface UploadProgress {
  current: number;
  total: number;
  percentage: number;
}
export const usePhotoUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const generateFolderName = async (
    receptionNumber: string,
    photographerName: string,
    customerName: string
  ): Promise<string> => {
    const baseName = `${receptionNumber}-${photographerName}-${customerName}`;
    const folderRef = ref(storage, baseName);
    
    try {
      const result = await listAll(folderRef);
      if (result.items.length === 0 && result.prefixes.length === 0) {
        return baseName;
      }
      
      // フォルダが存在する場合、バージョン番号を追加
      let version = 2;
      while (true) {
        const versionedName = `${baseName}-ver${version}`;
        const versionedRef = ref(storage, versionedName);
        
        try {
          const versionedResult = await listAll(versionedRef);
          if (versionedResult.items.length === 0 && versionedResult.prefixes.length === 0) {
            return versionedName;
          }
          version++;
        } catch (error) {
          return versionedName;
        }
      }
    } catch (error) {
      return baseName;
    }
  };

  const uploadPhotos = async (
    photos: PhotoFile[],
    metaInfo: MetaInfo
  ): Promise<UploadedPhoto[]> => {
    setUploading(true);
    setUploadProgress({ current: 0, total: photos.length, percentage: 0 });
    
    try {
      const folderName = await generateFolderName(
        metaInfo.receptionNumber,
        metaInfo.photographerName,
        metaInfo.customerName
      );
      
      const results: UploadedPhoto[] = [];
      
      for (let index = 0; index < photos.length; index++) {
        const photo = photos[index];
        const filename = `${String(index + 1).padStart(3, '0')}`;
        const storageRef = ref(storage, `${folderName}/${filename}`);
        
        const snapshot = await uploadBytes(storageRef, photo.file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        const uploadedPhoto: UploadedPhoto = {
          ...metaInfo,
          id: photo.id,
          number: index + 1,
          originalName: photo.originalName,
          storageUrl: downloadURL,
          deliveryDate: new Date(),
        };
        
        // Firestoreに保存
        await addDoc(collection(db, 'photos'), {
          ...uploadedPhoto,
          shootingDate: new Date(metaInfo.shootingDate), // 文字列をDateオブジェクトに変換
        });
        
        results.push(uploadedPhoto);
        
        // 進捗を更新
        const current = index + 1;
        const percentage = Math.round((current / photos.length) * 100);
        setUploadProgress({ current, total: photos.length, percentage });
      }
      
      return results;
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  return {
    uploading,
    uploadProgress,
    uploadPhotos,
  };
};