import { Routes, Route, Navigate } from 'react-router-dom';
import { PhotoUploadPage } from './pages/PhotoUploadPage';
import { PhotoInfoPage } from './pages/PhotoInfoPage';
import { PhotoSelectPage } from './pages/PhotoSelectPage';
import { PhotoCheckPage } from './pages/PhotoCheckPage';
import { PhotoCollectPage } from './pages/PhotoCollectPage';
import { GalleryPage } from './pages/GalleryPage';

function App() {
  return (
    <Routes>
      <Route path="/nouhin" element={<PhotoUploadPage />} />
      <Route path="/photo-info" element={<PhotoInfoPage />} />
      <Route path="/photo-select" element={<PhotoSelectPage />} />
      <Route path="/photo-check" element={<PhotoCheckPage />} />
      <Route path="/photo-collect" element={<PhotoCollectPage />} />
      <Route path="/gallery" element={<GalleryPage />} />
      {/* ルートパスのリダイレクトを最後に移動 */}
      <Route path="/" element={<Navigate to="/photo-info" replace />} />
    </Routes>
  );
}

export default App;