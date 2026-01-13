#!/usr/bin/env node
/**
 * Generate a secure JWT secret for production use
 * Run: node generate-jwt-secret.js
 */

const crypto = require('crypto');

function generateSecureSecret(length = 64) {
  return crypto.randomBytes(length).toString('base64');
}

console.log('\n🔐 JWT Secret Generator\n');
console.log('=' .repeat(60));
console.log('\nGenerated secure JWT secret:\n');

const secret = generateSecureSecret();
console.log(secret);

console.log('\n' + '=' .repeat(60));
console.log('\n📝 To use this secret:\n');
console.log('1. Copy the secret above');
console.log('2. Update your .env file:');
console.log(`   JWT_SECRET='${secret}'`);
console.log('\n⚠️  IMPORTANT: Never commit this secret to git!');
console.log('✅ Use different secrets for dev and production\n');
