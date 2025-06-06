import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Oarfish')
export class Oarfish extends Component {
    @property(Node)
    CrabNode: Node = null;

    @property
    WalkSpeed: number = 100; 

    @property(Number)
    leftX: number = -220.375; // left boundary X position
    @property(Number)
    rightX: number = 172.542; // right boundary X position
    @property(Number)
    ave_time: number = 20; // average time to wait before starting next round
    @property(Number)
    rand_time: number = 120; // random time to wait before starting next round

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
        // get the only sprite component of CrabNode's children. and set it's scale.x
        this.CrabNode.children.forEach(child => {
            const sprite = child.getComponent('cc.Sprite');
            if (sprite) {
                child.setScale(startLeft ? -1 : 1, 1, 1); // 設定 node 的 scaleX
            }
        });
        this.CrabNode.setPosition(new Vec3(startX, this.CrabNode.position.y, this.CrabNode.position.z));
        this.CrabNode.active = false;
        this.moving = false;

        // random wait time before starting the next round
        const waitTime = this.ave_time + Math.random() * this.rand_time;
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