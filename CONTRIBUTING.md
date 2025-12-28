# Contributing to Polymarket Copy Trading Platform

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect differing viewpoints

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. Use the bug report template
3. Include:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable
   - Environment details (OS, browser, Node version)

### Suggesting Features

1. Check if the feature has been suggested
2. Use the feature request template
3. Explain the use case and benefits
4. Consider implementation details

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow the code style
   - Add tests for new features
   - Update documentation

4. **Test your changes**
   ```bash
   npm run test
   npm run type-check
   npm run lint
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
   
   Use conventional commits:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation
   - `style:` formatting
   - `refactor:` code restructuring
   - `test:` adding tests
   - `chore:` maintenance

6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **Open a Pull Request**
   - Use the PR template
   - Link related issues
   - Describe your changes
   - Request review

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/copytrade.git
cd copytrade

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

## Code Style

- Use TypeScript for type safety
- Follow ESLint and Prettier rules
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

### TypeScript

```typescript
// Good
interface User {
  id: string;
  address: string;
}

function getUser(id: string): Promise<User> {
  return prisma.user.findUnique({ where: { id } });
}

// Avoid
function getUser(id: any): any {
  return prisma.user.findUnique({ where: { id } });
}
```

### React Components

```typescript
// Good
export default function TradeCard({ trade }: { trade: Trade }) {
  return (
    <div className="card">
      <h3>{trade.marketTitle}</h3>
    </div>
  );
}

// Avoid inline styles and any types
```

## Testing

- Write tests for new features
- Ensure all tests pass before submitting
- Aim for >80% code coverage

```bash
# Run all tests
npm run test

# Run specific test
npm run test -- crypto.test.ts

# Run with coverage
npm run test:coverage
```

## Documentation

- Update README.md for new features
- Add JSDoc comments for functions
- Update API documentation
- Include examples where helpful

## Review Process

1. Maintainers review PRs within 3 business days
2. Address feedback and update PR
3. Once approved, maintainers will merge
4. Your contribution will be in the next release!

## Questions?

- Open a Discussion on GitHub
- Join our Discord community
- Email: support@example.com

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in documentation

Thank you for contributing! 🎉
