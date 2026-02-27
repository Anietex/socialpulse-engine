# Platform Core Tests

This directory contains unit tests for Phase 1 of the platform abstraction layer.

## Test Coverage

### Value Objects
- **PlatformId.test.ts**: Tests for type-safe platform identifiers
  - Factory methods (twitter, linkedin, reddit, instagram)
  - String parsing with validation
  - Equality checks
  - Platform identification methods

- **ContentId.test.ts**: Tests for content identifiers with platform context
  - Creation and validation
  - Composite string format parsing ("platform:contentId")
  - Serialization/deserialization
  - Equality and comparison methods

- **Metrics.test.ts**: Tests for engagement metrics value object
  - Creation and validation (non-negative values)
  - Engagement calculations (total, rate, weighted score)
  - Business logic methods (isInGrowthSweetSpot, isViral)
  - Immutability with `withUpdated*` methods

### Errors
- **PlatformErrors.test.ts**: Tests for custom error classes
  - PlatformError (base error)
  - ScrapingError with factory methods
  - AuthenticationError with factory methods
  - ActionExecutionError with factory methods
  - RateLimitError with time calculations
  - NormalizationError with factory methods
  - Configuration and validation errors

### Types
- **ActionType.test.ts**: Tests for action type enum and utilities
  - Valid action type checking
  - String parsing and validation
  - Engagement action filtering
  - Data requirement detection
  - Display name formatting

- **ContentStatus.test.ts**: Tests for content lifecycle status
  - Valid status checking
  - String parsing and validation
  - Status classification (pending, active, terminal)
  - Pipeline progression (getNextStatus)
  - Operation permission checks (canCategorize, canRank, etc.)

## Running the Tests

### Prerequisites

First, install Jest and related dependencies:

```bash
cd /Users/aniefon/Work/Sandbox/twitter-builder/api
npm install --save-dev jest @types/jest ts-jest
```

### Configuration

Create a `jest.config.js` file in the `api/` directory:

```javascript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/platform/core/**/*.ts',
    '!src/platform/core/**/*.test.ts',
    '!src/platform/core/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Add Test Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:core": "jest src/platform/core"
  }
}
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only platform core tests
npm run test:core

# Run specific test file
npm test -- PlatformId.test.ts
```

## Test Statistics

- **Total Test Files**: 6
- **Test Suites**: ~50+
- **Individual Tests**: ~150+
- **Code Coverage Target**: 80%+

## Writing New Tests

When adding new components to Phase 1, follow these patterns:

### 1. Value Object Test Template

```typescript
import { MyValueObject } from '../../value-objects/MyValueObject';

describe('MyValueObject', () => {
  describe('creation', () => {
    it('should create with valid input', () => {
      const obj = MyValueObject.create('valid');
      expect(obj.toString()).toBe('valid');
    });

    it('should throw for invalid input', () => {
      expect(() => MyValueObject.create('')).toThrow();
    });
  });

  describe('equality', () => {
    it('should equal same values', () => {
      const obj1 = MyValueObject.create('test');
      const obj2 = MyValueObject.create('test');
      expect(obj1.equals(obj2)).toBe(true);
    });
  });
});
```

### 2. Error Test Template

```typescript
import { MyError } from '../../errors/MyErrors';

describe('MyError', () => {
  it('should create error with message and code', () => {
    const error = new MyError('Test message', 'TEST_CODE');
    expect(error.name).toBe('MyError');
    expect(error.code).toBe('TEST_CODE');
  });

  it('should have factory method', () => {
    const error = MyError.specificCase('param');
    expect(error.message).toContain('param');
  });
});
```

### 3. Utility Test Template

```typescript
import { MyUtils } from '../../types/MyType';

describe('MyUtils', () => {
  describe('isValid', () => {
    it('should validate correct input', () => {
      expect(MyUtils.isValid('correct')).toBe(true);
    });

    it('should reject incorrect input', () => {
      expect(MyUtils.isValid('incorrect')).toBe(false);
    });
  });
});
```

## Best Practices

1. **Test Naming**: Use descriptive test names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
3. **Edge Cases**: Test boundary conditions, empty inputs, and error cases
4. **Isolation**: Each test should be independent and not rely on other tests
5. **Coverage**: Aim for 80%+ code coverage, but prioritize meaningful tests over metrics

## Next Steps

After Phase 1 tests are passing:

1. **Phase 2**: Domain layer entity tests (Content, Action, etc.)
2. **Phase 3**: Twitter adapter integration tests
3. **Phase 4**: Infrastructure layer tests (repositories, factories)
4. **Phase 5**: End-to-end tests for complete workflows
