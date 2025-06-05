import { _decorator, Component, SpriteFrame } from 'cc';
import { AvatarDatabase } from './lottery/AvatarData';
import { AvatarManager } from './lottery/AvatarManager';
import databaseService from './firebase/database-service';

const { ccclass, property } = _decorator;

/**
 * PlayerManager
 * 
 * This class manages player sprites and avatar system integration.
 * It can load user-specific avatars from the lottery system.
 */
@ccclass('PlayerManager')
export class PlayerManager extends Component {
    /**
     * Default player sprite frame (fallback)
     */
    @property({
        type: SpriteFrame,
        tooltip: 'Default sprite frame for players (fallback)'
    })
    private defaultPlayerSprite: SpriteFrame | null = null;

    /**
     * Avatar manager for sprite access
     */
    @property({
        type: AvatarManager,
        tooltip: 'Avatar manager component for sprite loading'
    })
    private avatarManager: AvatarManager | null = null;

    // Cache for loaded avatar sprites (no longer needed with AvatarManager but kept for compatibility)
    private avatarSpriteCache: Map<string, SpriteFrame> = new Map();

    start() {
        console.log('[PlayerManager] Initialized with avatar system support');
    }

    /**
     * Get the default player sprite frame
     * @returns The default player sprite frame or null if not set
     */
    public getDefaultPlayerSprite(): SpriteFrame | null {
        return this.defaultPlayerSprite;
    }

    /**
     * Get a player sprite by user ID
     * This now supports the avatar system
     * @param userId The user ID
     * @returns Promise that resolves to the sprite frame or null if not found
     */
    public async getPlayerSpriteByUserId(userId: string): Promise<SpriteFrame | null> {
        try {
            // Get the user's selected avatar
            const selectedAvatarId = await databaseService.getSelectedAvatarByUid(userId);

            if (selectedAvatarId) {
                return await this.loadAvatarSprite(selectedAvatarId);
            } else {
                // Return default sprite if no avatar selected
                return this.defaultPlayerSprite;
            }
        } catch (error) {
            console.error(`Error loading sprite for user ${userId}:`, error);
            return this.defaultPlayerSprite;
        }
    }

    /**
     * Get the current user's selected avatar sprite
     * @returns Promise that resolves to the sprite frame or null if not found
     */
    public async getCurrentUserSprite(): Promise<SpriteFrame | null> {
        try {
            const selectedAvatarId = await databaseService.getSelectedAvatar();

            if (selectedAvatarId) {
                return await this.loadAvatarSprite(selectedAvatarId);
            } else {
                return this.defaultPlayerSprite;
            }
        } catch (error) {
            console.error('Error loading current user sprite:', error);
            return this.defaultPlayerSprite;
        }
    }    /**
     * Load an avatar sprite by avatar ID using AvatarManager
     * @param avatarId The avatar ID from the database
     * @returns Promise that resolves to the sprite frame or null if not found
     */
    public async loadAvatarSprite(avatarId: string): Promise<SpriteFrame | null> {
        try {
            // Use AvatarManager if available
            if (this.avatarManager) {
                const spriteFrame = this.avatarManager.getAvatarSpriteById(avatarId);
                if (spriteFrame) {
                    return spriteFrame;
                }
                console.warn(`[PlayerManager] Avatar sprite not found in AvatarManager for ID: ${avatarId}`);
            } else {
                console.warn('[PlayerManager] AvatarManager not assigned, cannot load avatar sprite');
            }

            // Fallback to default sprite
            return this.defaultPlayerSprite;
        } catch (error) {
            console.error(`[PlayerManager] Error loading avatar sprite for ${avatarId}:`, error);
            return this.defaultPlayerSprite;
        }
    }    /**
     * Get a random player sprite from available avatars
     * @returns A random avatar sprite or the default sprite
         /**
     * Get a random player sprite from available avatars
     * @returns A random avatar sprite or the default sprite
     */
    public getRandomPlayerSprite(): SpriteFrame | null {
        if (this.avatarManager) {
            const randomAvatarWithSprite = this.avatarManager.getRandomAvatarWithSprite();
            if (randomAvatarWithSprite.sprite) {
                return randomAvatarWithSprite.sprite;
            }
        }

        // Fallback to default sprite
        return this.defaultPlayerSprite;
    }    /**
     * Clear the sprite cache (useful when avatars are updated)
     * Note: With AvatarManager, this is mainly for compatibility
     */
    public clearSpriteCache(): void {
        this.avatarSpriteCache.clear();
        console.log('[PlayerManager] Avatar sprite cache cleared (using AvatarManager now)');
    }

    /**
     * Preload commonly used avatar sprites
     * Note: With AvatarManager, sprites are preloaded in the manager itself
     * @param avatarIds Array of avatar IDs to preload
     */
    public async preloadAvatarSprites(avatarIds: string[]): Promise<void> {
        if (this.avatarManager) {
            // With AvatarManager, sprites are already preloaded
            console.log(`[PlayerManager] Sprites already preloaded in AvatarManager for ${avatarIds.length} avatars`);
        } else {
            console.warn('[PlayerManager] AvatarManager not available for preloading');
        }
    }
}
