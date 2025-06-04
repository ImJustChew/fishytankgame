import { _decorator, Component, Node, Prefab, instantiate, Vec3, UITransform, Sprite, SpriteFrame } from 'cc';
import { SavedFishType } from './firebase/database-service';
import { Fish } from './Fish';
import { FishManager } from './FishManager';
import { FishFoodManager } from './FishFoodManager';
import { FishFood } from './FishFood'
import { FishFoodType, FISH_FOOD_LIST } from './FishFoodData'
import { Player, PlayerData } from './Player';
import { PlayerManager } from './PlayerManager';
import databaseService from './firebase/database-service';
import authService from './firebase/auth-service';


const { ccclass, property } = _decorator;

@ccclass('FishTank')
export class FishTank extends Component {

    @property
    maxFishCount: number = 10;

    @property
    maxFishFoodCount: number = 20;

    @property
    maxPlayerCount: number = 5; // Max players that can be displayed (current user + friends)

    private activeFish: Fish[] = [];
    private activeFishFood: FishFood[] = []
    private activePlayers: Player[] = [];
    private tankBounds: { min: Vec3, max: Vec3 } = { min: new Vec3(), max: new Vec3() };

    private currentActiveFishFood: FishFoodType | null = null;
    private currentUser: Player | null = null; // Reference to current user's player

    start() {
        this.calculateTankBounds();
        // always set default fish food value
        this.setCurrentActiveFishFoodByIdx(0);
    }

    private calculateTankBounds() {
        // Use the node this component is attached to as the tank boundary
        const transform = this.getComponent(UITransform);
        let width = 0;
        let height = 0;

        if (transform) {
            width = transform.contentSize.width;
            height = transform.contentSize.height;
        }

        // If UITransform doesn't exist or has zero size, use fallback values
        if (width === 0 || height === 0) {
            const scale = this.node.getScale();
            width = 400 * scale.x;  // Default tank width
            height = 300 * scale.y; // Default tank height
        }

        const halfWidth = width / 2;
        const halfHeight = height / 2;

        this.tankBounds = {
            min: new Vec3(-halfWidth, -halfHeight, 0),
            max: new Vec3(halfWidth, halfHeight, 0)
        };
    }

    public spawnFishFromData(fishDataArray: SavedFishType[], fishManager: FishManager) {
        // Recalculate tank bounds to ensure they're up to date
        this.calculateTankBounds();

        // Clear existing fish
        this.clearAllFish();

        // Limit the number of fish to spawn
        const fishToSpawn = fishDataArray.slice(0, this.maxFishCount);

        fishToSpawn.forEach((fishData, index) => {
            this.spawnFish(fishData, fishManager);
        });
    }

    /**
     * Update fish data without losing positions - intelligent synchronization
     * Only adds new fish, removes missing fish, and updates existing fish data
     */
    public updateFishFromData(fishDataArray: SavedFishType[], fishManager: FishManager) {
        // Recalculate tank bounds to ensure they're up to date
        this.calculateTankBounds();

        // Get current fish IDs for comparison
        const currentFishIds = new Set(
            this.activeFish
                .map(fish => fish.getFishData()?.id)
                .filter(id => id !== undefined) as string[]
        );

        // Get new fish IDs for comparison
        const newFishIds = new Set(
            fishDataArray
                .map(fish => fish.id)
                .filter(id => id !== undefined) as string[]
        );

        // Remove fish that are no longer in the new data
        const fishToRemove = this.activeFish.filter(fish => {
            const fishData = fish.getFishData();
            return fishData?.id && !newFishIds.has(fishData.id);
        });

        fishToRemove.forEach(fish => {
            console.log(`Removing fish ${fish.getFishData()?.id} - no longer in database`);
            this.removeFish(fish);
        });

        // Process each fish from the new data
        fishDataArray.slice(0, this.maxFishCount).forEach(newFishData => {
            if (!newFishData.id) {
                console.warn('Fish data missing ID, cannot sync');
                return;
            }

            // Find existing fish with this ID
            const existingFish = this.activeFish.find(fish => {
                const fishData = fish.getFishData();
                return fishData?.id === newFishData.id;
            });

            if (existingFish) {
                // Update existing fish data without losing position
                console.log(`Updating existing fish ${newFishData.id} data`);
                existingFish.updateFishData(newFishData);
            } else {
                // Add new fish if we haven't reached the limit
                if (this.activeFish.length < this.maxFishCount) {
                    console.log(`Adding new fish ${newFishData.id}`);
                    this.spawnFish(newFishData, fishManager);
                } else {
                    console.warn('Cannot add more fish - max fish count reached');
                }
            }
        });

        console.log(`Fish sync complete: ${this.activeFish.length} fish active`);
    }

