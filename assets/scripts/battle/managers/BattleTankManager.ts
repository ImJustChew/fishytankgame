import { _decorator, Component, Node, Vec3, Prefab, instantiate, EventTouch, Sprite, UITransform, Color, Graphics } from 'cc';
import { BattleTank } from '../BattleTank';
import { BattleFish } from '../components/BattleFish';
import { IBattleFish, BattleFishFactory, DeployedFishRecord as MatchDeployedFishRecord } from '../data/BattleFishData';
import { BattleConfig } from '../data/BattleConfig';
import { Fish, FISH_LIST } from '../../FishData';
import { FishManager } from '../../FishManager';
import { BattleFishVisualizer } from '../components/BattleFishVisualizer';

const { ccclass, property } = _decorator;

// Local interface for active battle tracking
export interface ActiveBattleFishRecord {
    fishId: string;
    position: Vec3;
    deployTime: number;
    isAlive: boolean;
}

@ccclass('BattleTankManager')
export class BattleTankManager extends Component {
    @property(BattleTank)
    battleTank: BattleTank | null = null;

    @property(Prefab)
    battleFishPrefab: Prefab = null!;

    @property(FishManager)
    fishManager: FishManager | null = null;

    @property(BattleFishVisualizer)
    fishVisualizer: BattleFishVisualizer | null = null;

    private isPlayerTank: boolean = false;
    private deployedFish: Map<string, BattleFish> = new Map();
    private deployedFishRecords: ActiveBattleFishRecord[] = [];
    private deploymentCount: number = 0;
    private battleActive: boolean = false; public initializeForBattle(isPlayer: boolean, fishCollection?: string[]) {
        // Check if battle tank is properly set up
        if (!this.battleTank) {
            console.error('BattleTank component not assigned to BattleTankManager');
            return;
        }

        console.log(`Initializing battle tank:
            - Tank exists: ${!!this.battleTank}
            - Tank node exists: ${!!this.battleTank.node}
            - Tank node name: ${this.battleTank.node.name}
            - Tank node parent: ${this.battleTank.node.parent?.name || 'none'}
            - Tank node active: ${this.battleTank.node.active}
        `);

        this.isPlayerTank = isPlayer;
        this.deployedFish.clear();
        this.deployedFishRecords = [];
        this.deploymentCount = 0;
        this.battleActive = false; if (!isPlayer) {
            // For opponent tank, deploy fish from collection or simulate if none provided
            if (fishCollection && fishCollection.length > 0) {
                this.deployOpponentFishCollection(fishCollection);
            } else {
                this.simulateOpponentDeployment();
            }
        } else {
            // For player tank, also deploy opponent fish if collection is provided
            // This allows for a hybrid tank where players can deploy and opponents are already present
            if (fishCollection && fishCollection.length > 0) {
                console.log('Deploying opponent fish collection in player battle tank:', fishCollection);
                this.deployOpponentFishCollection(fishCollection);
            }
        }
    } private simulateOpponentDeployment() {
        // Deploy some random opponent fish for visualization
        const opponentFishIds = ['fish_001', 'fish_002', 'fish_003', 'fish_004', 'fish_005'];
        const fishCount = Math.floor(Math.random() * 3) + 2; // 2-5 fish

        for (let i = 0; i < fishCount; i++) {
            const fishId = opponentFishIds[Math.floor(Math.random() * opponentFishIds.length)];
            const randomPos = this.getRandomTankPosition();
            this.deployOpponentFish(fishId, randomPos);
        }
    } private deployOpponentFishCollection(fishCollection: string[]) {
        // Deploy fish from the opponent's actual collection
        console.log('Deploying opponent fish collection:', fishCollection);

        for (const fishId of fishCollection) {
            const randomPos = this.getRandomTankPosition();
            this.deployOpponentFish(fishId, randomPos);
        }
    }

