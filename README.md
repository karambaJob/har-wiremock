# HAR to WireMock Converter

Скрипт для конвертации HAR файлов (HTTP Archive) из Chrome в stub mappings для WireMock.

## Установка

```bash
npm install
```

## Использование

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
- Пропускает системные заголовки (content-encoding, content-length, transfer-encoding)

