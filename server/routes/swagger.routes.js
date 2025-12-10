import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { listEndpoints, convertOpenApiToWireMock, analyzeDtoUsage } from '../../swagger.js';
import { upload } from '../config/multer.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// API: Загрузка Swagger/OpenAPI и получение списка эндпоинтов
router.post('/upload-swagger', upload.single('swaggerFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    const filePath = req.file.path;
    const endpoints = listEndpoints(filePath);
    const fileId = req.file.filename;
    res.json({
      success: true,
      fileId,
      endpoints,
      count: endpoints.length
    });
  } catch (error) {
    console.error('Ошибка при обработке swagger:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Генерация моков из Swagger по выбранным эндпоинтам
router.post('/generate-from-swagger', async (req, res) => {
  try {
    const { fileId, selectedIndices, outputDir, variantsPerEndpoint, selectedParams, customRules } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId обязателен' });
    }
    if (!selectedIndices || !Array.isArray(selectedIndices) || selectedIndices.length === 0) {
      return res.status(400).json({ error: 'Необходимо выбрать хотя бы один эндпоинт' });
    }

    const filePath = path.join('uploads', fileId);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    const selectedSet = new Set(selectedIndices.map(i => parseInt(i)));

    // Преобразуем выбранные параметры в Set
    const processedParams = {};
    if (selectedParams) {
      Object.keys(selectedParams).forEach(indexStr => {
        processedParams[parseInt(indexStr)] = {
          query: selectedParams[indexStr].query ? new Set(selectedParams[indexStr].query) : undefined,
          headers: selectedParams[indexStr].headers ? new Set(selectedParams[indexStr].headers) : undefined,
        };
      });
    }

    const result = convertOpenApiToWireMock(filePath, {
      selectedIndices: selectedSet,
      outputDir: outputDir || './wiremock-mappings',
      variantsPerEndpoint: parseInt(variantsPerEndpoint || 1),
      selectedParams: processedParams,
      customRules: Array.isArray(customRules) ? customRules : [],
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Ошибка при генерации из swagger:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Анализ DTO из Swagger файла
router.post('/analyze-swagger-dto', (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: 'fileId обязателен' });
    }

    const filePath = path.join('uploads', fileId);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    const result = analyzeDtoUsage(filePath);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Ошибка при анализе DTO:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;