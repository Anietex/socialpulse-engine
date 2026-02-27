/**
 * Data Transfer Objects for Platform API
 */

import { ActionType } from '../../core/types/ActionType';

/**
 * Request DTO for initializing browser session
 */
export interface InitBrowserSessionRequestDto {
  platformId: string;
  config?: {
    headless?: boolean;
    viewport?: {
      width: number;
      height: number;
    };
  };
}

/**
 * Request DTO for authenticating platform
 */
export interface AuthenticatePlatformRequestDto {
  platformId: string;
  credentials: Record<string, any>;
}

/**
 * Request DTO for saving authentication state
 */
export interface SaveAuthStateRequestDto {
  platformId: string;
  path: string;
}

/**
 * Request DTO for loading authentication state
 */
export interface LoadAuthStateRequestDto {
  platformId: string;
  path: string;
}

/**
 * Request DTO for restarting browser session
 */
export interface RestartSessionRequestDto {
  platformId: string;
  preserveAuth?: boolean;
}

/**
 * Response DTO for platform health
 */
export interface PlatformHealthResponseDto {
  platformId: string;
  isReady: boolean;
  authenticated: boolean;
  lastChecked: Date;
  error?: string;
}

/**
 * Response DTO for all platforms health
 */
export interface AllPlatformsHealthResponseDto {
  platforms: Record<string, PlatformHealthResponseDto>;
  summary: {
    total: number;
    ready: number;
    authenticated: number;
    errors: number;
  };
}

/**
 * Response DTO for platform capabilities
 */
export interface PlatformCapabilitiesResponseDto {
  platformId: string;
  displayName: string;
  scraping: boolean;
  supportedActions: ActionType[];
  rateLimits: Record<string, string>;
  mediaSupport: string[];
}

/**
 * Response DTO for all platforms capabilities
 */
export interface AllPlatformsCapabilitiesResponseDto {
  platforms: PlatformCapabilitiesResponseDto[];
}

/**
 * Response DTO for platform statistics
 */
export interface PlatformStatisticsResponseDto {
  total: number;
  registered: string[];
  activeBrowserSessions: number;
}

/**
 * Response DTO for registered platforms list
 */
export interface RegisteredPlatformsResponseDto {
  platforms: string[];
  count: number;
}

/**
 * Response DTO for authentication check
 */
export interface AuthenticationStatusResponseDto {
  platformId: string;
  authenticated: boolean;
}

/**
 * Response DTO for successful operation
 */
export interface OperationSuccessResponseDto {
  success: boolean;
  message?: string;
}
