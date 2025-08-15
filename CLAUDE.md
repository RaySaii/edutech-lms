# EduTech LMS - Claude Development Assistant Configuration

## Project Overview
This is a comprehensive Learning Management System (LMS) built with NestJS, featuring microservices architecture, multi-tenant support, and enterprise-grade features.

## Development Commands

### /init - Project Initialization
Initialize the complete EduTech LMS project structure and development environment.

**Usage:** When user types `/init`, execute the following steps:

1. **Create NX Monorepo Structure**
```bash
# Install NX globally
npm install -g nx

# Create workspace
npx create-nx-workspace@latest edutech-lms --preset=nest --packageManager=npm

cd edutech-lms

# Remove default application (we'll create our microservices)
rm -rf apps/edutech-lms apps/edutech-lms-e2e

# Generate microservice applications (they will be created in root, then moved)
nx g @nx/nest:app api-gateway && mv api-gateway apps/ && mv api-gateway-e2e apps/
nx g @nx/nest:app auth-service && mv auth-service apps/ && mv auth-service-e2e apps/
nx g @nx/nest:app course-service && mv course-service apps/ && mv course-service-e2e apps/
nx g @nx/nest:app user-service && mv user-service apps/ && mv user-service-e2e apps/
nx g @nx/nest:app notification-service && mv notification-service apps/ && mv notification-service-e2e apps/
nx g @nx/nest:app analytics-service && mv analytics-service apps/ && mv analytics-service-e2e apps/
```

2. **Setup Development Dependencies**
```bash
# Install core dependencies
npm install @nestjs/bull @nestjs/cache-manager @nestjs/config @nestjs/cqrs @nestjs/event-emitter @nestjs/jwt @nestjs/microservices @nestjs/passport @nestjs/swagger @nestjs/terminus @nestjs/typeorm bcrypt bull cache-manager cache-manager-redis-store class-transformer class-validator helmet ioredis passport passport-jwt passport-local pg speakeasy typeorm uuid winston

# Install dev dependencies
npm install -D @types/bcrypt @types/multer @types/passport-jwt @types/passport-local @types/speakeasy @types/uuid artillery jest supertest
```

3. **Create Docker Development Environment**
```bash
# Create docker-compose.dev.yml file
# Start development services
docker-compose -f docker-compose.dev.yml up -d
```

4. **Initialize Database**
```bash
# Generate and run initial migration
npm run db:migration:generate -- -n InitialSchema
npm run db:migration:run

# Seed database with initial data
npm run db:seed
```

5. **Start Development Environment**
```bash
# Start all microservices in parallel
npm run dev:all
```

## Service Management Guidelines

### Development Service Lifecycle
- **All services are managed collectively** - Use `npm run dev:all` to start all microservices
- **No individual service restarts** - When making modifications, services will auto-reload
- **Full restart when needed** - If a complete restart is required, restart all services together
- **Hot reload enabled** - Most code changes will be reflected without manual restarts

### Service Restart Protocol
```bash
# To restart all services (when necessary)
npm run dev:all
```

**Important:** Individual service commands (`npm run dev:api-gateway`, etc.) should only be used for debugging specific services, not for regular development workflow.

## Development Workflow Commands

