import { _decorator, Component, Node, Vec3, input, Input, KeyCode, Sprite, SpriteFrame, math } from 'cc';
import databaseService, { SavedFishType } from './firebase/database-service';

const { ccclass, property } = _decorator;

export type PlayerData = {
    id?: string;
    ownerId: string;
    x: number;
    y: number;
    isCurrentUser: boolean;
}

@ccclass('Player')
export class Player extends Component {
    @property
    moveSpeed: number = 200;

    @property
    gravity: number = 50;

    @property
    floatForce: number = 80;

    @property
    dampening: number = 0.95;

    @property
    positionSyncInterval: number = 1.0; // Sync position every 1 second

    private playerData: PlayerData | null = null;
    private tankBounds: { min: Vec3, max: Vec3 } | null = null;
    private velocity: Vec3 = new Vec3();
    private sprite: Sprite | null = null;
    private isCurrentUser: boolean = false;

    // Input state tracking
    private inputState = {
        left: false,
        right: false,
        up: false,
        down: false
    };

    // Position synchronization
    private lastSyncTime: number = 0;
    private positionChanged: boolean = false;

    start() {
        this.sprite = this.getComponent(Sprite);
        this.setupInputHandling();
    }

    update(deltaTime: number) {
        if (this.isCurrentUser) {
            this.handleMovement(deltaTime);
            this.applyPhysics(deltaTime);
            this.checkBounds();
            this.syncPositionToDatabase(deltaTime);
        }
    }

    /**
     * Initialize player with data and tank bounds
     */
    public initializePlayer(playerData: PlayerData, tankBounds: { min: Vec3, max: Vec3 }) {
        this.playerData = playerData;
        this.tankBounds = tankBounds;
        this.isCurrentUser = playerData.isCurrentUser;

        // Set initial position
        this.node.setPosition(playerData.x, playerData.y, 0);

        // Set up input handling only for current user
        if (this.isCurrentUser) {
            this.enableInput();
        } else {
            this.disableInput();
        }

        console.log(`Player initialized for ${this.isCurrentUser ? 'current user' : 'other user'} at position (${playerData.x}, ${playerData.y})`);
    }

    /**
     * Set up WASD input handling
     */
    private setupInputHandling() {
        if (this.isCurrentUser) {
            input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
            input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        }
    }

