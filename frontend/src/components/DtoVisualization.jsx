import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

const DtoVisualization = ({ dtoData }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!dtoData || !svgRef.current) return;

    // Очистка SVG
    svgRef.current.innerHTML = '';

    // Создание SVG элемента
    const svg = d3.select(svgRef.current)
      .attr('width', 800)
      .attr('height', 600);

    // Подготовка данных для графа
    const nodes = [];
    const links = [];

    // Добавляем DTO как узлы
    dtoData.dtos.forEach(dto => {
      nodes.push({
        id: dto.name,
        type: 'dto',
        usage: dto.totalUsage,
        group: 1
      });
    });

    // Добавляем эндпоинты как узлы
    dtoData.endpoints.forEach(endpoint => {
      const endpointId = `${endpoint.method} ${endpoint.path}`;
      nodes.push({
        id: endpointId,
        type: 'endpoint',
        method: endpoint.method,
        group: 2
      });

      // Связи между DTO и эндпоинтами
      if (endpoint.requestBody) {
        links.push({
          source: endpoint.requestBody,
          target: endpointId,
          type: 'request'
        });
      }

      endpoint.responses.forEach(response => {
        links.push({
          source: response.schema,
          target: endpointId,
          type: 'response',
          status: response.status
        });
      });
    });

    // Создание симуляции сил
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(400, 300));

    // Создание линий для связей
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', d => d.type === 'request' ? '#ff9800' : '#4caf50')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.type === 'request' ? '0' : '5,5');

    // Создание узлов
    const node = svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', d => d.type === 'dto' ? 20 : 15)
      .attr('fill', d => d.type === 'dto' ? '#2196f3' : '#9c27b0')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Добавление текстовых меток
    const text = svg.append('g')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text(d => d.id)
      .attr('font-size', 10)
      .attr('dx', 12)
      .attr('dy', 4);

    // Обновление позиций
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      text
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    // Функции для drag
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Очистка при размонтировании
    return () => {
      simulation.stop();
    };
  }, [dtoData]);

  return (
    <div className="dto-visualization">
      <h3>Визуализация DTO и связей</h3>
      <svg ref={svgRef}></svg>
      <div className="legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#2196f3' }}></div>
          <span>DTO</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#9c27b0' }}></div>
          <span>Endpoint</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ff9800' }}></div>
          <span>Request</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#4caf50' }}></div>
          <span>Response</span>
        </div>
      </div>
    </div>
  );
};

export default DtoVisualization;