import React, { useEffect, useRef, useState, useCallback } from 'react';

// 画像キャッシュの型定義
interface CachedImage {
  canvas: HTMLCanvasElement;
  timestamp: number;
}

// グローバル画像キャッシュ（メモリ内）
const imageCache = new Map<string, CachedImage>();
const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30分でキャッシュ期限切れ
const MAX_CACHE_SIZE = 50; // 最大50枚までキャッシュ

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
  
  const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
  toDelete.forEach(([key]) => imageCache.delete(key));
};

const getCacheKey = (src: string, alt: string): string => {
  return `${src}|${alt}`;
};

// キャッシュ統計情報を取得
const getCacheStats = () => {
  return {
    size: imageCache.size,
    maxSize: MAX_CACHE_SIZE,
    entries: Array.from(imageCache.keys())
  };
};

// デバッグ用：キャッシュ統計をコンソールに出力
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = getCacheStats();
    if (stats.size > 0) {
      console.log('Image Cache Stats:', stats);
    }
  }, 30000); // 30秒ごとに統計を出力
  
  // キャッシュの内容を詳細表示する関数
  (window as any).debugImageCache = () => {
    console.log('=== Image Cache Debug Info ===');
    console.log('Cache size:', imageCache.size);
    console.log('Max size:', MAX_CACHE_SIZE);
    console.log('Expiry time:', CACHE_EXPIRY_TIME);
    
    for (const [key, cached] of imageCache.entries()) {
      console.log(`Key: ${key}`);
      console.log(`  Size: ${cached.canvas.width}x${cached.canvas.height}`);
      console.log(`  Timestamp: ${new Date(cached.timestamp).toLocaleString()}`);
      console.log(`  Age: ${Date.now() - cached.timestamp}ms`);
    }
    console.log('===============================');
  };
}

