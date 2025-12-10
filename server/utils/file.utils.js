import fs from 'fs';
import path from 'path';

/**
 * Проверяет существование файла
 * @param {string} filePath - Путь к файлу
 * @returns {boolean} Существует ли файл
 */
export function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Получает список файлов в директории
 * @param {string} dirPath - Путь к директории
 * @param {function} filterFn - Функция фильтрации файлов (опционально)
 * @returns {Array} Массив файлов
 */
export function getFilesInDirectory(dirPath, filterFn = null) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  
  const files = fs.readdirSync(dirPath);
  return filterFn ? files.filter(filterFn) : files;
}

/**
 * Получает информацию о файле
 * @param {string} filePath - Путь к файлу
 * @returns {Object} Информация о файле
 */
export function getFileInfo(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const stat = fs.statSync(filePath);
  return {
    name: path.basename(filePath),
    path: filePath,
    size: stat.size
  };
}