    private getRandomTankPosition(): Vec3 {
        // Generate random position within tank bounds
        const tankBounds = this.getTankBounds();
        const width = tankBounds.max.x - tankBounds.min.x;
        const height = tankBounds.max.y - tankBounds.min.y;
        return new Vec3(
            tankBounds.min.x + Math.random() * width,
            tankBounds.min.y + Math.random() * height,
            0
        );
    } private getTankBounds(): { min: Vec3, max: Vec3 } {
        if (this.battleTank) {
            return this.battleTank.getTankBounds();
        }

        // Fallback bounds if battleTank is not available
        const width = 600;
        const height = 400;
        return {
            min: new Vec3(-width / 2, -height / 2, 0),
            max: new Vec3(width / 2, height / 2, 0)
        };
    } public deployFish(fishId: string, position: Vec3): boolean {
        if (!this.isPlayerTank || !this.canDeployFish()) {
            return false;
        }

        const fishData = FISH_LIST.find(f => f.id === fishId);
        if (!fishData) {
            console.error('Fish not found:', fishId);
            return false;
        }
        // Generate a single consistent instanceId for this fish
        const instanceId = this.generateInstanceId();

        // Create battle fish from data
        const battleFishData = BattleFishFactory.createBattleFish(fishData, 'player', position, instanceId);
        const fishNode = this.createBattleFishNode(battleFishData, position);

        if (!fishNode) {
            console.error('Failed to create fish node for', fishId);
            return false;
        }        // Set a descriptive name for the node to help with debugging
        fishNode.name = `PlayerFish_${fishId}_${instanceId.substring(0, 8)}`;

        // Add to tank
        this.addFishToTank(fishNode);

        // Track deployment
        const battleFish = fishNode.getComponent(BattleFish)!;
        this.deployedFish.set(instanceId, battleFish);

        this.deployedFishRecords.push({
            fishId: instanceId, // Store instanceId instead of fishId for consistent tracking
            position: position.clone(),
            deployTime: Date.now(),
            isAlive: true
        });
        // Print all children of the battle tank for debugging
        if (this.battleTank && this.battleTank.node) {
            console.log(`Battle tank children after deployment (${this.battleTank.node.children.length} total):`);
            this.battleTank.node.children.forEach((child, index) => {
                const sprite = child.getComponent(Sprite);
                const visibility = sprite ? (sprite.color.a > 0 ? 'visible' : 'transparent') : 'no-sprite';
                console.log(`   ${index}: ${child.name}, active: ${child.active}, visibility: ${visibility}`);
            });
        }

        this.deploymentCount++;

        console.log(`Deployed ${fishId} at position ${position}`);
        return true;
    } private deployOpponentFish(fishId: string, position: Vec3): void {
        const fishData = FISH_LIST.find(f => f.id === fishId);
        if (!fishData) {
            return;
        }

        // Generate a single consistent instanceId for this fish
        const instanceId = this.generateInstanceId();

        const battleFishData = BattleFishFactory.createBattleFish(fishData, 'opponent', position, instanceId);
        const fishNode = this.createBattleFishNode(battleFishData, position, false);

        if (fishNode) {
            this.addFishToTank(fishNode);

            // Use the same instanceId that was used in createBattleFish
            const battleFish = fishNode.getComponent(BattleFish)!;
            this.deployedFish.set(instanceId, battleFish);

            // Add to records for consistent tracking
            this.deployedFishRecords.push({
                fishId: instanceId,
                position: position.clone(),
                deployTime: Date.now(),
                isAlive: true
            });

            console.log(`Deployed opponent fish ${fishId} with instance ${instanceId} at position ${position}`);
        }
    } private createBattleFishNode(battleFishData: IBattleFish, position: Vec3, isPlayerFish: boolean = true): Node | null {
        if (!this.battleFishPrefab) {
            console.error('Battle fish prefab not set');
            return null;
        }

        const fishNode = instantiate(this.battleFishPrefab);

        // Set the node name for easier debugging
        fishNode.name = `BattleFish_${battleFishData.originalData.id}_${battleFishData.owner}`;

        // Set the position
        fishNode.setPosition(position);

        // Ensure the node is active
        fishNode.active = true;

        const battleFish = fishNode.getComponent(BattleFish);
        if (!battleFish) {
            console.error('BattleFish component not found on prefab');
            fishNode.destroy();
            return null;
        }

        // Set a debug property to track this fish's instance ID
        fishNode['_instanceId'] = battleFishData.fishId;        // Set fish sprite using FishManager
        if (this.fishManager) {
            const spriteFrame = this.fishManager.getFishSpriteById(battleFishData.originalData.id);
            if (spriteFrame) {
                // Find or create sprite component
                let spriteComponent = fishNode.getComponent(Sprite);

                // If no sprite component on node, check children
                if (!spriteComponent) {
                    for (const child of fishNode.children) {
                        const childSprite = child.getComponent(Sprite);
                        if (childSprite) {
                            spriteComponent = childSprite;
                            break;
                        }
                    }
                }

                // If still no sprite component, add one
                if (!spriteComponent) {
                    spriteComponent = fishNode.addComponent(Sprite);
                }

                // Set the sprite frame
                spriteComponent.spriteFrame = spriteFrame;

                // Ensure the sprite is visible
                if (spriteComponent) {
                    // Make sure sprite is not transparent
                    spriteComponent.color = new Color(255, 255, 255, 255);

                    // Set sprite properties for better visibility
                    spriteComponent.sizeMode = Sprite.SizeMode.CUSTOM;
                    // Get UITransform and set a reasonable size if it exists
                    const uiTransform = fishNode.getComponent(UITransform) || fishNode.addComponent(UITransform);
                    if (uiTransform) {
                        uiTransform.width = 80;
                        uiTransform.height = 40;
                    }
                }

                // Set appropriate node scale if needed
                if (fishNode.scale.x === 0 || fishNode.scale.y === 0) {
                    fishNode.setScale(1, 1, 1);
                }

                console.log(`Applied sprite frame for fish: ${battleFishData.originalData.id} (Sprite visible: ${!!spriteComponent})`);
            } else {
                console.warn(`No sprite found for fish type: ${battleFishData.originalData.id}`);
            }
        } else {
            console.warn('FishManager not set - fish will spawn without sprite');
        }

        // Ensure the fish is in front of other elements by adjusting z position
        const currentPos = fishNode.getPosition();
        fishNode.setPosition(currentPos.x, currentPos.y, -10);        // Initialize battle fish
        battleFish.initializeBattleFish(
            battleFishData.originalData,
            battleFishData.owner,
            this.getTankBounds(),
            position,
            battleFishData.fishId
        );

        // Force the fish to be highly visible for debugging
        const fishSprite = fishNode.getComponent(Sprite);
        if (fishSprite) {
            fishSprite.color = new Color(255, 255, 255, 255); // Full opacity            // No longer adding debug outlines to fish
        }

        return fishNode;
    } private canDeployFish(): boolean {
        if (!this.battleActive && this.deploymentCount >= BattleConfig.MAX_DEPLOYMENTS) {
            return false;
        }

        if (this.battleActive && this.deploymentCount >= BattleConfig.MAX_FISH_PER_PLAYER) {
            return false;
        }

        return true;
    }

