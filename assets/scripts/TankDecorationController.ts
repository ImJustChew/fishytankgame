import { _decorator, Component, Node, Button, Prefab, Sprite, Color } from 'cc';
import socialService from './firebase/social-service';
const { ccclass, property } = _decorator;

@ccclass('TankDecorationController')
export class TankDecorationController extends Component {

    @property(Button)
    decorationToggleButton: Button = null;

    @property(Node)
    background0: Node = null;

    @property(Node)
    background1: Node = null;

    @property(Node)
    decoration0: Node = null;

    @property(Node)
    decoration1: Node = null;

    @property(Node)
    decoration1_oarfish: Node = null;

    private currentDecorationIndex: number = 0;

    private timer: number = 0;


    onLoad() {
        this.decorationToggleButton.node.on(Button.EventType.CLICK, this.onDecorationToggleClicked, this);
    }

    async start() {
        const money = await socialService.getCurrentUserMoney();
        const tankType = await socialService.getCurrentUserTankType();
        if (money >= 300) {
            if (tankType === 0) {
                this.toggleDecoration(0);
                this.decorationToggleButton.enabled = true;
            } else if (tankType === 1) {
                this.toggleDecoration(1);
                this.decorationToggleButton.enabled = true;
            }
        } else {
            this.toggleDecoration(0);
            this.decorationToggleButton.enabled = false;
            const sprite = this.decorationToggleButton.node.getComponent(Sprite);
            if (sprite) {
                sprite.color = new Color(150, 150, 150, 255);
            }
            await socialService.setCurrentUserTankType(0);
        }
    }

    // each 1 second check the current money and then update the decoration
    update(deltaTime: number) {
        this.timer += deltaTime;
        if (this.timer >= 1) {
            this.timer = 0;
            socialService.getCurrentUserMoney().then(money => {
                if (money < 300) {
                    this.decorationToggleButton.enabled = false;
                    const sprite = this.decorationToggleButton.node.getComponent(Sprite);
                    if (sprite) {
                        sprite.color = new Color(150, 150, 150, 255);
                    }
                    this.toggleDecoration(0);
                    socialService.setCurrentUserTankType(0);
                } else {
                    if(!this.decorationToggleButton) return;
                    this.decorationToggleButton.enabled = true;
                    const sprite = this.decorationToggleButton.node.getComponent(Sprite);
                    if (sprite) {
                        sprite.color = new Color(255, 255, 255, 255);
                    }
                }
            });
        }
    }


    toggleDecoration(cur_idx: number) {
        if (cur_idx === 0) {
            if(this.background0 && this.decoration0 && this.decoration1 && this.decoration1_oarfish && this.background1){
                this.background0.active = true;
                this.decoration0.active = true;
                this.decoration1.active = false;
                this.decoration1_oarfish.active = false;
                this.background1.active = false;
            }
        }
        else if (cur_idx === 1) {
            if(this.background1 && this.decoration1 && this.decoration1_oarfish && this.background0 && this.decoration0){
                this.decoration1.active = true;
                this.decoration1_oarfish.active = true;
                this.background1.active = true;
                this.background0.active = false;
                this.decoration0.active = false;
            }
        }
        this.currentDecorationIndex = cur_idx;
    }

    onDecorationToggleClicked() {
        const nextIndex = (this.currentDecorationIndex + 1) % 2; // Toggle between 0 and 1
        this.toggleDecoration(nextIndex);
        socialService.setCurrentUserTankType(nextIndex).then(() => {
            console.log(`Tank decoration changed to type ${nextIndex}`);
        }).catch(error => {
            console.error('Error setting tank type:', error);
        });
    }

}