// 画像プリロード関数（表示に影響しない完全独立した処理）
const preloadImage = (src: string, alt: string, fallbackSrc?: string) => {
  const cacheKey = getCacheKey(src, alt);
  
  // 既にキャッシュされている場合はスキップ
  if (imageCache.has(cacheKey)) {
    console.log('Image already cached, skipping preload:', cacheKey);
    return Promise.resolve();
  }

  console.log('🔄 Starting preload for:', cacheKey, 'src:', src);

  // iOS Safari用のCanvas制限値（プリロード用）
  const MAX_CANVAS_DIMENSION = 2048;
  const MAX_CANVAS_AREA = 2048 * 2048;

  // Canvas サイズを制限内に調整（プリロード用）
  const getOptimalCanvasSize = (imgWidth: number, imgHeight: number) => {
    let width = imgWidth;
    let height = imgHeight;

    // 寸法制限チェック
    if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
      const ratio = Math.min(MAX_CANVAS_DIMENSION / width, MAX_CANVAS_DIMENSION / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    // 総面積制限チェック
    if (width * height > MAX_CANVAS_AREA) {
      const ratio = Math.sqrt(MAX_CANVAS_AREA / (width * height));
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    return { width, height };
  };

  // 解像度を下げたURLを生成（プリロード用）
  const getLowResUrl = (url: string) => {
    if (url.includes('firebasestorage.googleapis.com')) {
      return `${url}&q=30`;
    }
    return url;
  };

  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // プリロード専用の独立したCanvasを作成（表示用Canvasとは完全に分離）
        const preloadCanvas = document.createElement('canvas');
        const preloadCtx = preloadCanvas.getContext('2d');
        if (!preloadCtx) {
          reject(new Error('Failed to get preload canvas context'));
          return;
        }

        // 最適なCanvas サイズを計算
        const { width: canvasWidth, height: canvasHeight } = getOptimalCanvasSize(img.width, img.height);
        
        // プリロード用Canvasのサイズを設定
        preloadCanvas.width = canvasWidth;
        preloadCanvas.height = canvasHeight;

        // 画像を描画（リサイズして描画）
        preloadCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

        // ウォーターマークを描画
        preloadCtx.font = `bold ${Math.max(canvasWidth * 0.05, 24)}px Arial`;
        preloadCtx.font = `bold ${Math.max(canvasWidth * 0.05, 24)}px serif`;
        preloadCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        preloadCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        preloadCtx.lineWidth = 3;
        preloadCtx.textAlign = 'center';

        // ウォーターマークの配置計算
        const watermarkText = 'ToruTora';
        
        // 30度の角度で左下から右上に向かって平行線で表示
        const angle = -Math.PI / 6; // -30度（左下から右上）
        const textWidth = preloadCtx.measureText(watermarkText + '     ').width;
        const lineSpacing = Math.max(canvasHeight * 0.15, 80); // 線間の間隔
        
        // 必要な平行線の数を計算
        const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
        const numLines = Math.ceil(diagonal / lineSpacing) + 6; // より多くの線を生成して隙間を埋める
        
        // 各平行線を描画
        for (let lineIndex = -Math.floor(numLines / 2); lineIndex <= Math.floor(numLines / 2); lineIndex++) {
          // 線の開始点を計算（画像中央からの相対位置）
          const centerX = canvasWidth / 2;
          const centerY = canvasHeight / 2;
          const offsetX = lineIndex * lineSpacing * Math.cos(angle + Math.PI / 2);
          const offsetY = lineIndex * lineSpacing * Math.sin(angle + Math.PI / 2);
          
          // この線上に配置するテキストの数を計算
          const lineLength = diagonal * 1.5; // 線の長さを拡張して隙間を埋める
          const textCount = Math.floor(lineLength / textWidth) + 2; // より多くのテキストを配置
          
          // 各テキストを配置
          for (let textIndex = 0; textIndex < textCount; textIndex++) {
            const progress = (textIndex - textCount / 2) / textCount;
            const x = centerX + offsetX + progress * lineLength * Math.cos(angle);
            const y = centerY + offsetY + progress * lineLength * Math.sin(angle);
            
            // 画像範囲内かチェック
            if (x >= -100 && x <= canvasWidth + 100 && y >= -100 && y <= canvasHeight + 100) {
              preloadCtx.save();
              preloadCtx.translate(x, y);
              preloadCtx.rotate(angle);
              
              // 影付きテキストを描画
              preloadCtx.strokeText(watermarkText, 0, 0);
              preloadCtx.fillText(watermarkText, 0, 0);
              
              preloadCtx.restore();
            }
          }
        }

        // キャッシュに保存（プリロード専用Canvasを保存）
        imageCache.set(cacheKey, {
          canvas: preloadCanvas,
          timestamp: Date.now()
        });
        
        // キャッシュクリーンアップ
        cleanupExpiredCache();
        cleanupOldCache();
        
        console.log('✅ Image preloaded and cached (completely isolated):', cacheKey, 'Size:', canvasWidth, 'x', canvasHeight, 'Cache size:', imageCache.size);
        console.log('🔒 Preload completed - no impact on current display');
        console.log('📊 Preload cache details:', {
          cacheKey,
          src,
          alt,
          canvasSize: `${canvasWidth}x${canvasHeight}`,
          totalCacheSize: imageCache.size
        });
        resolve();
      } catch (err) {
        console.error('Preload canvas drawing error:', err);
        reject(err);
      }
    };

    img.onerror = () => {
      console.error('Preload image loading error for:', src);
      
      // フォールバックがある場合はフォールバックを試す
      if (fallbackSrc && src !== fallbackSrc) {
        console.log('Trying fallback for preload:', fallbackSrc);
        preloadImage(fallbackSrc, alt).then(resolve).catch(reject);
        return;
      }
      
      reject(new Error(`Failed to load image: ${src}`));
    };

    img.src = getLowResUrl(src);
  });
};

