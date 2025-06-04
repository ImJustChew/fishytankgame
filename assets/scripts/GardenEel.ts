import { _decorator, Component, Sprite, Animation, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GardenEel')
export class GardenEel extends Component {
    @property(Sprite)
    sprite: Sprite = null;

    @property(Number)
    random_x: number = 100;

    private animation: Animation = null;
    private origin_pos_x: number = 0;

    onLoad() {
        this.animation = this.sprite.getComponent(Animation);
        if (!this.animation) {
            console.error('GardenEel: Animation component not found!');
        }
        this.origin_pos_x = this.sprite.node.position.x;
    }

    start() {
        if (this.sprite) {
            this.sprite.node.active = false;
        }
        this.scheduleNext();
    }

    private scheduleNext() {
        const delay = 10 + Math.random() * 180; 
        this.scheduleOnce(() => this.playAnim(), delay);
    }

    private playAnim() {
        // randomize the x position within the range
        const newX = this.origin_pos_x + (Math.random() * 2 - 1) * this.random_x;
        const pos = this.sprite.node.position.clone();
        pos.x = newX;
        this.sprite.node.setPosition(pos); 
        // random flip the sprite
        const scale = this.sprite.node.scale.clone();
        scale.x = Math.random() < 0.5 ? -1 : 1;
        this.sprite.node.setScale(scale);
        if (this.sprite) {
            this.sprite.node.active = true;
        }
        if (this.animation) {
            this.animation.play();
            this.animation.once(Animation.EventType.FINISHED, this.onAnimFinished, this);
        } else {
            this.onAnimFinished();
        }
    }

    private onAnimFinished() {
        if (this.sprite) {
            this.sprite.node.active = false;
        }
        this.scheduleNext();
    }
}