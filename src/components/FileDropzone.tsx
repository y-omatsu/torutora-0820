import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { PhotoFile } from '../types/PhotoUpload';

interface FileDropzoneProps {
  onFilesAdded: (files: PhotoFile[]) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({ onFilesAdded }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const photoFiles: PhotoFile[] = acceptedFiles.map((file, index) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      originalName: file.name,
      number: index + 1
    }));
    
    onFilesAdded(photoFiles);
  }, [onFilesAdded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    multiple: true
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center space-y-4">
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <div>
          <p className="text-lg font-medium text-gray-700">
            {isDragActive ? '写真をドロップしてください' : '写真をドラッグ&ドロップ'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            または<span className="text-blue-500 underline">ファイルを選択</span>
          </p>
        </div>
      </div>
    </div>
  );
};