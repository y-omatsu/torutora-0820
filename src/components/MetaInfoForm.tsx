import React from 'react';
import { MetaInfo } from '../types/PhotoUpload';

interface MetaInfoFormProps {
  metaInfo: MetaInfo;
  onChange: (metaInfo: MetaInfo) => void;
  errors: Partial<MetaInfo>;
}

export const MetaInfoForm: React.FC<MetaInfoFormProps> = ({ 
  metaInfo, 
  onChange, 
  errors 
}) => {
  const handleChange = (field: keyof MetaInfo, value: string) => {
    onChange({
      ...metaInfo,
      [field]: value
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">撮影情報</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            カメラマン名 *
          </label>
          <input
            type="text"
            value={metaInfo.photographerName}
            onChange={(e) => handleChange('photographerName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.photographerName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="カメラマン名を入力"
          />
          {errors.photographerName && (
            <p className="text-red-500 text-xs mt-1">{errors.photographerName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            撮影日 *
          </label>
          <input
            type="date"
            value={metaInfo.shootingDate}
            onChange={(e) => handleChange('shootingDate', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.shootingDate ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.shootingDate && (
            <p className="text-red-500 text-xs mt-1">{errors.shootingDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            受付番号 *
          </label>
          <input
            type="number"
            value={metaInfo.receptionNumber}
            onChange={(e) => handleChange('receptionNumber', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.receptionNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="受付番号を入力"
          />
          {errors.receptionNumber && (
            <p className="text-red-500 text-xs mt-1">{errors.receptionNumber}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            お客様氏名（苗字のみ） *
          </label>
          <input
            type="text"
            value={metaInfo.customerName}
            onChange={(e) => handleChange('customerName', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.customerName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="お客様氏名（苗字のみ）を入力"
          />
          {errors.customerName && (
            <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>
          )}
        </div>
      </div>
    </div>
  );
};