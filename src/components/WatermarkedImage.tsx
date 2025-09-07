import React, { useEffect, useRef, useState, useCallback } from 'react';

// 画像キャッシュの型定義
interface CachedImage {
  canvas: HTMLCanvasElement;
  timestamp: number;
}

// グローバル画像キャッシュ（メモリ内）
const imageCache = new Map<string, CachedImage>();
const CACHE_EXPIRY_TIME = 60 * 60 * 1000; // 60分でキャッシュ期限切れ
const MAX_CACHE_SIZE = 20; // Safari用に大幅削減：最大20枚までキャッシュ

// キャッシュ管理関数
const cleanupExpiredCache = () => {
  const now = Date.now();
  for (const [key, cachedImage] of imageCache.entries()) {
    if (now - cachedImage.timestamp > CACHE_EXPIRY_TIME) {
      imageCache.delete(key);
    }
  }
};

const cleanupOldCache = () => {
  if (imageCache.size <= MAX_CACHE_SIZE) return;
  
  // 古いキャッシュから削除（LRU方式）
  const entries = Array.from(imageCache.entries());
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
  
  // 古い画像から削除（正しい順序）
  const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
  toDelete.forEach(([key]) => {
    // キャンバスを明示的にクリアしてメモリを解放
    const cachedImage = imageCache.get(key);
    if (cachedImage) {
      const ctx = cachedImage.canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, cachedImage.canvas.width, cachedImage.canvas.height);
      }
    }
    imageCache.delete(key);
  });
  
  console.log(`🧹 Cache cleanup: removed ${toDelete.length} OLD images, current size: ${imageCache.size}`);
};

const getCacheKey = (src: string, alt: string): string => {
  return `${src}|${alt}`;
};

// プリロード進行中の画像を追跡するMap
const preloadingImages = new Map<string, Promise<void>>();

// 画像プリロード関数（シンプル版）
const preloadImage = (src: string, alt: string) => {
  const cacheKey = getCacheKey(src, alt);
  
  // 既にキャッシュされている場合はスキップ
  if (imageCache.has(cacheKey)) {
    return Promise.resolve();
  }
  
  // 既にプリロード中の場合は同じPromiseを返す
  if (preloadingImages.has(cacheKey)) {
    return preloadingImages.get(cacheKey)!;
  }

  console.log('🔄 Starting preload for:', cacheKey);

  const preloadPromise = new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // プリロード用Canvasを作成
        const preloadCanvas = document.createElement('canvas');
        const preloadCtx = preloadCanvas.getContext('2d');
        if (!preloadCtx) {
          reject(new Error('Failed to get preload canvas context'));
          return;
        }

        // Canvas サイズを設定（縦横比を保持）
        const maxSize = 1024;
        let canvasWidth = img.width;
        let canvasHeight = img.height;
        
        // 縦横比を保持しながら最大サイズに収める
        if (canvasWidth > maxSize || canvasHeight > maxSize) {
          const ratio = Math.min(maxSize / canvasWidth, maxSize / canvasHeight);
          canvasWidth = Math.floor(canvasWidth * ratio);
          canvasHeight = Math.floor(canvasHeight * ratio);
        }
        
        preloadCanvas.width = canvasWidth;
        preloadCanvas.height = canvasHeight;

        // 画像を描画（縦横比を保持）
        preloadCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

        // ウォーターマークを描画（シンプル版）
        preloadCtx.font = `bold ${Math.max(canvasWidth * 0.05, 24)}px serif`;
        preloadCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        preloadCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        preloadCtx.lineWidth = 3;
        preloadCtx.textAlign = 'center';

        const watermarkText = 'ToruTora';
        const angle = -Math.PI / 6;
        const textWidth = preloadCtx.measureText(watermarkText + '     ').width;
        const lineSpacing = Math.max(canvasHeight * 0.15, 80);
        
        const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
        const numLines = Math.ceil(diagonal / lineSpacing) + 6;
        
        for (let lineIndex = -Math.floor(numLines / 2); lineIndex <= Math.floor(numLines / 2); lineIndex++) {
          const centerX = canvasWidth / 2;
          const centerY = canvasHeight / 2;
          const offsetX = lineIndex * lineSpacing * Math.cos(angle + Math.PI / 2);
          const offsetY = lineIndex * lineSpacing * Math.sin(angle + Math.PI / 2);
          
          const lineLength = diagonal * 1.5;
          const textCount = Math.floor(lineLength / textWidth) + 2;
          
          for (let textIndex = 0; textIndex < textCount; textIndex++) {
            const progress = (textIndex - textCount / 2) / textCount;
            const x = centerX + offsetX + progress * lineLength * Math.cos(angle);
            const y = centerY + offsetY + progress * lineLength * Math.sin(angle);
            
            if (x >= -100 && x <= canvasWidth + 100 && y >= -100 && y <= canvasHeight + 100) {
              preloadCtx.save();
              preloadCtx.translate(x, y);
              preloadCtx.rotate(angle);
              preloadCtx.strokeText(watermarkText, 0, 0);
              preloadCtx.fillText(watermarkText, 0, 0);
              preloadCtx.restore();
            }
          }
        }

        // キャッシュに保存
        imageCache.set(cacheKey, {
          canvas: preloadCanvas,
          timestamp: Date.now()
        });
        
        // キャッシュクリーンアップ
        cleanupExpiredCache();
        cleanupOldCache();
        
        console.log('✅ Image preloaded:', cacheKey);
        preloadingImages.delete(cacheKey);
        resolve();
      } catch (err) {
        console.error('Preload error:', err);
        preloadingImages.delete(cacheKey);
        reject(err);
      }
    };

    img.onerror = () => {
      console.error('Preload failed for:', src);
      preloadingImages.delete(cacheKey);
      reject(new Error(`Failed to load image: ${src}`));
    };

    img.src = src;
  });
  
  preloadingImages.set(cacheKey, preloadPromise);
  return preloadPromise;
};

