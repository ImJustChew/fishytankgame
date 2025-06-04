import { _decorator, Component, Node, Vec3, tween, randomRangeInt, Animation } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Bubble')
export class Bubble extends Component {
    
    private moveSpeed: number = 100;
    private spreadRange: number = 100;
    private maxHeight: number = 500; 
    private lifeTime: number = 5; 
    private bubbleRoot: Node | null = null;
    private swayTime: number = 0;
    private swayAmount: number = 5;
    private swayDuration: number = 2;
    private baseX: number = 0;
    
    private startPos: Vec3 = new Vec3();
    private targetPos: Vec3 = new Vec3();

    start() {
        this.bubbleRoot = this.node.parent;
        if (!this.bubbleRoot) {
            console.error('Bubble node must have a parent for movement!');
            return;
        }
        this.startPos.set(this.node.position);
        this.baseX = this.node.position.x;
        this.setupBubbleMovement();
        this.startLifeTimer();
    }

    update(dt: number) {
    // use sine wave for horizontal sway
        this.swayTime += dt;
        const swayX = this.baseX + Math.sin(this.swayTime * Math.PI * 2 / this.swayDuration) * this.swayAmount;
        this.node.setPosition(swayX, this.node.position.y, this.node.position.z);
    }


    init(spreadRange: number, maxHeight: number, speed: number) {
        this.spreadRange = spreadRange;
        this.maxHeight = maxHeight;
        this.moveSpeed = speed;
    }


    private setupBubbleMovement() {
        const horizontalOffset = randomRangeInt(-this.spreadRange, this.spreadRange);
        this.targetPos.set(
            this.startPos.x + horizontalOffset,
            this.startPos.y + this.maxHeight,
            this.startPos.z
        );
        //console.log(`Bubble start position: ${this.startPos}, target position: ${this.targetPos}`);
        const distance = Vec3.distance(this.startPos, this.targetPos);
        const duration = distance / this.moveSpeed;
        this.createFloatingAnimation(duration);
    }

 
    private createFloatingAnimation(duration: number) {
        if (this.bubbleRoot) {
            tween(this.bubbleRoot)
                .to(duration, { 
                    position: this.targetPos 
                }, {
                    easing: 'smooth',
                    onComplete: () => {
                        this.node.parent.destroy();
                    }
                })
                .start();
        }

        this.addScaleEffect(duration);
    }

 
    private addScaleEffect(duration: number) {
        const initialScale = 0.5 + Math.random() * 0.5;
        const finalScale = initialScale + 0.2; 

        this.node.setScale(initialScale, initialScale, 1);
        
        tween(this.node)
            .to(duration, { scale: new Vec3(finalScale, finalScale, 1) })
            .start();
    }

 
    private startLifeTimer() {
        // some bubbles may pop early
        const earlyPopChance = 0.2; 
        
        if (Math.random() < earlyPopChance) {
            const earlyTime = 0.5 + Math.random() * 2; 
            this.scheduleOnce(() => {
                this.node.parent.destroy();
            }, earlyTime);
        }
    }


    public destroyBubble() {
        this.node.parent.destroy();
    }
}