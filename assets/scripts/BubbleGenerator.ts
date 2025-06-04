import { _decorator, Component, Node, Prefab, instantiate, randomRangeInt, Vec3 } from 'cc';
import { Bubble } from './Bubble';

const { ccclass, property } = _decorator;

@ccclass('BubbleGenerator')
export class BubbleGenerator extends Component {
    
    @property({
        type: Prefab,
        tooltip: '氣泡預製體'
    })
    bubblePrefab: Prefab = null;

    @property({
        range: [10, 200],
        tooltip: '氣泡左右擴散程度（像素）'
    })
    spreadRange: number = 80;

    @property({
        range: [100, 800],
        tooltip: '氣泡最高可到達的高度（像素）'
    })
    maxHeight: number = 400;

    @property({
        range: [0.1, 20.0],
        tooltip: '氣泡生成密度（秒/個，數值越小生成越密集）'
    })
    spawnRate: number = 10;

    @property({
        range: [50, 300],
        tooltip: '氣泡上升速度'
    })
    bubbleSpeed: number = 120;

    @property({
        tooltip: '是否自動開始生成氣泡'
    })
    autoStart: boolean = true;

    @property({
        range: [1, 10],
        tooltip: '每次生成的氣泡數量'
    })
    bubblesPerSpawn: number = 1;

    private isGenerating: boolean = false;
    private bubblePool: Node[] = [];
    private maxPoolSize: number = 150;

    onLoad() {
        if (this.autoStart) {
            this.startGenerating();
        }
    }


    startGenerating() {
        if (this.isGenerating) return;
        
        this.isGenerating = true;
        this.schedule(this.spawnBubbles, this.spawnRate);
        console.log('bubble generator activated');
    }


    stopGenerating() {
        if (!this.isGenerating) return;
        
        this.isGenerating = false;
        this.unschedule(this.spawnBubbles);
        console.log('bubble generator stopped');
    }


    toggleGenerating() {
        if (this.isGenerating) {
            this.stopGenerating();
        } else {
            this.startGenerating();
        }
    }

 
    private spawnBubbles = () => {
        if (!this.bubblePrefab) {
            console.warn('bubblePrefab is not set. Please assign a bubble prefab in the editor.');
            return;
        }

        for (let i = 0; i < this.bubblesPerSpawn; i++) {
            this.createBubble();
        }
    }


    private createBubble() {
        let bubbleNode: Node;

        if (this.bubblePool.length > 0) {
            bubbleNode = this.bubblePool.pop();
            bubbleNode.active = true;
        } else {
            bubbleNode = instantiate(this.bubblePrefab);
        }

        // sett the bubble's position with a random offset
        const randomOffset = randomRangeInt(-10, 10);
        bubbleNode.setPosition(randomOffset, 0, 0);

        // add the bubble node to the scene
        this.node.addChild(bubbleNode);

        // initialize the bubble component
        const bubbleComponent = bubbleNode.getComponent(Bubble);
        if (bubbleComponent) {
            bubbleComponent.init(this.spreadRange, this.maxHeight, this.bubbleSpeed);
        }

        // scedule the destruction of the bubble
        this.scheduleBubbleDestroy(bubbleNode);
    }


    private scheduleBubbleDestroy(bubbleNode: Node) {
        const maxLifeTime = (this.maxHeight / this.bubbleSpeed) + 2;
        
        this.scheduleOnce(() => {
            if (bubbleNode && bubbleNode.isValid) {
                this.recycleBubble(bubbleNode);
            }
        }, maxLifeTime);
    }


    private recycleBubble(bubbleNode: Node) {
        if (this.bubblePool.length < this.maxPoolSize) {
            bubbleNode.removeFromParent();
            bubbleNode.active = false;
            //bubbleNode.stopAllActions();
            this.bubblePool.push(bubbleNode);
        } else {
            bubbleNode.destroy();
        }
    }


    clearAllBubbles() {
        const children = this.node.children.slice();
        children.forEach(child => {
            const bubbleComponent = child.children[0].getComponent(Bubble);
            if (bubbleComponent) {
                bubbleComponent.destroyBubble();
            }
        });

        this.bubblePool.forEach(bubble => {
            if (bubble && bubble.isValid) {
                bubble.destroy();
            }
        });
        this.bubblePool = [];
    }

    /**
     * Set the range for bubble spread
     */
    setSpreadRange(range: number) {
        this.spreadRange = Math.max(10, Math.min(200, range));
    }

    /**
     * Set the maximum height bubbles can reach
     */
    setMaxHeight(height: number) {
        this.maxHeight = Math.max(100, Math.min(800, height));
    }

    /**
     * Set the spawn rate of bubbles
     */
    setSpawnRate(rate: number) {
        this.spawnRate = Math.max(0.1, Math.min(5.0, rate));
        if (this.isGenerating) {
            this.unschedule(this.spawnBubbles);
            this.schedule(this.spawnBubbles, this.spawnRate);
        }
    }

    onDestroy() {
        this.stopGenerating();
        this.clearAllBubbles();
    }
}