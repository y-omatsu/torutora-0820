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
  console.log(`🧹 Deleted keys:`, toDelete.map(([key]) => key));
  console.log(`🧹 Deleted timestamps:`, toDelete.map(([key, value]) => ({ key, timestamp: new Date(value.timestamp).toLocaleString() })));
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

// Safari用メモリ管理
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// 動的メモリ管理（Safari用）
const checkMemoryPressure = () => {
  if (isSafari && isMobile) {
    const currentSize = imageCache.size;
    
    // Safari用：より積極的なメモリ管理（20枚制限に合わせて調整）
    if (currentSize > MAX_CACHE_SIZE * 0.8) { // 80%で緊急クリーンアップ（16枚で発動）
      console.log('🚨 Safari: Emergency cache cleanup (80% threshold)');
      cleanupOldCache();
      
      // 強制ガベージコレクション
      if (window.gc) {
        window.gc();
      }
    } else if (currentSize > MAX_CACHE_SIZE * 0.6) { // 60%で中程度のクリーンアップ（12枚で発動）
      console.log('⚠️ Safari: Moderate cache cleanup (60% threshold)');
      const entries = Array.from(imageCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, Math.floor(entries.length * 0.5)); // 50%削除（古い画像から）
      
      toDelete.forEach(([key]) => {
        const cachedImage = imageCache.get(key);
        if (cachedImage) {
          const ctx = cachedImage.canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, cachedImage.canvas.width, cachedImage.canvas.height);
          }
        }
        imageCache.delete(key);
      });
      
      console.log(`🧹 Safari: Moderate cleanup removed ${toDelete.length} OLD images, current size: ${imageCache.size}`);
      console.log(`🧹 Safari deleted keys:`, toDelete.map(([key]) => key));
      console.log(`🧹 Safari deleted timestamps:`, toDelete.map(([key, value]) => ({ key, timestamp: new Date(value.timestamp).toLocaleString() })));
    } else if (currentSize > MAX_CACHE_SIZE * 0.4) { // 40%で軽いクリーンアップ（8枚で発動）
      console.log('🧹 Safari: Light cache cleanup (40% threshold)');
      const entries = Array.from(imageCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, Math.floor(entries.length * 0.3)); // 30%のみ削除（古い画像から）
      
      toDelete.forEach(([key]) => {
        const cachedImage = imageCache.get(key);
        if (cachedImage) {
          const ctx = cachedImage.canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, cachedImage.canvas.width, cachedImage.canvas.height);
          }
        }
        imageCache.delete(key);
      });
      
      console.log(`🧹 Safari: Light cleanup removed ${toDelete.length} OLD images, current size: ${imageCache.size}`);
      console.log(`🧹 Safari deleted keys:`, toDelete.map(([key]) => key));
      console.log(`🧹 Safari deleted timestamps:`, toDelete.map(([key, value]) => ({ key, timestamp: new Date(value.timestamp).toLocaleString() })));
    }
  }
};

// デバッグ用：キャッシュ統計をコンソールに出力
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = getCacheStats();
    if (stats.size > 0) {
      console.log('Image Cache Stats:', stats);
    }
    checkMemoryPressure();
  }, 30000); // 30秒ごとに統計を出力
  
  // Safari用：強制メモリクリーンアップ関数をグローバルに公開
  if (isSafari && isMobile) {
    (window as any).forceSafariCleanup = () => {
      console.log('🧹 Force Safari cleanup triggered');
      const oldSize = imageCache.size;
      cleanupOldCache();
      console.log(`🧹 Safari cleanup: ${oldSize} -> ${imageCache.size} images`);
      
      // 強制ガベージコレクション
      if (window.gc) {
        window.gc();
        console.log('🗑️ Forced garbage collection');
      }
    };
  }
}
  
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
  
  // 画像キャッシュをグローバルに公開
  (window as any).imageCache = imageCache;

// プリロード進行中の画像を追跡するMap
const preloadingImages = new Map<string, Promise<void>>();

