# Security Policy

## Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability, please email us at security@example.com. Do not create a public GitHub issue.

## Security Measures

### Authentication
- Wallet-based authentication using SIWE (Sign-In with Ethereum)
- No passwords stored
- JWT-based session management
- Session expiration after 24 hours

### Data Protection
- All sensitive data encrypted at rest
- TLS/SSL for data in transit
- Environment variables for secrets
- No private keys stored on server

### API Security
- Rate limiting on all endpoints
- Input validation using Zod
- SQL injection prevention via Prisma ORM
- CORS properly configured
- API authentication required for protected routes

### Best Practices
- Regular dependency updates
- Security audits of critical code
- Principle of least privilege
- Comprehensive error handling without exposing sensitive info
- Logging and monitoring of suspicious activity

## Security Checklist for Deployment

- [ ] All environment variables properly set
- [ ] NEXTAUTH_SECRET is a strong random string
- [ ] Database credentials are secure
- [ ] HTTPS enabled in production
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Error messages don't expose system details
- [ ] Dependencies are up to date
- [ ] Security headers properly configured

## Secure Configuration

### Environment Variables
Never commit `.env` files. Use environment variable management:

```bash
# Generate secure secrets
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -hex 32      # For ENCRYPTION_KEY
```

### Database
- Use connection pooling
- Enable SSL for database connections
- Restrict database access by IP
- Regular backups
- Use read replicas for reporting

### API Keys
- Rotate API keys regularly
- Use different keys for different environments
- Monitor API key usage
- Revoke compromised keys immediately

## Vulnerability Disclosure Timeline

1. Report received and acknowledged within 24 hours
2. Initial assessment within 3 business days
3. Fix developed and tested
4. Security advisory published after fix is deployed
5. Public disclosure after 90 days or fix deployment

## Security Updates

We regularly update dependencies and apply security patches. Monitor:
- GitHub Security Advisories
- npm audit reports
- Dependabot alerts

## Contact

Security issues: security@example.com
General questions: support@example.com
