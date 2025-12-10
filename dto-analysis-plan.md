# План анализа DTO из Swagger файлов

## 1. Архитектура решения

### 1.1. Backend API endpoints

#### Новый endpoint для анализа DTO
```
POST /api/analyze-swagger-dto
- fileId: string (ID загруженного файла)
- Returns: {
    schemas: [{
      name: string,
      inRequests: [{path: string, method: string}],
      inResponses: [{path: string, method: string, status: string}],
      schema: object
    }],
    endpoints: [{
      path: string,
      method: string,
      requestBody: string, // schema name
      responses: [{status: string, schema: string}]
    }]
  }
```

### 1.2. Функции для анализа

#### analyzeDtoUsage(filePath)
Анализирует Swagger файл и возвращает информацию об использовании DTO:

```javascript
function analyzeDtoUsage(openapiFilePath) {
  const doc = loadOpenApi(openapiFilePath);
  const schemas = doc.components?.schemas || {};
  const usageMap = {};
  
  // Инициализируем карту использования
  for (const schemaName of Object.keys(schemas)) {
    usageMap[schemaName] = { 
      inRequests: [], 
      inResponses: [],
      schema: schemas[schemaName]
    };
  }
  
  // Анализируем пути
  for (const [path, methods] of Object.entries(doc.paths || {})) {
    for (const [method, operation] of Object.entries(methods || {})) {
      // Проверяем requestBody
      if (operation.requestBody?.content) {
        const schemaRef = operation.requestBody.content['application/json']?.schema?.$ref;
        if (schemaRef) {
          const dtoName = schemaRef.split('/').pop();
          if (usageMap[dtoName]) {
            usageMap[dtoName].inRequests.push({ path, method });
          }
        }
      }
      
      // Проверяем responses
      for (const [statusCode, response] of Object.entries(operation.responses || {})) {
        const schemaRef = response.content?.['application/json']?.schema?.$ref;
        if (schemaRef) {
          const dtoName = schemaRef.split('/').pop();
          if (usageMap[dtoName]) {
            usageMap[dtoName].inResponses.push({ path, method, status: statusCode });
          }
        }
      }
    }
  }
  
  return usageMap;
}
```

## 2. Frontend компоненты

### 2.1. Новый режим отображения

Добавить новую вкладку "Анализ DTO" в существующий интерфейс.

### 2.2. Компоненты UI

1. **DTO List** - список всех DTO с количеством использований
2. **Endpoint List** - список всех эндпоинтов
3. **DTO Detail View** - детальная информация о DTO и где она используется
4. **Endpoint Detail View** - детальная информация о эндпоинте и используемых DTO
5. **Relationship Graph** - граф связей между DTO и эндпоинтами

## 3. Визуализация

### 3.1. Таблица DTO
| DTO Name | Requests | Responses | Total Usage |
|----------|----------|-----------|-------------|
| UserDto  | 3        | 5         | 8           |
| OrderDto | 2        | 3         | 5           |

### 3.2. Таблица Endpoints
| Method | Path | Request DTO | Response DTOs |
|--------|------|-------------|---------------|
| GET    | /users | -          | UserDto       |
| POST   | /users | UserDto    | UserDto       |

## 4. Взаимодействие

1. Пользователь загружает Swagger файл
2. Система анализирует файл и извлекает информацию о DTO
3. Отображает список DTO и эндпоинтов
4. Пользователь может кликнуть на DTO для просмотра деталей
5. Пользователь может кликнуть на эндпоинт для просмотра используемых DTO