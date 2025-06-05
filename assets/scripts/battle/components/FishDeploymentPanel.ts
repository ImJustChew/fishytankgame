import { _decorator, Component, Node, Vec2, Vec3, EventTouch, UITransform, instantiate, Prefab, Sprite, Label, Color, Graphics, find } from 'cc';
import { BattleTankManager } from '../managers/BattleTankManager';
import { FISH_LIST } from '../../FishData';
import { BattleConfig } from '../data/BattleConfig';
import { FishManager } from '../../FishManager';
import { FishSlot } from './FishSlot';
import databaseService from '../../firebase/database-service';
import authService from '../../firebase/auth-service';
import { BattleFishVisualizerManager } from '../BattleFishVisualizerManager';

const { ccclass, property } = _decorator;

interface IBattleSceneManager {
    deployFish(fishId: string, position: Vec3): boolean;
}

interface FishSlotData {
    fishId: string;
    count: number;
    node: Node;
}

@ccclass('FishDeploymentPanel')
export class FishDeploymentPanel extends Component {
    @property(Node)
    fishSlotsContainer: Node = null!;

    @property(Node)
    deploymentArea: Node = null!;

    @property(Prefab)
    fishSlotPrefab: Prefab = null!;

    @property(Node) dragPreview: Node = null!;

    @property(FishManager)
    fishManager: FishManager | null = null;

    @property(BattleFishVisualizerManager)
    visualizerManager: BattleFishVisualizerManager | null = null;

    private deploymentAreaBorder: Node | null = null;
    private tankManager: BattleTankManager = null!;
    private battleSceneManager: IBattleSceneManager = null!;
    private fishSlots: FishSlotData[] = [];
    private isDeploymentEnabled: boolean = false;
    private isDragging: boolean = false;
    private draggedFishId: string = '';
    private canvasNode: Node | null = null; // Track canvas for cleanup

    async start() {
        await this.initializeFishSlots();
        this.setupDragAndDrop();
        this.setupGlobalTouchHandler(); // Add global touch handling
        this.createDeploymentAreaBorder();        // No longer creating debug visuals
    }

    // Debug visualizer method removed
    public setTankManager(tankManager: BattleTankManager): void {
        console.log("🏆 SETTING TANK MANAGER");
        console.log(`Tank Manager Valid: ${!!tankManager}`);

        if (tankManager) {
            console.log(`Tank Manager Battle Tank: ${!!tankManager.battleTank}`);
            if (tankManager.battleTank) {
                console.log(`Battle Tank Node: ${!!tankManager.battleTank.node}`);
                console.log(`Battle Tank Node Name: ${tankManager.battleTank.node?.name}`);
            }
            console.log(`Tank Manager canDeployMoreFish: ${typeof tankManager.canDeployMoreFish}`);
        }

        this.tankManager = tankManager;

        // Setup the visualizer manager to ensure fish are visible
        this.setupVisualizerManager();
    }

    /**
     * Set up the visualizer manager to ensure fish are visible
     */
    private setupVisualizerManager(): void {
        if (!this.tankManager) {
            return;
        }

        // Try to find an existing visualizer manager
        let visualizerManager = find('BattleFishVisualizerManager')?.getComponent(BattleFishVisualizerManager);

        // Create one if it doesn't exist
        if (!visualizerManager) {
            const visualizerNode = new Node('BattleFishVisualizerManager');
            this.node.parent?.addChild(visualizerNode);

            visualizerManager = visualizerNode.addComponent(BattleFishVisualizerManager);
        }

        if (visualizerManager) {
            // Connect components
            visualizerManager.tankManager = this.tankManager;
            visualizerManager.fishManager = this.fishManager;

            // Force an initial visualization
            visualizerManager.visualizeAllFish();
        }
    }

    public setBattleSceneManager(sceneManager: IBattleSceneManager): void {
        console.log("🎮 SETTING BATTLE SCENE MANAGER");
        console.log(`Battle Scene Manager Valid: ${!!sceneManager}`);

        if (sceneManager && typeof sceneManager.deployFish === 'function') {
            console.log("✅ Battle Scene Manager has deployFish method");
        } else {
            console.log("❌ Battle Scene Manager missing deployFish method");
        }

        this.battleSceneManager = sceneManager;
    }

    private async initializeFishSlots(): Promise<void> {
        // Get player's available fish for battle from database
        const availableFish = await this.getPlayerBattleFish();

        availableFish.forEach(fishData => {
            this.createFishSlot(fishData.id, fishData.count);
        });
    }

    private async getPlayerBattleFish(): Promise<Array<{ id: string, count: number }>> {
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                console.warn('No user logged in, using default fish');
                return this.getDefaultFish();
            }

            // Get player's fish from database
            const savedFish = await databaseService.getSavedFish();
            if (!savedFish || savedFish.length === 0) {
                console.warn('No saved fish found, using default fish');
                return this.getDefaultFish();
            }

            // Group fish by type and count healthy ones
            const fishCounts = new Map<string, number>();
            savedFish.forEach(fish => {
                if (fish.health > 0) { // Only count healthy fish
                    const count = fishCounts.get(fish.type) || 0;
                    fishCounts.set(fish.type, count + 1);
                }
            });