    public startBattle(): void {
        this.battleActive = true;

        // Activate all deployed fish for battle
        this.deployedFish.forEach(battleFish => {
            battleFish.activateForBattle();
        });
    }

    public stopBattle(): void {
        this.battleActive = false;

        // Deactivate all fish
        this.deployedFish.forEach(battleFish => {
            battleFish.deactivateFromBattle();
        });
    }

    public removeFish(instanceId: string): void {
        const battleFish = this.deployedFish.get(instanceId);
        if (battleFish) {
            // Mark as dead in records
            const record = this.deployedFishRecords.find(r =>
                r.position.equals(battleFish.node.getPosition()) && r.isAlive
            );
            if (record) {
                record.isAlive = false;
            }

            // Remove from tank
            battleFish.node.removeFromParent();
            this.deployedFish.delete(instanceId);
        }
    }

    public getAllBattleFish(): BattleFish[] {
        return Array.from(this.deployedFish.values());
    }

    public getAliveFishCount(): number {
        return Array.from(this.deployedFish.values()).filter(fish => fish.isAlive()).length;
    }

    public getDeadFishCount(): number {
        return this.deployedFishRecords.filter(record => !record.isAlive).length;
    } public getDeployedFishRecords(): ActiveBattleFishRecord[] {
        return [...this.deployedFishRecords];
    } public getMatchDeployedFishRecords(): MatchDeployedFishRecord[] {
        return this.deployedFishRecords.map(record => {
            const battleFish = this.deployedFish.get(record.fishId);
            const battleData = battleFish ? battleFish.getBattleData() : null;
            const fishType = battleData ? battleData.originalData.id : 'unknown';
            const role = battleFish ? battleFish.getBattleRole() : 'attacker';

            return {
                fishType: fishType,
                deployTime: record.deployTime,
                role: role === 'neutral' ? 'attacker' : role as 'attacker' | 'defender',
                survived: record.isAlive
            };
        });
    }