// 優先ダウンロード用の画像読み込み関数
const loadImageWithPriority = (src: string, alt: string, fallbackSrc?: string) => {
  const cacheKey = getCacheKey(src, alt);
  
  console.log('🔍 PRIORITY LOAD DEBUG START:', {
    src,
    alt,
    cacheKey,
    isSafari: isSafari,
    isMobile: isMobile,
    cacheSize: imageCache.size,
    maxCacheSize: MAX_CACHE_SIZE,
    memoryPressure: isSafari && isMobile ? 'Safari Mobile' : 'Other'
  });
  
  // 既にキャッシュされている場合は即座に返す
  if (imageCache.has(cacheKey)) {
    console.log('✅ Priority image already cached:', cacheKey);
    return Promise.resolve();
  }
  
  // 既にプリロード中の場合はそのPromiseを返す
  if (preloadingImages.has(cacheKey)) {
    console.log('⏳ Priority image already preloading, using existing promise:', cacheKey);
    return preloadingImages.get(cacheKey)!;
  }
  
  console.log('🚀 Starting PRIORITY load for:', cacheKey, 'src:', src);
  
  // 優先ダウンロード用のPromiseを作成
  const priorityPromise = new Promise<void>((resolve, reject) => {
    console.log('🔧 Creating priority Promise for:', cacheKey);
    const img = new Image() as HTMLImageElement & { onloadCalled?: boolean; onerrorCalled?: boolean };
    img.crossOrigin = 'anonymous';
    
    console.log('🖼️ Priority Image object created:', {
      src: img.src,
      crossOrigin: img.crossOrigin,
      cacheKey
    });
    
    // 優先ダウンロード用：より短いタイムアウト
    const timeoutId = setTimeout(() => {
      console.error('⏰ Priority load timeout for:', src, 'after 8 seconds');
      console.log('🔍 Timeout debug info:', {
        imgComplete: img.complete,
        imgNaturalWidth: img.naturalWidth,
        imgNaturalHeight: img.naturalHeight,
        imgSrc: img.src,
        onloadCalled: img.onloadCalled,
        onerrorCalled: img.onerrorCalled,
        cacheKey
      });
      if (!img.onloadCalled && !img.onerrorCalled) {
        img.onerrorCalled = true;
        img.onerror?.(new Event('error'));
      }
    }, 8000); // 8秒でタイムアウト（プリロードより短い）
    
    img.onload = () => {
      console.log('🎉 Priority onload event triggered for:', cacheKey);
      clearTimeout(timeoutId);
      
      if (img.onloadCalled) {
        console.log('🚫 Duplicate priority onload event, ignoring');
        return;
      }
      img.onloadCalled = true;
      
      console.log('🔍 Priority onload debug info:', {
        imgComplete: img.complete,
        imgNaturalWidth: img.naturalWidth,
        imgNaturalHeight: img.naturalHeight,
        imgSrc: img.src,
        cacheKey
      });
      
      try {
        // 優先ダウンロード用のCanvasを作成
        const priorityCanvas = document.createElement('canvas');
        const priorityCtx = priorityCanvas.getContext('2d');
        if (!priorityCtx) {
          reject(new Error('Failed to get priority canvas context'));
          return;
        }

        // 最適なCanvas サイズを計算（優先ダウンロード用）
        const MAX_CANVAS_DIMENSION = 1024; // 優先ダウンロード用
        const MAX_CANVAS_AREA = 1024 * 1024; // 約1MB/画像に削減
        
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
        
        const { width: canvasWidth, height: canvasHeight } = getOptimalCanvasSize(img.width, img.height);
        
        priorityCanvas.width = canvasWidth;
        priorityCanvas.height = canvasHeight;

        // 画像を描画
        priorityCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

        // ウォーターマークを描画（表示用と同じ処理）
        priorityCtx.font = `bold ${Math.max(canvasWidth * 0.05, 24)}px serif`;
        priorityCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        priorityCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        priorityCtx.lineWidth = 3;
        priorityCtx.textAlign = 'center';

        // ウォーターマークの配置計算
        const watermarkText = 'ToruTora';
        const angle = -Math.PI / 6; // -30度
        const textWidth = priorityCtx.measureText(watermarkText + '     ').width;
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
              priorityCtx.save();
              priorityCtx.translate(x, y);
              priorityCtx.rotate(angle);
              priorityCtx.strokeText(watermarkText, 0, 0);
              priorityCtx.fillText(watermarkText, 0, 0);
              priorityCtx.restore();
            }
          }
        }

        // キャッシュに保存
        imageCache.set(cacheKey, {
          canvas: priorityCanvas,
          timestamp: Date.now()
        });
        
        // キャッシュクリーンアップ
        cleanupExpiredCache();
        cleanupOldCache();
        
        console.log('✅ Priority image loaded and cached:', cacheKey, 'Size:', canvasWidth, 'x', canvasHeight);
        
        // プリロードMapから削除
        preloadingImages.delete(cacheKey);
        resolve();
      } catch (err) {
        console.error('Priority canvas drawing error:', err);
        preloadingImages.delete(cacheKey);
        reject(err);
      }
    };

    img.onerror = () => {
      console.log('❌ Priority onerror event triggered for:', cacheKey);
      clearTimeout(timeoutId);
      
      if (img.onerrorCalled) {
        console.log('🚫 Duplicate priority onerror event, ignoring');
        return;
      }
      img.onerrorCalled = true;
      
      console.error('Priority image loading error for:', src);
      console.log('🔍 Priority onerror debug info:', {
        imgComplete: img.complete,
        imgNaturalWidth: img.naturalWidth,
        imgNaturalHeight: img.naturalHeight,
        imgSrc: img.src,
        cacheKey
      });
      
      // フォールバックがある場合はフォールバックを試す
      if (fallbackSrc && src !== fallbackSrc) {
        console.log('Trying fallback for priority load:', fallbackSrc);
        loadImageWithPriority(fallbackSrc, alt).then(resolve).catch(reject);
        return;
      }
      
      preloadingImages.delete(cacheKey);
      reject(new Error(`Failed to load priority image: ${src}`));
    };

    img.src = src;
    
    // Safari用：優先ダウンロード画像読み込み状況を定期的にチェック
    if (isSafari && isMobile) {
      console.log('🍎 Safari: Starting priority polling check for:', cacheKey);
      const checkInterval = setInterval(() => {
        console.log('🔍 Safari priority polling check:', {
          imgComplete: img.complete,
          imgNaturalWidth: img.naturalWidth,
          imgNaturalHeight: img.naturalHeight,
          imgSrc: img.src,
          cacheKey
        });
        
        if (img.complete) {
          clearInterval(checkInterval);
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            console.log('✅ Safari: Priority image loaded via polling check');
            if (!img.onloadCalled && !img.onerrorCalled) {
              img.onloadCalled = true;
              img.onload?.(new Event('load'));
            }
          } else {
            console.log('❌ Safari: Priority image failed via polling check');
            if (!img.onloadCalled && !img.onerrorCalled) {
              img.onerrorCalled = true;
              img.onerror?.(new Event('error'));
            }
          }
        }
      }, 50); // より頻繁にチェック（50ms）
      
      // 6秒後にポーリングを停止（プリロードより短い）
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!img.onloadCalled && !img.onerrorCalled) {
          console.log('⏰ Safari: Priority polling timeout, treating as error');
          if (!img.onerrorCalled) {
            img.onerrorCalled = true;
            img.onerror?.(new Event('error'));
          }
        }
      }, 6000);
    }
  });
  
  // 優先ダウンロードPromiseをMapに保存
  preloadingImages.set(cacheKey, priorityPromise);
  
  return priorityPromise;
};

