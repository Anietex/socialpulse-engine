/**
 * Mock Controller Factories
 * Creates mock controllers for endpoint testing without DB/Redis dependencies
 */

import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

type MockHandler = jest.Mock<(req: Request, res: Response, next: NextFunction) => void>;

export interface MockControllerMap {
  [key: string]: MockHandler;
}

function mockHandler(name: string): MockHandler {
  return jest.fn((_req: Request, res: Response, _next: NextFunction) => {
    res.status(200).json({ success: true, handler: name });
  }) as MockHandler;
}

export function createMockAuthController(): MockControllerMap {
  return {
    register: mockHandler('register'),
    login: mockHandler('login'),
    refresh: mockHandler('refresh'),
    me: mockHandler('me'),
    logout: mockHandler('logout'),
  };
}

export function createMockIngestionController(): MockControllerMap {
  return {
    ingestTweets: mockHandler('ingestTweets'),
    getStats: mockHandler('getStats'),
  };
}

export function createMockSessionController(): MockControllerMap {
  return {
    canStartSession: mockHandler('canStartSession'),
    resetSession: mockHandler('resetSession'),
  };
}

export function createMockAnalyticsController(): MockControllerMap {
  return {
    getSummary: mockHandler('getSummary'),
    getAnalytics: mockHandler('getAnalytics'),
    generateAnalytics: mockHandler('generateAnalytics'),
  };
}

export function createMockUserController(): MockControllerMap {
  return {
    getUsers: mockHandler('getUsers'),
    getUserById: mockHandler('getUserById'),
    updateUser: mockHandler('updateUser'),
    updateSettings: mockHandler('updateSettings'),
    deleteUser: mockHandler('deleteUser'),
    getUserStats: mockHandler('getUserStats'),
  };
}

export function createMockTweetController(): MockControllerMap {
  return {
    searchTweets: mockHandler('searchTweets'),
    getTweetById: mockHandler('getTweetById'),
  };
}

export function createMockContentController(): MockControllerMap {
  return {
    scrapeContent: mockHandler('scrapeContent'),
    scrapeMultiplePlatforms: mockHandler('scrapeMultiplePlatforms'),
    getContentById: mockHandler('getContentById'),
    getContentByStage: mockHandler('getContentByStage'),
    updateContentStatuses: mockHandler('updateContentStatuses'),
    getContentStatistics: mockHandler('getContentStatistics'),
  };
}

export function createMockAutomationController(): MockControllerMap {
  return {
    executeAutomation: mockHandler('executeAutomation'),
    executeMultiPlatformAutomation: mockHandler('executeMultiPlatformAutomation'),
    executeActionBatch: mockHandler('executeActionBatch'),
    previewAutomation: mockHandler('previewAutomation'),
  };
}

export function createMockPlatformController(): MockControllerMap {
  return {
    getRegisteredPlatforms: mockHandler('getRegisteredPlatforms'),
    checkPlatformHealth: mockHandler('checkPlatformHealth'),
    getAllPlatformCapabilities: mockHandler('getAllPlatformCapabilities'),
    getPlatformStatistics: mockHandler('getPlatformStatistics'),
    initializeBrowserSession: mockHandler('initializeBrowserSession'),
    closeBrowserSession: mockHandler('closeBrowserSession'),
    closeAllBrowserSessions: mockHandler('closeAllBrowserSessions'),
    restartBrowserSession: mockHandler('restartBrowserSession'),
    authenticatePlatform: mockHandler('authenticatePlatform'),
    checkAuthenticationStatus: mockHandler('checkAuthenticationStatus'),
    logoutPlatform: mockHandler('logoutPlatform'),
    saveAuthenticationState: mockHandler('saveAuthenticationState'),
    loadAuthenticationState: mockHandler('loadAuthenticationState'),
  };
}

export function createMockOCRController(): MockControllerMap {
  return {
    extractFromUrl: mockHandler('extractFromUrl'),
    extractFromUrls: mockHandler('extractFromUrls'),
    getStatus: mockHandler('getStatus'),
    testContentOCR: mockHandler('testContentOCR'),
  };
}

export function createMockImageCaptioningController(): MockControllerMap {
  return {
    getStatus: mockHandler('getStatus'),
    captionFromUrl: mockHandler('captionFromUrl'),
    captionFromUrls: mockHandler('captionFromUrls'),
  };
}
