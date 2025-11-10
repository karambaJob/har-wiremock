import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Конвертирует HAR файл в WireMock stub mappings
 * @param {string} harFilePath - Путь к HAR файлу
 * @param {string} outputDir - Директория для сохранения моков
 */
function convertHarToWireMock(harFilePath, outputDir = './wiremock-mappings') {
  try {
    // Читаем HAR файл
    const harContent = fs.readFileSync(harFilePath, 'utf8');
    const harData = JSON.parse(harContent);

    // Создаем директорию для выходных файлов
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Извлекаем запросы из HAR
    const entries = harData.log?.entries || [];
    
    if (entries.length === 0) {
      console.log('⚠️  В HAR файле не найдено запросов');
      return;
    }

    console.log(`📦 Найдено ${entries.length} запросов в HAR файле`);

    // Конвертируем каждый запрос в WireMock stub
    entries.forEach((entry, index) => {
      const request = entry.request;
      const response = entry.response;

      // Пропускаем запросы без URL
      if (!request?.url) {
        return;
      }

      // Извлекаем путь из URL
      const url = new URL(request.url);
      const urlPath = url.pathname + url.search;

      // Создаем WireMock stub mapping
      const stubMapping = {
        request: {
          method: request.method || 'GET',
          urlPath: urlPath,
        },
        response: {
          status: response.status || 200,
          headers: convertHeaders(response.headers || [], false),
          body: extractBody(response),
        },
      };

      // Добавляем query параметры, если они есть (с фильтрацией токенов)
      if (request.queryString && request.queryString.length > 0) {
        const filteredQueryParams = filterQueryParameters(request.queryString);
        if (Object.keys(filteredQueryParams).length > 0) {
          stubMapping.request.queryParameters = filteredQueryParams;
        }
      }

      // Добавляем заголовки запроса, если нужно (с фильтрацией)
      if (request.headers && request.headers.length > 0) {
        const requestHeaders = convertHeaders(request.headers, true);
        if (Object.keys(requestHeaders).length > 0) {
          stubMapping.request.headers = requestHeaders;
        }
      }

      // Генерируем имя файла
      const method = (request.method || 'GET').toLowerCase();
      const pathName = urlPath.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
      const fileName = `${method}_${pathName}_${index + 1}.json`;

      // Сохраняем stub mapping
      const filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(stubMapping, null, 2), 'utf8');
      
      console.log(`✅ Создан мок: ${fileName}`);
    });

    console.log(`\n✨ Конвертация завершена! Моки сохранены в: ${outputDir}`);
    
  } catch (error) {
    console.error('❌ Ошибка при конвертации:', error.message);
    process.exit(1);
  }
}

/**
 * Список заголовков, которые нужно отфильтровать (специфичны для окружения)
 */
const FILTERED_HEADERS = [
  // Авторизация и аутентификация
  'authorization',
  'cookie',
  'x-auth-token',
  'x-api-key',
  'x-session-token',
  'x-csrf-token',
  'x-requested-with',
  'x-access-token',
  'x-refresh-token',
  
  // Заголовки хоста и окружения
  'host',
  'origin',
  'referer',
  'x-forwarded-host',
  'x-forwarded-for',
  'x-real-ip',
  'x-forwarded-proto',
  'x-original-host',
  
  // Системные заголовки
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'accept-encoding',
  'upgrade',
  
  // Заголовки браузера (опционально, можно оставить если нужны)
  // 'user-agent',
  // 'accept-language',
  // 'accept-charset',
  
  // Другие специфичные заголовки
  'if-modified-since',
  'if-none-match',
  'cache-control',
  'pragma',
];

/**
 * Конвертирует массив заголовков HAR в объект с фильтрацией
 * @param {Array} headers - Массив заголовков из HAR
 * @param {boolean} isRequest - true для заголовков запроса, false для ответа
 */
function convertHeaders(headers, isRequest = true) {
  const result = {};
  headers.forEach(header => {
    const headerName = header.name.toLowerCase();
    
    // Для запросов фильтруем больше заголовков
    if (isRequest && FILTERED_HEADERS.includes(headerName)) {
      return;
    }
    
    // Для ответов фильтруем только системные
    if (!isRequest) {
      const responseFilteredHeaders = [
        'content-encoding',
        'content-length',
        'transfer-encoding',
        'connection',
        'date',
        'server',
        'x-powered-by',
        'x-request-id',
        'x-trace-id',
      ];
      if (responseFilteredHeaders.includes(headerName)) {
        return;
      }
    }
    
    result[header.name] = header.value;
  });
  return result;
}

/**
 * Фильтрует query параметры, убирая токены и ключи API
 * @param {Array} queryParams - Массив query параметров из HAR
 */
function filterQueryParameters(queryParams) {
  const result = {};
  const filteredParamNames = [
    'token',
    'api_key',
    'api-key',
    'apikey',
    'auth',
    'auth_token',
    'session',
    'sessionid',
    'csrf',
    'csrf_token',
    'access_token',
    'refresh_token',
  ];
  
  queryParams.forEach(param => {
    const paramName = param.name.toLowerCase();
    
    // Пропускаем параметры, которые выглядят как токены/ключи
    if (filteredParamNames.includes(paramName)) {
      return;
    }
    
    // Пропускаем параметры, которые содержат "token" или "key" в названии
    if (paramName.includes('token') || paramName.includes('key') || paramName.includes('secret')) {
      return;
    }
    
    result[param.name] = {
      equalTo: param.value
    };
  });
  
  return result;
}

/**
 * Извлекает тело ответа из HAR response
 */
function extractBody(response) {
  const content = response.content || {};
  
  if (content.text) {
    // Пытаемся распарсить JSON, если это JSON
    if (content.mimeType && content.mimeType.includes('application/json')) {
      try {
        return JSON.parse(content.text);
      } catch (e) {
        // Если не JSON, возвращаем как есть
        return content.text;
      }
    }
    return content.text;
  }
  
  return '';
}

/**
 * Основная функция
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
📋 Использование:
  node index.js <har-file> [output-directory]

Примеры:
  node index.js requests.har
  node index.js requests.har ./mocks
    `);
    process.exit(0);
  }

  const harFilePath = args[0];
  const outputDir = args[1] || './wiremock-mappings';

  // Проверяем существование HAR файла
  if (!fs.existsSync(harFilePath)) {
    console.error(`❌ Файл не найден: ${harFilePath}`);
    process.exit(1);
  }

  console.log(`🔄 Конвертация HAR файла: ${harFilePath}`);
  convertHarToWireMock(harFilePath, outputDir);
}

main();

