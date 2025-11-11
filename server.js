import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { convertHarToWireMock, parseHarFile } from './index.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Настройка multer для загрузки файлов
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Создаем директорию для загрузок
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// API: Загрузка HAR файла и получение списка запросов
app.post('/api/upload', upload.single('harFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const filePath = req.file.path;
    
    // Парсим HAR файл
    const requests = parseHarFile(filePath);
    
    // Сохраняем путь к файлу в сессии (в реальном приложении используйте Redis или БД)
    // Для простоты сохраняем в памяти с временным ID
    const fileId = req.file.filename;
    
    res.json({
      success: true,
      fileId,
      requests,
      count: requests.length
    });
  } catch (error) {
    console.error('Ошибка при обработке файла:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Конвертация выбранных запросов
app.post('/api/convert', async (req, res) => {
  try {
    const { fileId, selectedIndices, outputDir } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ error: 'fileId обязателен' });
    }
    
    if (!selectedIndices || !Array.isArray(selectedIndices) || selectedIndices.length === 0) {
      return res.status(400).json({ error: 'Необходимо выбрать хотя бы один запрос' });
    }
    
    const filePath = path.join('uploads', fileId);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }
    
    const selectedSet = new Set(selectedIndices.map(i => parseInt(i)));
    const outputDirectory = outputDir || './wiremock-mappings';
    
    const result = convertHarToWireMock(filePath, outputDirectory, selectedSet);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Ошибка при конвертации:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Получение списка созданных файлов
app.get('/api/mappings', (req, res) => {
  try {
    const outputDir = req.query.outputDir || './wiremock-mappings';
    const mappingsPath = path.resolve(outputDir);
    
    if (!fs.existsSync(mappingsPath)) {
      return res.json({ success: true, files: [] });
    }
    
    const files = fs.readdirSync(mappingsPath)
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(mappingsPath, file),
        size: fs.statSync(path.join(mappingsPath, file)).size
      }));
    
    res.json({
      success: true,
      files,
      count: files.length
    });
  } catch (error) {
    console.error('Ошибка при получении списка файлов:', error);
    res.status(500).json({ error: error.message });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});