    public spawnFish(fishData: SavedFishType, fishManager: FishManager): Fish | null {
        if (this.activeFish.length >= this.maxFishCount) {
            console.warn('Maximum fish count reached, cannot spawn more fish');
            return null;
        }

        // Get sprite frame for the fish type
        const spriteFrame = fishManager.getFishSpriteById(fishData.type);
        if (!spriteFrame) {
            console.warn(`No sprite found for fish type: ${fishData.type}, spawning without sprite`);
        }

        // Create a new node for the fish
        const fishNode = new Node(`Fish_${fishData.type}`);
        this.node.addChild(fishNode);

        // Add Fish component
        const fishComponent = fishNode.addComponent(Fish);
        if (!fishComponent) {
            console.error('Failed to add Fish component');
            fishNode.destroy();
            return null;
        }

        // Add Sprite component and set sprite frame
        const spriteComponent = fishNode.addComponent(Sprite);
        if (spriteComponent && spriteFrame) {
            spriteComponent.spriteFrame = spriteFrame;
        }

        // Initialize the fish with data and bounds
        fishComponent.initializeFish(fishData, this.tankBounds);

        // Add to active fish array
        this.activeFish.push(fishComponent);

        // Set up cleanup when fish is destroyed
        fishNode.on(Node.EventType.NODE_DESTROYED, () => {
            const index = this.activeFish.indexOf(fishComponent);
            if (index > -1) {
                this.activeFish.splice(index, 1);
            }
        });

        return fishComponent;
    }

    // public spawnFishFoodFromData(fishFood: FishFoodType, fishFoodManager: FishFoodManager) {
    //     // Recalculate tank bounds to ensure they're up to date
    //     this.calculateTankBounds();

    //     // Limit the number of fish to spawn
    //     // const fishToSpawn = fishDataArray.slice(0, this.maxFishCount);

    //     this.spawnFishFood(fishFood, fishFoodManager);
    // }

    public spawnFishFood(fishFoodType: FishFoodType, spawnLocation: Vec3, fishFoodManager: FishFoodManager): FishFood | null {
        this.calculateTankBounds();

        // the click is out of bound, return null
        if (spawnLocation.x < this.tankBounds.min.x || spawnLocation.y < this.tankBounds.min.y
            || spawnLocation.x > this.tankBounds.max.x || spawnLocation.y > this.tankBounds.max.y
        ) {
            return null;
        }
        // make condition when food in aquarium has already reached a certain amount to avoid lag
        if (this.activeFishFood.length >= this.maxFishFoodCount) {
            console.warn('Maximum fish food count reached, cannot spawn more food');
            return null;
        }

        // Get sprite frame for the fish type
        const spriteFrame = fishFoodManager.getFishFoodSpriteById(fishFoodType.id);
        if (!spriteFrame) {
            console.warn(`No sprite found for fish type: ${fishFoodType.id}, spawning without sprite`);
        }

        // Create a new node for the fish
        const fishFoodNode = new Node(`Fish_${fishFoodType.id}`);
        this.node.addChild(fishFoodNode);

        // Add Fish component
        const fishFoodComponent = fishFoodNode.addComponent(FishFood);
        if (!fishFoodComponent) {
            console.error('Failed to add Fish Food component');
            fishFoodNode.destroy();
            return null;
        }

        // Add Sprite component and set sprite frame
        const spriteComponent = fishFoodNode.addComponent(Sprite);
        if (spriteComponent && spriteFrame) {
            spriteComponent.spriteFrame = spriteFrame;
        }

        // Initialize the fish food with data and bounds
        fishFoodComponent.initializeFishFood(fishFoodType, spawnLocation, this.tankBounds);

        // Add to active fish food array
        this.activeFishFood.push(fishFoodComponent);

        // Set up cleanup when fish food is destroyed
        fishFoodNode.on(Node.EventType.NODE_DESTROYED, () => {
            const index = this.activeFishFood.indexOf(fishFoodComponent);
            if (index > -1) {
                this.activeFishFood.splice(index, 1);
            }
        });

        return fishFoodComponent;
    }


