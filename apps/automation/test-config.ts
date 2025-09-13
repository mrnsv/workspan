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
console.log('🔐 LOGIN_ID and PASSWORD: Removed from .env for security');
console.log('📱 Use frontend login form for authentication');
console.log('');

if (!env.ATTENDANCE_INFO_URL) {
  console.log('❌ ATTENDANCE_INFO_URL is required');
}

if (env.ATTENDANCE_INFO_URL) {
  console.log('✅ Required environment variables are configured');
  console.log('🔐 For cookie refresh: Use the frontend login form');
  console.log('📝 Backend URL configuration is ready');
} else {
  console.log('⚠️ Please update apps/env/.env with your GreytHR URLs');
}
