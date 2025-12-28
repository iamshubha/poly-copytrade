#!/usr/bin/env node

/**
 * Project Validation Script
 * Checks if all required files and configurations are in place
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    log(`✅ ${description}`, colors.green);
  } else {
    log(`❌ ${description}`, colors.red);
  }
  return exists;
}

function checkDirectory(dirPath, description) {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  if (exists) {
    log(`✅ ${description}`, colors.green);
  } else {
    log(`❌ ${description}`, colors.red);
  }
  return exists;
}

async function main() {
  log('\n🔍 Validating Polymarket Copy Trading Platform\n', colors.blue);

  let allChecks = true;

  // Core configuration files
  log('📋 Configuration Files:', colors.yellow);
  allChecks &= checkFile('package.json', 'package.json');
  allChecks &= checkFile('tsconfig.json', 'tsconfig.json');
  allChecks &= checkFile('next.config.js', 'next.config.js');
  allChecks &= checkFile('tailwind.config.ts', 'tailwind.config.ts');
  allChecks &= checkFile('.env.example', '.env.example');
  allChecks &= checkFile('.gitignore', '.gitignore');
  console.log('');

  // Database
  log('🗄️  Database:', colors.yellow);
  allChecks &= checkFile('prisma/schema.prisma', 'Prisma schema');
  allChecks &= checkFile('src/lib/prisma.ts', 'Prisma client');
  console.log('');

  // Core libraries
  log('📚 Core Libraries:', colors.yellow);
  allChecks &= checkFile('src/lib/auth.ts', 'Authentication');
  allChecks &= checkFile('src/lib/copyEngine.ts', 'Copy trading engine');
  allChecks &= checkFile('src/lib/polymarket.ts', 'Polymarket client');
  allChecks &= checkFile('src/lib/crypto.ts', 'Crypto utilities');
  allChecks &= checkFile('src/lib/api.ts', 'API utilities');
  console.log('');

  // API routes
  log('🔌 API Routes:', colors.yellow);
  allChecks &= checkDirectory('src/app/api', 'API directory');
  allChecks &= checkFile('src/app/api/auth/[...nextauth]/route.ts', 'NextAuth route');
  allChecks &= checkFile('src/app/api/trades/route.ts', 'Trades API');
  allChecks &= checkFile('src/app/api/markets/route.ts', 'Markets API');
  allChecks &= checkFile('src/app/api/follow/route.ts', 'Follow API');
  console.log('');

  // Frontend pages
  log('🎨 Frontend Pages:', colors.yellow);
  allChecks &= checkFile('src/app/page.tsx', 'Landing page');
  allChecks &= checkFile('src/app/layout.tsx', 'Root layout');
  allChecks &= checkFile('src/app/dashboard/page.tsx', 'Dashboard page');
  allChecks &= checkFile('src/app/dashboard/settings/page.tsx', 'Settings page');
  allChecks &= checkFile('src/app/auth/signin/page.tsx', 'Sign in page');
  console.log('');

  // Testing
  log('🧪 Testing:', colors.yellow);
  allChecks &= checkFile('jest.config.js', 'Jest config');
  allChecks &= checkFile('playwright.config.ts', 'Playwright config');
  allChecks &= checkDirectory('src/__tests__', 'Unit tests directory');
  allChecks &= checkDirectory('e2e', 'E2E tests directory');
  console.log('');

  // CI/CD
  log('🚀 CI/CD:', colors.yellow);
  allChecks &= checkFile('.github/workflows/ci-cd.yml', 'GitHub Actions workflow');
  allChecks &= checkFile('vercel.json', 'Vercel config');
  allChecks &= checkFile('scripts/deploy.sh', 'Deployment script');
  console.log('');

  // Documentation
  log('📖 Documentation:', colors.yellow);
  allChecks &= checkFile('README.md', 'README');
  allChecks &= checkFile('QUICKSTART.md', 'Quick start guide');
  allChecks &= checkFile('SECURITY.md', 'Security policy');
  allChecks &= checkFile('CONTRIBUTING.md', 'Contributing guide');
  allChecks &= checkFile('LICENSE', 'License');
  allChecks &= checkFile('docs/API.md', 'API documentation');
  allChecks &= checkFile('docs/DEPLOYMENT.md', 'Deployment guide');
  console.log('');

  // Package dependencies check
  log('📦 Dependencies Check:', colors.yellow);
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      'next',
      'react',
      'typescript',
      '@prisma/client',
      '@vercel/postgres',
      'next-auth',
      'siwe',
      'ethers',
      'axios',
      'zod',
      'bullmq',
      'ioredis',
    ];

    const missingDeps = requiredDeps.filter(
      (dep) => !packageJson.dependencies[dep]
    );

    if (missingDeps.length === 0) {
      log('✅ All required dependencies present', colors.green);
    } else {
      log(`❌ Missing dependencies: ${missingDeps.join(', ')}`, colors.red);
      allChecks = false;
    }
  } catch (error) {
    log('❌ Could not read package.json', colors.red);
    allChecks = false;
  }
  console.log('');

  // Environment check
  log('🔐 Environment:', colors.yellow);
  if (fs.existsSync('.env')) {
    log('✅ .env file exists', colors.green);
    log('⚠️  Remember to configure all values', colors.yellow);
  } else {
    log('⚠️  .env file not found (use .env.example)', colors.yellow);
  }
  console.log('');

  // Final result
  if (allChecks) {
    log('✅ All validation checks passed!', colors.green);
    log('🚀 Project is ready for development', colors.green);
  } else {
    log('❌ Some validation checks failed', colors.red);
    log('Please ensure all required files are present', colors.yellow);
  }

  log('\n📊 Project Statistics:', colors.blue);
  
  // Count files
  const countFiles = (dir, ext) => {
    let count = 0;
    const walk = (d) => {
      const files = fs.readdirSync(d);
      files.forEach((file) => {
        const filepath = path.join(d, file);
        const stat = fs.statSync(filepath);
        if (stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
          walk(filepath);
        } else if (file.endsWith(ext)) {
          count++;
        }
      });
    };
    try {
      walk(dir);
    } catch (e) {}
    return count;
  };

  log(`TypeScript files: ${countFiles('src', '.ts')} + ${countFiles('src', '.tsx')}`);
  log(`Test files: ${countFiles('src', '.test.ts')} + ${countFiles('e2e', '.spec.ts')}`);
  log(`API routes: ${countFiles('src/app/api', 'route.ts')}`);
  console.log('');

  log('📝 Next Steps:', colors.blue);
  log('1. Copy .env.example to .env and configure');
  log('2. Run: npm install');
  log('3. Run: npm run db:migrate');
  log('4. Run: npm run dev');
  log('5. Open: http://localhost:3000');
  console.log('');

  process.exit(allChecks ? 0 : 1);
}

main();
