import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePhotoGallery } from '../hooks/usePhotoGallery';
import { WatermarkedImage, preloadImage } from '../components/WatermarkedImage';
import { PhotoSearchInfo, GalleryPhoto } from '../types/Gallery';

// 最適な画像URL取得関数（サムネイル優先、フォールバック付き）
const getOptimalImageUrl = (originalUrl: string): { src: string; fallbackSrc?: string } => {
  if (!originalUrl.includes('firebasestorage.googleapis.com')) {
    return { src: originalUrl };
  }

  try {
    // Firebase StorageのURLから画像パスを抽出
    const urlParts = originalUrl.split('/o/');
    if (urlParts.length < 2) return { src: originalUrl };
    
    const pathAndQuery = urlParts[1];
    const pathPart = pathAndQuery.split('?')[0];
    const queryPart = pathAndQuery.includes('?') ? '?' + pathAndQuery.split('?')[1] : '';
    
    // URLデコードしてパスを取得
    const decodedPath = decodeURIComponent(pathPart);
    
    // パスを分割（例: "117-澤田-堀内/001"）
    const pathSegments = decodedPath.split('/');
    if (pathSegments.length < 2) return { src: originalUrl };
    
    const folderName = pathSegments[0]; // "117-澤田-堀内"
    const fileName = pathSegments[pathSegments.length - 1]; // "001"
    
    // Firebase Extension は元のファイル名に _200x200 を付けて .jpg を追加する
    // 例: "001" → "001_200x200"
    const thumbnailFileName = `${fileName}_200x200`;
    const thumbnailPath = `${folderName}/thumbs/${thumbnailFileName}`;
    
    // サムネイルURLを構築（.jpg拡張子は付けない）
    const thumbnailUrl = `${urlParts[0]}/o/${encodeURIComponent(thumbnailPath)}${queryPart}`;
    
    console.log('Optimal image URL selection:', {
      original: originalUrl,
      decodedPath,
      folderName,
      fileName,
      thumbnailFileName,
      thumbnailPath,
      thumbnail: thumbnailUrl,
      userAgent: navigator.userAgent,
      isMobile: isMobile()
    });
    
    // サムネイルを優先し、元画像をフォールバックとして設定
    return { 
      src: thumbnailUrl, 
      fallbackSrc: originalUrl 
    };
  } catch (error) {
    console.error('Failed to convert to optimal image URL:', error);
    return { src: originalUrl };
  }
};

// デバイス検出関数
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// 高解像度画像URL取得関数（デバイスに応じて最適化）
const getHighResUrl = (url: string): string => {
  if (url.includes('firebasestorage.googleapis.com')) {
    // プリロードと表示で同じURLを生成するため、固定値を使用
    const quality = 10; // 固定品質
    const width = 200; // 固定幅
    return url.includes('?') ? `${url}&quality=${quality}&w=${width}` : `${url}?quality=${quality}&w=${width}`;
  }
  return url;
};

// 遅延読み込み用カスタムフック
const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, {
      rootMargin: '200px',
      threshold: 0.01,
      ...options
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return [ref, isIntersecting] as const;
};

