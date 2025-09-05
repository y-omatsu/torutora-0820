import { useState, useCallback } from 'react';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { PhotoSearchInfo, GalleryPhoto, PurchaseData } from '../types/Gallery';

export const usePhotoGallery = () => {
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const searchGalleryPhotos = useCallback(async (searchInfo: PhotoSearchInfo): Promise<GalleryPhoto[]> => {
    setLoading(true);
    setError(null);
    console.log('Starting gallery photo search with:', searchInfo);
    
    try {
      const galleryRef = collection(db, 'gallery');
      const q = query(
        galleryRef,
        where('receptionNumber', '==', searchInfo.receptionNumber),
        where('customerName', '==', searchInfo.customerName)
      );
      
      console.log('Executing Firestore query on gallery collection...');
      const querySnapshot = await getDocs(q);
      console.log('Query completed, documents found:', querySnapshot.size);
      const foundPhotos: GalleryPhoto[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        try {
          // 撮影日の処理（TimestampまたはDateオブジェクトに対応）
          console.log('Processing document:', doc.id, 'shootingDate:', data.shootingDate);
          let docDate: Date;
          if (data.shootingDate && typeof data.shootingDate.toDate === 'function') {
            docDate = data.shootingDate.toDate();
          } else if (data.shootingDate instanceof Date) {
            docDate = data.shootingDate;
          } else if (typeof data.shootingDate === 'string') {
            docDate = new Date(data.shootingDate);
            if (isNaN(docDate.getTime())) {
              console.warn('Invalid date string:', data.shootingDate);
              return; // スキップ
            }
          } else {
            console.warn('Unsupported shootingDate format for document:', doc.id, data.shootingDate);
            return; // スキップ
          }
          
          // 納期の処理（TimestampまたはDateオブジェクトに対応）
          let deliveryDate: Date;
          if (data.deliveryDate && typeof data.deliveryDate.toDate === 'function') {
            deliveryDate = data.deliveryDate.toDate();
          } else if (data.deliveryDate instanceof Date) {
            deliveryDate = data.deliveryDate;
          } else {
            console.warn('Invalid deliveryDate format for document:', doc.id, data.deliveryDate);
            deliveryDate = new Date();
          }
          
          const searchDate = new Date(searchInfo.shootingDate);
          console.log('Comparing dates - doc:', docDate, 'search:', searchDate);
          
          // 撮影日の比較（日付のみ）
          if (
            docDate.getFullYear() === searchDate.getFullYear() &&
            docDate.getMonth() === searchDate.getMonth() &&
            docDate.getDate() === searchDate.getDate()
          ) {
            foundPhotos.push({
              ...data,
              id: doc.id,
              number: data.number,
              photographerName: data.photographerName,
              shootingDate: docDate,
              receptionNumber: data.receptionNumber,
              customerName: data.customerName,
              storageUrl: data.storageUrl,
              deliveryDate: deliveryDate,
            });
            console.log('Photo added to results:', data.number);
          }
        } catch (error) {
          console.error('Error processing document:', doc.id, error);
        }
      });
      
      console.log('Total photos found:', foundPhotos.length);
      // 番号順にソート
      foundPhotos.sort((a, b) => a.number - b.number);
      setPhotos(foundPhotos);
      return foundPhotos;
    } catch (error) {
      console.error('Error searching gallery photos:', error);
      setError('写真の検索中にエラーが発生しました');
      setPhotos([]);
      return [];
    } finally {
      console.log('Gallery search completed, setting loading to false');
      setLoading(false);
    }
  }, []);

  const searchPhotos = useCallback(async (searchInfo: PhotoSearchInfo): Promise<GalleryPhoto[]> => {
    setLoading(true);
    setError(null);
    console.log('Starting photo search with:', searchInfo);
    
    try {
      const photosRef = collection(db, 'photos');
      const q = query(
        photosRef,
        where('receptionNumber', '==', searchInfo.receptionNumber),
        where('customerName', '==', searchInfo.customerName)
      );
      
      console.log('Executing Firestore query...');
      const querySnapshot = await getDocs(q);
      console.log('Query completed, documents found:', querySnapshot.size);
      const foundPhotos: GalleryPhoto[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        try {
          // 撮影日の処理（TimestampまたはDateオブジェクトに対応）
          console.log('Processing document:', doc.id, 'shootingDate:', data.shootingDate);
          let docDate: Date;
          if (data.shootingDate && typeof data.shootingDate.toDate === 'function') {
            docDate = data.shootingDate.toDate();
          } else if (data.shootingDate instanceof Date) {
            docDate = data.shootingDate;
          } else if (typeof data.shootingDate === 'string') {
            docDate = new Date(data.shootingDate);
            if (isNaN(docDate.getTime())) {
              console.warn('Invalid date string:', data.shootingDate);
              return; // スキップ
            }
          } else {
            console.warn('Unsupported shootingDate format for document:', doc.id, data.shootingDate);
            return; // スキップ
          }
          
          // 納期の処理（TimestampまたはDateオブジェクトに対応）
          let deliveryDate: Date;
          if (data.deliveryDate && typeof data.deliveryDate.toDate === 'function') {
            deliveryDate = data.deliveryDate.toDate();
          } else if (data.deliveryDate instanceof Date) {
            deliveryDate = data.deliveryDate;
          } else {
            console.warn('Invalid deliveryDate format for document:', doc.id, data.deliveryDate);
            deliveryDate = new Date();
          }
          
          const searchDate = new Date(searchInfo.shootingDate);
          console.log('Comparing dates - doc:', docDate, 'search:', searchDate);
          
          // 撮影日の比較（日付のみ）
          if (
            docDate.getFullYear() === searchDate.getFullYear() &&
            docDate.getMonth() === searchDate.getMonth() &&
            docDate.getDate() === searchDate.getDate()
          ) {
            foundPhotos.push({
              ...data,
              id: doc.id,
              number: data.number,
              photographerName: data.photographerName,
              shootingDate: docDate,
              receptionNumber: data.receptionNumber,
              customerName: data.customerName,
              storageUrl: data.storageUrl,
              deliveryDate: deliveryDate,
            });
            console.log('Photo added to results:', data.number);
          }
        } catch (error) {
          console.error('Error processing document:', doc.id, error);
        }
      });
      
      console.log('Total photos found:', foundPhotos.length);
      // 番号順にソート
      foundPhotos.sort((a, b) => a.number - b.number);
      setPhotos(foundPhotos);
      return foundPhotos;
    } catch (error) {
      console.error('Error searching photos:', error);
      setError('写真の検索中にエラーが発生しました');
      setPhotos([]);
      return [];
    } finally {
      console.log('Search completed, setting loading to false');
      setLoading(false);
    }
  }, []);

  const purchasePhotos = useCallback(async (
    selectedPhotos: GalleryPhoto[],
    allPhotoOption: boolean
  ): Promise<void> => {
    setLoading(true);
    try {
      const galleryRef = collection(db, 'gallery');
      
      for (const photo of selectedPhotos) {
        const purchaseData: PurchaseData = {
          customerName: photo.customerName,
          deliveryDate: new Date(),
          id: photo.id,
          number: photo.number,
          photographerName: photo.photographerName,
          receptionNumber: photo.receptionNumber,
          shootingDate: photo.shootingDate,
          storageUrl: photo.storageUrl,
          all_photo_flg: allPhotoOption ? 1 : 0,
        };
        
        await addDoc(galleryRef, purchaseData);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    photos,
    searchGalleryPhotos,
    searchPhotos,
    purchasePhotos,
  };
};