interface WatermarkedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  objectFit?: 'cover' | 'contain';
  onLoadComplete?: () => void;
  onLoadError?: () => void;
  hideInternalLoader?: boolean;
  externalLoading?: boolean;
  fallbackSrc?: string;
  imageId?: string;
  useCssWatermark?: boolean;
}

export const WatermarkedImage: React.FC<WatermarkedImageProps> = ({ 
  src, 
  alt, 
  className = '',
  style,
  objectFit = 'cover',
  onLoadComplete,
  onLoadError,
  hideInternalLoader = false,
  externalLoading = false,
  fallbackSrc,
  imageId,
  useCssWatermark = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [currentImageId, setCurrentImageId] = useState(imageId);

  // 解像度を下げたURLを生成（Firebase Storageの場合）
  const getLowResUrl = (url: string) => {
    if (url.includes('firebasestorage.googleapis.com')) {
      return `${url}&q=30`;
    }
    return url;
  };

  // キャッシュから画像を取得または新規作成（シンプル版）
  const getCachedOrCreateImage = useCallback((imageSrc: string) => {
    const cacheKey = getCacheKey(imageSrc, alt);
    const cached = imageCache.get(cacheKey);
    
    // キャッシュが有効な場合
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_TIME) {
      console.log('✅ Using cached image:', cacheKey);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = cached.canvas.width;
          canvas.height = cached.canvas.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(cached.canvas, 0, 0);
          setIsLoading(false);
          setError(false);
          if (onLoadComplete) {
            setTimeout(() => onLoadComplete(), 50);
          }
        }
      }
      return;
    }

    // キャッシュがない場合は直接読み込み
    console.log('❌ Cache miss, loading directly:', imageSrc);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // 古い画像の読み込み完了時は表示を更新しない
        if (imageId && currentImageId && imageId !== currentImageId) {
          return;
        }
        
        // Canvas サイズを設定（縦横比を保持）
        const maxSize = 1024;
        let canvasWidth = img.width;
        let canvasHeight = img.height;
        
        // 縦横比を保持しながら最大サイズに収める
        if (canvasWidth > maxSize || canvasHeight > maxSize) {
          const ratio = Math.min(maxSize / canvasWidth, maxSize / canvasHeight);
          canvasWidth = Math.floor(canvasWidth * ratio);
          canvasHeight = Math.floor(canvasHeight * ratio);
        }
        
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // 画像を描画（縦横比を保持）
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

        // ウォーターマークを描画（シンプル版）
        ctx.font = `bold ${Math.max(canvasWidth * 0.05, 24)}px serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';

        const watermarkText = 'ToruTora';
        const angle = -Math.PI / 6;
        const textWidth = ctx.measureText(watermarkText + '     ').width;
        const lineSpacing = Math.max(canvasHeight * 0.15, 80);
        
        const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
        const numLines = Math.ceil(diagonal / lineSpacing) + 6;
        
        for (let lineIndex = -Math.floor(numLines / 2); lineIndex <= Math.floor(numLines / 2); lineIndex++) {
          const centerX = canvasWidth / 2;
          const centerY = canvasHeight / 2;
          const offsetX = lineIndex * lineSpacing * Math.cos(angle + Math.PI / 2);
          const offsetY = lineIndex * lineSpacing * Math.sin(angle + Math.PI / 2);
          
          const lineLength = diagonal * 1.5;
          const textCount = Math.floor(lineLength / textWidth) + 2;
          
          for (let textIndex = 0; textIndex < textCount; textIndex++) {
            const progress = (textIndex - textCount / 2) / textCount;
            const x = centerX + offsetX + progress * lineLength * Math.cos(angle);
            const y = centerY + offsetY + progress * lineLength * Math.sin(angle);
            
            if (x >= -100 && x <= canvasWidth + 100 && y >= -100 && y <= canvasHeight + 100) {
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(angle);
              ctx.strokeText(watermarkText, 0, 0);
              ctx.fillText(watermarkText, 0, 0);
              ctx.restore();
            }
          }
        }

        console.log('✅ Image loaded:', imageSrc);
        setIsLoading(false);
        
        if (onLoadComplete) {
          setTimeout(() => onLoadComplete(), 100);
        }
      } catch (err) {
        console.error('Canvas drawing error:', err);
        setError(true);
        setIsLoading(false);
        if (onLoadError) {
          onLoadError();
        }
      }
    };

    img.onerror = () => {
      console.error('Image loading error for:', imageSrc);
      setError(true);
      setIsLoading(false);
      if (onLoadError) {
        onLoadError();
      }
    };

    img.src = getLowResUrl(imageSrc);
  }, [alt, onLoadComplete, onLoadError, imageId]);

  // srcが変更された時の初期化処理と画像読み込みを統合
  useEffect(() => {
    console.log('🔄 Image src changed from', currentSrc, 'to', src, 'ImageId:', imageId);
    
    setCurrentSrc(src);
    setCurrentImageId(imageId);
    setIsLoading(true);
    setError(false);
    
    // 新しい画像の読み込みを即座に開始
    console.log('🖼️ Loading image for display:', src, 'ImageId:', imageId);
    getCachedOrCreateImage(src);
  }, [src, imageId]);

  // Safari用の画像読み込み完了検出（CSS版のみ）
  useEffect(() => {
    if (useCssWatermark && src) {
      console.log('🔍 Safari image load detection for:', src);
      
      // 画像が既に読み込まれている場合の検出
      const img = new Image();
      img.onload = () => {
        console.log('✅ Safari pre-check: Image already loaded:', src);
        setIsLoading(false);
        setError(false);
        if (onLoadComplete) {
          onLoadComplete();
        }
      };
      img.onerror = () => {
        console.log('❌ Safari pre-check: Image load failed:', src);
        if (fallbackSrc && src !== fallbackSrc) {
          console.log('Trying fallback for Safari pre-check:', fallbackSrc);
          setCurrentSrc(fallbackSrc);
        } else {
          setError(true);
          setIsLoading(false);
          if (onLoadError) {
            onLoadError();
          }
        }
      };
      img.src = src;
    }
  }, [src, useCssWatermark, fallbackSrc, onLoadComplete, onLoadError]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 ${className}`} style={style}>
        <span className="text-gray-500">画像を読み込めませんでした</span>
      </div>
    );
  }

  // 内部ローダーを隠すかどうか（モーダルでは外部ローダーを使用）
  const showInternalLoader = !hideInternalLoader && isLoading && !externalLoading;

  // CSSウォーターマーク版のレンダリング
  if (useCssWatermark) {
    return (
      <div className={`relative ${className}`} style={style}>
        {showInternalLoader && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        <img
          src={currentSrc}
          alt={alt}
          className={`w-full h-full object-${objectFit}`}
          style={{ 
            display: 'block',
            opacity: (isLoading && !externalLoading) ? 0 : 1,
            transition: 'opacity 0.3s ease',
            visibility: 'visible'
          }}
          onLoad={() => {
            console.log('✅ CSS Image loaded:', currentSrc, 'FallbackSrc:', fallbackSrc);
            setIsLoading(false);
            setError(false);
            if (onLoadComplete) {
              onLoadComplete();
            }
          }}
          onError={() => {
            console.log('❌ CSS Image load error:', currentSrc, 'FallbackSrc:', fallbackSrc);
            if (fallbackSrc && currentSrc !== fallbackSrc) {
              console.log('Trying fallback for CSS image:', fallbackSrc);
              setCurrentSrc(fallbackSrc);
            } else {
              console.log('No fallback available, showing error');
              setError(true);
              setIsLoading(false);
              if (onLoadError) {
                onLoadError();
              }
            }
          }}
          onLoadStart={() => {
            console.log('🔄 CSS Image load started:', currentSrc);
          }}
        />
        {/* CSSウォーターマーク - 一覧画面用 */}
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div 
            className="text-white font-bold text-2xl md:text-4xl opacity-40 select-none"
            style={{
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
              transform: 'rotate(-30deg)',
              letterSpacing: '0.2em'
            }}
          >
            ToruTora
          </div>
        </div>
      </div>
    );
  }

  // Canvas版のレンダリング（既存の実装）
  return (
    <div className={`relative ${className}`} style={style}>
      {showInternalLoader && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-full`}
        style={{ 
          display: 'block',
          objectFit: objectFit,
          opacity: (isLoading && !externalLoading) ? 0 : 1,
          transition: 'opacity 0.3s ease',
          backgroundColor: '#f3f4f6' // グレー背景
        }}
      />
    </div>
  );
};

// プリロード関数をエクスポート
export { preloadImage };

// 画像キャッシュをグローバルに公開
(window as any).imageCache = imageCache;