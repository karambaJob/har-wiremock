import { useState } from 'react'
import './App.css'
import DtoVisualization from './components/DtoVisualization'

function App() {
  // режим: har | swagger
  const [mode, setMode] = useState('har')

  // HAR state
  const [file, setFile] = useState(null)
  const [requests, setRequests] = useState([])
  const [selectedIndices, setSelectedIndices] = useState(new Set())
  const [selectedOptions, setSelectedOptions] = useState({}) // { index: { headers: Set, queryParams: Set } }
  const [expandedRequests, setExpandedRequests] = useState(new Set()) // Индексы развернутых запросов
  const [fileId, setFileId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Swagger state
  const [swaggerFile, setSwaggerFile] = useState(null)
  const [swaggerFileId, setSwaggerFileId] = useState(null)
  const [endpoints, setEndpoints] = useState([]) // [{index, method, path, parameters: {query, header, path, cookie}}]
  const [epSelected, setEpSelected] = useState(new Set())
  const [epExpanded, setEpExpanded] = useState(new Set())
  const [epParamsSelected, setEpParamsSelected] = useState({}) // { index: { query:Set, headers:Set } }
  const [variantsPerEndpoint, setVariantsPerEndpoint] = useState(1)
  const [customRulesText, setCustomRulesText] = useState('[]') // JSON textarea
  const [swaggerGenerating, setSwaggerGenerating] = useState(false)
  const [dtoData, setDtoData] = useState(null)
  const [showDtoVisualization, setShowDtoVisualization] = useState(false)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setResult(null)
      setRequests([])
      setSelectedIndices(new Set())
      setSelectedOptions({})
      setExpandedRequests(new Set())
    }
  }

  const handleSwaggerFileChange = (e) => {
    const f = e.target.files[0]
    if (f) {
      setSwaggerFile(f)
      setSwaggerFileId(null)
      setEndpoints([])
      setEpSelected(new Set())
      setEpExpanded(new Set())
      setEpParamsSelected({})
      setResult(null)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Пожалуйста, выберите файл')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('harFile', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setFileId(data.fileId)
        setRequests(data.requests)
        // По умолчанию выбираем все запросы
        const allIndices = new Set(data.requests.map(r => r.index))
        setSelectedIndices(allIndices)
        
        // Инициализируем выбранные опции для всех запросов (по умолчанию все неотфильтрованные)
        const initialOptions = {}
        data.requests.forEach(request => {
          const headers = new Set(
            request.requestHeaders
              .filter(h => !h.isFiltered)
              .map(h => h.name)
          )
          const queryParams = new Set(
            request.queryParams
              .filter(p => !p.isFiltered)
              .map(p => p.name)
          )
          initialOptions[request.index] = { headers, queryParams }
        })
        setSelectedOptions(initialOptions)
      } else {
        setError(data.error || 'Ошибка при загрузке файла')
      }
    } catch (err) {
      setError('Ошибка при загрузке файла: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUploadSwagger = async () => {
    if (!swaggerFile) {
      setError('Пожалуйста, выберите Swagger/OpenAPI файл')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('swaggerFile', swaggerFile)
      const response = await fetch('/api/upload-swagger', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      if (data.success) {
        setSwaggerFileId(data.fileId)
        setEndpoints(data.endpoints || [])
        // по умолчанию выбрать все
        setEpSelected(new Set((data.endpoints || []).map(e => e.index)))
        // инициализировать выбранные параметры (query/headers) для каждого эндпоинта: по умолчанию все query/headers
        const init = {}
        ;(data.endpoints || []).forEach(ep => {
          const q = new Set((ep.parameters?.query || []).map(p => p.name))
          const h = new Set((ep.parameters?.header || []).map(p => p.name))
          init[ep.index] = { query: q, headers: h }
        })
        setEpParamsSelected(init)
      } else {
        setError(data.error || 'Ошибка при загрузке Swagger')
      }
    } catch (err) {
      setError('Ошибка при загрузке Swagger: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeDto = async () => {
    if (!swaggerFileId) {
      setError('Пожалуйста, сначала загрузите Swagger файл')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/analyze-swagger-dto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: swaggerFileId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setDtoData(data)
        setShowDtoVisualization(true)
      } else {
        setError(data.error || 'Ошибка при анализе DTO')
      }
    } catch (err) {
      setError('Ошибка при анализе DTO: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSelect = (index) => {
    const newSelected = new Set(selectedIndices)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedIndices(newSelected)
  }

  const handleToggleEndpoint = (index) => {
    const next = new Set(epSelected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setEpSelected(next)
  }

  const handleSelectAll = () => {
    if (selectedIndices.size === requests.length) {
      // Если все выбраны, снимаем выбор
      setSelectedIndices(new Set())
    } else {
      // Выбираем все
      setSelectedIndices(new Set(requests.map(r => r.index)))
    }
  }

  const handleSwaggerSelectAll = () => {
    if (epSelected.size === endpoints.length) {
      setEpSelected(new Set())
    } else {
      setEpSelected(new Set(endpoints.map(e => e.index)))
    }
  }

  const toggleRequestExpanded = (index) => {
    const newExpanded = new Set(expandedRequests)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRequests(newExpanded)
  }

  const toggleEndpointExpanded = (index) => {
    const next = new Set(epExpanded)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setEpExpanded(next)
  }

  const handleToggleHeader = (requestIndex, headerName) => {
    const newOptions = { ...selectedOptions }
    if (!newOptions[requestIndex]) {
      newOptions[requestIndex] = { headers: new Set(), queryParams: new Set() }
    }
    
    const headers = new Set(newOptions[requestIndex].headers || new Set())
    if (headers.has(headerName)) {
      headers.delete(headerName)
    } else {
      headers.add(headerName)
    }
    
    newOptions[requestIndex] = {
      ...newOptions[requestIndex],
      headers
    }
    setSelectedOptions(newOptions)
  }

  const handleToggleSwaggerHeader = (index, headerName) => {
    const next = { ...epParamsSelected }
    if (!next[index]) next[index] = { query: new Set(), headers: new Set() }
    const headers = new Set(next[index].headers || new Set())
    if (headers.has(headerName)) headers.delete(headerName)
    else headers.add(headerName)
    next[index] = { ...next[index], headers }
    setEpParamsSelected(next)
  }

  const handleToggleQueryParam = (requestIndex, paramName) => {
    const newOptions = { ...selectedOptions }
    if (!newOptions[requestIndex]) {
      newOptions[requestIndex] = { headers: new Set(), queryParams: new Set() }
    }
    
    const queryParams = new Set(newOptions[requestIndex].queryParams || new Set())
    if (queryParams.has(paramName)) {
      queryParams.delete(paramName)
    } else {
      queryParams.add(paramName)
    }
    
    newOptions[requestIndex] = {
      ...newOptions[requestIndex],
      queryParams
    }
    setSelectedOptions(newOptions)
  }

  const handleToggleSwaggerQuery = (index, paramName) => {
    const next = { ...epParamsSelected }
    if (!next[index]) next[index] = { query: new Set(), headers: new Set() }
    const query = new Set(next[index].query || new Set())
    if (query.has(paramName)) query.delete(paramName)
    else query.add(paramName)
    next[index] = { ...next[index], query }
    setEpParamsSelected(next)
  }

  const handleSelectAllHeaders = (requestIndex) => {
    const request = requests.find(r => r.index === requestIndex)
    if (!request) return
    
    const newOptions = { ...selectedOptions }
    if (!newOptions[requestIndex]) {
      newOptions[requestIndex] = { headers: new Set(), queryParams: new Set() }
    }
    
    const currentHeaders = newOptions[requestIndex].headers || new Set()
    const allHeaders = new Set(request.requestHeaders.map(h => h.name))
    
    // Если все выбраны, снимаем выбор, иначе выбираем все
    if (currentHeaders.size === allHeaders.size && 
        Array.from(allHeaders).every(h => currentHeaders.has(h))) {
      newOptions[requestIndex] = {
        ...newOptions[requestIndex],
        headers: new Set()
      }
    } else {
      newOptions[requestIndex] = {
        ...newOptions[requestIndex],
        headers: allHeaders
      }
    }
    setSelectedOptions(newOptions)
  }

  const handleSwaggerSelectAllHeaders = (index) => {
    const ep = endpoints.find(e => e.index === index)
    if (!ep) return
    const next = { ...epParamsSelected }
    const current = next[index]?.headers || new Set()
    const all = new Set((ep.parameters?.header || []).map(p => p.name))
    if (current.size === all.size && Array.from(all).every(h => current.has(h))) {
      next[index] = { ...(next[index] || {}), headers: new Set() }
    } else {
      next[index] = { ...(next[index] || {}), headers: all }
    }
    setEpParamsSelected(next)
  }

  const handleSelectAllQueryParams = (requestIndex) => {
    const request = requests.find(r => r.index === requestIndex)
    if (!request) return
    
    const newOptions = { ...selectedOptions }
    if (!newOptions[requestIndex]) {
      newOptions[requestIndex] = { headers: new Set(), queryParams: new Set() }
    }
    
    const currentParams = newOptions[requestIndex].queryParams || new Set()
    const allParams = new Set(request.queryParams.map(p => p.name))
    
    // Если все выбраны, снимаем выбор, иначе выбираем все
    if (currentParams.size === allParams.size && 
        Array.from(allParams).every(p => currentParams.has(p))) {
      newOptions[requestIndex] = {
        ...newOptions[requestIndex],
        queryParams: new Set()
      }
    } else {
      newOptions[requestIndex] = {
        ...newOptions[requestIndex],
        queryParams: allParams
      }
    }
    setSelectedOptions(newOptions)
  }

  const handleSwaggerSelectAllQuery = (index) => {
    const ep = endpoints.find(e => e.index === index)
    if (!ep) return
    const next = { ...epParamsSelected }
    const current = next[index]?.query || new Set()
    const all = new Set((ep.parameters?.query || []).map(p => p.name))
    if (current.size === all.size && Array.from(all).every(q => current.has(q))) {
      next[index] = { ...(next[index] || {}), query: new Set() }
    } else {
      next[index] = { ...(next[index] || {}), query: all }
    }
    setEpParamsSelected(next)
  }

  const handleConvert = async () => {
    if (selectedIndices.size === 0) {
      setError('Пожалуйста, выберите хотя бы один запрос')
      return
    }

    setConverting(true)
    setError(null)
    setResult(null)

    try {
      // Преобразуем Set в массивы для отправки
      const optionsToSend = {}
      Object.keys(selectedOptions).forEach(indexStr => {
        const index = parseInt(indexStr)
        if (selectedIndices.has(index)) {
          optionsToSend[indexStr] = {
            headers: selectedOptions[index].headers 
              ? Array.from(selectedOptions[index].headers) 
              : [],
            queryParams: selectedOptions[index].queryParams 
              ? Array.from(selectedOptions[index].queryParams) 
              : []
          }
        }
      })

      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          selectedIndices: Array.from(selectedIndices),
          selectedOptions: optionsToSend,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'Ошибка при конвертации')
      }
    } catch (err) {
      setError('Ошибка при конвертации: ' + err.message)
    } finally {
      setConverting(false)
    }
  }

  const handleGenerateFromSwagger = async () => {
    if (epSelected.size === 0) {
      setError('Выберите хотя бы один эндпоинт')
      return
    }
    setSwaggerGenerating(true)
    setError(null)
    setResult(null)
    try {
      // подготовить selectedParams и customRules
      const selectedParams = {}
      Object.keys(epParamsSelected).forEach(indexStr => {
        const index = parseInt(indexStr)
        if (epSelected.has(index)) {
          selectedParams[indexStr] = {
            query: epParamsSelected[index]?.query ? Array.from(epParamsSelected[index].query) : [],
            headers: epParamsSelected[index]?.headers ? Array.from(epParamsSelected[index].headers) : []
          }
        }
      })
      let customRules = []
      try {
        const parsed = JSON.parse(customRulesText || '[]')
        if (Array.isArray(parsed)) customRules = parsed
      } catch (_) {
        // игнорируем ошибку, оставим пусто
      }
      const response = await fetch('/api/generate-from-swagger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: swaggerFileId,
          selectedIndices: Array.from(epSelected),
          variantsPerEndpoint: Number(variantsPerEndpoint || 1),
          selectedParams,
          customRules
        })
      })
      const data = await response.json()
      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'Ошибка при генерации из Swagger')
      }
    } catch (err) {
      setError('Ошибка при генерации из Swagger: ' + err.message)
    } finally {
      setSwaggerGenerating(false)
    }
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) return '#4caf50'
    if (status >= 300 && status < 400) return '#ff9800'
    if (status >= 400) return '#f44336'
    return '#757575'
  }

  const truncateValue = (value, maxLength = 50) => {
    if (!value) return ''
    if (value.length <= maxLength) return value
    return value.substring(0, maxLength) + '...'
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>WireMock Generator</h1>
        <p>Работа с HAR и Swagger/OpenAPI</p>
      </header>

      <main className="app-main">
        <div className="mode-tabs">
          <button className={`tab-btn ${mode === 'har' ? 'active' : ''}`} onClick={() => setMode('har')}>HAR</button>
          <button className={`tab-btn ${mode === 'swagger' ? 'active' : ''}`} onClick={() => setMode('swagger')}>Swagger</button>
        </div>

        {mode === 'har' && (
        <div className="upload-section">
          <div className="file-input-wrapper">
            <input
              type="file"
              id="harFile"
              accept=".har,.json"
              onChange={handleFileChange}
              className="file-input"
            />
            <label htmlFor="harFile" className="file-label">
              {file ? file.name : 'Выберите HAR файл'}
            </label>
          </div>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="btn btn-primary"
          >
            {loading ? 'Загрузка...' : 'Загрузить и проанализировать'}
          </button>
        </div>
        )}

        {mode === 'swagger' && (
        <div className="upload-section">
          <div className="file-input-wrapper">
            <input
              type="file"
              id="swaggerFile"
              accept=".yaml,.yml,.json"
              onChange={handleSwaggerFileChange}
              className="file-input"
            />
            <label htmlFor="swaggerFile" className="file-label">
              {swaggerFile ? swaggerFile.name : 'Выберите Swagger/OpenAPI файл'}
            </label>
          </div>
          <button
            onClick={handleUploadSwagger}
            disabled={!swaggerFile || loading}
            className="btn btn-primary"
          >
            {loading ? 'Загрузка...' : 'Загрузить эндпоинты'}
          </button>
          <button
            onClick={handleAnalyzeDto}
            disabled={!swaggerFileId || loading}
            className="btn btn-secondary"
            style={{ marginLeft: '10px' }}
          >
            {loading ? 'Анализ...' : 'Анализ DTO'}
          </button>
        </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {result && (
          <div className="success-message">
            <h3>✅ Конвертация завершена!</h3>
            <p>Конвертировано запросов: {result.convertedCount}</p>
            <p>Пропущено: {result.skippedCount}</p>
            <p>Файлы сохранены в: {result.outputDir}</p>
          </div>
        )}

        {mode === 'har' && requests.length > 0 && (
          <div className="requests-section">
            <div className="requests-header">
              <h2>Запросы ({requests.length})</h2>
              <div className="controls">
                <button
                  onClick={handleSelectAll}
                  className="btn btn-secondary"
                >
                  {selectedIndices.size === requests.length
                    ? 'Отключить все'
                    : 'Выбрать все'}
                </button>
                <span className="selected-count">
                  Выбрано: {selectedIndices.size} / {requests.length}
                </span>
              </div>
            </div>

            <div className="requests-list">
              {requests.map((request) => {
                const isExpanded = expandedRequests.has(request.index)
                const requestOptions = selectedOptions[request.index] || { headers: new Set(), queryParams: new Set() }
                const selectedHeaders = requestOptions.headers || new Set()
                const selectedQueryParams = requestOptions.queryParams || new Set()
                
                return (
                  <div
                    key={request.index}
                    className={`request-item ${
                      selectedIndices.has(request.index) ? 'selected' : ''
                    }`}
                  >
                    <div className="request-main">
                      <label className="request-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedIndices.has(request.index)}
                          onChange={() => handleToggleSelect(request.index)}
                        />
                        <span className="request-info">
                          <span
                            className="method-badge"
                            style={{
                              backgroundColor:
                                request.method === 'GET'
                                  ? '#4caf50'
                                  : request.method === 'POST'
                                  ? '#2196f3'
                                  : request.method === 'PUT'
                                  ? '#ff9800'
                                  : request.method === 'DELETE'
                                  ? '#f44336'
                                  : '#757575',
                            }}
                          >
                            {request.method}
                          </span>
                          <span className="request-path">{request.path}</span>
                          <span
                            className="status-badge"
                            style={{ color: getStatusColor(request.status) }}
                          >
                            {request.status}
                          </span>
                          <span className="request-mime">{request.mimeType}</span>
                          <span className="request-size">
                            {formatSize(request.size)}
                          </span>
                        </span>
                      </label>
                      <button
                        className="expand-btn"
                        onClick={() => toggleRequestExpanded(request.index)}
                        title={isExpanded ? 'Свернуть' : 'Развернуть'}
                      >
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="request-details">
                        {/* Заголовки запроса */}
                        {request.requestHeaders && request.requestHeaders.length > 0 && (
                          <div className="details-section">
                            <div className="details-header">
                              <h4>Заголовки запроса ({request.requestHeaders.length})</h4>
                              <button
                                className="btn-small"
                                onClick={() => handleSelectAllHeaders(request.index)}
                              >
                                {selectedHeaders.size === request.requestHeaders.length
                                  ? 'Отключить все'
                                  : 'Выбрать все'}
                              </button>
                            </div>
                            <div className="details-list">
                              {request.requestHeaders.map((header, idx) => (
                                <label key={idx} className="detail-item">
                                  <input
                                    type="checkbox"
                                    checked={selectedHeaders.has(header.name)}
                                    onChange={() => handleToggleHeader(request.index, header.name)}
                                  />
                                  <span className="detail-name">{header.name}:</span>
                                  <span className={`detail-value ${header.isFiltered ? 'filtered' : ''}`}>
                                    {truncateValue(header.value)}
                                  </span>
                                  {header.isFiltered && (
                                    <span className="filtered-badge" title="Обычно фильтруется">⚠</span>
                                  )}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Query параметры */}
                        {request.queryParams && request.queryParams.length > 0 && (
                          <div className="details-section">
                            <div className="details-header">
                              <h4>Query параметры ({request.queryParams.length})</h4>
                              <button
                                className="btn-small"
                                onClick={() => handleSelectAllQueryParams(request.index)}
                              >
                                {selectedQueryParams.size === request.queryParams.length
                                  ? 'Отключить все'
                                  : 'Выбрать все'}
                              </button>
                            </div>
                            <div className="details-list">
                              {request.queryParams.map((param, idx) => (
                                <label key={idx} className="detail-item">
                                  <input
                                    type="checkbox"
                                    checked={selectedQueryParams.has(param.name)}
                                    onChange={() => handleToggleQueryParam(request.index, param.name)}
                                  />
                                  <span className="detail-name">{param.name}:</span>
                                  <span className={`detail-value ${param.isFiltered ? 'filtered' : ''}`}>
                                    {truncateValue(param.value)}
                                  </span>
                                  {param.isFiltered && (
                                    <span className="filtered-badge" title="Обычно фильтруется">⚠</span>
                                  )}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {(!request.requestHeaders || request.requestHeaders.length === 0) &&
                         (!request.queryParams || request.queryParams.length === 0) && (
                          <div className="no-details">Нет заголовков или параметров</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="convert-section">
              <button
                onClick={handleConvert}
                disabled={selectedIndices.size === 0 || converting}
                className="btn btn-success"
              >
                {converting
                  ? 'Конвертация...'
                  : `Конвертировать (${selectedIndices.size})`}
              </button>
            </div>
          </div>
        )}

        {mode === 'swagger' && endpoints.length > 0 && (
          <div className="requests-section">
            <div className="requests-header">
              <h2>Эндпоинты ({endpoints.length})</h2>
              <div className="controls">
                <button
                  onClick={handleSwaggerSelectAll}
                  className="btn btn-secondary"
                >
                  {epSelected.size === endpoints.length ? 'Отключить все' : 'Выбрать все'}
                </button>
                <div className="variants-input">
                  <label>Вариантов на ручку:</label>
                  <input
                    type="number"
                    min="1"
                    value={variantsPerEndpoint}
                    onChange={(e) => setVariantsPerEndpoint(Number(e.target.value || 1))}
                  />
                </div>
              </div>
            </div>

            <div className="requests-list">
              {endpoints.map((ep) => {
                const expanded = epExpanded.has(ep.index)
                const sel = epParamsSelected[ep.index] || { query: new Set(), headers: new Set() }
                const selQ = sel.query || new Set()
                const selH = sel.headers || new Set()
                return (
                  <div key={ep.index} className={`request-item ${epSelected.has(ep.index) ? 'selected' : ''}`}>
                    <div className="request-main">
                      <label className="request-checkbox">
                        <input
                          type="checkbox"
                          checked={epSelected.has(ep.index)}
                          onChange={() => handleToggleEndpoint(ep.index)}
                        />
                        <span className="request-info">
                          <span
                            className="method-badge"
                            style={{
                              backgroundColor:
                                ep.method === 'GET' ? '#4caf50' :
                                ep.method === 'POST' ? '#2196f3' :
                                ep.method === 'PUT' ? '#ff9800' :
                                ep.method === 'DELETE' ? '#f44336' : '#757575'
                            }}
                          >
                            {ep.method}
                          </span>
                          <span className="request-path">{ep.path}</span>
                          <span className="request-mime">{ep.summary || ep.operationId || ''}</span>
                        </span>
                      </label>
                      <button className="expand-btn" onClick={() => toggleEndpointExpanded(ep.index)}>
                        {expanded ? '▼' : '▶'}
                      </button>
                    </div>

                    {expanded && (
                      <div className="request-details">
                        {ep.parameters?.header && ep.parameters.header.length > 0 && (
                          <div className="details-section">
                            <div className="details-header">
                              <h4>Заголовки ({ep.parameters.header.length})</h4>
                              <button className="btn-small" onClick={() => handleSwaggerSelectAllHeaders(ep.index)}>
                                {selH.size === ep.parameters.header.length ? 'Отключить все' : 'Выбрать все'}
                              </button>
                            </div>
                            <div className="details-list">
                              {ep.parameters.header.map((h, i) => (
                                <label key={i} className="detail-item">
                                  <input
                                    type="checkbox"
                                    checked={selH.has(h.name)}
                                    onChange={() => handleToggleSwaggerHeader(ep.index, h.name)}
                                  />
                                  <span className="detail-name">{h.name}</span>
                                  <span className="detail-value">{h.required ? 'required' : ''}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {ep.parameters?.query && ep.parameters.query.length > 0 && (
                          <div className="details-section">
                            <div className="details-header">
                              <h4>Query параметры ({ep.parameters.query.length})</h4>
                              <button className="btn-small" onClick={() => handleSwaggerSelectAllQuery(ep.index)}>
                                {selQ.size === ep.parameters.query.length ? 'Отключить все' : 'Выбрать все'}
                              </button>
                            </div>
                            <div className="details-list">
                              {ep.parameters.query.map((q, i) => (
                                <label key={i} className="detail-item">
                                  <input
                                    type="checkbox"
                                    checked={selQ.has(q.name)}
                                    onChange={() => handleToggleSwaggerQuery(ep.index, q.name)}
                                  />
                                  <span className="detail-name">{q.name}</span>
                                  <span className="detail-value">{q.required ? 'required' : ''}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="custom-rules-section">
              <label>Custom rules (JSON массив):</label>
              <textarea
                className="rules-textarea"
                rows={6}
                value={customRulesText}
                onChange={(e) => setCustomRulesText(e.target.value)}
                placeholder='[{ "fieldNamePattern": "(?i)^id$", "values": ["1","2"] }]'
              />
              <div className="rules-help">
                <div className="rules-help-title">Как использовать custom rules</div>
                <div className="rules-help-text">
                  Укажите массив правил. Каждое правило может задавать варианты значений по имени поля (RegExp) и/или по типу поля.
                  Первое подходящее правило применяется с приоритетом над дефолтами.
                </div>
                <div className="rules-help-examples">
                  Примеры:
                  <pre className="rules-code">
{`[
  { "fieldNamePattern": "(?i)^id$", "values": ["100", "200", "300"] },
  { "fieldNamePattern": "(?i)(name|title)$", "values": ["Alpha", "Beta", "Gamma"] },
  { "fieldType": "string", "values": ["foo", "bar"] },
  { "fieldNamePattern": "(?i)^created_at$", "values": ["2025-01-01T00:00:00Z"] },
  { "fieldNamePattern": "(?i)^email$", "values": ["user@example.com"] }
]`}
                  </pre>
                  Подсказки:
                  <ul className="rules-list">
                    <li>fieldNamePattern — регулярное выражение для имени поля (используйте (?i) для регистронезависимого поиска).</li>
                    <li>fieldType — тип поля из схемы (например: string, integer, number, boolean).</li>
                    <li>values — массив возможных значений; будет использовано первое из списка.</li>
                    <li>Правила имеют приоритет над дефолтными значениями по имени и по типу.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="convert-section">
              <button
                onClick={handleGenerateFromSwagger}
                disabled={epSelected.size === 0 || swaggerGenerating || !swaggerFileId}
                className="btn btn-success"
              >
                {swaggerGenerating ? 'Генерация...' : `Сгенерировать (${epSelected.size})`}
              </button>
            </div>
          </div>
        )}
        
        {showDtoVisualization && dtoData && (
          <div className="dto-visualization-section">
            <div className="dto-visualization-header">
              <h2>Анализ DTO и связей</h2>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDtoVisualization(false)}
              >
                Закрыть
              </button>
            </div>
            <DtoVisualization dtoData={dtoData} />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
