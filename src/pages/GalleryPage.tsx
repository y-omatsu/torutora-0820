import { useState } from 'react';
import { usePhotoGallery } from '../hooks/usePhotoGallery';
import { PhotoSearchInfo, GalleryPhoto } from '../types/Gallery';

export const GalleryPage: React.FC = () => {
  const { loading, photos, searchGalleryPhotos } = usePhotoGallery();
  const [showSearchModal, setShowSearchModal] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [modalPhoto, setModalPhoto] = useState<GalleryPhoto | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showDownloadComplete, setShowDownloadComplete] = useState(false);
  const [searchInfo, setSearchInfo] = useState<PhotoSearchInfo>({
    receptionNumber: '',
    shootingDate: '',
    customerName: '',
    password: '',
  });
  const [searchErrors, setSearchErrors] = useState<Partial<PhotoSearchInfo>>({});

  const handleSearchChange = (field: keyof PhotoSearchInfo, value: string) => {
    setSearchInfo(prev => ({
      ...prev,
      [field]: value
    }));
    setSearchErrors(prev => ({
      ...prev,
      [field]: ''
    }));
  };

  const validateSearchForm = (): boolean => {
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
    
    if (!searchInfo.password || !searchInfo.password.trim()) {
      newErrors.password = 'パスワードを入力してください';
    } else if (searchInfo.password && searchInfo.password !== 'torutora0820') {
      newErrors.password = 'パスワードが正しくありません';
    }
    
    setSearchErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = async () => {
    if (validateSearchForm()) {
      await searchGalleryPhotos(searchInfo);
      setShowSearchModal(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const allPhotoIds = new Set(photos.map(photo => photo.id));
      setSelectedPhotos(allPhotoIds);
    } else {
      setSelectedPhotos(new Set());
    }
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleSingleDownload = async (photo: GalleryPhoto) => {
    setDownloading(true);
    setDownloadProgress(0);
    
    // プログレスバーのアニメーション
    const progressInterval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    try {
      await downloadImage(photo.storageUrl, `photo_${photo.number}.jpg`);
      
      setTimeout(() => {
        setDownloading(false);
        setShowDownloadComplete(true);
        setDownloadProgress(0);
      }, 1200);
    } catch (error) {
      setDownloading(false);
      setDownloadProgress(0);
      alert('ダウンロードに失敗しました');
    }
  };

  const handleBulkDownload = async () => {
    if (selectedPhotos.size === 0) return;
    
    setDownloading(true);
    setDownloadProgress(0);
    
    const selectedPhotoList = photos.filter(photo => selectedPhotos.has(photo.id));
    let completed = 0;
    
    for (const photo of selectedPhotoList) {
      try {
        await downloadImage(photo.storageUrl, `photo_${photo.number}.jpg`);
        completed++;
        setDownloadProgress((completed / selectedPhotoList.length) * 100);
      } catch (error) {
        console.error('Download failed for photo:', photo.number);
      }
    }
    
    setTimeout(() => {
      setDownloading(false);
      setShowDownloadComplete(true);
      setDownloadProgress(0);
    }, 500);
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

      {/* 検索モーダル */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 p-4">
          {showSearchModal && (
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
                  onChange={(e) => handleSearchChange('receptionNumber', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    searchErrors.receptionNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder=""
                />
                {searchErrors.receptionNumber && (
                  <p className="text-red-500 text-xs mt-1">{searchErrors.receptionNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  撮影日
                </label>
                <input
                  type="date"
                  value={searchInfo.shootingDate}
                  onChange={(e) => handleSearchChange('shootingDate', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    searchErrors.shootingDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {searchErrors.shootingDate && (
                  <p className="text-red-500 text-xs mt-1">{searchErrors.shootingDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  お客様氏名（苗字のみ）
                </label>
                <input
                  type="text"
                  value={searchInfo.customerName}
                  onChange={(e) => handleSearchChange('customerName', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    searchErrors.customerName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder=""
                />
                {searchErrors.customerName && (
                  <p className="text-red-500 text-xs mt-1">{searchErrors.customerName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード
                </label>
                <input
                  type="password"
                  value={searchInfo.password}
                  onChange={(e) => handleSearchChange('password', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    searchErrors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder=""
                />
                {searchErrors.password && (
                  <p className="text-red-500 text-xs mt-1">{searchErrors.password}</p>
                )}
              </div>

              <button
                onClick={handleSearch}
                disabled={loading}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${
                  loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading ? '検索中...' : '写真を表示する'}
              </button>
            </div>
          </div>
          )}
        </div>
      )}

      {/* プログレスバーモーダル */}
      {downloading && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg p-6 w-80 shadow-lg pointer-events-auto">
            <div className="text-center mb-4">
              <span className="text-lg font-medium">{Math.round(downloadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* ダウンロード完了モーダル */}
      {showDownloadComplete && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg p-8 text-center shadow-lg pointer-events-auto">
            <div className="w-16 h-16 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-800 mb-4">
              ダウンロードが完了しました
            </p>
            <button
              onClick={() => setShowDownloadComplete(false)}
              className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      {!showSearchModal && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          {photos.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <p className="text-lg text-gray-600 mb-4">
                写真が登録されていません。
              </p>
              <p className="text-gray-600">
                Lineにてお問い合わせください
              </p>
              <button
                onClick={() => setShowSearchModal(true)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                再検索
              </button>
            </div>
          ) : (
            <>
              {/* ダウンロードボタンと全選択 */}
              <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                <button
                  onClick={handleBulkDownload}
                  disabled={selectedPhotos.size === 0 || downloading}
                  className={`w-full py-3 rounded-lg font-semibold text-white transition-colors mb-4 ${
                    selectedPhotos.size === 0 || downloading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  選択した写真をダウンロード ({selectedPhotos.size}枚)
                </button>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-800 font-medium">
                    全ての写真を選択する
                  </span>
                </label>
              </div>

              {/* 写真一覧 */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <div 
                      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setModalPhoto(photo)}
                    >
                      <div className="relative aspect-square">
                        <img
                          src={photo.storageUrl}
                          alt={`写真 ${photo.number}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePhotoSelection(photo.id);
                          }}
                          className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedPhotos.has(photo.id)
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          {selectedPhotos.has(photo.id) && (
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
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 写真拡大モーダル */}
      {modalPhoto && (
        <div className="fixed inset-0 bg-black" style={{ zIndex: 1000 }}>
          {/* ヘッダー */}
          <div className="flex items-center justify-between bg-white text-gray-800 p-4 shadow-sm">
            <button
              onClick={() => setModalPhoto(null)}
              className="text-gray-800 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-medium">{String(modalPhoto.number).padStart(3, '0')}</span>
            <button
              onClick={() => togglePhotoSelection(modalPhoto.id)}
              className={`w-8 h-8 rounded flex items-center justify-center ${
                selectedPhotos.has(modalPhoto.id)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {selectedPhotos.has(modalPhoto.id) && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          
          {/* 画像表示エリア */}
          <div className="flex items-center justify-center bg-black" style={{ height: 'calc(100vh - 140px)' }}>
            <img
              src={modalPhoto.storageUrl}
              alt={`写真 ${modalPhoto.number}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          
          {/* ダウンロードボタン */}
          <div className="p-4 bg-white border-t border-gray-200" style={{ height: '80px' }}>
            <button
              onClick={() => handleSingleDownload(modalPhoto)}
              disabled={downloading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-colors flex items-center justify-center ${
                downloading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {downloading ? 'ダウンロード中...' : 'ダウンロード'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};