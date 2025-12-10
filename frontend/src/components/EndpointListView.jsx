import React from 'react';

const EndpointListView = ({ endpoints, onEndpointSelect }) => {
  return (
    <div className="endpoint-list-view">
      <h3>Список эндпоинтов ({endpoints.length})</h3>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Метод</th>
              <th>Путь</th>
              <th>DTO в запросе</th>
              <th>DTO в ответах</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((endpoint, index) => (
              <tr key={index} onClick={() => onEndpointSelect(endpoint)} className="clickable-row">
                <td>
                  <span className={`method-badge ${endpoint.method.toLowerCase()}`}>
                    {endpoint.method}
                  </span>
                </td>
                <td>{endpoint.path}</td>
                <td>{endpoint.requestBody || '-'}</td>
                <td>
                  {endpoint.responses && endpoint.responses.length > 0
                    ? endpoint.responses.map((r) => `${r.schema} (${r.status})`).join(', ')
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EndpointListView;