interface WatermarkedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  objectFit?: 'cover' | 'contain';
  // 新しいプロパティ
  onLoadComplete?: () => void;
  onLoadError?: () => void;
  hideInternalLoader?: boolean;
  externalLoading?: boolean;
  // フォールバック用プロパティ
  fallbackSrc?: string;
  // 競合状態防止用
  imageId?: string;
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
  imageId
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [currentImageId, setCurrentImageId] = useState(imageId);

  // iOS Safari用のCanvas制限値
  const MAX_CANVAS_DIMENSION = 2048;
  const MAX_CANVAS_AREA = 2048 * 2048;

  // Canvas サイズを制限内に調整
  const getOptimalCanvasSize = (imgWidth: number, imgHeight: number) => {
    let width = imgWidth;
    let height = imgHeight;

    // 寸法制限チェック
    if (width > MAX_CANVAS_DIMENSION || height > MAX_CANVAS_DIMENSION) {
      const ratio = Math.min(MAX_CANVAS_DIMENSION / width, MAX_CANVAS_DIMENSION / height);
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    // 総面積制限チェック
    if (width * height > MAX_CANVAS_AREA) {
      const ratio = Math.sqrt(MAX_CANVAS_AREA / (width * height));
      width = Math.floor(width * ratio);
      height = Math.floor(height * ratio);
    }

    return { width, height };
  };

  // 解像度を下げたURLを生成（Firebase Storageの場合）
  const getLowResUrl = (url: string) => {
    if (url.includes('firebasestorage.googleapis.com')) {
      return `${url}&q=30`;
    }
    return url;
  };

  // キャッシュから画像を取得または新規作成
  const getCachedOrCreateImage = useCallback((imageSrc: string, isFallback = false) => {
    console.log('🔍 getCachedOrCreateImage called for:', imageSrc, 'ImageId:', imageId, 'CurrentImageId:', currentImageId);
    const cacheKey = getCacheKey(imageSrc, alt);
    const cached = imageCache.get(cacheKey);
    
    // キャッシュが有効な場合（プリロードされた画像も使用可能）
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_TIME) {
      console.log('✅ Using cached image:', cacheKey, 'Size:', cached.canvas.width, 'x', cached.canvas.height, 'Current src:', currentSrc, 'Requested src:', imageSrc);
      const canvas = canvasRef.current;
      if (canvas) {
        // キャッシュされたCanvasをコピー
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Canvasのサイズを設定
          canvas.width = cached.canvas.width;
          canvas.height = cached.canvas.height;
          
          // キャッシュされたCanvasの内容をコピー
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(cached.canvas, 0, 0);
          
          // キャッシュから即座に表示される場合はローディング状態を即座に解除
          setIsLoading(false);
          setError(false);
          
          console.log('🚀 Cached image displayed immediately, loading state cleared');
          
          if (onLoadComplete) {
            setTimeout(() => onLoadComplete(), 50);
          }
        }
      }
      return;
    }

    console.log('❌ Cache miss for:', cacheKey, 'Available cache keys:', Array.from(imageCache.keys()));
    console.log('🔍 Cache check details:', {
      requestedSrc: imageSrc,
      requestedAlt: alt,
      cacheKey,
      hasCached: !!cached,
      isExpired: cached ? Date.now() - cached.timestamp > CACHE_EXPIRY_TIME : 'N/A',
      currentSrc
    });

    // キャッシュがない場合は新規作成
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
          console.log('🚫 Ignoring load completion for outdated image:', imageId, 'Current:', currentImageId);
          return;
        }
        
        console.log('🖼️ Image onload triggered for:', imageSrc, 'ImageId:', imageId, 'CurrentImageId:', currentImageId);
        
        img.alt = alt;
        
        // 最適なCanvas サイズを計算
        const { width: canvasWidth, height: canvasHeight } = getOptimalCanvasSize(img.width, img.height);
        
        // Canvasのサイズを設定
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // 画像を描画（リサイズして描画）
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

        // ウォーターマークを描画
        ctx.font = `bold ${Math.max(canvasWidth * 0.05, 24)}px Arial`;
        ctx.font = `bold ${Math.max(canvasWidth * 0.05, 24)}px serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';

        // ウォーターマークの配置計算
        const watermarkText = 'ToruTora';
        
        // 30度の角度で左下から右上に向かって平行線で表示
        const angle = -Math.PI / 6; // -30度（左下から右上）
        const textWidth = ctx.measureText(watermarkText + '     ').width;
        const lineSpacing = Math.max(canvasHeight * 0.15, 80); // 線間の間隔
        
        // 必要な平行線の数を計算
        const diagonal = Math.sqrt(canvasWidth * canvasWidth + canvasHeight * canvasHeight);
        const numLines = Math.ceil(diagonal / lineSpacing) + 6; // より多くの線を生成して隙間を埋める
        
        // 各平行線を描画
        for (let lineIndex = -Math.floor(numLines / 2); lineIndex <= Math.floor(numLines / 2); lineIndex++) {
          // 線の開始点を計算（画像中央からの相対位置）
          const centerX = canvasWidth / 2;
          const centerY = canvasHeight / 2;
          const offsetX = lineIndex * lineSpacing * Math.cos(angle + Math.PI / 2);
          const offsetY = lineIndex * lineSpacing * Math.sin(angle + Math.PI / 2);
          
          // この線上に配置するテキストの数を計算
          const lineLength = diagonal * 1.5; // 線の長さを拡張して隙間を埋める
          const textCount = Math.floor(lineLength / textWidth) + 2; // より多くのテキストを配置
          
          // 各テキストを配置
          for (let textIndex = 0; textIndex < textCount; textIndex++) {
            const progress = (textIndex - textCount / 2) / textCount;
            const x = centerX + offsetX + progress * lineLength * Math.cos(angle);
            const y = centerY + offsetY + progress * lineLength * Math.sin(angle);
            
            // 画像範囲内かチェック
            if (x >= -100 && x <= canvasWidth + 100 && y >= -100 && y <= canvasHeight + 100) {
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(angle);
              
              // 影付きテキストを描画
              ctx.strokeText(watermarkText, 0, 0);
              ctx.fillText(watermarkText, 0, 0);
              
              ctx.restore();
            }
          }
        }

        // キャッシュに保存
        const cacheCanvas = document.createElement('canvas');
        cacheCanvas.width = canvasWidth;
        cacheCanvas.height = canvasHeight;
        const cacheCtx = cacheCanvas.getContext('2d');
        if (cacheCtx) {
          cacheCtx.drawImage(canvas, 0, 0);
          imageCache.set(cacheKey, {
            canvas: cacheCanvas,
            timestamp: Date.now()
          });
          
          // キャッシュクリーンアップ
          cleanupExpiredCache();
          cleanupOldCache();
          
          console.log('Image cached:', cacheKey, 'Cache size:', imageCache.size);
        }

        // 古い画像の読み込み完了時は表示を更新しない
        if (imageId && currentImageId && imageId !== currentImageId) {
          console.log('🚫 Ignoring load completion for outdated image:', imageId, 'Current:', currentImageId);
          return;
        }
        
        setIsLoading(false);
        
        console.log('✅ Image load completed successfully:', imageSrc, 'ImageId:', imageId);
        
        // 外部コールバックを呼び出し
        if (onLoadComplete) {
          // 少し遅延してからコールバック（Canvas描画完了を確実にするため）
          setTimeout(() => {
            console.log('📞 Calling onLoadComplete callback');
            onLoadComplete();
          }, 100);
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
      
      // 古い画像の読み込みエラー時は表示を更新しない
      if (imageId && currentImageId && imageId !== currentImageId) {
        console.log('🚫 Ignoring load error for outdated image:', imageId, 'Current:', currentImageId);
        return;
      }
      
      console.log('❌ Image onerror triggered for:', imageSrc, 'ImageId:', imageId, 'CurrentImageId:', currentImageId);
      
      // フォールバックがある場合かつまだ試していない場合
      if (fallbackSrc && !isFallback && imageSrc !== fallbackSrc) {
        console.log('Trying fallback image:', fallbackSrc);
        getCachedOrCreateImage(fallbackSrc, true);
        return;
      }
      
      // フォールバックも失敗した場合またはフォールバックがない場合
      console.log('❌ Image load failed, setting error state');
      setError(true);
      setIsLoading(false);
      
      if (onLoadError) {
        onLoadError();
      }
    };

    console.log('🚀 Starting image load for:', imageSrc, 'ImageId:', imageId);
    img.src = getLowResUrl(imageSrc);
  }, [alt, onLoadComplete, onLoadError, fallbackSrc, imageId, currentImageId]);

  // srcが変更された時の初期化処理
  useEffect(() => {
    console.log('🔄 Image src changed from', currentSrc, 'to', src, 'ImageId:', imageId);
    setCurrentSrc(src);
    setCurrentImageId(imageId);
    setIsLoading(true);
    setError(false);
    
    // 画像切り替え時は確実に読み込み状態をリセット
    console.log('🔄 Reset loading state for new image:', src);
    
    // 新しい画像の読み込みを即座に開始
    if (src !== currentSrc) {
      console.log('🚀 Starting immediate load for new image:', src);
      getCachedOrCreateImage(src);
    }
  }, [src, imageId, getCachedOrCreateImage]);

  // 画像読み込み実行（表示用）
  useEffect(() => {
    console.log('🖼️ Loading image for display:', currentSrc, 'ImageId:', currentImageId);
    getCachedOrCreateImage(currentSrc);
  }, [currentSrc, getCachedOrCreateImage, currentImageId]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 ${className}`} style={style}>
        <span className="text-gray-500">画像を読み込めませんでした</span>
      </div>
    );
  }

  // 内部ローダーを隠すかどうか
  const showInternalLoader = !hideInternalLoader && isLoading && !externalLoading;

  return (
    <div className={`relative ${className}`} style={style}>
      {showInternalLoader && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-${objectFit}`}
        style={{ 
          display: isLoading ? 'none' : 'block',
          opacity: externalLoading ? 0.3 : 1,
          transition: 'opacity 0.3s ease'
        }}
      />
    </div>
  );
};

// プリロード関数をエクスポート
export { preloadImage };