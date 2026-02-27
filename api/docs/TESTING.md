# Testing Documentation

## Test Setup

Jest testing framework has been configured for the project with TypeScript support.

### Installation

Jest and related dependencies are installed:
- `jest@^29.7.0`
- `@types/jest@^30.0.0`
- `ts-jest@^29.4.5`

### Configuration

**File**: `jest.config.js`

- Preset: `ts-jest` for TypeScript support
- Test environment: `node`
- Test match patterns: `**/__tests__/**/*.test.ts`, `**/*.spec.ts`
- ESM module support enabled
- Coverage thresholds: 70% for all metrics

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only platform core tests
npm run test:core

# Run specific test file
npm test -- PlatformId.test.ts
```

## Phase 1 Test Results

### Summary

✅ **147 tests passing** (0 failing)

### Coverage by Module

| Module | Statements | Branch | Functions | Lines | Status |
|--------|-----------|--------|-----------|-------|--------|
| **Value Objects** | 100% | 100% | 100% | 100% | ✅ Complete |
| **Types** | 100% | 100% | 100% | 100% | ✅ Complete |
| **Errors** | 100% | 100% | 100% | 100% | ✅ Complete |
| **Commands** | 0% | 0% | 0% | 0% | ⏳ Integration tests pending |

### Test Files

1. **PlatformId.test.ts** - 16 tests
   - Factory methods for each platform
   - String parsing with validation
   - Equality checks
   - Platform identification methods

2. **ContentId.test.ts** - 18 tests
   - Creation and validation
   - Composite string format ("platform:contentId")
   - Serialization/deserialization
   - Comparison methods

3. **Metrics.test.ts** - 42 tests
   - Creation and validation
   - Engagement calculations (total, rate, weighted)
   - Business logic (growth sweet spot, viral detection)
   - Immutability patterns

4. **PlatformErrors.test.ts** - 30 tests
   - All 10 error classes
   - Factory methods
   - Error serialization
   - Time-based calculations (RateLimitError)

5. **ActionType.test.ts** - 15 tests
   - Enum validation
   - String parsing
   - Action filtering (engagement vs non-engagement)
   - Display name formatting

6. **ContentStatus.test.ts** - 26 tests
   - Status validation
   - Pipeline progression
   - State classification (pending, active, terminal)
   - Permission checks for operations

## Commands Testing Strategy

The command classes (ScrapeContentCommand, ExecuteActionCommand) will be tested in **Phase 3** during integration testing when we have:
- Real platform adapters to inject
- Mock scrapers and normalizers
- Test fixtures for content data

This follows the testing pyramid:
1. ✅ **Phase 1**: Unit tests for pure functions and value objects
2. ⏳ **Phase 3**: Integration tests for commands and adapters
3. ⏳ **Phase 5**: End-to-end tests for complete workflows

## Test Conventions

### Naming

- Test files: `ComponentName.test.ts`
- Test suites: `describe('ComponentName', () => {...})`
- Test cases: `it('should do something', () => {...})`

### Structure (Arrange-Act-Assert)

```typescript
it('should create valid instance', () => {
  // Arrange: Set up test data
  const input = 'test-value';

  // Act: Execute the operation
  const result = MyClass.create(input);

  // Assert: Verify the result
  expect(result.getValue()).toBe('test-value');
});
```

### Error Testing

```typescript
it('should throw error for invalid input', () => {
  expect(() => MyClass.create('')).toThrow('cannot be empty');
});
```

### Factory Method Testing

```typescript
describe('factory methods', () => {
  it('should create from factory', () => {
    const instance = MyClass.fromString('value');
    expect(instance).toBeDefined();
  });
});
```

## Coverage Goals

| Phase | Target Coverage | Status |
|-------|----------------|---------|
| Phase 1 - Core | 100% | ✅ Achieved |
| Phase 2 - Domain | 85%+ | ⏳ Pending |
| Phase 3 - Adapters | 80%+ | ⏳ Pending |
| Phase 4 - Infrastructure | 75%+ | ⏳ Pending |
| Overall Project | 80%+ | ⏳ In Progress |

## CI/CD Integration

To add testing to CI/CD pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Troubleshooting

### ESM Module Warnings

The warning `ExperimentalWarning: VM Modules is an experimental feature` is expected when using Jest with ESM modules. This doesn't affect test execution.

### TypeScript Compilation Errors

If tests fail with TypeScript errors:
1. Run `npm run typecheck` to verify TypeScript configuration
2. Check that `tsconfig.json` includes test files
3. Ensure `ts-jest` preset is configured in `jest.config.js`

### Coverage Not Collected

If coverage reports show 0% for files you've tested:
1. Verify the file is not in `collectCoverageFrom` exclusions
2. Check that the test actually imports and uses the code
3. Run with `--verbose` flag to see detailed output

## Next Steps

1. **Phase 2**: Add tests for domain entities (Content, Action)
2. **Phase 3**: Add integration tests for Twitter adapter
3. **Phase 4**: Add tests for repositories and factories
4. **Phase 5**: Add end-to-end workflow tests
5. **CI/CD**: Set up automated testing in GitHub Actions

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Guide](https://kulshekhar.github.io/ts-jest/)
- [Testing Best Practices](https://testingjavascript.com/)
- Phase 1 Test README: `api/src/platform/core/__tests__/README.md`
