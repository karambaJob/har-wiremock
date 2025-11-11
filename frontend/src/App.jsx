import { useState } from 'react'
import './App.css'

function App() {
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

  const handleToggleSelect = (index) => {
    const newSelected = new Set(selectedIndices)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedIndices(newSelected)
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

  const toggleRequestExpanded = (index) => {
    const newExpanded = new Set(expandedRequests)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRequests(newExpanded)
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
        <h1>HAR to WireMock Converter</h1>
        <p>Загрузите HAR файл и выберите запросы для конвертации</p>
      </header>

      <main className="app-main">
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

        {requests.length > 0 && (
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
      </main>
    </div>
  )
}

export default App
