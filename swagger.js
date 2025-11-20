import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Загружает и парсит OpenAPI (JSON или YAML)
 */
export function loadOpenApi(openapiFilePath) {
  const raw = fs.readFileSync(openapiFilePath, 'utf8');
  let doc;
  try {
    // попробуем как JSON
    doc = JSON.parse(raw);
  } catch {
    // иначе YAML
    doc = YAML.parse(raw);
  }
  if (!doc || !doc.paths) {
    throw new Error('Некорректный OpenAPI: отсутствует секция paths');
  }
  return doc;
}

/**
 * Возвращает краткий список эндпоинтов для UI
 */
export function listEndpoints(openapiFilePath) {
  const doc = loadOpenApi(openapiFilePath);
  const endpoints = [];
  let index = 0;
  for (const [p, methods] of Object.entries(doc.paths || {})) {
    for (const [method, op] of Object.entries(methods || {})) {
      if (!['get','post','put','patch','delete','options','head'].includes(method)) continue;
      const parameters = collectParameters(op, methods);
      const hasJsonResponse = hasJsonResponseSchema(op);
      endpoints.push({
        index,
        method: method.toUpperCase(),
        path: p,
        parameters,
        hasJsonResponse,
        operationId: op.operationId || null,
        summary: op.summary || '',
      });
      index += 1;
    }
  }
  return endpoints;
}

function collectParameters(op, pathItem) {
  const all = [...(pathItem.parameters || []), ...(op.parameters || [])];
  const result = { query: [], header: [], path: [], cookie: [] };
  for (const p of all) {
    if (!p || !p.name || !p.in) continue;
    if (result[p.in]) {
      result[p.in].push({ name: p.name, required: !!p.required, schema: p.schema || null });
    }
  }
  return result;
}

function hasJsonResponseSchema(op) {
  const responses = op.responses || {};
  for (const [code, resp] of Object.entries(responses)) {
    const content = resp && resp.content;
    if (content && (content['application/json'] || content['application/*+json'])) {
      return true;
    }
  }
  return false;
}

/**
 * Генерация моков WireMock из OpenAPI
 * options:
 * - selectedIndices: Set<number>
 * - outputDir: string
 * - variantsPerEndpoint: number
 * - selectedParams: { [index]: { query?: Set<string>, headers?: Set<string> } }
 * - customRules: Array<{ fieldNamePattern?: string, fieldType?: string, values: string[] }>
 */
export function convertOpenApiToWireMock(openapiFilePath, options) {
  const {
    selectedIndices,
    outputDir = './wiremock-mappings',
    variantsPerEndpoint = 1,
    selectedParams = {},
    customRules = [],
  } = options || {};

  if (!selectedIndices || !(selectedIndices instanceof Set) || selectedIndices.size === 0) {
    throw new Error('Не выбрано ни одного эндпоинта');
  }

  const doc = loadOpenApi(openapiFilePath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const endpoints = listEndpoints(openapiFilePath);
  let convertedCount = 0;
  let skippedCount = 0;

  for (const ep of endpoints) {
    if (!selectedIndices.has(ep.index)) {
      skippedCount++;
      continue;
    }
    const methodLower = ep.method.toLowerCase();
    // WireMock: urlPathPattern из OpenAPI пути {id} -> [^/]+
    const urlPathPattern = '^' + ep.path.replace(/{[^/]+}/g, '[^/]+') + '$';

    const op = (doc.paths[ep.path] || {})[methodLower] || {};
    // Найдем JSON схему ответа (prefer 200, затем любой 2xx, затем первый json)
    const { status, schema } = pickJsonSchema(op);

    for (let v = 1; v <= Math.max(1, variantsPerEndpoint); v++) {
      const body = schema ? generateExampleFromSchema(schema, customRules, { path: [] }, doc, 0) : '';

      const mapping = {
        request: {
          method: ep.method,
        },
        response: {
          status: status || 200,
          headers: { 'Content-Type': 'application/json' },
          body: schema ? body : '',
        },
      };

      if (urlPathPattern.includes('[')) {
        mapping.request.urlPathPattern = urlPathPattern;
      } else {
        mapping.request.urlPath = ep.path;
      }

      // queryParameters по выбору
      const sel = selectedParams[ep.index] || {};
      if (sel.query && sel.query.size > 0) {
        mapping.request.queryParameters = {};
        for (const qName of sel.query) {
          mapping.request.queryParameters[qName] = { matches: '.*' };
        }
      }
      // headers по выбору
      if (sel.headers && sel.headers.size > 0) {
        mapping.request.headers = {};
        for (const hName of sel.headers) {
          mapping.request.headers[hName] = { matches: '.*' };
        }
      }

      const safePath = ep.path.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 60);
      const fileName = `swagger_${methodLower}_${safePath}_${ep.index}_${v}.json`;
      const filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(mapping, null, 2), 'utf8');
      convertedCount++;
    }
  }

  return { success: true, convertedCount, skippedCount, outputDir };
}

