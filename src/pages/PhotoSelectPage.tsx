import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePhotoGallery } from '../hooks/usePhotoGallery';
import { WatermarkedImage } from '../components/WatermarkedImage';
import { PhotoSearchInfo, GalleryPhoto } from '../types/Gallery';

// サムネイル画像URL取得関数（thumbs/フォルダを参照）
const getThumbnailUrl = (originalUrl: string): string => {
  if (!originalUrl.includes('firebasestorage.googleapis.com')) {
    return originalUrl;
  }

  try {
    // Firebase StorageのURLから画像パスを抽出
    const urlParts = originalUrl.split('/o/');
    if (urlParts.length < 2) return originalUrl;
    
    const pathAndQuery = urlParts[1];
    const pathPart = pathAndQuery.split('?')[0];
    const queryPart = pathAndQuery.includes('?') ? '?' + pathAndQuery.split('?')[1] : '';
    
    // URLデコードしてパスを取得
    const decodedPath = decodeURIComponent(pathPart);
    
    // パスを分割（例: "117-澤田-堀内/001"）
    const pathSegments = decodedPath.split('/');
    if (pathSegments.length < 2) return originalUrl;
    
    const folderName = pathSegments[0]; // "117-澤田-堀内"
    const fileName = pathSegments[pathSegments.length - 1]; // "001"
    
    // Firebase Extension は元のファイル名に _200x200 を付けて .jpg を追加する
    // 例: "001" → "001_200x200"
    const thumbnailFileName = `${fileName}_200x200`;
    const thumbnailPath = `${folderName}/thumbs/${thumbnailFileName}`;
    
    // 新しいURLを構築（.jpg拡張子は付けない）
    const newUrl = `${urlParts[0]}/o/${encodeURIComponent(thumbnailPath)}${queryPart}`;
    
    console.log('Thumbnail URL conversion:', {
      original: originalUrl,
      decodedPath,
      folderName,
      fileName,
      thumbnailFileName,
      thumbnailPath,
      thumbnail: newUrl
    });
    
    return newUrl;
  } catch (error) {
    console.error('Failed to convert to thumbnail URL:', error);
    return originalUrl;
  }
};

