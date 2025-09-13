#!/usr/bin/env node

/**
 * Migration script to remove LOGIN_ID and PASSWORD from .env files
 * This script helps users securely transition to frontend-only authentication
 */

import { readFile, writeFile, access } from 'fs/promises';
import { resolve } from 'path';

const ENV_PATH = resolve('apps/env/.env');

async function migrateCredentials() {
  console.log('🔐 Credential Security Migration');
  console.log('=====================================');
  
  try {
    // Check if .env file exists
    await access(ENV_PATH);
    
    // Read current .env file
    const envContent = await readFile(ENV_PATH, 'utf8');
    console.log('📄 Found existing .env file');
    
    // Check if credentials exist
    const hasLoginId = envContent.includes('LOGIN_ID=');
    const hasPassword = envContent.includes('PASSWORD=');
    
    if (!hasLoginId && !hasPassword) {
      console.log('✅ No credentials found in .env - already secure!');
      return;
    }
    
    console.log('⚠️  Found credentials in .env file:');
    if (hasLoginId) console.log('   - LOGIN_ID detected');
    if (hasPassword) console.log('   - PASSWORD detected');
    
    // Create backup
    const backupPath = `${ENV_PATH}.backup.${Date.now()}`;
    await writeFile(backupPath, envContent);
    console.log(`💾 Backup created: ${backupPath}`);
    
    // Remove credential lines
    const lines = envContent.split('\n');
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim();
      return !trimmed.startsWith('LOGIN_ID=') && !trimmed.startsWith('PASSWORD=');
    });
    
    // Add security comment
    const securityComment = [
      '',
      '# Security Notice: LOGIN_ID and PASSWORD removed',
      '# Use the frontend login form for authentication',
      ''
    ];
    
    const newContent = [...filteredLines, ...securityComment].join('\n');
    
    // Write updated .env file
    await writeFile(ENV_PATH, newContent);
    
    console.log('🔒 Credentials removed from .env file');
    console.log('📱 Authentication now handled via frontend login form');
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('📝 No .env file found - create one with GreytHR URLs only');
      console.log('🔐 Credentials will be handled via frontend authentication');
    } else {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  }
}

// Run migration
migrateCredentials().catch(console.error);