function pickJsonSchema(op) {
  const responses = op.responses || {};
  const preferred = ['200', '201', '202'];
  for (const c of preferred) {
    const r = responses[c];
    const schema = getJsonSchemaFromResponse(r);
    if (schema) return { status: parseInt(c, 10), schema };
  }
  for (const [code, r] of Object.entries(responses)) {
    const schema = getJsonSchemaFromResponse(r);
    if (schema) return { status: isNaN(parseInt(code, 10)) ? 200 : parseInt(code, 10), schema };
  }
  return { status: 200, schema: null };
}

function getJsonSchemaFromResponse(resp) {
  if (!resp || !resp.content) return null;
  const content = resp.content['application/json'] || resp.content['application/*+json'];
  if (!content) return null;
  return content.schema || null;
}

/**
 * Простой генератор примеров JSON по OpenAPI Schema Object
 * Поддержка: type object/array/string/number/integer/boolean, enum, default, example
 * Учитывает customRules (по имени поля или типу)
 */
function generateExampleFromSchema(schema, customRules, ctx = { path: [] }, doc = null, depth = 0) {
  if (!schema) return null;
  if (depth > 6) return null; // предохранитель от циклов

  // Разворачиваем $ref
  if (schema.$ref && doc) {
    const resolved = resolveRef(schema.$ref, doc);
    if (resolved) {
      return generateExampleFromSchema(resolved, customRules, ctx, doc, depth + 1);
    }
  }

  // Поддержка allOf/oneOf/anyOf
  if (schema.allOf && Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const merged = mergeAllOf(schema.allOf, doc);
    return generateExampleFromSchema(merged, customRules, ctx, doc, depth + 1);
  }
  if (schema.oneOf && Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    return generateExampleFromSchema(schema.oneOf[0], customRules, ctx, doc, depth + 1);
  }
  if (schema.anyOf && Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    return generateExampleFromSchema(schema.anyOf[0], customRules, ctx, doc, depth + 1);
  }

  // Прямые примеры/дефолты/enum
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0) {
    return schema.enum[0];
  }

  // Типизированная генерация
  switch (schema.type) {
    case 'object': {
      const out = {};
      const props = schema.properties || {};
      for (const [name, propSchema] of Object.entries(props)) {
        const nextCtx = { path: [...ctx.path, name] };
        const value = applyCustomAndDefaults(
          name,
          propSchema,
          customRules,
          () => generateExampleFromSchema(propSchema, customRules, nextCtx, doc, depth + 1)
        );
        out[name] = value;
      }
      return out;
    }
    case 'array': {
      const item = schema.items || { type: 'string' };
      const minItems = Number(schema.minItems || 0);
      const target = Math.max(2, Math.min(5, minItems || 2));
      const arr = [];
      for (let i = 0; i < target; i++) {
        arr.push(generateExampleFromSchema(item, customRules, ctx, doc, depth + 1));
      }
      return arr;
    }
    case 'string':
      return defaultString(schema);
    case 'integer':
    case 'number':
      return defaultNumber(schema, ctx.path[ctx.path.length - 1]);
    case 'boolean':
      return defaultBoolean(schema, ctx.path[ctx.path.length - 1]);
    default:
      // если тип не указан, предположим объект
      if (!schema.type && (schema.properties || schema.allOf || schema.oneOf || schema.anyOf)) {
        return generateExampleFromSchema({ type: 'object', properties: schema.properties || {} }, customRules, ctx, doc, depth + 1);
      }
      return null;
  }
}

function resolveRef(ref, doc) {
  // формата "#/components/schemas/Name"
  if (!ref.startsWith('#/')) return null;
  const path = ref.slice(2).split('/');
  let cur = doc;
  for (const key of path) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, key)) {
      cur = cur[key];
    } else {
      return null;
    }
  }
  return cur || null;
}

