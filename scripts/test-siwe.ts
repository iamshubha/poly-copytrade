import { SiweMessage } from 'siwe';
import { generateNonce } from '../src/lib/crypto';

async function testSIWE() {
  console.log('Testing SIWE library...');
  
  try {
    const nonce = generateNonce();
    console.log('Generated nonce:', nonce);
    console.log('Nonce length:', nonce.length);
    
    const message = new SiweMessage({
      domain: 'localhost',
      address: '0x1234567890123456789012345678901234567890',
      statement: 'Sign in to test',
      uri: 'http://localhost:3000',
      version: '1',
      chainId: 1,
      nonce: nonce,
    });
    
    console.log('SIWE Message created successfully');
    console.log('Message:', message.prepareMessage());
    console.log('\nSIWE version:', require('siwe/package.json').version);
  } catch (error) {
    console.error('Error:', error);
  }
}

testSIWE();
