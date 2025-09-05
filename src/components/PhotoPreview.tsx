import React from 'react';
import { PhotoFile } from '../types/PhotoUpload';

interface PhotoPreviewProps {
  photos: PhotoFile[];
  onRemove: (id: string) => void;
}

export const PhotoPreview: React.FC<PhotoPreviewProps> = ({ photos, onRemove }) => {
  if (photos.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">プレビュー ({photos.length}枚)</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative">
                <img
                  src={photo.preview}
                  alt={photo.originalName}
                  className="w-full h-32 object-cover"
                />
                <button
                  onClick={() => onRemove(photo.id)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
                <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  {photo.number}
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs text-gray-600 truncate" title={photo.originalName}>
                  {photo.originalName}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};