            // Convert to array format
            const result = Array.from(fishCounts.entries()).map(([type, count]) => ({
                id: type,
                count: count
            }));

            // If no healthy fish found, use defaults
            return result.length > 0 ? result : this.getDefaultFish();
        } catch (error) {
            console.error('Error loading player fish:', error);
            return this.getDefaultFish();
        }
    }

    private getDefaultFish(): Array<{ id: string, count: number }> {
        // Fallback fish for testing/development
        return [
            { id: 'fish_001', count: 3 },
            { id: 'fish_002', count: 2 },
            { id: 'fish_003', count: 2 },
            { id: 'fish_004', count: 4 },
            { id: 'fish_005', count: 5 }
        ];
    }

    private createFishSlot(fishId: string, count: number): void {
        if (!this.fishSlotPrefab) {
            console.error('Fish slot prefab not set');
            return;
        }

        const slotNode = instantiate(this.fishSlotPrefab);
        this.fishSlotsContainer.addChild(slotNode);

        // Configure slot appearance
        this.configureFishSlot(slotNode, fishId, count);

        // Add to tracking
        this.fishSlots.push({
            fishId: fishId,
            count: count,
            node: slotNode
        });

        // Setup touch events for this slot
        this.setupSlotTouchEvents(slotNode, fishId);
    }

    private configureFishSlot(slotNode: Node, fishId: string, count: number): void {
        const fishData = FISH_LIST.find(f => f.id === fishId);
        if (!fishData) {
            console.warn(`Fish data not found for ID: ${fishId}`);
            return;
        }

        console.log(`Configuring slot for ${fishData.name} (${fishId}) with count ${count}`);

        // Check if we have FishManager
        if (!this.fishManager) {
            console.error('FishManager not set on FishDeploymentPanel - fish sprites will not display');
            return;
        }

        // Get sprite frame
        const spriteFrame = this.fishManager.getFishSpriteById(fishId);
        if (!spriteFrame) {
            console.warn(`No sprite found for fish ID: ${fishId}`);
        } else {
            console.log(`Found sprite for ${fishId}:`, spriteFrame.name);
        }

        // Try different ways to find and set the fish sprite
        let spriteSet = false;

        // Method 1: Check if slot node itself has a sprite component
        let spriteComponent = slotNode.getComponent(Sprite);
        if (spriteComponent && spriteFrame) {
            spriteComponent.spriteFrame = spriteFrame;
            spriteSet = true;
            console.log(`Set sprite on slot node directly for ${fishId}`);
        }

        // Method 2: Look for specific child nodes
        if (!spriteSet) {
            const iconNames = ['FishIcon', 'Icon', 'Sprite', 'Image', 'fishIcon'];
            for (const iconName of iconNames) {
                const iconChild = slotNode.getChildByName(iconName);
                if (iconChild) {
                    spriteComponent = iconChild.getComponent(Sprite);
                    if (spriteComponent && spriteFrame) {
                        spriteComponent.spriteFrame = spriteFrame;
                        spriteSet = true;
                        console.log(`Set sprite on child '${iconName}' for ${fishId}`);
                        break;
                    }
                }
            }
        }

        // Method 3: Look for any child with a Sprite component
        if (!spriteSet) {
            for (const child of slotNode.children) {
                spriteComponent = child.getComponent(Sprite);
                if (spriteComponent && spriteFrame) {
                    spriteComponent.spriteFrame = spriteFrame;
                    spriteSet = true;
                    console.log(`Set sprite on child '${child.name}' for ${fishId}`);
                    break;
                }
            }
        }

        if (!spriteSet && spriteFrame) {
            console.warn(`Could not find any Sprite component to set image for ${fishId}`);
        }

        // Try different ways to find and set the count label
        let countSet = false;
        const countLabel = this.findLabelInNode(slotNode, 'Count');
        if (countLabel) {
            countLabel.string = count.toString();
            countSet = true;
            console.log(`Set count label to ${count} for ${fishId}`);
        } else {
            console.warn(`Could not find count label for ${fishId}`);
        }
        // Remove fish name display - only show count        
        const nameLabel = this.findLabelInNode(slotNode, 'Name');
        if (nameLabel) {
            nameLabel.string = ''; // Clear the name label
            console.log(`Cleared name label for ${fishId}`);
        }

        // If we have a FishSlot component on the prefab, use it
        const fishSlotComponent = slotNode.getComponent(FishSlot);
        if (fishSlotComponent) {
            fishSlotComponent.init(fishId, '', count, spriteFrame); // Pass empty string for name
            console.log(`Initialized FishSlot component for ${fishId} with count only`);
        }

        console.log(`Finished configuring slot for ${fishData.name} - sprite set: ${spriteSet}, count set: ${countSet}`);
    } private findLabelInNode(node: Node, expectedName?: string): Label | null {
        // First try to find by expected name
        if (expectedName) {
            const possibleNames = [expectedName, expectedName.toLowerCase(), expectedName.toUpperCase()];
            for (const name of possibleNames) {
                const namedChild = node.getChildByName(name);
                if (namedChild) {
                    const label = namedChild.getComponent(Label);
                    if (label) {
                        console.log(`Found label by name '${name}' in node`);
                        return label;
                    }
                }
            }
        }

        // Try to find label component in the node itself
        let label = node.getComponent(Label);
        if (label) {
            console.log(`Found label component on node itself`);
            return label;
        }

        // Search through children for any Label component
        for (const child of node.children) {
            label = child.getComponent(Label);
            if (label) {
                console.log(`Found label component on child '${child.name}'`);
                return label;
            }
        }

        // Try common label names if no expected name was provided
        if (!expectedName) {
            const commonNames = ['Label', 'Text', 'Count', 'Name', 'Title'];
            for (const commonName of commonNames) {
                const commonChild = node.getChildByName(commonName);
                if (commonChild) {
                    label = commonChild.getComponent(Label);
                    if (label) {
                        console.log(`Found label by common name '${commonName}'`);
                        return label;
                    }
                }
            }
        }

        console.log(`No label found in node${expectedName ? ` for '${expectedName}'` : ''}`);
        return null;
    }

    private setupSlotTouchEvents(slotNode: Node, fishId: string): void {
        slotNode.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
            this.onSlotTouchStart(event, fishId);
        }, this);

        slotNode.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
            this.onSlotTouchMove(event);
        }, this);

        slotNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            this.onSlotTouchEnd(event);
        }, this);

        slotNode.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => {
            this.onSlotTouchEnd(event);
        }, this);
    } private setupDragAndDrop(): void {
        // Setup deployment area touch events
        if (this.deploymentArea) {
            console.log("Setting up deployment area touch events");

            // Listen for both TOUCH_END and TOUCH_START on deployment area
            this.deploymentArea.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
                console.log("🎯 DEPLOYMENT AREA TOUCH START");
                if (this.isDragging) {
                    console.log("Fish is being dragged - preparing for deployment");
                }
            }, this);

            this.deploymentArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                console.log("🎯 DEPLOYMENT AREA TOUCH END");
                console.log(`isDragging: ${this.isDragging}, draggedFishId: ${this.draggedFishId}`);

                if (this.isDragging && this.draggedFishId) {
                    this.onDeploymentAreaTouch(event);
                }
            }, this);

            // Also listen for TOUCH_MOVE to detect when user drags over deployment area
            this.deploymentArea.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
                if (this.isDragging) {
                    console.log("🎯 DEPLOYMENT AREA TOUCH MOVE - Fish being dragged over deployment area");
                }
            }, this);
        } else {
            console.error("❌ Deployment area not set - cannot setup drag and drop events");
        }

        // Note: Global touch handler is set up separately in setupGlobalTouchHandler()
    } private onSlotTouchStart(event: EventTouch, fishId: string): void {
        console.log(`🖱️ SLOT TOUCH START: Fish ${fishId}`);

        // Check if slot is disabled
        const slotNode = event.target as Node;
        if (slotNode && slotNode['_deploymentDisabled']) {
            console.log("❌ Slot is disabled");
            return;
        }

        if (!this.isDeploymentEnabled || !this.canDeployFish(fishId)) {
            console.log(`❌ Cannot deploy fish: deploymentEnabled=${this.isDeploymentEnabled}, canDeploy=${this.canDeployFish(fishId)}`);
            return;
        }

        console.log("✅ Starting fish drag operation");
        this.isDragging = true;
        this.draggedFishId = fishId;

        // Show drag preview and deployment area hint
        this.showDragPreview(event.getUILocation());
        this.showDeploymentAreaHint();
    } private onSlotTouchMove(event: EventTouch): void {
        if (!this.isDragging) {
            return;
        }

        console.log(`🖱️ SLOT TOUCH MOVE: dragging ${this.draggedFishId} to (${event.getUILocation().x}, ${event.getUILocation().y})`);

        // Update drag preview position
        this.updateDragPreview(event.getUILocation());

        // Check if we're over the deployment area
        if (this.isPointOverDeploymentArea(event.getUILocation())) {
            console.log("🎯 Currently over deployment area");
        }
    } private onSlotTouchEnd(event: EventTouch): void {
        console.log("🖱️ SLOT TOUCH END");
        console.log(`isDragging: ${this.isDragging}, draggedFishId: ${this.draggedFishId}`);

        if (this.isDragging && this.draggedFishId) {
            console.log("🖱️ Processing touch end for dragged fish");

            // Check if the touch ended over the deployment area
            if (this.isPointOverDeploymentArea(event.getUILocation())) {
                console.log("✅ Touch ended over deployment area - triggering deployment");
                this.onDeploymentAreaTouch(event);
            } else {
                console.log("❌ Touch ended outside deployment area - canceling drag");
                this.cancelDragOperation();
            }
        }
    } private onDeploymentAreaTouch(event: EventTouch): void {
        console.log("=== DEPLOYMENT AREA TOUCH EVENT ===");
        console.log(`isDragging: ${this.isDragging}`);
        console.log(`draggedFishId: ${this.draggedFishId}`);
        console.log(`Touch position: (${event.getUILocation().x}, ${event.getUILocation().y})`);

        if (!this.isDragging || !this.draggedFishId) {
            console.log("DEPLOYMENT CANCELLED: Not dragging or no fish selected");
            return;
        }

        // Convert touch position to world position
        const worldPos = this.convertToWorldPosition(event.getUILocation());

        console.log(`=== ATTEMPTING FISH DEPLOYMENT ===`);
        console.log(`Fish ID: ${this.draggedFishId}`);
        console.log(`Touch UI Position: (${event.getUILocation().x}, ${event.getUILocation().y})`);
        console.log(`Converted World Position: (${worldPos.x}, ${worldPos.y})`);
        console.log(`Tank Manager Available: ${!!this.tankManager}`);
        console.log(`Battle Scene Manager Available: ${!!this.battleSceneManager}`);

        // Attempt deployment
        const success = this.deployFish(this.draggedFishId, worldPos);

        console.log(`=== DEPLOYMENT RESULT: ${success ? 'SUCCESS' : 'FAILED'} ===`);

        if (success) {
            console.log("✅ Fish deployed successfully - updating slot count");
            this.updateFishSlotCount(this.draggedFishId);
            this.showDeploymentFeedback(true, worldPos);

            // Log tank state after deployment
            this.logTankState();
        } else {
            console.log("❌ Fish deployment failed");
            this.showDeploymentFeedback(false, worldPos);
        }

        // End drag operation immediately after deployment attempt
        console.log("🏁 Ending drag operation");
        this.hideDeploymentAreaHint();
        this.hideDragPreview();
        this.isDragging = false;
        this.draggedFishId = '';

        console.log("=== DEPLOYMENT PROCESS COMPLETE ===");
    } private deployFish(fishId: string, worldPosition: Vec2): boolean {
        console.log("=== DEPLOY FISH METHOD CALLED ===");
        console.log(`Fish ID: ${fishId}`);
        console.log(`World Position: (${worldPosition.x}, ${worldPosition.y})`);

        if (!this.tankManager || !this.battleSceneManager) {
            console.error('❌ DEPLOYMENT FAILED: Tank manager or battle scene manager not initialized');
            console.log(`Tank Manager: ${!!this.tankManager}`);
            console.log(`Battle Scene Manager: ${!!this.battleSceneManager}`);
            return false;
        }

        // Check if we can deploy more fish
        if (!this.tankManager.canDeployMoreFish()) {
            console.warn('❌ DEPLOYMENT FAILED: Cannot deploy more fish - Tank limit reached');
            return false;
        }

        // Convert Vec2 to Vec3 for deployment
        const deployPos = new Vec3(worldPosition.x, worldPosition.y, 0);

        console.log(`🐟 CALLING BATTLE SCENE MANAGER deployFish()`);
        console.log(`Parameters: fishId="${fishId}", position=(${deployPos.x}, ${deployPos.y}, ${deployPos.z})`);

        // Try to deploy the fish
        const result = this.battleSceneManager.deployFish(fishId, deployPos);

        console.log(`🎯 BATTLE SCENE MANAGER RESPONSE: ${result}`);

        if (result) {
            console.log("✅ BattleSceneManager confirmed fish deployment success");
        } else {
            console.log("❌ BattleSceneManager reported fish deployment failure");
        }

        return result;
    }

    private canDeployFish(fishId: string): boolean {
        if (!this.isDeploymentEnabled) {
            return false;
        }

        // Check if player has fish available
        const slot = this.fishSlots.find(s => s.fishId === fishId);
        if (!slot || slot.count <= 0) {
            return false;
        }

        // Check tank deployment limits
        if (this.tankManager && !this.tankManager.canDeployMoreFish()) {
            return false;
        }

        return true;
    }

    private updateFishSlotCount(fishId: string): void {
        const slot = this.fishSlots.find(s => s.fishId === fishId);
        if (slot && slot.count > 0) {
            slot.count--;
            this.updateSlotDisplay(slot);
        }
    } private updateSlotDisplay(slot: FishSlotData): void {
        // Update visual count display
        const countLabel = this.findLabelInNode(slot.node, 'Count');
        if (countLabel) {
            countLabel.string = slot.count.toString();
        }

        console.log(`Updated ${slot.fishId} count to ${slot.count}`);

        // Disable slot if no fish left
        if (slot.count <= 0) {
            this.disableSlot(slot.node);
        }
    } private disableSlot(slotNode: Node): void {
        // Gray out or disable slot visually
        const spriteComponent = slotNode.getComponent(Sprite);
        if (spriteComponent) {
            // Make the slot appear grayed out
            const grayColor = new Color(128, 128, 128, 255); // Gray color
            spriteComponent.color = grayColor;
        }

        // Try to gray out child sprites as well
        slotNode.children.forEach(child => {
            const childSprite = child.getComponent(Sprite);
            if (childSprite) {
                const grayColor = new Color(128, 128, 128, 255);
                childSprite.color = grayColor;
            }
        });

        // Disable touch events by setting the node as non-interactable
        const uiTransform = slotNode.getComponent(UITransform);
        if (uiTransform) {
            // We can't disable UITransform, but we can add a flag to track disabled state
            slotNode['_deploymentDisabled'] = true;
        }
    } private showDragPreview(uiPosition: Vec2): void {
        if (!this.dragPreview) {
            return;
        }

        this.dragPreview.active = true;
        this.updateDragPreview(uiPosition);

        // Set preview fish sprite based on draggedFishId
        if (this.fishManager && this.draggedFishId) {
            const spriteFrame = this.fishManager.getFishSpriteById(this.draggedFishId);
            if (spriteFrame) {
                let spriteComponent = this.dragPreview.getComponent(Sprite);
                if (!spriteComponent) {
                    // Try to find sprite in children
                    const spriteChild = this.dragPreview.getChildByName('FishIcon') || this.dragPreview.getChildByName('Icon') || this.dragPreview.children[0];
                    if (spriteChild) {
                        spriteComponent = spriteChild.getComponent(Sprite);
                    }
                }

                if (spriteComponent) {
                    spriteComponent.spriteFrame = spriteFrame;
                } else {
                    // Create a sprite component if none exists
                    const newSpriteComponent = this.dragPreview.addComponent(Sprite);
                    newSpriteComponent.spriteFrame = spriteFrame;
                }
            }
        }
    } private updateDragPreview(uiPosition: Vec2): void {
        if (!this.dragPreview || !this.dragPreview.active) {
            return;
        }

        // Position the drag preview directly at the UI touch position
        // We need to convert from UI space to the drag preview's parent space
        const dragPreviewParent = this.dragPreview.parent;
        if (!dragPreviewParent) {
            console.error('Drag preview has no parent node');
            return;
        }

        const parentUITransform = dragPreviewParent.getComponent(UITransform);
        if (!parentUITransform) {
            console.error('Drag preview parent has no UITransform component');
            return;
        }

        // Convert UI position to the parent's local space
        const localPos = parentUITransform.convertToNodeSpaceAR(new Vec3(uiPosition.x, uiPosition.y, 0));
        this.dragPreview.setPosition(localPos);
    }

    private hideDragPreview(): void {
        if (this.dragPreview) {
            this.dragPreview.active = false;
        }
    } private convertToWorldPosition(uiPosition: Vec2): Vec2 {
        // Convert UI touch position to tank world position
        if (!this.tankManager || !this.tankManager.battleTank) {
            console.error('Tank manager or battle tank not available for coordinate conversion');
            return uiPosition;
        }

        // Get the battle tank's UITransform component
        const tankUITransform = this.tankManager.battleTank.getComponent(UITransform);
        if (!tankUITransform) {
            console.error('Battle tank has no UITransform component');
            return uiPosition;
        }

        // Get the deployment area's UITransform
        const deployAreaUITransform = this.deploymentArea.getComponent(UITransform);
        if (!deployAreaUITransform) {
            console.error('Deployment area has no UITransform component');
            return uiPosition;
        }

        // FIXED COORDINATE CONVERSION:
        // Step 1: Get the position in the deployment area's local space
        // The uiPosition is already in local UI coordinates for the deployment area

        // Step 2: Calculate the relative position within the deployment area (0-1 range)
        const deployAreaWidth = deployAreaUITransform.width;
        const deployAreaHeight = deployAreaUITransform.height;

        // Normalize position to 0-1 range within deployment area
        // Assuming the origin (0,0) is at the center of the deployment area
        const normalizedX = (uiPosition.x + deployAreaWidth / 2) / deployAreaWidth;
        const normalizedY = (uiPosition.y + deployAreaHeight / 2) / deployAreaHeight;

        // Step 3: Map the normalized position to tank coordinates
        // This ensures the fish appears in the same relative position in the tank
        // as it was dropped in the deployment area
        const tankNode = this.tankManager.battleTank.node;
        const tankWidth = tankUITransform.width;
        const tankHeight = tankUITransform.height;

        // Calculate local position in tank space
        // Map to fit within deployable area (usually left side of tank for player)
        // Adjust to use only left portion of the tank with some padding
        const deployableWidthPct = 0.3; // Use left 30% of tank for deployment
        const padding = 30; // Keep fish away from tank edges

        // Map to absolute coordinates in tank
        let localX = -tankWidth / 2 + padding + normalizedX * (deployableWidthPct * tankWidth - 2 * padding);
        let localY = -tankHeight / 2 + padding + normalizedY * (tankHeight - 2 * padding);

        // Clamp to tank bounds to ensure fish is placed within tank
        const halfWidth = tankUITransform.width / 2;
        const halfHeight = tankUITransform.height / 2;

        const clampedX = Math.max(-halfWidth + padding, Math.min(halfWidth - padding, localX));
        const clampedY = Math.max(-halfHeight + padding, Math.min(halfHeight - padding, localY));
        // Final position in tank's coordinate system
        const finalPos = new Vec2(clampedX, clampedY);

        // Enhanced debug logging
        console.log(`Fixed coordinate conversion: 
            Original UI Position: (${uiPosition.x}, ${uiPosition.y})
            Deployment Area World Pos: (${this.deploymentArea.worldPosition.x}, ${this.deploymentArea.worldPosition.y})
            Tank World Pos: (${tankNode.worldPosition.x}, ${tankNode.worldPosition.y})
            Deployment Area Size: (${deployAreaWidth}, ${deployAreaHeight})
            Normalized Position: (${normalizedX}, ${normalizedY})
            Mapped Local Position: (${localX}, ${localY})
            Clamped Position: (${clampedX}, ${clampedY})
            Final Result Position: (${finalPos.x}, ${finalPos.y})
            Tank Size: (${tankUITransform.width}, ${tankUITransform.height})
            Tank Bounds: (${-halfWidth}, ${-halfHeight}) to (${halfWidth}, ${halfHeight})
        `);

        // Create a visual debug marker at the calculated position
        if (this.tankManager.battleTank) {
            const markerNode = new Node('DeployMarker');
            tankNode.addChild(markerNode);

            // Draw a small crosshair at the position
            const graphics = markerNode.addComponent(Graphics);
            graphics.lineWidth = 3;
            graphics.strokeColor = new Color(255, 0, 255, 255);

            const size = 15;
            graphics.moveTo(-size, 0);
            graphics.lineTo(size, 0);
            graphics.moveTo(0, -size);
            graphics.lineTo(0, size);
            graphics.stroke();

            // Position the marker at the deployment point
            markerNode.setPosition(new Vec3(finalPos.x, finalPos.y, -5));

            // Add a label showing coordinates
            const labelNode = new Node('CoordLabel');
            markerNode.addChild(labelNode);
            const label = labelNode.addComponent(Label);
            if (label) {
                label.string = `(${finalPos.x.toFixed(1)}, ${finalPos.y.toFixed(1)})`;
                label.fontSize = 12;
                label.color = new Color(255, 255, 255, 255);
                labelNode.setPosition(0, 20, 0);
            }

            // Destroy after 5 seconds for better debugging
            setTimeout(() => {
                if (markerNode.isValid) {
                    markerNode.destroy();
                }
            }, 5000);
        }

        return finalPos;
    } private showDeploymentFeedback(success: boolean, position: Vec2): void {
        // Show visual feedback for deployment success/failure
        console.log(`Deployment ${success ? 'succeeded' : 'failed'} at position (${position.x}, ${position.y})`);

        // Create a temporary feedback node
        const feedbackNode = new Node('DeploymentFeedback');
        this.deploymentArea.addChild(feedbackNode);

        // Position it at the deployment position
        feedbackNode.setPosition(new Vec3(position.x, position.y, 0));

        // Create a more visible feedback with both graphics and label
        // Check if graphics component already exists to avoid duplicate component error
        let graphics = feedbackNode.getComponent(Graphics);
        if (!graphics) {
            graphics = feedbackNode.addComponent(Graphics);
        }
        graphics.lineWidth = 3;

        if (success) {
            // Success feedback - green circle with checkmark
            graphics.strokeColor = new Color(0, 255, 0, 255);
            graphics.fillColor = new Color(0, 255, 0, 100);
            graphics.circle(0, 0, 30);
            graphics.stroke();
            graphics.fill();
        } else {
            // Failure feedback - red X
            graphics.strokeColor = new Color(255, 0, 0, 255);
            graphics.fillColor = new Color(255, 0, 0, 100);
            graphics.circle(0, 0, 30);
            graphics.stroke();
            graphics.fill();
        }

        // Add a label to show success/failure - check if label already exists
        let label = feedbackNode.getComponent(Label);
        if (!label) {
            label = feedbackNode.addComponent(Label);
        }
        if (label) {
            label.string = success ? "✓" : "×";
            label.fontSize = 40;
            label.color = success ? new Color(0, 255, 0, 255) : new Color(255, 0, 0, 255);
        }

        // Create a debug visualization in the tank if deployment succeeded
        if (success && this.tankManager && this.tankManager.battleTank) {
            const debugMarker = new Node('DebugMarker');
            this.tankManager.battleTank.node.addChild(debugMarker);

            // Add a visible marker at the same position in the tank
            const graphics = debugMarker.addComponent(Graphics);
            graphics.lineWidth = 3;
            graphics.strokeColor = new Color(255, 0, 255, 200);
            graphics.fillColor = new Color(255, 0, 255, 100);

            // Draw a crosshair
            const size = 20;
            graphics.circle(0, 0, size / 2);
            graphics.fill();
            graphics.moveTo(-size, 0);
            graphics.lineTo(size, 0);
            graphics.moveTo(0, -size);
            graphics.lineTo(0, size);
            graphics.stroke();

            // Position the marker at the same position where the fish should be
            debugMarker.setPosition(new Vec3(position.x, position.y, 0));

            // Log all child nodes of the battle tank for debugging
            console.log('Current children in battle tank:');
            this.tankManager.battleTank.node.children.forEach((child, index) => {
                console.log(`Child ${index}: ${child.name}, active: ${child.active}, position: ${child.position.toString()}`);
            });

            // Auto-destroy after 5 seconds
            setTimeout(() => {
                if (debugMarker.isValid) {
                    debugMarker.destroy();
                }
            }, 5000);
        }

        // Auto-destroy the feedback after 1 second
        setTimeout(() => {
            if (feedbackNode.isValid) {
                feedbackNode.destroy();
            }
        }, 1000);
    }

    /**
     * Create a visual border around the deployment area
     */
    private createDeploymentAreaBorder(): void {
        if (!this.deploymentArea) {
            console.warn('Deployment area not set, cannot create border');
            return;
        }

        // Create border node
        this.deploymentAreaBorder = new Node('DeploymentAreaBorder');
        this.deploymentArea.addChild(this.deploymentAreaBorder);

        // Add Graphics component for drawing the border
        const graphics = this.deploymentAreaBorder.addComponent(Graphics);
        const uiTransform = this.deploymentArea.getComponent(UITransform);

        if (uiTransform) {
            const width = uiTransform.contentSize.width;
            const height = uiTransform.contentSize.height;

            // Set border style
            graphics.lineWidth = 4;
            graphics.strokeColor = new Color(0, 255, 0, 180); // Green border with transparency

            // Draw border rectangle
            graphics.rect(-width / 2, -height / 2, width, height);
            graphics.stroke();
        }

        // Initially hide the border
        this.deploymentAreaBorder.active = false;
    }

    /**
     * Show the deployment area border hint
     */
    private showDeploymentAreaHint(): void {
        if (this.deploymentAreaBorder) {
            this.deploymentAreaBorder.active = true;

            // Update border color to indicate deployment state
            const graphics = this.deploymentAreaBorder.getComponent(Graphics);
            if (graphics) {
                graphics.clear();
                graphics.lineWidth = 4;
                graphics.strokeColor = new Color(0, 255, 0, 200); // Bright green when active

                const uiTransform = this.deploymentArea.getComponent(UITransform);
                if (uiTransform) {
                    const width = uiTransform.contentSize.width;
                    const height = uiTransform.contentSize.height;
                    graphics.rect(-width / 2, -height / 2, width, height);
                    graphics.stroke();
                }
            }
        }
    }

    /**
     * Hide the deployment area border hint
     */
    private hideDeploymentAreaHint(): void {
        if (this.deploymentAreaBorder) {
            this.deploymentAreaBorder.active = false;
        }
    }

    public enableDeployment(): void {
        this.isDeploymentEnabled = true;
        this.node.active = true;

        // Visual feedback that deployment is active
        console.log('Fish deployment enabled');
    } public disableDeployment(): void {
        this.isDeploymentEnabled = false;

        // Cancel any ongoing drag
        if (this.isDragging) {
            this.hideDeploymentAreaHint();
            this.hideDragPreview();
            this.isDragging = false;
            this.draggedFishId = '';
        }

        console.log('Fish deployment disabled');
    }

    public getRemainingFishCount(fishId: string): number {
        const slot = this.fishSlots.find(s => s.fishId === fishId);
        return slot ? slot.count : 0;
    }

    public getTotalRemainingFish(): number {
        return this.fishSlots.reduce((total, slot) => total + slot.count, 0);
    }

    public reset(): void {
        // Reset all fish counts
        this.fishSlots.forEach(slot => {
            // TODO: Reset to original inventory counts
            this.updateSlotDisplay(slot);
        });

        this.disableDeployment();
        this.hideDragPreview();
    }

    /**
     * Debug method to check prefab and component setup
     */
    public debugPrefabStructure(): void {
        console.log('=== FishDeploymentPanel Debug Info ===');
        console.log('FishManager set:', !!this.fishManager);
        console.log('Fish slot prefab set:', !!this.fishSlotPrefab);
        console.log('Drag preview set:', !!this.dragPreview);
        console.log('Fish slots container set:', !!this.fishSlotsContainer);
        console.log('Deployment area set:', !!this.deploymentArea);
        console.log('Number of fish slots created:', this.fishSlots.length);

        if (this.fishManager) {
            console.log('FishManager sprite count:', this.fishManager.getAllFish().length);
        }

        this.fishSlots.forEach((slot, index) => {
            console.log(`Slot ${index}:`, {
                fishId: slot.fishId,
                count: slot.count,
                nodeValid: !!slot.node,
                nodeChildren: slot.node ? slot.node.children.length : 0
            });

            if (slot.node) {
                this.debugNodeStructure(slot.node, `Slot ${index}`);
            }
        });
    }

    private debugNodeStructure(node: Node, prefix: string): void {
        console.log(`${prefix} node structure:`);
        console.log(`  - Has Sprite component:`, !!node.getComponent(Sprite));
        console.log(`  - Has Label component:`, !!node.getComponent(Label));
        console.log(`  - Has UITransform component:`, !!node.getComponent(UITransform));
        console.log(`  - Children count:`, node.children.length);

        node.children.forEach((child, index) => {
            console.log(`  Child ${index} (${child.name}):`);
            console.log(`    - Has Sprite:`, !!child.getComponent(Sprite));
            console.log(`    - Has Label:`, !!child.getComponent(Label));
        });
    }

    /**
     * Test method to verify touch events are working
     */
    public testTouchEvents(): void {
        console.log('Testing touch events setup...');
        console.log('Deployment enabled:', this.isDeploymentEnabled);

        this.fishSlots.forEach((slot, index) => {
            console.log(`Slot ${index} touch events:`);
            console.log(`  - Node valid:`, !!slot.node);
            console.log(`  - Node active:`, slot.node?.active);
            console.log(`  - UITransform enabled:`, slot.node?.getComponent(UITransform)?.enabled);
        });
    }

    /**
     * Enable deployment and debugging for testing
     */
    public enableDeploymentAndDebug(): void {
        this.enableDeployment();
        this.debugPrefabStructure();
        this.testTouchEvents();
    }    /**
     * Log the current state of the battle tank for debugging
     */
    private logTankState(): void {
        console.log("=== TANK STATE DEBUG ===");

        if (!this.tankManager || !this.tankManager.battleTank) {
            console.log("❌ No tank manager or battle tank available");
            return;
        }

        const tankNode = this.tankManager.battleTank.node;
        console.log(`Tank Node: ${tankNode.name}`);
        console.log(`Tank Active: ${tankNode.active}`);
        console.log(`Tank Children Count: ${tankNode.children.length}`);

        // List all children in the tank
        tankNode.children.forEach((child, index) => {
            const battleFish = child.getComponent('BattleFish');
            const sprite = child.getComponent(Sprite);
            const position = child.getPosition();

            console.log(`  Child ${index}: ${child.name}`);
            console.log(`    Active: ${child.active}`);
            console.log(`    Position: (${position.x}, ${position.y}, ${position.z})`);
            console.log(`    Has BattleFish: ${!!battleFish}`);
            console.log(`    Has Sprite: ${!!sprite}`);

            if (sprite) {
                console.log(`    Sprite Visible: ${sprite.color.a > 0}`);
                console.log(`    Sprite Frame: ${!!sprite.spriteFrame}`);
            }

            if (child['_fishType']) {
                console.log(`    Fish Type: ${child['_fishType']}`);
            }
            if (child['_fishId']) {
                console.log(`    Fish ID: ${child['_fishId']}`);
            }
            if (child['_owner']) {
                console.log(`    Owner: ${child['_owner']}`);
            }
        });

        // Also check deployed fish count
        if (this.tankManager.getAllBattleFish) {
            const allFish = this.tankManager.getAllBattleFish();
            console.log(`Battle Fish Manager Reports: ${allFish.length} fish`);
        }

        console.log("=== END TANK STATE ===");
    }    // Add global touch handling for better drag-and-drop detection
    private setupGlobalTouchHandler(): void {
        // Find the Canvas node to listen to global touch events
        const canvasNode = find('Canvas');
        if (!canvasNode) {
            console.error('Canvas node not found - global touch handling may not work properly');
            return;
        }

        this.canvasNode = canvasNode; // Track the canvas node

        // Listen to global touch events on the Canvas
        canvasNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            if (this.isDragging && this.draggedFishId) {
                console.log("🌍 GLOBAL TOUCH END - checking if over deployment area");

                // Check if the touch ended over the deployment area
                if (this.isPointOverDeploymentArea(event.getUILocation())) {
                    console.log("✅ Touch ended over deployment area - triggering deployment");
                    this.onDeploymentAreaTouch(event);
                } else {
                    console.log("❌ Touch ended outside deployment area - canceling drag");
                    this.cancelDragOperation();
                }
            }
        }, this);

        console.log("Global touch handler set up on Canvas node");
    } onDestroy() {
        // Clean up global event listeners to prevent memory leaks
        if (this.canvasNode) {
            this.canvasNode.off(Node.EventType.TOUCH_END, undefined, this);
            console.log("Global touch event listener removed from Canvas");
        }
    }

    private isPointOverDeploymentArea(uiPoint: Vec2): boolean {
        if (!this.deploymentArea) {
            return false;
        }

        const uiTransform = this.deploymentArea.getComponent(UITransform);
        if (!uiTransform) {
            return false;
        }

        // Convert UI point to deployment area's local space
        const localPoint = uiTransform.convertToNodeSpaceAR(new Vec3(uiPoint.x, uiPoint.y, 0));

        // Check if point is within the deployment area bounds
        const size = uiTransform.contentSize;
        const isInside = Math.abs(localPoint.x) <= size.width / 2 &&
            Math.abs(localPoint.y) <= size.height / 2;

        console.log(`Point check: UI(${uiPoint.x}, ${uiPoint.y}) -> Local(${localPoint.x}, ${localPoint.y}) in bounds(${size.width}x${size.height}) = ${isInside}`);

        return isInside;
    }

    private cancelDragOperation(): void {
        console.log("🚫 Canceling drag operation");
        this.hideDeploymentAreaHint();
        this.hideDragPreview();
        this.isDragging = false;
        this.draggedFishId = '';
    }
}
