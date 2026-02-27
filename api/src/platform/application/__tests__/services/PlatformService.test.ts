/**
 * PlatformService Tests
 */
import { PlatformService } from '../../services/PlatformService';
import { ActionType } from '../../../core/types/ActionType';
import { createMockRegistry, createMockBrowserProvider, createMockAdapter } from '../helpers/mocks';

describe('PlatformService', () => {
  let service: PlatformService;
  let mockRegistry: ReturnType<typeof createMockRegistry>;
  let mockBrowserProvider: ReturnType<typeof createMockBrowserProvider>;
  let mockAdapter: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    mockRegistry = createMockRegistry();
    mockBrowserProvider = createMockBrowserProvider();
    service = new PlatformService(mockRegistry, mockBrowserProvider);
    mockAdapter = createMockAdapter('twitter');
  });

  describe('registerPlatform', () => {
    it('should register a platform adapter', () => {
      // Act
      service.registerPlatform('twitter', mockAdapter);

      // Assert
      expect(mockRegistry.register).toHaveBeenCalledWith('twitter', mockAdapter);
    });
  });

  describe('getPlatform', () => {
    it('should retrieve a registered platform', () => {
      // Arrange
      mockRegistry.get.mockReturnValue(mockAdapter);

      // Act
      const result = service.getPlatform('twitter');

      // Assert
      expect(result).toBe(mockAdapter);
      expect(mockRegistry.get).toHaveBeenCalledWith('twitter');
    });
  });

  describe('tryGetPlatform', () => {
    it('should return platform if exists', () => {
      // Arrange
      mockRegistry.tryGet.mockReturnValue(mockAdapter);

      // Act
      const result = service.tryGetPlatform('twitter');

      // Assert
      expect(result).toBe(mockAdapter);
    });

    it('should return null if platform not found', () => {
      // Arrange
      mockRegistry.tryGet.mockReturnValue(null);

      // Act
      const result = service.tryGetPlatform('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('hasPlatform', () => {
    it('should check if platform is registered', () => {
      // Arrange
      mockRegistry.has.mockReturnValue(true);

      // Act
      const result = service.hasPlatform('twitter');

      // Assert
      expect(result).toBe(true);
      expect(mockRegistry.has).toHaveBeenCalledWith('twitter');
    });
  });

  describe('getRegisteredPlatforms', () => {
    it('should return all registered platform IDs', () => {
      // Arrange
      mockRegistry.getRegisteredPlatforms.mockReturnValue(['twitter', 'instagram']);

      // Act
      const result = service.getRegisteredPlatforms();

      // Assert
      expect(result).toEqual(['twitter', 'instagram']);
    });
  });

  describe('getAllPlatforms', () => {
    it('should return all platform adapters', () => {
      // Arrange
      const adapters = [mockAdapter, createMockAdapter('instagram')];
      mockRegistry.getAll.mockReturnValue(adapters);

      // Act
      const result = service.getAllPlatforms();

      // Assert
      expect(result).toEqual(adapters);
    });
  });

  describe('checkPlatformHealth', () => {
    it('should check health of all platforms', async () => {
      // Arrange
      const twitterAdapter = createMockAdapter('twitter');
      const instagramAdapter = createMockAdapter('instagram');

      mockRegistry.getRegisteredPlatforms.mockReturnValue(['twitter', 'instagram']);
      mockRegistry.get.mockReturnValueOnce(twitterAdapter).mockReturnValueOnce(instagramAdapter);

      twitterAdapter.isReady.mockResolvedValue(true);
      twitterAdapter.authenticator.isAuthenticated.mockResolvedValue(true);

      instagramAdapter.isReady.mockResolvedValue(false);
      instagramAdapter.authenticator.isAuthenticated.mockResolvedValue(false);

      // Act
      const result = await service.checkPlatformHealth();

      // Assert
      expect(result.size).toBe(2);

      const twitterHealth = result.get('twitter');
      expect(twitterHealth?.platformId).toBe('twitter');
      expect(twitterHealth?.isReady).toBe(true);
      expect(twitterHealth?.authenticated).toBe(true);
      expect(twitterHealth?.lastChecked).toBeInstanceOf(Date);

      const instagramHealth = result.get('instagram');
      expect(instagramHealth?.platformId).toBe('instagram');
      expect(instagramHealth?.isReady).toBe(false);
      expect(instagramHealth?.authenticated).toBe(false);
    });

    it('should capture errors during health check', async () => {
      // Arrange
      mockRegistry.getRegisteredPlatforms.mockReturnValue(['twitter']);
      mockRegistry.get.mockReturnValue(mockAdapter);
      mockAdapter.isReady.mockRejectedValue(new Error('Connection timeout'));

      // Act
      const result = await service.checkPlatformHealth();

      // Assert
      const health = result.get('twitter');
      expect(health?.isReady).toBe(false);
      expect(health?.authenticated).toBe(false);
      expect(health?.error).toBe('Connection timeout');
    });
  });

  describe('getHealthyPlatforms', () => {
    it('should return only healthy platforms', async () => {
      // Arrange
      const adapters = [mockAdapter];
      mockRegistry.getReadyPlatforms.mockResolvedValue(['twitter']);
      mockRegistry.get.mockReturnValue(mockAdapter);

      // Act
      const result = await service.getHealthyPlatforms();

      // Assert
      expect(result).toEqual(adapters);
    });
  });

  describe('getPlatformsSupportingAction', () => {
    it('should return platforms supporting specific action', () => {
      // Arrange
      mockRegistry.getPlatformsSupportingAction.mockReturnValue(['twitter']);
      mockRegistry.get.mockReturnValue(mockAdapter);

      // Act
      const result = service.getPlatformsSupportingAction(ActionType.LIKE);

      // Assert
      expect(result).toEqual([mockAdapter]);
      expect(mockRegistry.getPlatformsSupportingAction).toHaveBeenCalledWith(ActionType.LIKE);
    });
  });

  describe('getAllPlatformCapabilities', () => {
    it('should return capabilities for all platforms', () => {
      // Arrange
      mockAdapter.getCapabilities.mockReturnValue({
        scraping: true,
        rateLimits: { like: '150/hour' },
        mediaSupport: ['image', 'video'],
      });

      mockAdapter.actionExecutor.getSupportedActions.mockReturnValue([
        { actionType: ActionType.LIKE, validateData: () => true },
        { actionType: ActionType.COMMENT, validateData: () => true },
      ]);

      mockRegistry.getAll.mockReturnValue([mockAdapter]);

      // Act
      const result = service.getAllPlatformCapabilities();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        platformId: 'twitter',
        displayName: 'Twitter',
        scraping: true,
        supportedActions: [ActionType.LIKE, ActionType.COMMENT],
        rateLimits: { like: '150/hour' },
        mediaSupport: ['image', 'video'],
      });
    });
  });

  describe('initializeBrowserSession', () => {
    it('should create new browser session if none exists', async () => {
      // Arrange
      mockBrowserProvider.hasSession.mockReturnValue(false);
      mockBrowserProvider.createSession.mockResolvedValue({} as any);

      // Act
      await service.initializeBrowserSession('twitter', { headless: false });

      // Assert
      expect(mockBrowserProvider.createSession).toHaveBeenCalledWith('twitter', {
        headless: false,
      });
    });

    it('should not create session if already exists', async () => {
      // Arrange
      mockBrowserProvider.hasSession.mockReturnValue(true);

      // Act
      await service.initializeBrowserSession('twitter');

      // Assert
      expect(mockBrowserProvider.createSession).not.toHaveBeenCalled();
    });
  });

  describe('closeBrowserSession', () => {
    it('should close browser session', async () => {
      // Arrange
      mockBrowserProvider.closeSession.mockResolvedValue(undefined);

      // Act
      await service.closeBrowserSession('twitter');

      // Assert
      expect(mockBrowserProvider.closeSession).toHaveBeenCalledWith('twitter');
    });
  });

  describe('closeAllBrowserSessions', () => {
    it('should close all browser sessions', async () => {
      // Arrange
      mockBrowserProvider.closeAll.mockResolvedValue(undefined);

      // Act
      await service.closeAllBrowserSessions();

      // Assert
      expect(mockBrowserProvider.closeAll).toHaveBeenCalled();
    });
  });

  describe('saveAuthenticationState', () => {
    it('should save authentication state to file', async () => {
      // Arrange
      mockBrowserProvider.saveSessionState.mockResolvedValue(undefined);

      // Act
      await service.saveAuthenticationState('twitter', '/path/to/auth.json');

      // Assert
      expect(mockBrowserProvider.saveSessionState).toHaveBeenCalledWith(
        'twitter',
        '/path/to/auth.json'
      );
    });
  });

  describe('loadAuthenticationState', () => {
    it('should load authentication state from file', async () => {
      // Arrange
      mockBrowserProvider.loadSessionState.mockResolvedValue(undefined);

      // Act
      await service.loadAuthenticationState('twitter', '/path/to/auth.json');

      // Assert
      expect(mockBrowserProvider.loadSessionState).toHaveBeenCalledWith(
        'twitter',
        '/path/to/auth.json'
      );
    });
  });

  describe('restartBrowserSession', () => {
    it('should restart browser session with auth preservation', async () => {
      // Arrange
      mockBrowserProvider.restartSession.mockResolvedValue({} as any);

      // Act
      await service.restartBrowserSession('twitter', true);

      // Assert
      expect(mockBrowserProvider.restartSession).toHaveBeenCalledWith('twitter', true);
    });

    it('should restart browser session without auth preservation', async () => {
      // Arrange
      mockBrowserProvider.restartSession.mockResolvedValue({} as any);

      // Act
      await service.restartBrowserSession('twitter', false);

      // Assert
      expect(mockBrowserProvider.restartSession).toHaveBeenCalledWith('twitter', false);
    });
  });

  describe('getActiveBrowserSessionCount', () => {
    it('should return active session count', () => {
      // Arrange
      mockBrowserProvider.getActiveSessionCount.mockReturnValue(3);

      // Act
      const result = service.getActiveBrowserSessionCount();

      // Assert
      expect(result).toBe(3);
    });
  });

  describe('getActiveBrowserSessions', () => {
    it('should return active session platform IDs', () => {
      // Arrange
      mockBrowserProvider.getActivePlatformIds.mockReturnValue(['twitter', 'instagram']);

      // Act
      const result = service.getActiveBrowserSessions();

      // Assert
      expect(result).toEqual(['twitter', 'instagram']);
    });
  });

  describe('authenticatePlatform', () => {
    it('should authenticate platform successfully', async () => {
      // Arrange
      mockRegistry.get.mockReturnValue(mockAdapter);
      mockAdapter.authenticator.authenticate.mockResolvedValue(undefined);
      mockAdapter.authenticator.isAuthenticated.mockResolvedValue(true);

      // Act
      const result = await service.authenticatePlatform('twitter', {
        username: 'testuser',
        password: 'testpass',
      });

      // Assert
      expect(result).toBe(true);
      expect(mockAdapter.authenticator.authenticate).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'testpass',
      });
    });

    it('should handle authentication failure', async () => {
      // Arrange
      mockRegistry.get.mockReturnValue(mockAdapter);
      mockAdapter.authenticator.authenticate.mockRejectedValue(new Error('Invalid credentials'));

      // Act
      const result = await service.authenticatePlatform('twitter', {
        username: 'testuser',
        password: 'wrongpass',
      });

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isPlatformAuthenticated', () => {
    it('should check if platform is authenticated', async () => {
      // Arrange
      mockRegistry.tryGet.mockReturnValue(mockAdapter);
      mockAdapter.authenticator.isAuthenticated.mockResolvedValue(true);

      // Act
      const result = await service.isPlatformAuthenticated('twitter');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if platform not found', async () => {
      // Arrange
      mockRegistry.tryGet.mockReturnValue(null);

      // Act
      const result = await service.isPlatformAuthenticated('nonexistent');

      // Assert
      expect(result).toBe(false);
    });

    it('should handle authentication check errors', async () => {
      // Arrange
      mockRegistry.tryGet.mockReturnValue(mockAdapter);
      mockAdapter.authenticator.isAuthenticated.mockRejectedValue(new Error('Network error'));

      // Act
      const result = await service.isPlatformAuthenticated('twitter');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('logoutPlatform', () => {
    it('should logout from platform', async () => {
      // Arrange
      mockRegistry.get.mockReturnValue(mockAdapter);
      mockAdapter.authenticator.logout.mockResolvedValue(undefined);

      // Act
      await service.logoutPlatform('twitter');

      // Assert
      expect(mockAdapter.authenticator.logout).toHaveBeenCalled();
    });
  });

  describe('getPlatformStatistics', () => {
    it('should return platform statistics', () => {
      // Arrange
      mockRegistry.getCount.mockReturnValue(2);
      mockRegistry.getRegisteredPlatforms.mockReturnValue(['twitter', 'instagram']);
      mockBrowserProvider.getActiveSessionCount.mockReturnValue(1);

      // Act
      const result = service.getPlatformStatistics();

      // Assert
      expect(result).toEqual({
        total: 2,
        registered: ['twitter', 'instagram'],
        activeBrowserSessions: 1,
      });
    });
  });

  describe('unregisterPlatform', () => {
    it('should close session and unregister platform', async () => {
      // Arrange
      mockBrowserProvider.hasSession.mockReturnValue(true);
      mockBrowserProvider.closeSession.mockResolvedValue(undefined);
      mockRegistry.unregister.mockReturnValue(undefined);

      // Act
      await service.unregisterPlatform('twitter');

      // Assert
      expect(mockBrowserProvider.closeSession).toHaveBeenCalledWith('twitter');
      expect(mockRegistry.unregister).toHaveBeenCalledWith('twitter');
    });

    it('should skip session close if no session exists', async () => {
      // Arrange
      mockBrowserProvider.hasSession.mockReturnValue(false);
      mockRegistry.unregister.mockReturnValue(undefined);

      // Act
      await service.unregisterPlatform('twitter');

      // Assert
      expect(mockBrowserProvider.closeSession).not.toHaveBeenCalled();
      expect(mockRegistry.unregister).toHaveBeenCalledWith('twitter');
    });
  });

  describe('cleanupAll', () => {
    it('should close all sessions and clear registry', async () => {
      // Arrange
      mockBrowserProvider.closeAll.mockResolvedValue(undefined);
      mockRegistry.clear.mockReturnValue(undefined);

      // Act
      await service.cleanupAll();

      // Assert
      expect(mockBrowserProvider.closeAll).toHaveBeenCalled();
      expect(mockRegistry.clear).toHaveBeenCalled();
    });
  });
});