// 修正版：遅延読み込み画像コンポーネント（WatermarkedImageに読み込みを一任）
const LazyPhotoCard: React.FC<{
  photo: GalleryPhoto;
  isSelected: boolean;
  onToggleSelection: (photoId: string) => void;
  onPhotoClick: (photo: GalleryPhoto) => void;
  allPhotoOption: boolean;
}> = ({ photo, isSelected, onToggleSelection, onPhotoClick, allPhotoOption }) => {
  const [imageRef, isVisible] = useIntersectionObserver();
  const [localIsSelected, setLocalIsSelected] = useState(isSelected);

  // 外部の選択状態が変更されたときにローカル状態を更新
  useEffect(() => {
    setLocalIsSelected(isSelected);
  }, [isSelected]);

  return (
    <div ref={imageRef} className="relative">
      <div 
        className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => onPhotoClick(photo)}
      >
        <div className="relative aspect-square bg-gray-200">
          {!isVisible ? (
            // まだ表示範囲に入っていない
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center text-gray-400">
                <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">画像を準備中</span>
              </div>
            </div>
          ) : (
            // WatermarkedImageに読み込みを一任（最適化されたURL選択）
            (() => {
              const { src, fallbackSrc } = getOptimalImageUrl(photo.storageUrl);
              return (
                <WatermarkedImage
                  src={src}
                  alt={`写真 ${photo.number}`}
                  className="w-full h-full"
                  objectFit="cover"
                  fallbackSrc={fallbackSrc}
                  useCssWatermark={true}
                />
              );
            })()
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLocalIsSelected(!localIsSelected);
              onToggleSelection(photo.id);
            }}
            disabled={allPhotoOption}
            className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              localIsSelected
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white border-gray-300'
            } ${
              allPhotoOption ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
            } shadow-sm`}
          >
            {localIsSelected && (
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        <div className="p-2 text-center">
          <span className="text-sm text-gray-600 font-medium">
            {String(photo.number).padStart(3, '0')}
          </span>
        </div>
      </div>
    </div>
  );
};

export const PhotoSelectPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, error, photos, searchPhotos, searchGalleryPhotos } = usePhotoGallery();
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [allPhotoOption, setAllPhotoOption] = useState(false);
  const [manuallySelectedPhotos, setManuallySelectedPhotos] = useState<Set<string>>(new Set());
  const [modalPhoto, setModalPhoto] = useState<GalleryPhoto | null>(null);
  const [currentModalIndex, setCurrentModalIndex] = useState<number>(0);
  const [isPurchased, setIsPurchased] = useState(false);
  
  // モーダル画像のローディング状況の状態（WatermarkedImageと連携）
  const [modalImageLoading, setModalImageLoading] = useState<boolean>(false);
  const [modalImageProgress, setModalImageProgress] = useState<number>(0);
  const [modalImageError, setModalImageError] = useState<boolean>(false);
  const [modalImageKey, setModalImageKey] = useState<number>(0); // 画像の強制再読み込み用

  const searchInfo = location.state?.searchInfo as PhotoSearchInfo;
  const forceAllPhotoOption = location.state?.forceAllPhotoOption as boolean;

  useEffect(() => {
    if (!searchInfo) {
      navigate('/photo-info');
      return;
    }
    
    console.log('PhotoSelectPage: Starting purchase check...');
    
    const purchaseCheckSearchInfo = {
      receptionNumber: searchInfo.receptionNumber,
      shootingDate: searchInfo.shootingDate,
      customerName: searchInfo.customerName
    };
    
    searchGalleryPhotos(purchaseCheckSearchInfo).then((galleryPhotos) => {
      if (galleryPhotos.length > 0) {
        console.log('PhotoSelectPage: Already purchased photos found:', galleryPhotos.length);
        setIsPurchased(true);
      } else {
        console.log('PhotoSelectPage: No purchased photos found, proceeding with photo search...');
        return searchPhotos(searchInfo);
      }
    }).then(() => {
      console.log('PhotoSelectPage: Search completed');
    }).catch((err) => {
      console.error('PhotoSelectPage: Search failed:', err);
    });
  }, [searchInfo, navigate, searchPhotos, searchGalleryPhotos]);

  useEffect(() => {
    if (forceAllPhotoOption && photos.length > 0) {
      setAllPhotoOption(true);
      const allPhotoIds = new Set(photos.map(photo => photo.id));
      setSelectedPhotos(allPhotoIds);
    }
  }, [forceAllPhotoOption, photos]);

  const togglePhotoSelection = useCallback((photoId: string) => {
    if (allPhotoOption) return;
    
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
    
    setManuallySelectedPhotos(prev => {
      const newSet = new Set(prev);
      newSet.has(photoId) ? newSet.delete(photoId) : newSet.add(photoId);
      return newSet;
    });
  }, [allPhotoOption]);

  // キャッシュチェック関数（WatermarkedImageのキャッシュと同期）
  const checkImageCache = useCallback((photo: GalleryPhoto) => {
    const highResUrl = getHighResUrl(photo.storageUrl);
    const cacheKey = `${highResUrl}|写真 ${photo.number}`;
    
    // WatermarkedImageコンポーネントのキャッシュを直接参照
    const imageCache = (window as any).imageCache;
    if (!imageCache) {
      console.log('❌ Image cache not available');
      return false;
    }
    
    const cached = imageCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) { // 60分で期限切れ（WatermarkedImageと同期）
      console.log('✅ Image found in cache:', cacheKey, 'Size:', cached.canvas?.width, 'x', cached.canvas?.height);
      return true;
    }
    
    console.log('❌ Image not in cache:', cacheKey);
    return false;
  }, []);

  // 画像プリロード関数（プラス5枚のみ）
  const preloadAdjacentImages = useCallback((currentIndex: number) => {
    console.log(`🚀 Starting preload for index ${currentIndex}, total photos: ${photos.length}`);
    const preloadPromises: Promise<void>[] = [];
    
    // デバイスに応じたプリロード戦略
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Safariモバイルではプリロード数を大幅に削減
    const preloadCount = (isSafari && isMobile) ? 1 : 5;
    
    const indicesToPreload = Array.from({ length: preloadCount }, (_, i) => currentIndex + i + 1)
      .filter(i => i >= 0 && i < photos.length); // 範囲内のインデックスのみ
    
    console.log(`📋 Indices to preload:`, indicesToPreload);
    
    if (indicesToPreload.length === 0) {
      console.log(`⚠️ No images to preload for index ${currentIndex}`);
      return;
    }
    
    for (const i of indicesToPreload) {
      const photo = photos[i];
      // モーダル用の高解像度URLを使用
      const highResUrl = getHighResUrl(photo.storageUrl);
      
      console.log(`🔄 Preloading modal image ${i}: ${photo.number}, src: ${highResUrl}`);
      
      preloadPromises.push(
        preloadImage(highResUrl, `写真 ${photo.number}`)
          .then(() => {
            console.log(`✅ Successfully preloaded modal image ${i}: ${photo.number}`);
            // プリロード完了後にキャッシュキーを確認
            const cacheKey = `${highResUrl}|写真 ${photo.number}`;
            const cached = (window as any).imageCache?.get?.(cacheKey);
            console.log(`📊 Preload cache verification for ${photo.number}:`, cached ? 'CACHED' : 'NOT CACHED', 'Key:', cacheKey);
          })
          .catch(err => console.warn(`❌ Failed to preload modal image ${i}:`, err))
      );
    }
    
    // プリロードを並列実行
    Promise.allSettled(preloadPromises).then(results => {
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`🎯 Preload completed: ${successCount}/${preloadPromises.length} adjacent modal images`);
      
      // プリロード完了後にキャッシュ状況を確認
      setTimeout(() => {
        console.log('🔍 Post-preload cache verification:');
        indicesToPreload.forEach(i => {
          const photo = photos[i];
          const isCached = checkImageCache(photo);
          console.log(`  - Photo ${photo.number} (index ${i}): ${isCached ? 'CACHED' : 'NOT CACHED'}`);
        });
      }, 1000);
    });
  }, [photos, checkImageCache]);


  // 画像読み込み完了時のコールバック
  const handleImageLoadComplete = useCallback((currentIndex: number) => {
    console.log(`✅ Image load complete for index ${currentIndex}, starting preload immediately`);
    // 現在の画像の読み込みが完了したら即座にプリロードを開始
    preloadAdjacentImages(currentIndex);
    
    // プリロードの完了を少し待ってからログ出力
    setTimeout(() => {
      console.log(`🔄 Preload status check for index ${currentIndex}`);
      const nextIndex = currentIndex + 1;
      if (nextIndex < photos.length) {
        const nextPhoto = photos[nextIndex];
        const isCached = checkImageCache(nextPhoto);
        console.log(`📊 Next image (${nextPhoto.number}) cache status:`, isCached ? 'CACHED' : 'NOT CACHED');
      }
    }, 2000); // 2秒後にプリロード状況をチェック
  }, [preloadAdjacentImages, photos, checkImageCache]);

  // 簡素化されたhandlePhotoClick（WatermarkedImageに読み込みを任せる）
  const handlePhotoClick = useCallback((photo: GalleryPhoto) => {
    const index = photos.findIndex(p => p.id === photo.id);
    setCurrentModalIndex(index);
    setModalPhoto(photo);
    
    // ローディング状態の初期化のみ（実際の読み込みはWatermarkedImageが担当）
    setModalImageLoading(true);
    setModalImageProgress(0);
    setModalImageError(false);
    
    // プリロードは画像読み込み完了後に実行
    // handleImageLoadCompleteがonLoadCompleteで呼ばれる
  }, [photos]);

  // 簡素化されたgoToPrevPhoto
  const goToPrevPhoto = useCallback(() => {
    if (currentModalIndex > 0) {
      const newIndex = currentModalIndex - 1;
      const newPhoto = photos[newIndex];
      console.log(`⬅️ Going to previous photo: ${currentModalIndex} -> ${newIndex}`);
      
      // キャッシュをチェック
      const isCached = checkImageCache(newPhoto);
      
      if (isCached) {
        // キャッシュにある場合はローディング状態を設定しない
        console.log(`✅ Photo ${newPhoto.number} is cached, no loading state needed`);
        setModalImageLoading(false);
        setModalImageProgress(100);
        setModalImageError(false);
      } else {
        // キャッシュにない場合はローディング状態を設定
        console.log(`⏳ Photo ${newPhoto.number} not cached, setting loading state`);
        setModalImageLoading(true);
        setModalImageProgress(0);
        setModalImageError(false);
        
        // タイムアウトを設定して、読み込みが完了しない場合のフォールバック
        setTimeout(() => {
          if (modalImageLoading) {
            console.log('⚠️ Image load timeout, forcing modal to close');
            setModalImageLoading(false);
            setModalImageError(true);
          }
        }, 10000); // 10秒でタイムアウト
      }
      
      // 画像とインデックスを更新
      setCurrentModalIndex(newIndex);
      setModalPhoto(newPhoto);
      
      // プリロードは画像読み込み完了後に実行
      // handleImageLoadCompleteがonLoadCompleteで呼ばれる
    }
  }, [currentModalIndex, photos, checkImageCache, modalImageLoading]);

  // 簡素化されたgoToNextPhoto
  const goToNextPhoto = useCallback(() => {
    if (currentModalIndex < photos.length - 1) {
      const newIndex = currentModalIndex + 1;
      const newPhoto = photos[newIndex];
      console.log(`➡️ Going to next photo: ${currentModalIndex} -> ${newIndex}`);
      
      // キャッシュをチェック
      const isCached = checkImageCache(newPhoto);
      
      if (isCached) {
        // キャッシュにある場合はローディング状態を設定しない
        console.log(`✅ Photo ${newPhoto.number} is cached, no loading state needed`);
        setModalImageLoading(false);
        setModalImageProgress(100);
        setModalImageError(false);
      } else {
        // キャッシュにない場合はローディング状態を設定
        console.log(`⏳ Photo ${newPhoto.number} not cached, setting loading state`);
        setModalImageLoading(true);
        setModalImageProgress(0);
        setModalImageError(false);
        
        // タイムアウトを設定して、読み込みが完了しない場合のフォールバック
        setTimeout(() => {
          if (modalImageLoading) {
            console.log('⚠️ Image load timeout, forcing modal to close');
            setModalImageLoading(false);
            setModalImageError(true);
          }
        }, 10000); // 10秒でタイムアウト
      }
      
      // 画像とインデックスを更新
      setCurrentModalIndex(newIndex);
      setModalPhoto(newPhoto);
      
      // プリロードは画像読み込み完了後に実行
      // handleImageLoadCompleteがonLoadCompleteで呼ばれる
    }
  }, [currentModalIndex, photos, checkImageCache, modalImageLoading]);

  // デバッグ用：プリロード状況を確認する関数
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).debugPreload = () => {
        console.log('=== Preload Debug Info ===');
        console.log('Current modal index:', currentModalIndex);
        console.log('Total photos:', photos.length);
        console.log('Modal photo:', modalPhoto?.number);
        
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const preloadCount = (isSafari && isMobile) ? 1 : 5;
        
        const indicesToPreload = Array.from({ length: preloadCount }, (_, i) => currentModalIndex + i + 1)
          .filter(i => i >= 0 && i < photos.length);
        
        console.log('Should preload indices:', indicesToPreload);
        
        indicesToPreload.forEach(i => {
          const photo = photos[i];
          const highResUrl = getHighResUrl(photo.storageUrl);
          console.log(`Photo ${i}: ${photo.number}, URL: ${highResUrl}`);
        });
        console.log('========================');
      };
    }
  }, [currentModalIndex, photos, modalPhoto]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!modalPhoto) return;
      
      if (event.key === 'ArrowLeft') {
        goToPrevPhoto();
      } else if (event.key === 'ArrowRight') {
        goToNextPhoto();
      } else if (event.key === 'Escape') {
        setModalPhoto(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalPhoto, goToPrevPhoto, goToNextPhoto]);

  const handleAllPhotoOptionChange = useCallback((checked: boolean) => {
    setAllPhotoOption(checked);
    
    if (checked) {
      const allPhotoIds = new Set(photos.map(photo => photo.id));
      setSelectedPhotos(allPhotoIds);
    } else {
      setSelectedPhotos(new Set(manuallySelectedPhotos));
    }
  }, [photos, manuallySelectedPhotos]);

  const handleConfirm = useCallback(() => {
    const selectedPhotoData = photos.filter(photo => selectedPhotos.has(photo.id));
    navigate('/photo-check', { 
      state: { 
        selectedPhotos: selectedPhotoData, 
        allPhotoOption,
        searchInfo 
      } 
    });
  }, [photos, selectedPhotos, allPhotoOption, searchInfo, navigate]);

  const photoCards = useMemo(() => {
    return photos.map((photo) => (
      <LazyPhotoCard
        key={photo.id}
        photo={photo}
        isSelected={selectedPhotos.has(photo.id)}
        onToggleSelection={togglePhotoSelection}
        onPhotoClick={handlePhotoClick}
        allPhotoOption={allPhotoOption}
      />
    ));
  }, [photos, selectedPhotos, togglePhotoSelection, handlePhotoClick, allPhotoOption]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">写真を検索中...</p>
          <p className="text-sm text-gray-500 mt-2">
            写真が多い場合、時間がかかることがあります
          </p>
          {error && (
            <p className="text-red-600 mt-2">{error}</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-lg text-red-600 mb-4">エラーが発生しました</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/photo-info')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <div className="flex flex-col space-y-1 mr-4">
              <div className="w-6 h-0.5 bg-gray-800"></div>
              <div className="w-6 h-0.5 bg-gray-800"></div>
              <div className="w-6 h-0.5 bg-gray-800"></div>
            </div>
            <h1 className="text-xl font-bold text-gray-800">ToruTora</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {isPurchased ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <svg className="w-16 h-16 text-blue-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">写真選択済み</h2>
            </div>
            <p className="text-lg text-gray-600 mb-4">
              すでに写真を選択済みです。
            </p>
            <p className="text-gray-600 mb-6">
              変更がある場合にはLineにてお問い合わせください。
            </p>
            <button
              onClick={() => navigate('/photo-info')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              戻る
            </button>
          </div>
        ) : photos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-lg text-gray-600 mb-4">
              一致する写真が存在しませんでした。
            </p>
            <p className="text-gray-600">
              Lineにてお問い合わせください
            </p>
          </div>
        ) : (
          <>
            {/* 写真数とパフォーマンス情報 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 font-medium">
                {photos.length}枚の写真が見つかりました
              </p>
            </div>

            {/* 写真一覧 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {photoCards}
            </div>

            {/* 全データ購入オプション */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allPhotoOption}
                  onChange={(e) => handleAllPhotoOptionChange(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-gray-800 font-medium">
                    全データ購入オプション（+5500円）を適用
                  </span>
                  <p className="text-sm text-red-600">
                    19枚以上選択する場合はこちらがおすすめ
                  </p>
                </div>
              </label>
            </div>

            {/* 確認ボタン */}
            <div className="text-center">
              <button
                onClick={handleConfirm}
                disabled={selectedPhotos.size === 0 && !allPhotoOption}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                  selectedPhotos.size === 0 && !allPhotoOption
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                確認画面へ進む（{allPhotoOption ? photos.length : selectedPhotos.size}枚選択中）
              </button>
              <p className="text-xs text-gray-500 mt-2">
                ※3枚までは追加料金なしで選択可能
              </p>
              <p className="text-xs text-gray-500 mt-2">
                ※写真購入後にウォーターマークなし/高解像度のお写真を再納品します
              </p>
            </div>
          </>
        )}
      </div>

      {/* モーダル（WatermarkedImageに読み込みを任せる版） */}
      {modalPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-lg flex flex-col relative"
            style={{ 
              width: '90vw', 
              height: '90vh',
              maxWidth: '90vw',
              maxHeight: '90vh'
            }}
          >
            
            {/* 画像表示エリア */}
            <div 
              className="relative flex items-center justify-center bg-gray-100 overflow-hidden"
              style={{ 
                height: 'calc(90vh - 120px)'
              }}
            >
              {/* 常に最前面に表示される閉じるボタンと写真番号 */}
              {/* ヘッダー部分：写真番号、再読み込みボタン、閉じるボタンを一列に配置 */}
              <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-50">
                {/* 写真番号（左寄せ） */}
                <div className="bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {currentModalIndex + 1} / {photos.length}
                </div>

                {/* 再読み込みボタン（中央寄せ） */}
                <button
                  onClick={() => {
                    console.log('🔄 Manual reload requested for photo:', modalPhoto?.number);
                    setModalImageError(false);
                    setModalImageLoading(true);
                    setModalImageProgress(0);
                    
                    // キャッシュを完全にクリア
                    if (modalPhoto) {
                      const highResUrl = getHighResUrl(modalPhoto.storageUrl);
                      const cacheKey = `${highResUrl}|写真 ${modalPhoto.number}`;
                      const imageCache = (window as any).imageCache;
                      if (imageCache) {
                        imageCache.delete(cacheKey);
                        console.log('🗑️ Cache cleared for:', cacheKey);
                      }
                    }
                    
                    // 強制的に画像を再読み込み（keyを変更してコンポーネントを再マウント）
                    setModalImageKey(prev => prev + 1);
                    console.log('🔄 Reload triggered, key updated to:', modalImageKey + 1);
                  }}
                  className="bg-gray-400 bg-opacity-70 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-90 transition-all"
                  title="再読み込み"
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                </button>

                {/* 閉じるボタン（右寄せ） */}
                <button
                  onClick={() => setModalPhoto(null)}
                  className="bg-black bg-opacity-70 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-90 transition-all text-lg font-bold"
                >
                  ×
                </button>
              </div>

              {/* ローディング表示 */}
              {modalImageLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 backdrop-blur-sm z-20">
                  <div className="bg-white rounded-lg p-6 text-center shadow-lg border border-gray-200">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg font-medium text-gray-800 mb-2">画像を読み込み中...</p>
                    <div className="w-64 bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${modalImageProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600">{modalImageProgress}%</p>
                  </div>
                </div>
              )}
              
              {/* エラー表示 */}
              {modalImageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 backdrop-blur-sm z-20">
                  <div className="bg-white rounded-lg p-6 text-center shadow-lg border border-gray-200">
                    <div className="w-16 h-16 text-red-500 mx-auto mb-4">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-gray-800 mb-2">画像の読み込みに失敗しました</p>
                    <button 
                      onClick={() => {
                        // 再試行時もWatermarkedImageに任せるため、状態のリセットのみ
                        setModalImageError(false);
                        setModalImageLoading(true);
                        setModalImageProgress(0);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      再試行
                    </button>
                  </div>
                </div>
              )}
              
              {/* WatermarkedImageコンポーネント（読み込み処理を一元化） */}
              <WatermarkedImage
                key={`${modalPhoto.id}-${modalImageKey}`} // 強制再読み込み用のkey
                src={(() => {
                  const url = getHighResUrl(modalPhoto.storageUrl);
                  console.log(`🖼️ Displaying image ${modalPhoto.number}, src: ${url}`);
                  return url;
                })()}
                alt={`写真 ${modalPhoto.number}`}
                className="max-w-full max-h-full"
                objectFit="contain"
                style={{
                  maxWidth: '100%', 
                  maxHeight: '100%',
                }}
                imageId={modalPhoto.id}
                onLoadComplete={() => {
                  console.log('🎉 onLoadComplete called for photo:', modalPhoto?.number, 'index:', currentModalIndex);
                  setModalImageLoading(false);
                  setModalImageProgress(100);
                  setModalImageError(false);
                  console.log('✅ Modal loading state cleared');
                  // 画像読み込み完了後にプリロードを開始
                  handleImageLoadComplete(currentModalIndex);
                }}
                onLoadError={() => {
                  console.log('❌ onLoadError called for photo:', modalPhoto?.number, 'index:', currentModalIndex);
                  setModalImageLoading(false);
                  setModalImageError(true);
                  console.log('✅ Modal loading state cleared due to error');
                }}
                hideInternalLoader={true}
                externalLoading={modalImageLoading}
                // モーダルでは高解像度画像なのでフォールバックは設定しない
              />

              {/* 前の写真ボタン */}
              {currentModalIndex > 0 && (
                <button
                  onClick={goToPrevPhoto}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-70 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-90 transition-all z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              {/* 次の写真ボタン */}
              {currentModalIndex < photos.length - 1 && (
                <button
                  onClick={goToNextPhoto}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-70 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-opacity-90 transition-all z-10"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* 下部エリア */}
            <div 
              className="border-t border-gray-200 bg-white flex flex-col justify-center"
              style={{ height: '120px', flexShrink: 0 }}
            >
              <div className="p-3 text-center">
                <label className="flex items-center justify-center space-x-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={selectedPhotos.has(modalPhoto.id)}
                    onChange={() => togglePhotoSelection(modalPhoto.id)}
                    disabled={allPhotoOption}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className={`font-medium ${allPhotoOption ? 'text-gray-400' : 'text-blue-600'}`}>
                    {allPhotoOption ? '全データ購入オプション適用中' : '選択する'}
                  </span>
                  <span className="text-sm text-gray-600 font-semibold">
                    ({String(modalPhoto.number).padStart(3, '0')})
                  </span>
                </label>
                
                <button
                  onClick={handleConfirm}
                  disabled={selectedPhotos.size === 0 && !allPhotoOption}
                  className={`w-full py-2 rounded-lg font-semibold text-white transition-colors ${
                    selectedPhotos.size === 0 && !allPhotoOption
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  確認画面へ進む
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  ※3枚までは基本料金に含まれます
                </p>
                <p className="text-xs text-gray-500">
                  ← → キーで写真切り替え、ESCで閉じる
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};