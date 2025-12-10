import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { convertHarToWireMock, parseHarFile } from '../../index.js';
import { upload } from '../config/multer.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// API: Загрузка HAR файла и получение списка запросов
router.post('/upload', upload.single('harFile'), (req, res) => {
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
router.post('/convert', async (req, res) => {
  try {
    const { fileId, selectedIndices, selectedOptions, outputDir } = req.body;
    
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
    
    // Преобразуем selectedOptions из объекта с массивами в объект с Set
    let processedOptions = null;
    if (selectedOptions) {
      processedOptions = {};
      Object.keys(selectedOptions).forEach(indexStr => {
        const index = parseInt(indexStr);
        processedOptions[index] = {
          headers: selectedOptions[indexStr].headers 
            ? new Set(selectedOptions[indexStr].headers) 
            : null,
          queryParams: selectedOptions[indexStr].queryParams 
            ? new Set(selectedOptions[indexStr].queryParams) 
            : null
        };
      });
    }
    
    const result = convertHarToWireMock(filePath, outputDirectory, selectedSet, processedOptions);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Ошибка при конвертации:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;