    public getPlayerMatchDeployedFishRecords(): MatchDeployedFishRecord[] {
        return this.deployedFishRecords
            .filter(record => {
                const battleFish = this.deployedFish.get(record.fishId);
                return battleFish && battleFish.getOwner() === 'player';
            })
            .map(record => {
                const battleFish = this.deployedFish.get(record.fishId);
                const battleData = battleFish ? battleFish.getBattleData() : null;
                const fishType = battleData ? battleData.originalData.id : 'unknown';
                const role = battleFish ? battleFish.getBattleRole() : 'attacker';

                return {
                    fishType: fishType,
                    deployTime: record.deployTime,
                    role: role === 'neutral' ? 'attacker' : role as 'attacker' | 'defender',
                    survived: record.isAlive
                };
            });
    }

    public getOpponentMatchDeployedFishRecords(): MatchDeployedFishRecord[] {
        return this.deployedFishRecords
            .filter(record => {
                const battleFish = this.deployedFish.get(record.fishId);
                return battleFish && battleFish.getOwner() === 'opponent';
            })
            .map(record => {
                const battleFish = this.deployedFish.get(record.fishId);
                const battleData = battleFish ? battleFish.getBattleData() : null;
                const fishType = battleData ? battleData.originalData.id : 'unknown';
                const role = battleFish ? battleFish.getBattleRole() : 'attacker';

                return {
                    fishType: fishType,
                    deployTime: record.deployTime,
                    role: role === 'neutral' ? 'attacker' : role as 'attacker' | 'defender',
                    survived: record.isAlive
                };
            });
    } public getAllDeployedFishIds(): string[] {
        return this.deployedFishRecords.map(record => record.fishId);
    }

    public getPlayerDeployedFishIds(): string[] {
        return this.deployedFishRecords
            .filter(record => {
                const battleFish = this.deployedFish.get(record.fishId);
                return battleFish && battleFish.getOwner() === 'player';
            })
            .map(record => record.fishId);
    }

    public getDeploymentCount(): number {
        return this.deploymentCount;
    }

    public canDeployMoreFish(): boolean {
        return this.canDeployFish();
    }

    public getFishByPosition(position: Vec3, tolerance: number = 50): BattleFish | null {
        for (const battleFish of this.deployedFish.values()) {
            const fishPos = battleFish.node.getPosition();
            if (Vec3.distance(fishPos, position) <= tolerance) {
                return battleFish;
            }
        }
        return null;
    }

    public getFishInArea(center: Vec3, radius: number): BattleFish[] {
        const fishInArea: BattleFish[] = [];

        for (const battleFish of this.deployedFish.values()) {
            const fishPos = battleFish.node.getPosition();
            if (Vec3.distance(fishPos, center) <= radius) {
                fishInArea.push(battleFish);
            }
        }

        return fishInArea;
    }

