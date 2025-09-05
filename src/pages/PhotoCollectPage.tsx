import { useLocation } from 'react-router-dom';
import { GalleryPhoto } from '../types/Gallery';

export const PhotoCollectPage: React.FC = () => {
  const location = useLocation();
  const selectedPhotos = location.state?.selectedPhotos as GalleryPhoto[] || [];

  const getPhotoNumbers = () => {
    return selectedPhotos
      .map(photo => String(photo.number).padStart(3, '0'))
      .join('/');
  };

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

      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            ご購入ありがとうございます
          </h2>
          
          {selectedPhotos.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-700 font-medium mb-2">購入した写真番号:</p>
              <p className="text-lg font-bold text-blue-600 mb-4">
                {getPhotoNumbers()}
              </p>
            </div>
          )}
          
          <p className="text-gray-600 leading-relaxed">
            ※お支払い確認後、ウォーターマークなしの画像を再納品させて頂きます
          </p>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              控えとして本画面をスクリーンショットで保存していただくことをおすすめします
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};