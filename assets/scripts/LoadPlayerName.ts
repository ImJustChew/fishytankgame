import { _decorator, Component, Node, Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LoadPlayerName')
export class LoadPlayerName extends Component {

    @property(Label)
    playerNameLabel: Label = null;

    start() {
        this.playerNameLabel.string = window['userName'] || 'Player';
    }

    update(deltaTime: number) {
        
    }
}


