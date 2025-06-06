import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TankBGMManager')
export class TankBGMManager {
    static bgmNode: Node | null = null;
}


