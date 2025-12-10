import { analyzeDtoUsage } from './swagger.js';
import fs from 'fs';

// Create a simple test file
const testSwagger = {
  swagger: "2.0",
  info: {
    title: "Test API",
    version: "1.0.0"
  },
  paths: {
    "/users": {
      "get": {
        "responses": {
          "200": {
            "description": "A list of users",
            "schema": {
              "type": "array",
              "items": {
                "$ref": "#/definitions/User"
              }
            }
          }
        }
      }
    }
  },
  definitions: {
    User: {
      type: "object",
      properties: {
        id: {
          type: "integer"
        },
        name: {
          type: "string"
        }
      }
    }
  }
};

// Write test file
fs.writeFileSync('test-simple.json', JSON.stringify(testSwagger, null, 2));

try {
  const result = analyzeDtoUsage('test-simple.json');
  console.log('DTO analysis result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Error analyzing DTO:', error);
}