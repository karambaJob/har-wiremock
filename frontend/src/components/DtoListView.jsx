import React from 'react';

const DtoListView = ({ dtos, onDtoSelect }) => {
  // Сортируем DTO по общему количеству использований (по убыванию)
  const sortedDtos = [...dtos].sort((a, b) => b.totalUsage - a.totalUsage);

  return (
    <div className="dto-list-view">
      <h3>Список DTO ({dtos.length})</h3>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Название DTO</th>
              <th>Использований в запросах</th>
              <th>Использований в ответах</th>
              <th>Общее количество использований</th>
            </tr>
          </thead>
          <tbody>
            {sortedDtos.map((dto) => (
              <tr key={dto.name} onClick={() => onDtoSelect(dto)} className="clickable-row">
                <td>{dto.name}</td>
                <td>{dto.inRequests.length}</td>
                <td>{dto.inResponses.length}</td>
                <td>{dto.totalUsage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DtoListView;