    public removeFish(fish: Fish) {
        const index = this.activeFish.indexOf(fish);
        if (index > -1) {
            this.activeFish.splice(index, 1);
            fish.node.destroy();
        }
    }

    public clearAllFish() {
        this.activeFish.forEach(fish => {
            if (fish && fish.node) {
                fish.node.destroy();
            }
        });
        this.activeFish = [];
    }

    public getActiveFish(): Fish[] {
        return [...this.activeFish];
    }

    public getActiveFishFood(): FishFood[] {
        return [...this.activeFishFood]
    }

    public getFishCount(): number {
        return this.activeFish.length;
    }

    public getFishFoodCount(): number {
        return this.activeFishFood.length;
    }
    /**
     * Get Current active food list 
     * @param idx 
     * @returns 
     */
    public getCurrentActiveFishFood(): FishFoodType | null {
        return this.currentActiveFishFood;
    }

    public getFishDataArray(): SavedFishType[] {
        return this.activeFish
            .map(fish => fish.getFishData())
            .filter(data => data !== null) as SavedFishType[];
    }

    /**
     * Set the current Active fish food maybe by idx in an array, 
     * for example from UI manager by passing an index 
     * @param index 
     */
    public setCurrentActiveFishFoodByIdx(index) {
        this.currentActiveFishFood = FISH_FOOD_LIST[index];
    }


    public updateTankBounds() {
        this.calculateTankBounds();

        // Update bounds for existing fish
        this.activeFish.forEach(fish => {
            if (fish && fish.initializeFish) {
                const fishData = fish.getFishData();
                if (fishData) {
                    fish.initializeFish(fishData, this.tankBounds);
                }
            }
        });

        // Update bounds for existing players
        this.activePlayers.forEach(player => {
            if (player && player.initializePlayer) {
                const playerData = player.getPlayerData();
                if (playerData) {
                    player.initializePlayer(playerData, this.tankBounds);
                }
            }
        });
    }

    public addRandomFish(fishManager: FishManager) {
        // Create a sample fish data for testing
        const randomFishData: SavedFishType = {
            ownerId: 'current-user',
            type: `fish_${Math.floor(Math.random() * 3) + 1}`, // fish_1, fish_2, or fish_3 to match FishData IDs
            health: 100,
            lastFedTime: Date.now()
        };

        this.spawnFish(randomFishData, fishManager);
    }

    // ==================== PLAYER MANAGEMENT METHODS ====================

    /**
     * Spawn the current user's player (controllable)
     */
    public async spawnCurrentUserPlayer(playerManager?: PlayerManager): Promise<Player | null> {
        const user = authService.getCurrentUser();
        if (!user) {
            console.warn('Cannot spawn current user player: No user is signed in');
            return null;
        }

        // Check if current user player already exists
        if (this.currentUser) {
            console.log('Current user player already spawned');
            return this.currentUser;
        }

        // Get or create player position from database
        let playerPosition = await databaseService.getPlayerPosition(user.uid);
        if (!playerPosition) {
            // Create default position if none exists
            playerPosition = { x: 0, y: 0, lastUpdated: Date.now() };
            await databaseService.updatePlayerPosition(0, 0);
        }

        const playerData: PlayerData = {
            ownerId: user.uid,
            x: playerPosition.x,
            y: playerPosition.y,
            isCurrentUser: true
        };

        const player = this.spawnPlayer(playerData, playerManager);
        if (player) {
            this.currentUser = player;
            console.log('Current user player spawned successfully');
        }

        return player;
    }

