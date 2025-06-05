import { _decorator, Component, Node, find, director } from 'cc';
import { BattleFishVisualizer } from './components/BattleFishVisualizer';
import { BattleTankManager } from './managers/BattleTankManager';
import { BattleTank } from './BattleTank';
import { FishManager } from '../FishManager';

const { ccclass, property } = _decorator;

/**
 * BattleFishVisualizerManager
 * Ensures that a BattleFishVisualizer component exists in the scene and is properly connected
 * This helps with making fish visible in the battle tank
 */
@ccclass('BattleFishVisualizerManager')
export class BattleFishVisualizerManager extends Component {
    @property(BattleTankManager)
    tankManager: BattleTankManager | null = null;

    @property(FishManager)
    fishManager: FishManager | null = null;

    start() {
        this.ensureVisualizerExists();
    }

    /**
     * Ensures that a BattleFishVisualizer exists and is properly connected
     */
    private ensureVisualizerExists(): void {
        // First check if the tank manager already has a visualizer
        if (this.tankManager && this.tankManager.fishVisualizer) {
            console.log('BattleFishVisualizer already exists');
            return;
        }

        // Find or create visualizer
        let visualizer = this.getOrCreateVisualizer();

        // Connect it to the tank manager if found
        if (visualizer && this.tankManager) {
            this.tankManager.fishVisualizer = visualizer;
            console.log('Connected BattleFishVisualizer to BattleTankManager');
        }
    }

    /**
     * Gets an existing BattleFishVisualizer or creates a new one
     */
    private getOrCreateVisualizer(): BattleFishVisualizer | null {
        // Try to find an existing visualizer in the scene
        const existingVisualizer = find('BattleFishVisualizer')?.getComponent(BattleFishVisualizer) ||
            this.node.parent?.getComponentInChildren(BattleFishVisualizer);

        if (existingVisualizer) {
            console.log('Found existing BattleFishVisualizer');
            return existingVisualizer;
        }

        console.log('Creating new BattleFishVisualizer');

        // Create a new visualizer node
        const visualizerNode = new Node('BattleFishVisualizer');

        // Add it as a child of this node
        this.node.addChild(visualizerNode);

        // Add the component
        const visualizer = visualizerNode.addComponent(BattleFishVisualizer);

        // Configure it
        if (this.tankManager) {
            visualizer.battleTank = this.tankManager.battleTank;
        }

        if (this.fishManager) {
            visualizer.fishManager = this.fishManager;
        }

        return visualizer;
    }

    /**
     * Visualize all existing fish in the tank
     * This can be called manually to refresh all fish
     */
    public visualizeAllFish(): void {
        const visualizer = this.getOrCreateVisualizer();
        if (visualizer) {
            visualizer.visualizeExistingFish();
        }
    }
}
