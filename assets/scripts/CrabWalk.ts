import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CrabWalk')
export class CrabWalk extends Component {
    @property(Node)
    CrabNode: Node = null;

    @property
    WalkSpeed: number = 100; 

    @property(Number)
    leftX: number = -220.375; // left boundary X position
    @property(Number)
    rightX: number = 172.542; // right boundary X position

    private targetX: number = 0;
    private moving: boolean = false;

    start() {
        this.startNextRound();
    }

    update(dt: number) {
        if (!this.moving || !this.CrabNode) return;

        const pos = this.CrabNode.getPosition();
        const dir = Math.sign(this.targetX - pos.x);
        if (dir === 0) {
            this.finishRound();
            return;
        }

        let move = this.WalkSpeed * dt * dir;
        // avoid overshooting the target position
        if (Math.abs(this.targetX - pos.x) < Math.abs(move)) {
            move = this.targetX - pos.x;
        }
        this.CrabNode.setPosition(new Vec3(pos.x + move, pos.y, pos.z));

        // arrived at target position
        if (Math.abs(this.CrabNode.getPosition().x - this.targetX) < 0.01) {
            this.finishRound();
        }
    }

    private startNextRound() {
        if (!this.CrabNode) return;
        const startLeft = Math.random() < 0.5;
        const startX = startLeft ? this.leftX : this.rightX;
        const endX = startLeft ? this.rightX : this.leftX;
        this.CrabNode.setPosition(new Vec3(startX, this.CrabNode.position.y, this.CrabNode.position.z));
        this.CrabNode.active = false;
        this.moving = false;

        // random wait time before starting the next round
        const waitTime = 20 + Math.random() * 120;
        this.scheduleOnce(() => {
            this.CrabNode.active = true;
            this.targetX = endX;
            this.moving = true;
        }, waitTime);
    }

    private finishRound() {
        this.CrabNode.active = false;
        this.moving = false;
        this.scheduleOnce(() => this.startNextRound(), 0.5);
    }
}