function mergeAllOf(schemas, doc) {
  const result = { type: 'object', properties: {} };
  for (const part of schemas) {
    const resolved = part.$ref ? resolveRef(part.$ref, doc) || part : part;
    if (resolved.properties) {
      result.properties = { ...result.properties, ...resolved.properties };
    } else {
      // простое слияние верхнего уровня
      Object.assign(result, resolved);
    }
  }
  return result;
}

function applyCustomAndDefaults(fieldName, schema, customRules, fallbackGen) {
  // customRules приоритетнее
  const custom = matchCustomRule(fieldName, schema, customRules);
  if (custom !== undefined) return custom;
  // дефолты по имени/типу
  const byName = defaultByFieldName(fieldName, schema);
  if (byName !== undefined) return byName;
  const byType = defaultByType(schema, fieldName);
  if (byType !== undefined) return byType;
  // иначе генерим по схеме
  return fallbackGen();
}

function matchCustomRule(fieldName, schema, customRules) {
  if (!Array.isArray(customRules) || customRules.length === 0) return undefined;
  const type = schema.type || (schema.format ? 'string' : undefined);
  for (const rule of customRules) {
    let nameOk = false;
    let typeOk = false;
    if (rule.fieldNamePattern) {
      try {
        const re = new RegExp(rule.fieldNamePattern, 'i');
        nameOk = re.test(fieldName);
      } catch (_) {}
    }
    if (rule.fieldType) {
      typeOk = String(rule.fieldType).toLowerCase() === String(type || '').toLowerCase();
    }
    if ((nameOk || typeOk) && Array.isArray(rule.values) && rule.values.length > 0) {
      return rule.values[0];
    }
  }
  return undefined;
}

function defaultString(schema) {
  switch (schema.format) {
    case 'uuid': return '00000000-0000-0000-0000-000000000000';
    case 'date-time': return '2025-01-01T00:00:00Z';
    case 'date': return '2025-01-01';
    case 'email': return 'user@example.com';
    case 'uri':
    case 'url': return 'https://example.com/resource';
    case 'hostname': return 'example.com';
    default: return 'string';
  }
}

function defaultNumber(schema, fieldName) {
  if (fieldName && /(^|_)id$/.test(fieldName)) return 1;
  if (schema.minimum !== undefined) return Number(schema.minimum);
  if (schema.maximum !== undefined) return Number(schema.maximum);
  return 42;
}

function defaultBoolean(schema, fieldName) {
  if (fieldName && /^is[A-Z_]/.test(fieldName)) return true;
  return true;
}

function defaultByFieldName(fieldName, schema) {
  const lower = String(fieldName || '').toLowerCase();
  if (lower === 'id' || lower.endsWith('_id')) return 1;
  if (lower === 'name' || lower === 'title') return 'example';
  if (lower === 'description' || lower === 'desc') return 'example description';
  if (lower === 'email') return 'user@example.com';
  if (lower === 'url' || lower === 'link') return 'https://example.com';
  if (lower === 'status') return 'ok';
  if (lower === 'createdat' || lower === 'created_at') return '2025-01-01T00:00:00Z';
  if (lower === 'updatedat' || lower === 'updated_at') return '2025-01-01T00:00:00Z';
  if (lower === 'phone' || lower === 'phone_number') return '+10000000000';
  if (lower === 'price' || lower === 'amount' || lower === 'total') return 100;
  if (lower === 'currency') return 'USD';
  return undefined;
}

function defaultByType(schema, fieldName) {
  switch (schema.type) {
    case 'string': return defaultString(schema);
    case 'integer':
    case 'number': return defaultNumber(schema, fieldName);
    case 'boolean': return defaultBoolean(schema, fieldName);
    case 'array':
    case 'object':
    default:
      return undefined;
  }
}

function applyCustomRules(fieldName, schema, customRules, fallbackGen) {
  if (!customRules || customRules.length === 0) return fallbackGen();
  const type = schema.type || (schema.format ? 'string' : undefined);
  for (const rule of customRules) {
    const byName = rule.fieldNamePattern && new RegExp(rule.fieldNamePattern, 'i').test(fieldName);
    const byType = rule.fieldType && rule.fieldType.toLowerCase() === String(type || '').toLowerCase();
    if ((byName || byType) && Array.isArray(rule.values) && rule.values.length > 0) {
      return rule.values[0];
    }
  }
  return fallbackGen();
}

