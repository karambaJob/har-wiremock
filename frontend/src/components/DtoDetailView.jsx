import React from 'react';

const DtoDetailView = ({ dto, onBack }) => {
  return (
    <div className="dto-detail-view">
      <div className="detail-header">
        <button onClick={onBack} className="btn btn-secondary">
          ← Назад к списку
        </button>
        <h3>Детали DTO: {dto.name}</h3>
      </div>
      
      <div className="detail-section">
        <h4>Общая информация</h4>
        <p><strong>Общее количество использований:</strong> {dto.totalUsage}</p>
      </div>
      
      <div className="detail-section">
        <h4>Использование в запросах ({dto.inRequests.length})</h4>
        {dto.inRequests.length > 0 ? (
          <ul>
            {dto.inRequests.map((req, index) => (
              <li key={index}>
                <span className={`method-badge ${req.method.toLowerCase()}`}>
                  {req.method}
                </span>
                {req.path}
              </li>
            ))}
          </ul>
        ) : (
          <p>Не используется в запросах</p>
        )}
      </div>
      
      <div className="detail-section">
        <h4>Использование в ответах ({dto.inResponses.length})</h4>
        {dto.inResponses.length > 0 ? (
          <ul>
            {dto.inResponses.map((res, index) => (
              <li key={index}>
                <span className={`method-badge ${res.method.toLowerCase()}`}>
                  {res.method}
                </span>
                {res.path} (статус: {res.status})
              </li>
            ))}
          </ul>
        ) : (
          <p>Не используется в ответах</p>
        )}
      </div>
      
      <div className="detail-section">
        <h4>Схема DTO</h4>
        <pre className="schema-preview">
          {JSON.stringify(dto.schema, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default DtoDetailView;