    public reset(): void {
        // Remove all fish from tank
        this.deployedFish.forEach(battleFish => {
            battleFish.node.removeFromParent();
        });

        // Clear tracking data
        this.deployedFish.clear();
        this.deployedFishRecords = [];
        this.deploymentCount = 0;
        this.battleActive = false;
    }

    private generateInstanceId(): string {
        return `fish_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } private addFishToTank(fishNode: Node): void {
        if (!this.battleTank) {
            console.error('BattleTank component not assigned');
            return;
        }

        // Store original position before adding to tank
        const originalPosition = fishNode.getPosition().clone();

        // Add fish directly to the battle tank node
        this.battleTank.node.addChild(fishNode);

        // Ensure the fish's position is preserved in the new parent's coordinate system
        fishNode.setPosition(originalPosition);

        // Apply fish visualizer to make the fish visible 
        if (this.fishVisualizer) {
            // Visualize the newly added fish
            this.fishVisualizer.visualizeSpecificFish(fishNode);
            console.log(`Applied visualizer to fish: ${fishNode.name}`);
        } else {
            console.warn('No BattleFishVisualizer assigned, fish may not be visible');
        }

        // Apply fish visualizer to make the fish visible 
        if (this.fishVisualizer) {
            // Visualize the newly added fish
            const battleFish = fishNode.getComponent(BattleFish);
            if (battleFish) {
                // Either visualize just this fish or refresh all fish
                this.fishVisualizer.visualizeSpecificFish(fishNode);
                console.log(`Applied visualizer to fish: ${fishNode.name}`);
            }
        } else {
            console.warn('No BattleFishVisualizer assigned, fish may not be visible');
        }

        // Explicitly bring the fish to front by adjusting z
        const currentPos = fishNode.getPosition();
        fishNode.setPosition(currentPos.x, currentPos.y, -10);

        // Set the node name to something identifiable
        const battleFish = fishNode.getComponent(BattleFish);
        if (battleFish && battleFish.getBattleData && battleFish.getBattleData()) {
            const fishData = battleFish.getBattleData()!;
            fishNode.name = `BattleFish_${fishData.originalData.id}_${fishData.owner}`;
        }

        // Ensure the node is active and visible
        fishNode.active = true;

        // Get the sprite component and ensure it's visible
        const spriteComponent = fishNode.getComponent(Sprite);
        if (spriteComponent) {
            spriteComponent.color = new Color(255, 255, 255, 255);  // Full opacity
        }        // No longer adding debug outlines for fish

        // Log detailed debug info for troubleshooting
        console.log(`Fish added to tank: 
            - Name: ${fishNode.name}
            - Position: ${fishNode.position.toString()}
            - Parent: ${fishNode.parent?.name || 'none'}
            - Active: ${fishNode.active}
            - Children: ${fishNode.children.length}
            - Has Sprite: ${!!spriteComponent}
            - Sprite Visible: ${spriteComponent ? (spriteComponent.color.a > 0 ? 'Yes' : 'No') : 'N/A'}
            - Sprite Frame: ${spriteComponent && spriteComponent.spriteFrame ? spriteComponent.spriteFrame.name : 'None'}
            - Has BattleFish: ${!!fishNode.getComponent('BattleFish')}
            - Debug Outline Added: Yes
        `);

        console.log(`Tank children after adding fish: ${this.battleTank.node.children.length}`);
    }// Battle mode specific update - no food mechanics needed
    update(deltaTime: number) {
        // Battle tanks don't need food mechanics or collision detection
        // All battle logic is handled by individual BattleFish components
    }

    // Battle mode doesn't need touch interaction for food
    protected onTouch(event: EventTouch) {
        // Battles don't use food spawning on touch
        // Touch interactions in battle are handled by other systems
    }
}