// 高解像度画像URL取得関数（元画像のまま、品質のみ調整）
const getHighResUrl = (url: string): string => {
  if (url.includes('firebasestorage.googleapis.com')) {
    return url.includes('?') ? `${url}&quality=80` : `${url}?quality=80`;
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

// 遅延読み込み画像コンポーネント（サムネイル対応版）
const LazyPhotoCard: React.FC<{
  photo: GalleryPhoto;
  isSelected: boolean;
  onToggleSelection: (photoId: string) => void;
  onPhotoClick: (photo: GalleryPhoto) => void;
  allPhotoOption: boolean;
}> = ({ photo, isSelected, onToggleSelection, onPhotoClick, allPhotoOption }) => {
  const [imageRef, isVisible] = useIntersectionObserver();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageStartedLoading, setImageStartedLoading] = useState(false);

  // サムネイル用の軽量な画像コンポーネント（フォールバック付き）
  const ThumbnailImage: React.FC<{ src: string; alt: string; onLoad: () => void; onError: () => void }> = ({ 
    src, 
    alt, 
    onLoad, 
    onError 
  }) => {
    const [imageSrc, setImageSrc] = useState<string>(src);
    const [hasFallback, setHasFallback] = useState<boolean>(false);

    const handleError = () => {
      if (!hasFallback) {
        // サムネイルが見つからない場合、元画像を使用
        console.log('Falling back to original image for:', alt);
        setImageSrc(photo.storageUrl);
        setHasFallback(true);
      } else {
        onError();
      }
    };

    return (
      <img
        src={imageSrc}
        alt={alt}
        className="w-full h-full object-cover"
        onLoad={onLoad}
        onError={handleError}
        loading="eager"
        decoding="async"
        style={{
          // 軽量なウォーターマーク風の効果をCSSで
          filter: 'contrast(0.9) brightness(0.95)',
          position: 'relative'
        }}
      />
    );
  };

  // サムネイル画像の読み込み処理
  useEffect(() => {
    if (!isVisible) return;

    setImageStartedLoading(true);
    
    // サムネイル画像を読み込み
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => {
      setImageError(true);
      console.error(`Failed to load thumbnail: ${photo.id}`, getThumbnailUrl(photo.storageUrl));
    };
    
    // thumbs/フォルダのサムネイル画像を使用
    img.src = getThumbnailUrl(photo.storageUrl);

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isVisible, photo.storageUrl, photo.id]);

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
          ) : imageError ? (
            // エラー状態（サムネイルが見つからない場合）
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center text-red-400">
                <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">サムネイル準備中</span>
              </div>
            </div>
          ) : imageStartedLoading && !imageLoaded ? (
            // 読み込み中状態
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
              <div className="text-center text-gray-500">
                <div className="relative mx-auto mb-2">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <span className="text-xs font-medium">読み込み中...</span>
                <div className="w-16 h-1 bg-gray-300 rounded-full mx-auto mt-2 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          ) : (
            // サムネイル画像表示
            <div className="relative w-full h-full overflow-hidden">
              <ThumbnailImage
                src={getThumbnailUrl(photo.storageUrl)}
                alt={`写真 ${photo.number}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
              {/* 軽量なウォーターマーク表示 */}
              <div className="absolute inset-0 pointer-events-none">
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(`
                      <svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>
                        <defs>
                          <pattern id='watermark' x='0' y='0' width='100' height='100' patternUnits='userSpaceOnUse'>
                            <text x='50' y='50' font-family='Arial' font-size='12' font-weight='bold' 
                                  fill='white' text-anchor='middle' transform='rotate(-30 50 50)'>ToruTora</text>
                          </pattern>
                        </defs>
                        <rect width='200' height='200' fill='url(#watermark)'/>
                      </svg>
                    `)}")`,
                    backgroundRepeat: 'repeat'
                  }}
                />
              </div>
            </div>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection(photo.id);
            }}
            disabled={allPhotoOption}
            className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              isSelected
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white border-gray-300'
            } ${
              allPhotoOption ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
            } shadow-sm`}
          >
            {isSelected && (
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
  
  // モーダル画像のローディング状況の状態
  const [modalImageLoading, setModalImageLoading] = useState<boolean>(false);
  const [modalImageProgress, setModalImageProgress] = useState<number>(0);
  const [modalImageError, setModalImageError] = useState<boolean>(false);

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

  const handlePhotoClick = useCallback((photo: GalleryPhoto) => {
    const index = photos.findIndex(p => p.id === photo.id);
    setCurrentModalIndex(index);
    setModalPhoto(photo);
    
    // モーダル画像のローディング状態をリセット
    setModalImageLoading(true);
    setModalImageProgress(0);
    setModalImageError(false);
    
    // 高解像度画像の読み込み開始
    const img = new Image();
    
    img.onloadstart = () => {
      setModalImageLoading(true);
      setModalImageProgress(10);
    };
    
    img.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        setModalImageProgress(progress);
      }
    };
    
    img.onload = () => {
      setModalImageLoading(false);
      setModalImageProgress(100);
      setModalImageError(false);
    };
    
    img.onerror = () => {
      setModalImageLoading(false);
      setModalImageError(true);
      console.error('Failed to load modal image:', photo.storageUrl);
    };
    
    // 高解像度画像を読み込み
    img.src = getHighResUrl(photo.storageUrl);
  }, [photos]);

  const goToPrevPhoto = useCallback(() => {
    if (currentModalIndex > 0) {
      const newIndex = currentModalIndex - 1;
      setCurrentModalIndex(newIndex);
      setModalPhoto(photos[newIndex]);
      
      // 新しい画像のローディング状態をリセット
      setModalImageLoading(true);
      setModalImageProgress(0);
      setModalImageError(false);
      
      // 高解像度画像を読み込み
      const img = new Image();
      img.onload = () => {
        setModalImageLoading(false);
        setModalImageProgress(100);
      };
      img.onerror = () => {
        setModalImageLoading(false);
        setModalImageError(true);
      };
      img.src = getHighResUrl(photos[newIndex].storageUrl);
    }
  }, [currentModalIndex, photos]);

  const goToNextPhoto = useCallback(() => {
    if (currentModalIndex < photos.length - 1) {
      const newIndex = currentModalIndex + 1;
      setCurrentModalIndex(newIndex);
      setModalPhoto(photos[newIndex]);
      
      // 新しい画像のローディング状態をリセット
      setModalImageLoading(true);
      setModalImageProgress(0);
      setModalImageError(false);
      
      // 高解像度画像を読み込み
      const img = new Image();
      img.onload = () => {
        setModalImageLoading(false);
        setModalImageProgress(100);
      };
      img.onerror = () => {
        setModalImageLoading(false);
        setModalImageError(true);
      };
      img.src = getHighResUrl(photos[newIndex].storageUrl);
    }
  }, [currentModalIndex, photos]);

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

      {/* ナビゲーション機能付きモーダル（元画像をウォーターマーク付きで表示） */}
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
            
            {/* 画像表示エリア（元画像 + ウォーターマーク） */}
            <div 
              className="relative flex items-center justify-center bg-gray-100 overflow-hidden"
              style={{ 
                height: 'calc(90vh - 120px)'
              }}
            >
              {/* 常に最前面に表示される閉じるボタンと写真番号 */}
              <button
                onClick={() => setModalPhoto(null)}
                className="absolute top-4 right-4 bg-black bg-opacity-70 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-90 transition-all text-lg font-bold z-50"
              >
                ×
              </button>

              <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-medium z-50">
                {currentModalIndex + 1} / {photos.length}
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
                        setModalImageError(false);
                        setModalImageLoading(true);
                        setModalImageProgress(0);
                        const img = new Image();
                        img.onload = () => {
                          setModalImageLoading(false);
                          setModalImageProgress(100);
                        };
                        img.onerror = () => {
                          setModalImageLoading(false);
                          setModalImageError(true);
                        };
                        img.src = getHighResUrl(modalPhoto.storageUrl);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      再試行
                    </button>
                  </div>
                </div>
              )}
              
              <WatermarkedImage
                src={getHighResUrl(modalPhoto.storageUrl)}
                alt={`写真 ${modalPhoto.number}`}
                className="max-w-full max-h-full"
                objectFit="contain"
                style={{
                  maxWidth: '100%', 
                  maxHeight: '100%',
                }}
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