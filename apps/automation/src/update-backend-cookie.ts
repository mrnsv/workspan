import { promises as fs } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../../');
const cookiesPath = resolve(projectRoot, 'apps/env/cookies.json');
const envPath = resolve(projectRoot, 'apps/env/.env');

interface CookieData {
  cookie: string;
  extractedAt: string;
  url: string;
  employeeId?: number;
  employeeName?: string;
  employeeNumber?: string;
}

async function updateBackendCookie() {
  try {
    console.log('🍪 Reading extracted cookie data...');
    
    // Read the extracted cookie
    const cookieData: CookieData = JSON.parse(
      await fs.readFile(cookiesPath, 'utf8')
    );
    
    console.log(`📅 Cookie extracted at: ${cookieData.extractedAt}`);
    console.log(`🌐 Source URL: ${cookieData.url}`);
    console.log(`📏 Cookie length: ${cookieData.cookie.length} characters`);
    
    // Log employee data if available
    if (cookieData.employeeId) {
      console.log('👤 Employee information found:');
      console.log(`   - Employee ID: ${cookieData.employeeId}`);
      console.log(`   - Employee Name: ${cookieData.employeeName}`);
      console.log(`   - Employee Number: ${cookieData.employeeNumber}`);
    }
    
    // Read current .env file
    const envContent = await fs.readFile(envPath, 'utf8');
    
    // Update the COOKIE value
    const updatedEnvContent = envContent.replace(
      /COOKIE=.*/,
      `COOKIE="${cookieData.cookie}"`
    );
    
    // Write back to .env file
    await fs.writeFile(envPath, updatedEnvContent, 'utf8');
    
    console.log('✅ Backend .env file updated with new cookie!');
    console.log('🔄 You may need to restart your backend server to use the new cookie.');
    
  } catch (error) {
    console.error('❌ Error updating backend cookie:', error);
    
    if (error.code === 'ENOENT' && error.path?.includes('cookies.json')) {
      console.log('💡 Run "npm run get-token" first to extract the cookie');
    }
    
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  updateBackendCookie().catch(console.error);
}
