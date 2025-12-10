import React from 'react';

const EndpointDetailView = ({ endpoint, onBack }) => {
  return (
    <div className="endpoint-detail-view">
      <div className="detail-header">
        <button onClick={onBack} className="btn btn-secondary">
          ← Назад к списку
        </button>
        <h3>Детали эндпоинта</h3>
      </div>
      
      <div className="detail-section">
        <h4>Основная информация</h4>
        <p><strong>Путь:</strong> {endpoint.path}</p>
        <p>
          <strong>Метод:</strong>
          <span className={`method-badge ${endpoint.method.toLowerCase()}`}>
            {endpoint.method}
          </span>
        </p>
      </div>
      
      <div className="detail-section">
        <h4>DTO в запросе</h4>
        {endpoint.requestBody ? (
          <p>{endpoint.requestBody}</p>
        ) : (
          <p>Нет DTO в запросе</p>
        )}
      </div>
      
      <div className="detail-section">
        <h4>DTO в ответах</h4>
        {endpoint.responses && endpoint.responses.length > 0 ? (
          <ul>
            {endpoint.responses.map((response, index) => (
              <li key={index}>
                <strong>Статус {response.status}:</strong> {response.schema}
              </li>
            ))}
          </ul>
        ) : (
          <p>Нет DTO в ответах</p>
        )}
      </div>
    </div>
  );
};

export default EndpointDetailView;