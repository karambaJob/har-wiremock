import { analyzeDtoUsage } from './swagger.js';

try {
  const result = analyzeDtoUsage('test-swagger.json');
  console.log('DTO analysis result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Error analyzing DTO:', error);
}