import React, { useState, useCallback } from 'react';
import { FileDropzone } from '../components/FileDropzone';
import { PhotoPreview } from '../components/PhotoPreview';
import { MetaInfoForm } from '../components/MetaInfoForm';
import { usePhotoUpload } from '../hooks/usePhotoUpload';
import { validateMetaInfo } from '../utils/validation';
import { PhotoFile, MetaInfo } from '../types/PhotoUpload';

export const PhotoUploadPage: React.FC = () => {
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [metaInfo, setMetaInfo] = useState<MetaInfo>({
    photographerName: '',
    shootingDate: '',
    receptionNumber: '',
    customerName: '',
  });
  const [errors, setErrors] = useState<Partial<MetaInfo>>({});
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const { uploading, uploadProgress, uploadPhotos } = usePhotoUpload();

  const handleFilesAdded = useCallback((newFiles: PhotoFile[]) => {
    setPhotos(prev => {
      const updatedFiles = [...prev, ...newFiles];
      return updatedFiles.map((file, index) => ({
        ...file,
        number: index + 1
      }));
    });
    setUploadSuccess(false);
  }, []);

  const handleRemovePhoto = useCallback((id: string) => {
    setPhotos(prev => {
      const updated = prev.filter(photo => photo.id !== id);
      return updated.map((file, index) => ({
        ...file,
        number: index + 1
      }));
    });
  }, []);

  const handleMetaInfoChange = useCallback((newMetaInfo: MetaInfo) => {
    setMetaInfo(newMetaInfo);
    setErrors({});
  }, []);

  const handleUpload = async () => {
    const validationErrors = validateMetaInfo(metaInfo);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (photos.length === 0) {
      alert('アップロードする写真を選択してください。');
      return;
    }

    try {
      await uploadPhotos(photos, metaInfo);
      setUploadSuccess(true);
      setPhotos([]);
      setMetaInfo({
        photographerName: '',
        shootingDate: '',
        receptionNumber: '',
        customerName: '',
      });
      alert('写真のアップロードが完了しました！');
    } catch (error) {
      console.error('Upload error:', error);
      alert('アップロード中にエラーが発生しました。');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm mb-8">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">ToruTora</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-8 text-center">
            写真納品システム
          </h2>

          {/* ファイルドロップゾーン */}
          <div className="mb-8">
            <FileDropzone onFilesAdded={handleFilesAdded} />
          </div>

          {/* 写真プレビュー */}
          <PhotoPreview photos={photos} onRemove={handleRemovePhoto} />

          {/* メタ情報入力フォーム */}
          <div className="mt-8">
            <MetaInfoForm
              metaInfo={metaInfo}
              onChange={handleMetaInfoChange}
              errors={errors}
            />
          </div>

          {/* アップロードボタン */}
          <div className="mt-8 text-center">
            {/* 進捗表示 */}
            {uploadProgress && (
              <div className="mb-4">
                <div className="flex justify-center items-center space-x-4 mb-2">
                  <span className="text-lg font-semibold text-blue-600">
                    {uploadProgress.percentage}% 進捗中
                  </span>
                  <span className="text-sm text-gray-600">
                    {uploadProgress.current}枚 / {uploadProgress.total}枚
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress.percentage}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            <button
              onClick={handleUpload}
              disabled={uploading || photos.length === 0}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-colors ${
                uploading || photos.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {uploading ? 'アップロード中...' : 'アップロード実行'}
            </button>
          </div>

          {/* 成功メッセージ */}
          {uploadSuccess && (
            <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              写真のアップロードが正常に完了しました。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};