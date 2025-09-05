import { useLocation, useNavigate } from 'react-router-dom';
import { usePhotoGallery } from '../hooks/usePhotoGallery';
import { WatermarkedImage } from '../components/WatermarkedImage';
import { GalleryPhoto, PhotoSearchInfo } from '../types/Gallery';

export const PhotoCheckPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, purchasePhotos } = usePhotoGallery();

  const selectedPhotos = location.state?.selectedPhotos as GalleryPhoto[] || [];
  const allPhotoOption = location.state?.allPhotoOption as boolean || false;
  const searchInfo = location.state?.searchInfo as PhotoSearchInfo;

  const calculatePrice = () => {
    if (allPhotoOption) return 5500;
    if (selectedPhotos.length <= 3) return 0;
    return (selectedPhotos.length - 3) * 330;
  };

  const handlePurchase = async () => {
    try {
      await purchasePhotos(selectedPhotos, allPhotoOption);
      navigate('/photo-collect', { 
        state: { 
          selectedPhotos,
          allPhotoOption 
        } 
      });
    } catch (error) {
      console.error('Purchase error:', error);
      alert('購入処理中にエラーが発生しました。');
    }
  };

  if (!selectedPhotos.length) {
    navigate('/photo-info');
    return null;
  }

  const price = calculatePrice();

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
        {/* 選択された写真一覧 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {selectedPhotos.map((photo) => (
            <div key={photo.id} className="relative">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="relative aspect-square">
                  <WatermarkedImage
                    src={photo.storageUrl}
                    alt={`写真 ${photo.number}`}
                    className="w-full h-full"
                  />
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="p-2 text-center">
                  <span className="text-sm text-gray-600 font-medium">
                    {String(photo.number).padStart(3, '0')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 料金表示 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              支払い合計：{price.toLocaleString()}円
            </h2>
            {!allPhotoOption && selectedPhotos.length > 3 && (
              <p className="text-gray-600">
                追加写真{selectedPhotos.length - 3}枚 × 単価330円
              </p>
            )}
          </div>

          {/* 全データ購入オプションの案内 */}
          {!allPhotoOption && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">
                  i
                </div>
                <div className="flex-1">
                  <p className="text-blue-800 font-medium mb-2">
                    5500円のお支払いで
                    <button
                      onClick={() => navigate('/photo-select', { 
                        state: { 
                          searchInfo,
                          forceAllPhotoOption: true 
                        } 
                      })}
                      className="text-blue-600 underline mx-1"
                    >
                      こちら
                    </button>
                    から全てのお写真をご購入することができます
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handlePurchase}
            disabled={loading}
            className={`w-full py-4 rounded-lg font-semibold text-white transition-colors ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? '処理中...' : '購入完了'}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            ※お支払い完了後にウォーターマークなしの高品質画像をお届けします
          </p>
        </div>
      </div>
    </div>
  );
};