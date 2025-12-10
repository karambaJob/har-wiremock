import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';
import DtoListView from './DtoListView';
import EndpointListView from './EndpointListView';
import DtoDetailView from './DtoDetailView';
import EndpointDetailView from './EndpointDetailView';
import { 
  VisualizationContainer, 
  GraphView, 
  GraphContainer, 
  StyledSvg, 
  Legend, 
  LegendItem, 
  LegendColor 
} from './DtoVisualization.styles';

const DtoVisualization = ({ dtoData }) => {
  const svgRef = useRef();
  const [viewMode, setViewMode] = useState('graph'); // graph, dtoList, endpointList
  const [currentDto, setCurrentDto] = useState(null);
  const [currentEndpoint, setCurrentEndpoint] = useState(null);
  const [isGraphVisible, setIsGraphVisible] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);

  // Обработчики для переключения между представлениями
  const showDtoList = () => {
    setViewMode('dtoList');
    setCurrentDto(null);
    setCurrentEndpoint(null);
    setSelectedNode(null);
  };

  const showEndpointList = () => {
    setViewMode('endpointList');
    setCurrentDto(null);
    setCurrentEndpoint(null);
    setSelectedNode(null);
  };

  const showGraphView = () => {
    setViewMode('graph');
    setCurrentDto(null);
    setCurrentEndpoint(null);
  };

  const handleDtoSelect = (dto) => {
    setCurrentDto(dto);
    setCurrentEndpoint(null);
  };

  const handleEndpointSelect = (endpoint) => {
    setCurrentEndpoint(endpoint);
    setCurrentDto(null);
  };

  const handleBackToDtoList = () => {
    setCurrentDto(null);
  };

  const handleBackToEndpointList = () => {
    setCurrentEndpoint(null);
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node.id === selectedNode?.id ? null : node);
  };

  const resetNodeSelection = () => {
    setSelectedNode(null);
  };

  // Эффект для отрисовки графа
  useEffect(() => {
    if (!dtoData || !svgRef.current || viewMode !== 'graph') return;

    // Очистка SVG
    svgRef.current.innerHTML = '';

    // Создание SVG элемента
    const svg = d3.select(svgRef.current)
      .attr('width', 800)
      .attr('height', 600);

    // Подготовка данных для графа
    let nodes = [];
    let links = [];

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

    // Фильтрация узлов и связей, если выбран узел
    if (selectedNode) {
      // Получаем все связанные узлы
      const connectedNodeIds = new Set([selectedNode.id]);
      
      links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (sourceId === selectedNode.id || targetId === selectedNode.id) {
          connectedNodeIds.add(sourceId);
          connectedNodeIds.add(targetId);
        }
      });
      
      nodes = nodes.filter(node => connectedNodeIds.has(node.id));
      links = links.filter(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return connectedNodeIds.has(sourceId) && connectedNodeIds.has(targetId);
      });
    }

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
      .attr('fill', d => {
        // Выделяем выбранный узел
        if (selectedNode && d.id === selectedNode.id) {
          return '#ff5722'; // Цвет для выбранного узла
        }
        return d.type === 'dto' ? '#2196f3' : '#9c27b0';
      })
      .attr('stroke', d => selectedNode && d.id === selectedNode.id ? '#ff5722' : '#fff')
      .attr('stroke-width', d => selectedNode && d.id === selectedNode.id ? 3 : 1)
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))
      .on('click', (event, d) => handleNodeClick(d));

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
  }, [dtoData, viewMode, selectedNode]);

  return (
    <VisualizationContainer>
      <div className="visualization-controls">
        <h3>Анализ DTO и связей</h3>
        <div className="view-buttons">
          <button
            className={`btn ${viewMode === 'graph' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={showGraphView}
          >
            Граф связей
          </button>
          <button
            className={`btn ${viewMode === 'dtoList' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={showDtoList}
          >
            Список DTO
          </button>
          <button
            className={`btn ${viewMode === 'endpointList' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={showEndpointList}
          >
            Список эндпоинтов
          </button>
        </div>
        {viewMode === 'graph' && (
          <div className="graph-controls">
            <label>
              <input
                type="checkbox"
                checked={isGraphVisible}
                onChange={(e) => setIsGraphVisible(e.target.checked)}
              />
              Показать граф связей
            </label>
            {selectedNode && (
              <button className="btn btn-secondary" onClick={resetNodeSelection} style={{ marginLeft: '10px' }}>
                Сбросить выбор
              </button>
            )}
          </div>
        )}
      </div>

      {viewMode === 'graph' && isGraphVisible && (
        <GraphView>
          <GraphContainer>
            <StyledSvg ref={svgRef}></StyledSvg>
          </GraphContainer>
          <Legend>
            <LegendItem>
              <LegendColor color="#2196f3" />
              <span>DTO</span>
            </LegendItem>
            <LegendItem>
              <LegendColor color="#9c27b0" />
              <span>Endpoint</span>
            </LegendItem>
            <LegendItem>
              <LegendColor color="#ff9800" />
              <span>Request</span>
            </LegendItem>
            <LegendItem>
              <LegendColor color="#4caf50" />
              <span>Response</span>
            </LegendItem>
            <LegendItem>
              <LegendColor color="#ff5722" />
              <span>Выбранный узел</span>
            </LegendItem>
          </Legend>
        </GraphView>
      )}

      {viewMode === 'dtoList' && !currentDto && (
        <DtoListView dtos={dtoData.dtos} onDtoSelect={handleDtoSelect} />
      )}

      {currentDto && (
        <DtoDetailView dto={currentDto} onBack={handleBackToDtoList} />
      )}

      {viewMode === 'endpointList' && !currentEndpoint && (
        <EndpointListView endpoints={dtoData.endpoints} onEndpointSelect={handleEndpointSelect} />
      )}

      {currentEndpoint && (
        <EndpointDetailView endpoint={currentEndpoint} onBack={handleBackToEndpointList} />
      )}
    </VisualizationContainer>
  );
};

export default DtoVisualization;