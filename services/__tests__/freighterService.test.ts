import { freighterService } from '@/services/freighterService';

const mockFreighter = {
  isConnected: jest.fn(),
  getPublicKey: jest.fn(),
  isAllowed: jest.fn(),
  setAllowed: jest.fn(),
};

function mountFreighter() {
  Object.defineProperty(window, 'freighter', {
    value: mockFreighter,
    writable: true,
    configurable: true,
  });
}

function unmountFreighter() {
  Object.defineProperty(window, 'freighter', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

describe('freighterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isInstalled()', () => {
    it('returns true when window.freighter exists', () => {
      mountFreighter();
      expect(freighterService.isInstalled()).toBe(true);
      unmountFreighter();
    });

    it('returns false when window.freighter is absent', () => {
      unmountFreighter();
      expect(freighterService.isInstalled()).toBe(false);
    });
  });

  describe('isAllowed()', () => {
    it('returns true when Freighter reports allowed', async () => {
      mountFreighter();
      mockFreighter.isAllowed.mockResolvedValue(true);
      await expect(freighterService.isAllowed()).resolves.toBe(true);
      unmountFreighter();
    });

    it('returns false when Freighter is not installed', async () => {
      unmountFreighter();
      await expect(freighterService.isAllowed()).resolves.toBe(false);
    });

    it('returns false when isAllowed throws', async () => {
      mountFreighter();
      mockFreighter.isAllowed.mockRejectedValue(new Error('Extension error'));
      await expect(freighterService.isAllowed()).resolves.toBe(false);
      unmountFreighter();
    });
  });

  describe('isConnected()', () => {
    it('resolves to true for v2 object shape { isConnected: true }', async () => {
      mountFreighter();
      mockFreighter.isConnected.mockResolvedValue({ isConnected: true });
      await expect(freighterService.isConnected()).resolves.toBe(true);
      unmountFreighter();
    });

    it('resolves to true for v1 boolean shape', async () => {
      mountFreighter();
      mockFreighter.isConnected.mockResolvedValue(true);
      await expect(freighterService.isConnected()).resolves.toBe(true);
      unmountFreighter();
    });

    it('resolves to false when Freighter is not installed', async () => {
      unmountFreighter();
      await expect(freighterService.isConnected()).resolves.toBe(false);
    });
  });

  describe('getPublicKey()', () => {
    it('returns the public key when Freighter is allowed', async () => {
      mountFreighter();
      mockFreighter.isAllowed.mockResolvedValue(true);
      mockFreighter.getPublicKey.mockResolvedValue('GSTELLARPUBLICKEY');
      await expect(freighterService.getPublicKey()).resolves.toBe(
        'GSTELLARPUBLICKEY'
      );
      unmountFreighter();
    });

    it('calls setAllowed first when the site is not yet allowed', async () => {
      mountFreighter();
      mockFreighter.isAllowed.mockResolvedValue(false);
      mockFreighter.setAllowed.mockResolvedValue(true);
      mockFreighter.getPublicKey.mockResolvedValue('GSTELLARPUBLICKEY');
      await freighterService.getPublicKey();
      expect(mockFreighter.setAllowed).toHaveBeenCalledTimes(1);
      unmountFreighter();
    });

    it('throws when Freighter is not installed', async () => {
      unmountFreighter();
      await expect(freighterService.getPublicKey()).rejects.toThrow(
        'Freighter is not installed'
      );
    });

    it('throws when getPublicKey returns an empty string', async () => {
      mountFreighter();
      mockFreighter.isAllowed.mockResolvedValue(true);
      mockFreighter.getPublicKey.mockResolvedValue('');
      await expect(freighterService.getPublicKey()).rejects.toThrow(
        'Freighter did not return a public key'
      );
      unmountFreighter();
    });
  });

  describe('requestAccess()', () => {
    it('calls setAllowed on the Freighter extension', async () => {
      mountFreighter();
      mockFreighter.setAllowed.mockResolvedValue(true);
      await freighterService.requestAccess();
      expect(mockFreighter.setAllowed).toHaveBeenCalledTimes(1);
      unmountFreighter();
    });

    it('throws when Freighter is not installed', async () => {
      unmountFreighter();
      await expect(freighterService.requestAccess()).rejects.toThrow(
        'Freighter is not installed'
      );
    });
  });
});
