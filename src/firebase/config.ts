import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDnKX4BJsQRgv9tjl7R9l6edfLb2Pk6au4",
  authDomain: "nouhin-bolt-test-202508.firebaseapp.com",
  projectId: "nouhin-bolt-test-202508",
  storageBucket: "nouhin-bolt-test-202508.firebasestorage.app",
  messagingSenderId: "143363676790",
  appId: "1:143363676790:web:193dc5843f55ba891d1d57",
  measurementId: "G-4PWQ11BFWF"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);