function guessString(format) {
  switch (format) {
    case 'uuid': return '00000000-0000-0000-0000-000000000000';
    case 'date-time': return '2025-01-01T00:00:00Z';
    case 'date': return '2025-01-01';
    case 'email': return 'user@example.com';
    case 'uri': return 'https://example.com/resource';
    default: return 'string';
  }
}



/**
 * Анализ использования DTO в OpenAPI спецификации
 * Возвращает информацию о том, в каких запросах и ответах используются схемы
 */
export function analyzeDtoUsage(openapiFilePath) {
  const doc = loadOpenApi(openapiFilePath);
  // Поддержка как Swagger 2.0 (definitions), так и OpenAPI 3.0 (components.schemas)
  const schemas = doc.definitions || doc.components?.schemas || {};
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
      // Проверяем requestBody (OpenAPI 3.0) или parameters (Swagger 2.0)
      if (operation.requestBody?.content) {
        // OpenAPI 3.0 format
        const schemaRef = operation.requestBody.content['application/json']?.schema?.$ref;
        if (schemaRef) {
          const dtoName = schemaRef.split('/').pop();
          if (usageMap[dtoName]) {
            usageMap[dtoName].inRequests.push({ path, method });
          }
        }
      } else if (operation.parameters) {
        // Swagger 2.0 format - ищем body параметры
        const bodyParam = operation.parameters.find(p => p.in === 'body' && p.schema?.$ref);
        if (bodyParam) {
          const dtoName = bodyParam.schema.$ref.split('/').pop();
          if (usageMap[dtoName]) {
            usageMap[dtoName].inRequests.push({ path, method });
          }
        }
      }
      
      // Проверяем responses
      for (const [statusCode, response] of Object.entries(operation.responses || {})) {
        let schemaRef = null;
        if (response.content) {
          // OpenAPI 3.0 format
          schemaRef = response.content['application/json']?.schema?.$ref;
        } else if (response.schema?.$ref) {
          // Swagger 2.0 format
          schemaRef = response.schema.$ref;
        }
        
        if (schemaRef) {
          const dtoName = schemaRef.split('/').pop();
          if (usageMap[dtoName]) {
            usageMap[dtoName].inResponses.push({ path, method, status: statusCode });
          }
        }
      }
    }
  }
  
  // Преобразуем в массив для удобства отображения
  const dtoList = Object.entries(usageMap).map(([name, data]) => ({
    name,
    inRequests: data.inRequests,
    inResponses: data.inResponses,
    totalUsage: data.inRequests.length + data.inResponses.length,
    schema: data.schema
  }));
  
  // Собираем информацию об эндпоинтах с DTO
  const endpointsWithDto = [];
  for (const [path, methods] of Object.entries(doc.paths || {})) {
    for (const [method, operation] of Object.entries(methods || {})) {
      const endpointInfo = {
        path,
        method,
        requestBody: null,
        responses: []
      };
      
      // Request body DTO
      if (operation.requestBody?.content) {
        // OpenAPI 3.0 format
        const schemaRef = operation.requestBody.content['application/json']?.schema?.$ref;
        if (schemaRef) {
          endpointInfo.requestBody = schemaRef.split('/').pop();
        }
      } else if (operation.parameters) {
        // Swagger 2.0 format
        const bodyParam = operation.parameters.find(p => p.in === 'body' && p.schema?.$ref);
        if (bodyParam) {
          endpointInfo.requestBody = bodyParam.schema.$ref.split('/').pop();
        }
      }
      
      // Response DTOs
      for (const [statusCode, response] of Object.entries(operation.responses || {})) {
        let schemaRef = null;
        if (response.content) {
          // OpenAPI 3.0 format
          schemaRef = response.content['application/json']?.schema?.$ref;
        } else if (response.schema?.$ref) {
          // Swagger 2.0 format
          schemaRef = response.schema.$ref;
        }
        
        if (schemaRef) {
          endpointInfo.responses.push({
            status: statusCode,
            schema: schemaRef.split('/').pop()
          });
        }
      }
      
      endpointsWithDto.push(endpointInfo);
    }
  }
  
  return {
    dtos: dtoList,
    endpoints: endpointsWithDto
  };
}
