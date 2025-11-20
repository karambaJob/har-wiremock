import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testUpload() {
  try {
    const form = new FormData();
    form.append('swaggerFile', fs.createReadStream('test-swagger.json'));
    
    const response = await fetch('http://localhost:3001/api/upload-swagger', {
      method: 'POST',
      body: form
    });
    
    const data = await response.json();
    console.log('Upload response:', data);
    
    if (data.success) {
      // Test DTO analysis
      const dtoResponse = await fetch('http://localhost:3001/api/analyze-swagger-dto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: data.fileId })
      });
      
      const dtoData = await dtoResponse.json();
      console.log('DTO analysis response:', dtoData);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testUpload();