    private enableInput() {
        if (!this.isCurrentUser) return;
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    private disableInput() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    private onKeyDown = (event: any) => {
        if (!this.isCurrentUser) return;

        switch (event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this.inputState.up = true;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this.inputState.down = true;
                break;
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this.inputState.left = true;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this.inputState.right = true;
                break;
        }
    }

    private onKeyUp = (event: any) => {
        if (!this.isCurrentUser) return;

        switch (event.keyCode) {
            case KeyCode.KEY_W:
            case KeyCode.ARROW_UP:
                this.inputState.up = false;
                break;
            case KeyCode.KEY_S:
            case KeyCode.ARROW_DOWN:
                this.inputState.down = false;
                break;
            case KeyCode.KEY_A:
            case KeyCode.ARROW_LEFT:
                this.inputState.left = false;
                break;
            case KeyCode.KEY_D:
            case KeyCode.ARROW_RIGHT:
                this.inputState.right = false;
                break;
        }
    }

    /**
     * Handle WASD movement with floating physics
     */
    private handleMovement(deltaTime: number) {
        if (!this.isCurrentUser) return;

        const inputVector = new Vec3();

        // Calculate input direction
        if (this.inputState.left) inputVector.x -= 1;
        if (this.inputState.right) inputVector.x += 1;
        if (this.inputState.up) inputVector.y += 1;
        if (this.inputState.down) inputVector.y -= 1;

        // Normalize diagonal movement
        if (inputVector.length() > 0) {
            inputVector.normalize();
            inputVector.multiplyScalar(this.moveSpeed * deltaTime);

            // Add input to velocity
            this.velocity.add(inputVector);
            this.positionChanged = true;

            // Update sprite flip based on movement direction
            if (this.sprite && inputVector.x !== 0) {
                this.sprite.node.setScale(inputVector.x < 0 ? -1 : 1, 1, 1);
            }
        }
    }

    /**
     * Apply floating physics with gravity and dampening
     */
    private applyPhysics(deltaTime: number) {
        if (!this.isCurrentUser) return;

        // Apply gravity (downward force)
        this.velocity.y -= this.gravity * deltaTime;

        // Apply floating force (upward buoyancy)
        this.velocity.y += this.floatForce * deltaTime;

        // Apply dampening to simulate water resistance
        this.velocity.multiplyScalar(this.dampening);

        // Apply velocity to position
        const currentPos = this.node.getPosition();
        const newPos = currentPos.clone();
        newPos.add(new Vec3(this.velocity.x * deltaTime, this.velocity.y * deltaTime, 0));

        this.node.setPosition(newPos);

        if (this.velocity.length() > 0.1) {
            this.positionChanged = true;
        }
    }

    /**
     * Check and enforce tank boundaries
     */
    private checkBounds() {
        if (!this.tankBounds) return;

        const currentPos = this.node.getPosition();
        let positionAdjusted = false;

        // Check X bounds
        if (currentPos.x < this.tankBounds.min.x) {
            currentPos.x = this.tankBounds.min.x;
            this.velocity.x = 0; // Stop horizontal velocity
            positionAdjusted = true;
        } else if (currentPos.x > this.tankBounds.max.x) {
            currentPos.x = this.tankBounds.max.x;
            this.velocity.x = 0;
            positionAdjusted = true;
        }

        // Check Y bounds
        if (currentPos.y < this.tankBounds.min.y) {
            currentPos.y = this.tankBounds.min.y;
            this.velocity.y = 0; // Stop vertical velocity
            positionAdjusted = true;
        } else if (currentPos.y > this.tankBounds.max.y) {
            currentPos.y = this.tankBounds.max.y;
            this.velocity.y = 0;
            positionAdjusted = true;
        }

        if (positionAdjusted) {
            this.node.setPosition(currentPos);
            this.positionChanged = true;
        }
    }

    /**
     * Sync position to database at regular intervals
     */
    private syncPositionToDatabase(deltaTime: number) {
        if (!this.isCurrentUser || !this.playerData) return;

        this.lastSyncTime += deltaTime;

        if (this.lastSyncTime >= this.positionSyncInterval && this.positionChanged) {
            const currentPos = this.node.getPosition();
            this.updatePlayerPosition(currentPos.x, currentPos.y);
            this.lastSyncTime = 0;
            this.positionChanged = false;
        }
    }

    /**
     * Update player position in database
     */
    private async updatePlayerPosition(x: number, y: number) {
        if (!this.playerData?.id) return;

        try {
            // Update in the player data structure (we'll need to modify database service for this)
            await this.updatePlayerDataInDatabase({ x, y });
            console.log(`Player position synced: (${x.toFixed(1)}, ${y.toFixed(1)})`);
        } catch (error) {
            console.error('Error syncing player position:', error);
        }
    }    /**
     * Update player data in database (placeholder - need to implement in database service)
     */
    private async updatePlayerDataInDatabase(updates: Partial<PlayerData>) {
        if (updates.x !== undefined && updates.y !== undefined) {
            try {
                await databaseService.updatePlayerPosition(updates.x, updates.y);
                console.log(`Player position synced to database: (${updates.x.toFixed(1)}, ${updates.y.toFixed(1)})`);
            } catch (error) {
                console.error('Error syncing player position to database:', error);
            }
        }
    }

    /**
     * Update player data (for other users' position updates)
     */
    public updatePlayerData(newData: Partial<PlayerData>) {
        if (!this.playerData) return;

        // Update local data
        Object.assign(this.playerData, newData);

        // Update position for other users (not current user - they control their own position)
        if (!this.isCurrentUser && typeof newData.x === 'number' && typeof newData.y === 'number') {
            this.node.setPosition(newData.x, newData.y, 0);
        }
    }

    /**
     * Get current player data
     */
    public getPlayerData(): PlayerData | null {
        if (!this.playerData) return null;

        // Update position in data for current user
        if (this.isCurrentUser) {
            const currentPos = this.node.getPosition();
            this.playerData.x = currentPos.x;
            this.playerData.y = currentPos.y;
        }

        return this.playerData;
    }

    /**
     * Set player sprite
     */
    public setSprite(spriteFrame: SpriteFrame) {
        if (this.sprite) {
            this.sprite.spriteFrame = spriteFrame;
        }
    }

    /**
     * Set random position within tank bounds
     */
    public setRandomPosition() {
        if (!this.tankBounds) return;

        const padding = 20;
        const minX = this.tankBounds.min.x + padding;
        const maxX = this.tankBounds.max.x - padding;
        const minY = this.tankBounds.min.y + padding;
        const maxY = this.tankBounds.max.y - padding;

        const randomX = math.lerp(minX, maxX, Math.random());
        const randomY = math.lerp(minY, maxY, Math.random());

        this.node.setPosition(randomX, randomY, 0);
        this.positionChanged = true;
    }

    onDestroy() {
        // Clean up input handlers
        this.disableInput();
    }
}
