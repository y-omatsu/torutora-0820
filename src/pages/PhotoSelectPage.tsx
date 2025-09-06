import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePhotoGallery } from '../hooks/usePhotoGallery';
import { WatermarkedImage } from '../components/WatermarkedImage';
import { PhotoSearchInfo, GalleryPhoto } from '../types/Gallery';

// 画像URL最適化関数
const getLowResUrl = (url: string): string => {
  if (url.includes('firebasestorage.googleapis.com')) {
    return url.includes('?') ? `${url}&quality=30&width=400` : `${url}?quality=30&width=400`;
  }
  return url;
};

const getHighResUrl = (url: string): string => {
  if (url.includes('firebasestorage.googleapis.com')) {
    return url.includes('?') ? `${url}&quality=80` : `${url}?quality=80`;
  }
  return url;
};

// 遅延読み込み用カスタムフック（設定を調整）
const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, {
      rootMargin: '100px', // より早めに読み込み開始（100px手前から）
      threshold: 0.1,
      ...options
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return [ref, isIntersecting] as const;
};

// 遅延読み込み画像コンポーネント（改善版）
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

  // 一覧用の軽量な画像コンポーネント（ウォーターマークなし）
  const SimpleThumbnail: React.FC<{ src: string; alt: string; onLoad: () => void; onError: () => void }> = ({ 
    src, 
    alt, 
    onLoad, 
    onError 
  }) => {
    return (
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onLoad={onLoad}
        onError={onError}
        loading="lazy"
        style={{
          // 軽量なウォーターマーク風の効果をCSSで
          filter: 'contrast(0.9) brightness(0.95)',
          position: 'relative'
        }}
      />
    );
  };

  // 画像の読み込み処理
  useEffect(() => {
    if (!isVisible) return;

    setImageStartedLoading(true);
    
    // プリロード用の画像オブジェクト（表示はSimpleThumbnailで行う）
    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => {
      setImageError(true);
      console.error(`Failed to load image: ${photo.id}`);
    };
    img.src = getLowResUrl(photo.storageUrl);

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
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">画像を準備中</span>
              </div>
            </div>
          ) : imageError ? (
            // エラー状態
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <div className="text-center text-red-400">
                <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                <span className="text-xs">読み込みエラー</span>
              </div>
            </div>
          ) : imageStartedLoading && !imageLoaded ? (
            // 読み込み中状態（改善されたローディング表示）
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
              <div className="text-center text-gray-500">
                {/* スピナーアニメーション */}
                <div className="relative mx-auto mb-2">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <span className="text-xs font-medium">読み込み中...</span>
                {/* 進行バーっぽい表現 */}
                <div className="w-16 h-1 bg-gray-300 rounded-full mx-auto mt-2 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          ) : (
            // 画像表示（軽量版）
            <div className="relative w-full h-full overflow-hidden">
              <SimpleThumbnail
                src={getLowResUrl(photo.storageUrl)}
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
  const { loading, error, photos, searchPhotos } = usePhotoGallery();
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [allPhotoOption, setAllPhotoOption] = useState(false);
  const [manuallySelectedPhotos, setManuallySelectedPhotos] = useState<Set<string>>(new Set());
  const [modalPhoto, setModalPhoto] = useState<GalleryPhoto | null>(null);
  const [currentModalIndex, setCurrentModalIndex] = useState<number>(0);

  const searchInfo = location.state?.searchInfo as PhotoSearchInfo;
  const forceAllPhotoOption = location.state?.forceAllPhotoOption as boolean;

  useEffect(() => {
    if (!searchInfo) {
      navigate('/photo-info');
      return;
    }
    
    console.log('PhotoSelectPage: Starting search with info:', searchInfo);
    searchPhotos(searchInfo).then(() => {
      console.log('PhotoSelectPage: Search completed');
    }).catch((err) => {
      console.error('PhotoSelectPage: Search failed:', err);
    });
  }, [searchInfo, navigate, searchPhotos]);

  // 全データ購入オプションを強制的に有効にする
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
  }, [photos]);

  // モーダル内で前の写真に移動
  const goToPrevPhoto = useCallback(() => {
    if (currentModalIndex > 0) {
      const newIndex = currentModalIndex - 1;
      setCurrentModalIndex(newIndex);
      setModalPhoto(photos[newIndex]);
    }
  }, [currentModalIndex, photos]);

  // モーダル内で次の写真に移動
  const goToNextPhoto = useCallback(() => {
    if (currentModalIndex < photos.length - 1) {
      const newIndex = currentModalIndex + 1;
      setCurrentModalIndex(newIndex);
      setModalPhoto(photos[newIndex]);
    }
  }, [currentModalIndex, photos]);

  // キーボードナビゲーション
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

  // メモ化された写真リスト
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
        {photos.length === 0 ? (
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
              <p className="text-sm text-blue-600 mt-1">
                画像は表示される際に順次読み込まれます
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

      {/* ナビゲーション機能付きモーダル（高解像度画像用） */}
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
              
              {/* 閉じるボタン */}
              <button
                onClick={() => setModalPhoto(null)}
                className="absolute top-4 right-4 bg-black bg-opacity-70 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-90 transition-all text-lg font-bold z-10"
              >
                ×
              </button>

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

              {/* 写真番号表示 */}
              <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-medium">
                {currentModalIndex + 1} / {photos.length}
              </div>
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