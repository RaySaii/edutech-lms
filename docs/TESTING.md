# Testing Strategy

## Overview

This project follows a **layered testing approach** that separates concerns between different types of tests:

- **Backend Services**: Focus on **unit testing** (business logic, services, controllers)
- **API Gateway**: **Integration testing** (microservice communication, HTTP endpoints) 
- **Frontend**: **End-to-End testing only** (complete user workflows)

## Testing Structure

### Backend Services (Unit Tests)
```
apps/
├── auth-service/src/app/auth/
│   ├── auth.service.spec.ts          # Business logic tests
│   └── auth.controller.spec.ts       # Controller tests
├── course-service/src/app/course/
│   └── course.service.spec.ts        # Service tests
└── user-service/src/app/user/
    └── user.service.spec.ts          # Service tests
```

**Focus**: Test individual functions, services, and controllers in isolation
- Service business logic
- Controller request/response handling
- Data validation
- Error handling
- Security logic

### API Gateway (Integration Tests)
```
apps/api-gateway-e2e/src/
├── auth-e2e/
│   ├── auth-flow.e2e-spec.ts         # Complete auth workflows
│   ├── auth-security.e2e-spec.ts     # Security testing
│   └── auth-performance.e2e-spec.ts  # Performance testing
```

**Focus**: Test service-to-service communication and HTTP endpoints
- Microservice integration
- API endpoint functionality
- Authentication/authorization flows
- Error responses
- Performance characteristics

### Frontend (E2E Tests Only)
```
apps/frontend-e2e/src/
├── auth-flow.spec.ts          # User authentication workflows
├── auth-security.spec.ts      # Security scenarios
└── auth-performance.spec.ts   # Performance testing
```

**Focus**: Test complete user workflows end-to-end
- User authentication flows
- Form validation
- Navigation
- Role-based access control
- Error handling
- Session management

## Test Commands

### Run All Tests
```bash
npm run test:all              # All unit + e2e tests
```

### Backend Testing
```bash
npm run test:backend-unit     # All backend service unit tests
npm run test:integration      # API Gateway integration tests
```

### Frontend Testing
```bash
npm run test:frontend         # Playwright user workflow tests
```

### Specific Test Types
```bash
npm run test:unit             # All unit tests (backend only)
npm run test:e2e              # All e2e tests (API + frontend)
npm run test:coverage         # Backend test coverage report
```

## Testing Best Practices

### Backend Unit Tests
- **Mock external dependencies** (databases, external APIs)
- **Test business logic thoroughly**
- **Focus on edge cases and error conditions**
- **Use meaningful test descriptions**
- **Maintain high coverage** (>90% for critical paths)

### Integration Tests
- **Test real HTTP requests/responses**
- **Test authentication and authorization**
- **Test error scenarios**
- **Use test databases**
- **Clean up test data**

### Frontend E2E Tests
- **Test complete user workflows**
- **Use realistic data**
- **Test different user roles**
- **Test error scenarios**
- **Test across different browsers**

## Test Data Management

### Backend Tests
- Use **mocked data** for unit tests
- Use **test fixtures** for consistent test data
- **Clean up after each test**

### Integration Tests
- Use **test database**
- **Seed test data** before tests
- **Clean up** after test suites

### E2E Tests
- Generate **unique test data** (timestamps)
- Use **test user accounts**
- **Reset state** between tests

## Debugging Tests

### Backend Tests
```bash
# Debug specific test file
npm run test auth.service.spec.ts -- --verbose

# Debug with breakpoints
npm run test:debug auth.service.spec.ts
```

### E2E Tests
```bash
# Run with browser visible
npm run test:frontend-e2e -- --headed

# Debug mode with browser dev tools
npm run test:frontend-e2e -- --debug
```

## Test Coverage

Target coverage levels:
- **Backend Services**: 90%+ for business logic
- **E2E Tests**: Cover all major user workflows

## Continuous Integration

Tests run automatically on:
- **Pull requests**
- **Main branch commits**
- **Scheduled nightly runs**

CI Pipeline stages:
1. Lint and type checking
2. Backend unit tests
3. Frontend unit tests
4. Integration tests
5. E2E tests
6. Coverage reporting

## Writing New Tests

### Adding Backend Unit Tests
1. Create `.spec.ts` file next to source file
2. Mock all external dependencies
3. Test all public methods
4. Include error scenarios
5. Follow existing patterns

### Adding Integration Tests
1. Add to `api-gateway-e2e` project
2. Use real HTTP requests
3. Test complete workflows
4. Include authentication
5. Clean up test data

### Adding E2E Tests
1. Add to `frontend-e2e` project
2. Use meaningful test IDs
3. Test user workflows
4. Handle async operations
5. Test error scenarios

This testing strategy ensures **comprehensive coverage** while maintaining **clear separation of concerns** between different test types.