import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getFilesInDirectory, getFileInfo } from '../utils/file.utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// API: Получение списка созданных файлов
router.get('/mappings', (req, res) => {
  try {
    const outputDir = req.query.outputDir || './wiremock-mappings';
    const mappingsPath = path.resolve(outputDir);
    
    if (!fs.existsSync(mappingsPath)) {
      return res.json({ success: true, files: [] });
    }
    
    const files = getFilesInDirectory(mappingsPath, file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(mappingsPath, file);
        return getFileInfo(filePath);
      });
    
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

export default router;