### Testing Commands
- `npm run test:unit` - Run unit tests across all services
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:integration` - Run integration tests
- `npm run test:coverage` - Generate test coverage reports

### Development Commands
- `npm run dev:services` - Start infrastructure services (Docker)
- `npm run dev:all` - Start all microservices in development mode
- `npm run dev:api-gateway` - Start only API Gateway (debugging only)
- `npm run dev:auth-service` - Start only Auth Service (debugging only)
- `npm run dev:course-service` - Start only Course Service (debugging only)

### Database Commands
- `npm run db:migration:generate -- -n <name>` - Generate new migration
- `npm run db:migration:run` - Run pending migrations
- `npm run db:migration:revert` - Revert last migration
- `npm run db:seed` - Seed database with test data

### Build & Deployment Commands
- `npm run build` - Build all services for production
- `npm run build:prod` - Build with production optimizations
- `npm run lint` - Run linting across all projects
- `npm run typecheck` - Run TypeScript type checking

## Project Structure Guidelines

### Microservices Architecture
- **api-gateway** - Main entry point, request routing, rate limiting
- **auth-service** - Authentication, authorization, user management
- **course-service** - Course management, lessons, assessments
- **user-service** - User profiles, organizations, preferences
- **notification-service** - Email, SMS, push notifications
- **analytics-service** - Reporting, analytics, dashboards

### Shared Libraries
- **shared/common** - Common types, interfaces, enums, utilities
- **shared/database** - Database entities, configurations, migrations
- **shared/auth** - Authentication guards, decorators, strategies
- **shared/events** - Event definitions and handlers

## Development Standards

### Code Quality
- Always run `npm run lint` before committing
- Ensure `npm run typecheck` passes
- Maintain test coverage above 80%
- Follow TypeScript strict mode

### Security Guidelines
- Never commit secrets or API keys
- Use environment variables for configuration
- Implement proper input validation
- Follow OWASP security guidelines

### Database Patterns
- Use UUIDs for primary keys
- Implement soft deletes where appropriate
- Create database indexes for frequently queried fields
- Use TypeORM migrations for schema changes

## Environment Configuration

### Required Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=edutech_lms

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# JWT
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# External Services
STRIPE_SECRET_KEY=sk_test_your_stripe_key
ZOOM_API_KEY=your_zoom_api_key
ZOOM_API_SECRET=your_zoom_api_secret
```

### Development Services URLs
- API Gateway: http://localhost:3000
- RabbitMQ Management: http://localhost:15672
- MailHog: http://localhost:8025
- PostgreSQL: localhost:5432
- Redis: localhost:6379

## Testing Strategy

### Unit Testing
- Test services, controllers, and utilities in isolation
- Use Jest mocking for dependencies
- Aim for 90%+ coverage on business logic

### Integration Testing
- Test service-to-service communication
- Test database operations
- Test external API integrations

### End-to-End Testing
- Test complete user workflows
- Test authentication flows
- Test course enrollment and progress tracking

## Deployment Guidelines

### Production Checklist
1. Run all tests and ensure they pass
2. Run linting and type checking
3. Build for production
4. Run security audits
5. Update environment variables
6. Run database migrations
7. Deploy services in correct order
8. Verify health checks
9. Monitor application logs

### Monitoring
- Implement health checks for all services
- Set up logging with Winston
- Monitor database performance
- Track API response times
- Set up error alerting

## Common Development Tasks

### Adding New Feature
1. Create feature branch
2. Implement in appropriate microservice
3. Add shared types if needed
4. Write comprehensive tests
5. Update documentation
6. Run full test suite
7. Create pull request

### Adding New Microservice
1. Generate NX application
2. Set up basic structure
3. Configure database connection
4. Implement health checks
5. Add to docker-compose
6. Update API gateway routing
7. Add monitoring and logging

## Troubleshooting

### Common Issues
- **Port conflicts**: Check if services are running on expected ports
- **Database connection**: Verify PostgreSQL is running and accessible
- **Redis connection**: Ensure Redis is started and password is correct
- **Migration failures**: Check database schema and migration files
- **Build failures**: Run `npm run typecheck` to identify TypeScript issues

### Performance Optimization
- Use Redis for caching frequently accessed data
- Implement database query optimization
- Use Bull queues for background tasks
- Monitor and optimize API response times
- Implement proper error handling and logging

## Getting Help

### Documentation References
- Follow step-by-step guides in project markdown files
- Refer to NestJS official documentation
- Check TypeORM documentation for database operations
- Review Docker and Kubernetes documentation for deployment

### Development Workflow
1. Start with `project-step1-foundation-setup.md`
2. Follow sequential implementation steps
3. Test each feature thoroughly
4. Deploy incrementally to avoid issues

This configuration ensures Claude understands the project structure, common commands, and development workflow for the EduTech LMS project.