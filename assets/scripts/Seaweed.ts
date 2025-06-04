import { _decorator, Component, Node, input, Input, EventMouse, Vec2, Vec3, math } from 'cc';
const { ccclass, property } = _decorator;

type SegmentState = {
    angle: number;
    velocity: number;
};

@ccclass('Seaweed')
export class Seaweed extends Component {
    @property([Node])
    segments: Node[] = [];

    @property
    segmentLength: number = 15;

    @property
    spring: number = 0.2;

    @property
    damping: number = 0.1;

    @property
    maxHorizontalOffset: number = 10;

    @property
    mouseInfluenceRadius: number = 20; 

    @property
    disturbanceAmplitude: number = 15; 

    @property
    disturbanceFrequency: number = 3.0; 

    @property
    recoverySpeed: number = 2.0; 

    private states: SegmentState[] = [];
    private mousePos = new Vec2();
    private isMouseNear = false; 
    private disturbanceIntensity = 0; 
    private canTrigger = true; 
    private baseTime = 0;

    onLoad() {
        this.states = this.segments.map(() => ({ 
            angle: 0, 
            velocity: 0
        }));
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        this.baseTime = performance.now();
    }

    onDestroy() {
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    }

    onMouseMove(event: EventMouse) {
        this.mousePos = event.getUILocation();
    }

    update(dt: number) {
        console.log(this.disturbanceIntensity);
        // Segment0 is fixed at the root position
        const rootPos = this.segments[0].getPosition();
        this.segments[0].setPosition(rootPos); 
        let currentPos = rootPos;

        const worldPositions: Vec2[] = this.segments.map(seg => {
            const wp = seg.getWorldPosition();
            return new Vec2(wp.x, wp.y);
        });

        let mouseCurrentlyNear = false;
        for (let i = 0; i < this.segments.length; i++) {
            const dist = Vec2.distance(worldPositions[i], this.mousePos);
            if (dist < this.mouseInfluenceRadius) {
                mouseCurrentlyNear = true;
                break;
            }
        }


        if (mouseCurrentlyNear && !this.isMouseNear && this.canTrigger) {
            if(this.disturbanceIntensity <= 1.6)
                if(this.disturbanceIntensity == 0) {
                    this.disturbanceIntensity += 0.8;
                } else {
                    this.disturbanceIntensity += 0.4;
                }
            this.canTrigger = false; 
        } else if (!mouseCurrentlyNear && this.isMouseNear) {
            this.canTrigger = true; 
        }

        this.isMouseNear = mouseCurrentlyNear;

        if (this.disturbanceIntensity > 0) {
            this.disturbanceIntensity = Math.max(0, this.disturbanceIntensity - this.recoverySpeed * dt);
            if (this.disturbanceIntensity <= 0) {
                this.canTrigger = true;
            }
        }

        const targetAngles: number[] = [];
        const currentTime = performance.now();
        
        for (let i = 0; i < this.segments.length; i++) {
            const naturalTime = currentTime / 2000;
            const baseAmplitude = 8 + Math.sin(naturalTime + i) * 5;
            const naturalSway = Math.sin(naturalTime * 2 + i * 0.3) * baseAmplitude;
            const disturbanceTime = currentTime / 1000; 
            const disturbanceSway = Math.sin(disturbanceTime * this.disturbanceFrequency + i * 0.5) * this.disturbanceAmplitude;
            targetAngles[i] = naturalSway + disturbanceSway * this.disturbanceIntensity;
        }

        for (let i = 1; i < this.segments.length; i++) {
            targetAngles[i] = targetAngles[i] * 0.85 + targetAngles[i - 1] * 0.15;
        }
        for (let i = this.segments.length - 2; i >= 0; i--) {
            targetAngles[i] = targetAngles[i] * 0.7 + targetAngles[i + 1] * 0.3;
        }

        for (let i = 1; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const state = this.states[i];

            const force = (targetAngles[i] - state.angle) * this.spring;
            state.velocity += force;
            state.velocity *= (1 - this.damping);
            state.angle += state.velocity;

            const angleRad = state.angle * (Math.PI / 180);
            let offsetX = Math.sin(angleRad) * this.segmentLength;
            const offsetY = Math.cos(angleRad) * this.segmentLength;

            offsetX = math.clamp(offsetX, -this.maxHorizontalOffset, this.maxHorizontalOffset);

            currentPos = currentPos.add(new Vec3(offsetX, offsetY, 0));
            segment.setPosition(currentPos);
        }
    }
}