// 優先ダウンロード関数をグローバルに公開
(window as any).loadImageWithPriority = loadImageWithPriority;

// 画像プリロード関数（表示に影響しない完全独立した処理）
const preloadImage = (src: string, alt: string, fallbackSrc?: string) => {
  const cacheKey = getCacheKey(src, alt);
  
  // 既にキャッシュされている場合はスキップ
  if (imageCache.has(cacheKey)) {
    console.log('Image already cached, skipping preload:', cacheKey);
    return Promise.resolve();
  }
  
  // 既にプリロード中の場合は同じPromiseを返す
  if (preloadingImages.has(cacheKey)) {
    console.log('Image already preloading, returning existing promise:', cacheKey);
    return preloadingImages.get(cacheKey)!;
  }

  console.log('🔄 Starting preload for:', cacheKey, 'src:', src);

  // iOS Safari用のCanvas制限値（プリロード用）- メモリ制限を考慮して削減
  const MAX_CANVAS_DIMENSION = 1024; // 2048から1024に削減
  const MAX_CANVAS_AREA = 1024 * 1024; // 約1MB/画像に削減

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

  // プリロード用URL生成（表示用と同じURLを使用）
  const getPreloadUrl = (url: string) => {
    // プリロード時も表示時と同じURLを使用してキャッシュキーを一致させる
    return url;
  };

  const preloadPromise = new Promise<void>((resolve, reject) => {
    const img = new Image() as HTMLImageElement & { onloadCalled?: boolean; onerrorCalled?: boolean };
    img.crossOrigin = 'anonymous';
    
    // Safari用：タイムアウト処理を追加
    const timeoutId = setTimeout(() => {
      console.error('⏰ Preload timeout for:', src);
      if (!img.onloadCalled && !img.onerrorCalled) {
        img.onerrorCalled = true;
        img.onerror?.(new Event('error'));
      }
    }, 10000); // 10秒でタイムアウト
    
    img.onload = () => {
      clearTimeout(timeoutId);
      
      // 重複発火を防ぐ
      if (img.onloadCalled || img.onerrorCalled) {
        console.log('🚫 Duplicate preload onload event, ignoring');
        return;
      }
      img.onloadCalled = true;
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
        
        // プリロード完了時にMapから削除
        preloadingImages.delete(cacheKey);
        resolve();
      } catch (err) {
        console.error('Preload canvas drawing error:', err);
        reject(err);
      }
    };

    img.onerror = (error) => {
      clearTimeout(timeoutId);
      
      // 重複発火を防ぐ
      if (img.onloadCalled || img.onerrorCalled) {
        console.log('🚫 Duplicate preload onerror event, ignoring');
        return;
      }
      img.onerrorCalled = true;
      
      console.error('Preload image loading error for:', src);
      console.error('Preload error details:', error);
      
      // フォールバックがある場合はフォールバックを試す
      if (fallbackSrc && src !== fallbackSrc) {
        console.log('Trying fallback for preload:', fallbackSrc);
        preloadImage(fallbackSrc, alt).then(resolve).catch(reject);
        return;
      }
      
      // プリロード失敗時もMapから削除
      preloadingImages.delete(cacheKey);
      reject(new Error(`Failed to load image: ${src}`));
    };

    img.src = getPreloadUrl(src);
    
    // Safari用：プリロード画像読み込み状況を定期的にチェック
    if (isSafari && isMobile) {
      const checkInterval = setInterval(() => {
        if (img.complete) {
          clearInterval(checkInterval);
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            console.log('✅ Safari: Preload image loaded via polling check');
            // 手動でonloadを発火（既に発火済みの場合はスキップ）
            if (!img.onloadCalled) {
              img.onloadCalled = true;
              img.onload?.(new Event('load'));
            }
          } else {
            console.log('❌ Safari: Preload image failed via polling check');
            // 手動でonerrorを発火（既に発火済みの場合はスキップ）
            if (!img.onerrorCalled) {
              img.onerrorCalled = true;
              img.onerror?.(new Event('error'));
            }
          }
        }
      }, 100); // 100msごとにチェック
      
      // 8秒後にポーリングを停止
      setTimeout(() => {
        clearInterval(checkInterval);
        // ポーリング終了時、まだ読み込み完了していない場合はエラーとして処理
        if (!img.onloadCalled && !img.onerrorCalled) {
          console.log('⏰ Safari: Preload polling timeout, treating as error');
          if (!img.onerrorCalled) {
            img.onerrorCalled = true;
            img.onerror?.(new Event('error'));
          }
        }
      }, 8000);
    }
  });
  
  // プリロードPromiseをMapに保存
  preloadingImages.set(cacheKey, preloadPromise);
  
  return preloadPromise;
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
  // CSSウォーターマーク用
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

  // iOS Safari用のCanvas制限値 - メモリ制限を考慮して削減
  const MAX_CANVAS_DIMENSION = 1024; // 2048から1024に削減
  const MAX_CANVAS_AREA = 1024 * 1024; // 約1MB/画像に削減

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
    
    // Safari用メモリ圧迫チェック
    checkMemoryPressure();
    
    // リロードボタン用：キャッシュを無視して強制再読み込み
    const isReload = imageSrc.includes('?t=');
    if (isReload) {
      console.log('🔄 Reload detected, bypassing cache for:', imageSrc);
      const cacheKey = getCacheKey(imageSrc, alt);
      imageCache.delete(cacheKey); // キャッシュを削除
      
      // Safari用：関連するキャッシュも削除
      if (isSafari && isMobile) {
        console.log('🧹 Safari: Clearing all related cache entries for reload');
        const baseUrl = imageSrc.split('?')[0]; // タイムスタンプを除去
        for (const [key] of imageCache.entries()) {
          if (key.includes(baseUrl) && key.includes(alt)) {
            imageCache.delete(key);
            console.log('🗑️ Safari: Cleared related cache for reload:', key);
          }
        }
      }
    }
    
    const cacheKey = getCacheKey(imageSrc, alt);
    const cached = imageCache.get(cacheKey);
    
    // Safari用：グレー背景（エラー状態）のキャッシュを無視
    if (cached && isSafari && isMobile) {
      const canvas = cached.canvas;
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        // キャンバスが完全にグレーかどうかチェック
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 10), Math.min(canvas.height, 10));
          const data = imageData.data;
          let isGray = true;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // 完全にグレー（R=G=B）でない場合は有効な画像とみなす
            if (r !== g || g !== b) {
              isGray = false;
              break;
            }
          }
          if (isGray) {
            console.log('🚫 Safari: Detected gray background cache, removing:', cacheKey);
            imageCache.delete(cacheKey);
            // キャッシュを削除したので、新規作成に進む
          }
        }
      }
    }
    
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

    // 削除された画像を表示しようとしている場合の特別処理
    if (!cached) {
      console.log('🚫 Image was deleted from cache, loading fresh from storage:', imageSrc);
      console.log('💡 This might be due to memory cleanup - loading fresh image');
      
      // プリロード途中の画像かチェック
      if (preloadingImages.has(cacheKey)) {
        console.log('⏳ Image is currently preloading, waiting for completion:', cacheKey);
        
        // プリロード待機のタイムアウト処理（3秒でタイムアウト）
        const preloadTimeout = setTimeout(() => {
          console.log('⏰ Preload wait timeout, falling back to direct load:', cacheKey);
          preloadingImages.delete(cacheKey);
          loadImageDirectly();
        }, 3000);
        
        preloadingImages.get(cacheKey)!.then(() => {
          clearTimeout(preloadTimeout);
          console.log('✅ Preload completed, retrying display:', cacheKey);
          // プリロード完了後に再試行
          getCachedOrCreateImage(imageSrc, isFallback);
        }).catch((error) => {
          clearTimeout(preloadTimeout);
          console.error('❌ Preload failed, falling back to direct load:', error);
          // プリロード失敗時は直接読み込み
          loadImageDirectly();
        });
        return;
      }
      
      // Safari用：メモリ不足時の特別処理
      if (isSafari && isMobile) {
        console.log('🍎 Safari: Memory pressure detected, using aggressive cleanup');
        // より積極的にキャッシュをクリア
        const entries = Array.from(imageCache.entries());
        if (entries.length > 5) { // 5枚以下に強制削減
          entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
          const toDelete = entries.slice(0, entries.length - 5);
          toDelete.forEach(([key]) => {
            const cachedImage = imageCache.get(key);
            if (cachedImage) {
              const ctx = cachedImage.canvas.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, cachedImage.canvas.width, cachedImage.canvas.height);
              }
            }
            imageCache.delete(key);
          });
          console.log(`🧹 Safari: Aggressive cleanup removed ${toDelete.length} images, current size: ${imageCache.size}`);
        }
      }
    }

    // 直接読み込み関数を定義
    const loadImageDirectly = () => {
      console.log('🔄 Loading directly from storage (no cache):', imageSrc);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image() as HTMLImageElement & { onloadCalled?: boolean; onerrorCalled?: boolean };
    img.crossOrigin = 'anonymous';
    
    // Safari用：タイムアウト処理を追加
    const timeoutId = setTimeout(() => {
      console.error('⏰ Image load timeout for:', imageSrc);
      if (imageId && currentImageId && imageId !== currentImageId) {
        console.log('🚫 Ignoring timeout for outdated image:', imageId, 'Current:', currentImageId);
        return;
      }
      
      // タイムアウト時はエラーとして処理
      console.log('❌ Timeout: Setting error state for:', imageSrc);
      setError(true);
      setIsLoading(false);
      if (onLoadError) {
        onLoadError();
      }
    }, 12000); // 12秒でタイムアウト（ポーリングより長く）
    
    img.onload = () => {
      clearTimeout(timeoutId); // タイムアウトをクリア
      
      // 重複発火を防ぐ
      if (img.onloadCalled) {
        console.log('🚫 Duplicate onload event, ignoring');
        return;
      }
      img.onloadCalled = true;
      
      try {
        console.log('🖼️ Image onload triggered for:', imageSrc, 'ImageId:', imageId, 'CurrentImageId:', currentImageId);
        console.log('🖼️ Image dimensions:', img.width, 'x', img.height);
        console.log('🖼️ User Agent:', navigator.userAgent);
        
        // 古い画像の読み込み完了時は表示を更新しない
        if (imageId && currentImageId && imageId !== currentImageId) {
          console.log('🚫 Ignoring load completion for outdated image:', imageId, 'Current:', currentImageId);
          return;
        }
        
        img.alt = alt;
        console.log('🎨 Starting canvas drawing for:', imageSrc, 'Dimensions:', img.width, 'x', img.height);
        
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

        // キャッシュにない場合は直接表示のみ（キャッシュ保存なし）
        // これにより削除された画像も正常に表示される
        console.log('✅ Image loaded directly from storage (no cache):', imageSrc);
        console.log('🎨 Canvas drawing completed, size:', canvasWidth, 'x', canvasHeight);

        // 古い画像の読み込み完了時は表示を更新しない
        if (imageId && currentImageId && imageId !== currentImageId) {
          console.log('🚫 Ignoring load completion for outdated image:', imageId, 'Current:', currentImageId);
          return;
        }
        
        console.log('🔄 Setting loading state to false for:', imageSrc);
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

    img.onerror = (error) => {
      clearTimeout(timeoutId); // タイムアウトをクリア
      
      // 重複発火を防ぐ
      if (img.onerrorCalled) {
        console.log('🚫 Duplicate onerror event, ignoring');
        return;
      }
      img.onerrorCalled = true;
      
      console.error('Image loading error for:', imageSrc);
      console.error('Error details:', error);
      console.error('User Agent:', navigator.userAgent);
      console.error('Image src:', img.src);
      
      // Safari用：エラー時にキャッシュをクリア
      if (isSafari && isMobile) {
        const cacheKey = getCacheKey(imageSrc, alt);
        imageCache.delete(cacheKey);
        console.log('🗑️ Safari: Cleared error cache for:', cacheKey);
      }
      
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
    
    // Safari用：画像読み込み状況を定期的にチェック（キャッシュにない場合）
    if (isSafari && isMobile) {
      const checkInterval = setInterval(() => {
        if (img.complete) {
          clearInterval(checkInterval);
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            console.log('✅ Safari: Direct storage image loaded via polling check');
            // 手動でonloadを発火（既に発火済みの場合はスキップ）
            if (!img.onloadCalled && !img.onerrorCalled) {
              img.onloadCalled = true;
              img.onload?.(new Event('load'));
            }
          } else {
            console.log('❌ Safari: Direct storage image failed via polling check');
            // 手動でonerrorを発火（既に発火済みの場合はスキップ）
            if (!img.onloadCalled && !img.onerrorCalled) {
              img.onerrorCalled = true;
              img.onerror?.(new Event('error'));
            }
          }
        }
      }, 100); // 100msごとにチェック
      
      // 8秒後にポーリングを停止（タイムアウトより短く）
      setTimeout(() => {
        clearInterval(checkInterval);
        // ポーリング終了時、まだ読み込み完了していない場合はエラーとして処理
        if (!img.onloadCalled && !img.onerrorCalled) {
          console.log('⏰ Safari: Polling timeout, treating as error');
          if (!img.onerrorCalled) {
            img.onerrorCalled = true;
            img.onerror?.(new Event('error'));
          }
        }
      }, 8000);
    }
    };
    
    // 直接読み込みを実行
    loadImageDirectly();
  }, [alt, onLoadComplete, onLoadError, fallbackSrc, imageId, currentImageId]);

  // srcが変更された時の初期化処理と画像読み込みを統合
  useEffect(() => {
    console.log('🔄 Image src changed from', currentSrc, 'to', src, 'ImageId:', imageId);
    console.log('🔄 User Agent:', navigator.userAgent);
    console.log('🔄 Is Mobile:', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    
    setCurrentSrc(src);
    setCurrentImageId(imageId);
    setIsLoading(true);
    setError(false);
    
    // 画像切り替え時は確実に読み込み状態をリセット
    console.log('🔄 Reset loading state for new image:', src);
    
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
        className={`w-full h-full object-${objectFit}`}
        style={{ 
          display: 'block',
          opacity: (isLoading && !externalLoading) ? 0 : 1,
          transition: 'opacity 0.3s ease'
        }}
      />
    </div>
  );
};

// プリロード関数をエクスポート
export { preloadImage };