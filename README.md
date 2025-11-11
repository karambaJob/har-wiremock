# HAR to WireMock Converter

Скрипт для конвертации HAR файлов (HTTP Archive) из Chrome в stub mappings для WireMock.

## Установка

```bash
npm install
cd frontend
npm install
```

## Использование

### Веб-интерфейс (Рекомендуется)

Запустите сервер и frontend в отдельных терминалах:

```bash
# Терминал 1: Запуск API сервера
npm run server

# Терминал 2: Запуск React приложения
npm run frontend
```

Откройте браузер и перейдите на `http://localhost:5173` (или другой порт, указанный Vite).

**Возможности веб-интерфейса:**
- 📤 Загрузка HAR файла через удобный интерфейс
- ✅ Выбор запросов для конвертации (галочки)
- 🔘 Кнопка "Выбрать все" / "Отключить все"
- 📊 Просмотр информации о каждом запросе (метод, URL, статус, размер)
- 🎨 Красивый и современный UI

### CLI использование

### Базовое использование

```bash
node index.js <путь-к-har-файлу>
```

### С указанием выходной директории

```bash
node index.js <путь-к-har-файлу> <выходная-директория>
```

### Примеры

```bash
# Конвертация с дефолтной директорией (./wiremock-mappings)
node index.js requests.har

# Конвертация с указанием директории
node index.js requests.har ./mocks
```

## Как получить HAR файл из Chrome

1. Откройте Chrome DevTools (F12)
2. Перейдите на вкладку **Network**
3. Выполните нужные запросы
4. Правой кнопкой мыши на любом запросе → **Save all as HAR with content**
5. Сохраните файл

## Структура выходных файлов

Скрипт создает JSON файлы в формате WireMock stub mappings:

```json
{
  "request": {
    "method": "GET",
    "urlPath": "/api/users",
    "queryParameters": {
      "page": {
        "equalTo": "1"
      }
    }
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "body": {
      "users": [...]
    }
  }
}
```

## Использование с WireMock

1. Скопируйте созданные JSON файлы в директорию `__files` и `mappings` вашего WireMock сервера
2. Запустите WireMock сервер
3. Моки будут доступны по указанным путям

## Особенности

- Автоматически извлекает метод, URL, заголовки, query параметры и тело ответа
- Поддерживает JSON и текстовые ответы
- Генерирует уникальные имена файлов для каждого запроса
- **Автоматическая фильтрация окружения-специфичных данных** для использования на разных серверах

## Фильтрация данных

Скрипт автоматически фильтрует следующие параметры, специфичные для окружения, где был записан HAR:

### Отфильтрованные заголовки запроса:
- **Авторизация**: `Authorization`, `Cookie`, `X-Auth-Token`, `X-API-Key`, `X-Session-Token`, `X-CSRF-Token` и другие токены
- **Хост и окружение**: `Host`, `Origin`, `Referer`, `X-Forwarded-Host`, `X-Forwarded-For`, `X-Real-IP`
- **Системные**: `Content-Encoding`, `Content-Length`, `Transfer-Encoding`, `Connection`, `Accept-Encoding`
- **Кэш**: `Cache-Control`, `If-Modified-Since`, `If-None-Match`, `Pragma`

### Отфильтрованные query параметры:
- Параметры, содержащие токены и ключи: `token`, `api_key`, `api-key`, `auth`, `session`, `csrf`, `access_token`, `refresh_token` и любые параметры с названиями, содержащими `token`, `key` или `secret`

### Отфильтрованные заголовки ответа:
- Системные заголовки: `Content-Encoding`, `Content-Length`, `Transfer-Encoding`, `Connection`, `Date`, `Server`, `X-Powered-By`, `X-Request-Id`, `X-Trace-Id`

Это позволяет использовать созданные моки на любом тестовом сервере без привязки к конкретному окружению, где был записан HAR файл.

