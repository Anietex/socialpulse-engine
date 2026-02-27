/**
 * Platform Module
 * Clean Architecture implementation for multi-platform social media automation
 *
 * Layers (from inner to outer):
 * 1. Core - Interfaces, value objects, types, errors
 * 2. Domain - Entities, domain services, repository interfaces
 * 3. Infrastructure - Concrete implementations, persistence, adapters
 * 4. Application - Use cases, orchestration services
 * 5. API - REST endpoints, controllers, DTOs
 */

// Core Layer (Phase 1)
export * from './core';

// Domain Layer (Phase 2)
export * from './domain';

// Infrastructure Layer (Phase 4)
export * from './infrastructure';

// Application Layer (Phase 5)
export * from './application';

// API Layer (Phase 6)
export * from './api';
