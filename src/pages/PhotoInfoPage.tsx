import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhotoSearchInfo } from '../types/Gallery';

export const PhotoInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchInfo, setSearchInfo] = useState<PhotoSearchInfo>({
    receptionNumber: '',
    shootingDate: '',
    customerName: '',
  });
  const [errors, setErrors] = useState<Partial<PhotoSearchInfo>>({});

  const handleChange = (field: keyof PhotoSearchInfo, value: string) => {
    setSearchInfo(prev => ({
      ...prev,
      [field]: value
    }));
    setErrors(prev => ({
      ...prev,
      [field]: ''
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<PhotoSearchInfo> = {};
    
    if (!searchInfo.receptionNumber.trim()) {
      newErrors.receptionNumber = '受付番号を入力してください';
    }
    
    if (!searchInfo.shootingDate) {
      newErrors.shootingDate = '撮影日を入力してください';
    }
    
    if (!searchInfo.customerName.trim()) {
      newErrors.customerName = 'お客様氏名を入力してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      navigate('/photo-select', { state: { searchInfo } });
    }
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

      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">
            受付番号と確認番号を入力してください
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                受付番号
              </label>
              <input
                type="text"
                value={searchInfo.receptionNumber}
                onChange={(e) => handleChange('receptionNumber', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.receptionNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder=""
              />
              {errors.receptionNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.receptionNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                撮影日
              </label>
              <input
                type="date"
                value={searchInfo.shootingDate}
                onChange={(e) => handleChange('shootingDate', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.shootingDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.shootingDate && (
                <p className="text-red-500 text-xs mt-1">{errors.shootingDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                お客様氏名（苗字のみ）
              </label>
              <input
                type="text"
                value={searchInfo.customerName}
                onChange={(e) => handleChange('customerName', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.customerName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder=""
              />
              {errors.customerName && (
                <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>
              )}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              写真を表示する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};