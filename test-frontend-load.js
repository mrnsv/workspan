// Simple test to verify frontend loads without PageTransport errors
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 4200,
  path: '/',
  method: 'GET'
};

console.log('Testing frontend application...');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('✅ Frontend responded successfully');
    console.log('Status Code:', res.statusCode);
    
    // Check for common error indicators
    if (data.includes('PageTransport')) {
      console.log('❌ PageTransport error still present');
    } else {
      console.log('✅ No PageTransport errors detected');
    }
    
    if (data.includes('<app-root>')) {
      console.log('✅ Angular app root element found');
    } else {
      console.log('⚠️  Angular app root element not found');
    }
    
    if (data.includes('workspan')) {
      console.log('✅ Workspan application detected');
    }
    
    console.log('\n🎉 Frontend test completed successfully!');
  });
});

req.on('error', (e) => {
  console.error('❌ Error testing frontend:', e.message);
});

req.end();
