import multer from 'multer';
import fs from 'fs';

// Создаем директорию для загрузок
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Настройка multer для загрузки файлов
export const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});