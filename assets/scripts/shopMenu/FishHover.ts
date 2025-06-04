import { _decorator, Component, Node, EventMouse, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('FishHover')
export class FishHover extends Component {
    private originalScale: Vec3 = new Vec3();

    onLoad() {
        this.originalScale = this.node.scale.clone();

        // 加事件監聽
        this.node.on(Node.EventType.MOUSE_ENTER, this.onHoverEnter, this);
        this.node.on(Node.EventType.MOUSE_LEAVE, this.onHoverExit, this);
    }

    onHoverEnter(event: EventMouse) {
        // Stop event propagation to prevent accidental triggering of other events
        event.propagationStopped = true;
        
        // 放大到 1.2 倍
        tween(this.node)
            .to(0.1, { scale: this.originalScale.clone().multiplyScalar(1.2) })
            .start();
    }

    onHoverExit(event: EventMouse) {
        // Stop event propagation to prevent accidental triggering of other events
        event.propagationStopped = true;
        
        // 還原大小
        tween(this.node)
            .to(0.1, { scale: this.originalScale })
            .start();
    }
}
