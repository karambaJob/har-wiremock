import { useState } from 'react'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [requests, setRequests] = useState([])
  const [selectedIndices, setSelectedIndices] = useState(new Set())
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
        setSelectedIndices(new Set(data.requests.map(r => r.index)))
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

  const handleConvert = async () => {
    if (selectedIndices.size === 0) {
      setError('Пожалуйста, выберите хотя бы один запрос')
      return
    }

    setConverting(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          selectedIndices: Array.from(selectedIndices),
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
              {requests.map((request) => (
                <div
                  key={request.index}
                  className={`request-item ${
                    selectedIndices.has(request.index) ? 'selected' : ''
                  }`}
                >
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
                </div>
              ))}
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