    /**
     * Load and display friends' players in the tank
     */
    public async loadFriendsPlayers(playerManager?: PlayerManager): Promise<void> {
        try {
            // Remove existing friend players (keep current user)
            this.clearFriendPlayers();

            // Get friends' player positions
            const friendsData = await databaseService.getFriendsPlayerPositions();

            // Spawn friend players (display-only)
            for (const friendUid in friendsData) {
                if (friendsData.hasOwnProperty(friendUid)) {
                    if (this.activePlayers.length >= this.maxPlayerCount) {
                        console.warn('Maximum player count reached, cannot spawn more friend players');
                        break;
                    }

                    const friendInfo = friendsData[friendUid];
                    const playerData: PlayerData = {
                        id: friendUid,
                        ownerId: friendUid,
                        x: friendInfo.x,
                        y: friendInfo.y,
                        isCurrentUser: false
                    };

                    const friendPlayer = this.spawnPlayer(playerData, playerManager);
                    if (friendPlayer) {
                        console.log(`Spawned friend player: ${friendInfo.username} at (${friendInfo.x}, ${friendInfo.y})`);
                    }
                }
            }

            console.log(`Loaded ${Object.keys(friendsData).length} friend players`);
        } catch (error) {
            console.error('Error loading friends players:', error);
        }
    }

    /**
     * Spawn a player (current user or friend)
     */
    public spawnPlayer(playerData: PlayerData, playerManager?: PlayerManager): Player | null {
        if (this.activePlayers.length >= this.maxPlayerCount) {
            console.warn('Maximum player count reached, cannot spawn more players');
            return null;
        }

        // Create a new node for the player
        const playerNode = new Node(`Player_${playerData.ownerId}`);
        this.node.addChild(playerNode);

        // Add Player component
        const playerComponent = playerNode.addComponent(Player);
        if (!playerComponent) {
            console.error('Failed to add Player component');
            playerNode.destroy();
            return null;
        }

        // Add Sprite component for player visual
        const spriteComponent = playerNode.addComponent(Sprite);
        if (spriteComponent && playerManager) {
            // Get player sprite from PlayerManager
            const playerSprite = playerManager.getPlayerSpriteByUserId(playerData.ownerId);
            if (playerSprite) {
                spriteComponent.spriteFrame = playerSprite;
            } else {
                console.warn(`No sprite found for player ${playerData.ownerId}, using default`);
                const defaultSprite = playerManager.getDefaultPlayerSprite();
                if (defaultSprite) {
                    spriteComponent.spriteFrame = defaultSprite;
                }
            }
        }

        // Initialize the player with data and bounds
        playerComponent.initializePlayer(playerData, this.tankBounds);

        // Add to active players array
        this.activePlayers.push(playerComponent);

        // Set up cleanup when player is destroyed
        playerNode.on(Node.EventType.NODE_DESTROYED, () => {
            const index = this.activePlayers.indexOf(playerComponent);
            if (index > -1) {
                this.activePlayers.splice(index, 1);
            }

            // Clear current user reference if this was the current user
            if (this.currentUser === playerComponent) {
                this.currentUser = null;
            }
        });

        return playerComponent;
    }

    /**
     * Remove all friend players but keep current user player
     */
    public clearFriendPlayers() {
        const friendPlayers = this.activePlayers.filter(player => {
            const playerData = player.getPlayerData();
            return playerData && !playerData.isCurrentUser;
        });

        friendPlayers.forEach(player => {
            this.removePlayer(player);
        });

        console.log(`Cleared ${friendPlayers.length} friend players`);
    }

    /**
     * Remove all players including current user
     */
    public clearAllPlayers() {
        this.activePlayers.forEach(player => {
            if (player && player.node) {
                player.node.destroy();
            }
        });
        this.activePlayers = [];
        this.currentUser = null;
        console.log('Cleared all players');
    }

    /**
     * Remove a specific player
     */
    public removePlayer(player: Player) {
        const index = this.activePlayers.indexOf(player);
        if (index > -1) {
            this.activePlayers.splice(index, 1);

            // Clear current user reference if removing current user
            if (this.currentUser === player) {
                this.currentUser = null;
            }

            player.node.destroy();
        }
    }

    /**
     * Get the current user's player
     */
    public getCurrentUserPlayer(): Player | null {
        return this.currentUser;
    }

    /**
     * Get all active players
     */
    public getActivePlayers(): Player[] {
        return [...this.activePlayers];
    }

    /**
     * Get the number of active players
     */
    public getPlayerCount(): number {
        return this.activePlayers.length;
    }

    onDestroy() {
        this.clearAllFish();
        this.clearAllPlayers();
    }
}
