import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../');
const envPath = resolve(projectRoot, 'apps/env/.env');

// Import shared environment loader (will automatically load .env)
const { env } = await import('../env/env.js');

console.log('🔧 Environment Configuration Test');
console.log('================================');
console.log(`📁 Project Root: ${projectRoot}`);
console.log(`📄 Env File: ${envPath}`);
console.log('');

console.log('🌐 Environment Variables:');
console.log(`ATTENDANCE_INFO_URL: ${env.ATTENDANCE_INFO_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`LOGIN_ID: ${env.LOGIN_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`PASSWORD: ${env.PASSWORD ? '✅ Set' : '❌ Missing'}`);
console.log('');

if (!env.ATTENDANCE_INFO_URL) {
  console.log('❌ ATTENDANCE_INFO_URL is required');
}
if (!env.LOGIN_ID) {
  console.log('❌ LOGIN_ID is required');
}
if (!env.PASSWORD || env.PASSWORD === 'your_password_here') {
  console.log('❌ PASSWORD needs to be set to your actual password');
}

if (env.ATTENDANCE_INFO_URL && env.LOGIN_ID && env.PASSWORD && env.PASSWORD !== 'your_password_here') {
  console.log('✅ All required environment variables are configured');
  console.log('📝 You can now run: npm run get-token');
} else {
  console.log('⚠️ Please update apps/env/.env with your actual credentials');
}
