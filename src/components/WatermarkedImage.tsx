import React, { useEffect, useRef, useState } from 'react';

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
  externalLoading = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // 解像度を下げたURLを生成（Firebase Storageの場合）
  const getLowResUrl = (url: string) => {
    if (url.includes('firebasestorage.googleapis.com')) {
      return `${url}&q=30`;
    }
    return url;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 新しい画像ロード時はリセット
    setIsLoading(true);
    setError(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        img.alt = alt;
        // Canvasのサイズを画像に合わせて設定
        canvas.width = img.width;
        canvas.height = img.height;

        // 画像を描画
        ctx.drawImage(img, 0, 0);

        // ウォーターマークを描画
        ctx.font = `bold ${Math.max(img.width * 0.05, 24)}px Arial`;
        ctx.font = `bold ${Math.max(img.width * 0.05, 24)}px serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';

        // ウォーターマークの配置計算
        const watermarkText = 'ToruTora';
        
        // 30度の角度で左下から右上に向かって平行線で表示
        const angle = -Math.PI / 6; // -30度（左下から右上）
        const textWidth = ctx.measureText(watermarkText + '     ').width;
        const lineSpacing = Math.max(img.height * 0.15, 80); // 線間の間隔
        
        // 必要な平行線の数を計算
        const diagonal = Math.sqrt(img.width * img.width + img.height * img.height);
        const numLines = Math.ceil(diagonal / lineSpacing) + 6; // より多くの線を生成して隙間を埋める
        
        // 各平行線を描画
        for (let lineIndex = -Math.floor(numLines / 2); lineIndex <= Math.floor(numLines / 2); lineIndex++) {
          // 線の開始点を計算（画像中央からの相対位置）
          const centerX = img.width / 2;
          const centerY = img.height / 2;
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
            if (x >= -100 && x <= img.width + 100 && y >= -100 && y <= img.height + 100) {
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

        setIsLoading(false);
        
        // 外部コールバックを呼び出し
        if (onLoadComplete) {
          // 少し遅延してからコールバック（Canvas描画完了を確実にするため）
          setTimeout(() => {
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
      console.error('Image loading error');
      setError(true);
      setIsLoading(false);
      
      if (onLoadError) {
        onLoadError();
      }
    };

    img.src = getLowResUrl(src);
  }, [src, alt, onLoadComplete, onLoadError]);

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