import styled from 'styled-components';

export const VisualizationContainer = styled.div`
  .visualization-controls {
    margin-bottom: 20px;
  }

  .view-buttons {
    margin-bottom: 15px;
  }

  .view-buttons .btn {
    margin-right: 10px;
  }

  .graph-controls {
    margin-top: 10px;
  }
`;

export const GraphView = styled.div`
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 20px;
  text-align: center;
`;

export const GraphContainer = styled.div`
  overflow: auto;
  border: 1px solid #ddd;
  border-radius: 5px;
  margin-bottom: 20px;
  position: relative;
  max-width: 100%;
  max-height: 700px;
  min-height: 600px;
`;

export const StyledSvg = styled.svg`
  min-width: 800px;
  min-height: 600px;
  width: 100%;
  height: 100%;
`;

export const Legend = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
`;

export const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

export const LegendColor = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: ${props => props.color || '#ccc'};
  
  ${props => props.selected && `
    border: 2px solid #333;
  `}
`;