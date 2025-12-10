import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testApi() {
  try {
    // Step 1: Upload the swagger file
    const form = new FormData();
    form.append('swaggerFile', fs.createReadStream('test-swagger.json'));
    
    const uploadResponse = await fetch('http://localhost:3001/api/upload-swagger', {
      method: 'POST',
      body: form
    });
    
    const uploadData = await uploadResponse.json();
    console.log('Upload response:', uploadData);
    
    if (uploadData.success) {
      // Step 2: Test DTO analysis
      const dtoResponse = await fetch('http://localhost:3001/api/analyze-swagger-dto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: uploadData.fileId })
      });
      
      const dtoData = await dtoResponse.json();
      console.log('DTO analysis response:', JSON.stringify(dtoData, null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testApi();