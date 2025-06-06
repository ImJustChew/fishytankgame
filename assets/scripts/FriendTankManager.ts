import { _decorator, Component, Node, Label, Button, director, Sprite, SpriteFrame } from 'cc';
import { FriendsFishTankManager } from './FriendsFishTankManager';
import { FriendData } from './firebase/social-service';
import { TankBGMManager } from './TankBGMManager';

const { ccclass, property } = _decorator;

@ccclass('FriendTankManager')
export class FriendTankManager extends Component {
    @property(FriendsFishTankManager)
    private friendsFishTankManager: FriendsFishTankManager = null!;
    
    @property(Label)
    private friendNameLabel: Label = null!;
    
    @property(Label)
    private fishCountLabel: Label = null!;
    
    @property(Button)
    private backButton: Button = null!;
    
    @property(Button)
    private stealButton: Button = null!;
    
    @property(Sprite)
    private friendAvatarSprite: Sprite = null!;
    
    @property(SpriteFrame)
    private defaultAvatarSprite: SpriteFrame = null;

    @property(Node)
    private backgroundNode: Node = null!;

    @property(Node)
    private waterNode: Node = null!;

    private friendUid: string = '';
    private friendData: FriendData | null = null;
    
    start() {
        // 設置返回按鈕點擊事件
        if (this.backButton) {
            this.backButton.node.on(Button.EventType.CLICK, this.onBackButtonClicked, this);
        }
        
        // 設置偷魚按鈕點擊事件
        if (this.stealButton) {
            this.stealButton.node.on(Button.EventType.CLICK, this.onStealButtonClicked, this);
        }
        
        // 從全局變量獲取訪問的朋友 UID
        this.friendUid = window['visitingFriendUid'] || '';
        this.friendData = window['visitingFriendData'] || null;
        
        console.log('FriendTankManager start - Friend UID:', this.friendUid);
        console.log('FriendTankManager start - Friend Data:', this.friendData);
        console.log('FriendTankManager start - FriendsFishTankManager assigned:', !!this.friendsFishTankManager);
        
        // 如果沒有朋友 UID，返回主場景
        if (!this.friendUid) {
            console.error('No friend UID provided, returning to main scene');
            this.returnToMainScene();
            return;
        }
        
        // 加載朋友的魚缸
        this.loadFriendTank();
    }
    
    /**
     * 加載朋友的魚缸
     */
    private async loadFriendTank() {
        console.log("開始加載朋友魚缸場景...");
        
        // 檢查必要組件是否存在
        if (!this.friendsFishTankManager) {
            console.error('FriendsFishTankManager 組件未分配');
            return;
        }
        
        // 檢查魚缸 Sprite 是否存在
        const tankSprite = this.friendsFishTankManager.getComponent(Sprite);
        if (!tankSprite) {
            console.error('魚缸 Sprite 組件未找到');
        } else {
            console.log('魚缸 Sprite 組件存在');
        }
        
        // 檢查魚缸背景是否存在
        if (!this.backgroundNode) {
            console.error('背景節點未分配');
        } else {
            console.log('背景節點存在');
        }
        
        // 檢查魚缸水體是否存在
        if (!this.waterNode) {
            console.error('水體節點未分配');
        } else {
            console.log('水體節點存在');
        }
        
        // 更新 UI 顯示
        this.updateFriendInfo();
        
        // 重要：加載朋友的魚缸等級並更新外觀
        if (this.friendUid) {
            console.log(`正在加載朋友的魚缸等級: ${this.friendUid}`);
            try {
                await this.friendsFishTankManager.loadFriendTankLevel(this.friendUid);
                console.log('成功加載朋友的魚缸等級');
            } catch (error) {
                console.error('加載朋友的魚缸等級時出錯:', error);
            }
        }
        
        // 正常加載朋友的魚缸
        console.log(`正在加載朋友的魚缸: ${this.friendUid}`);
        const success = await this.friendsFishTankManager.loadFriendsFishTank(
            this.friendUid,
            this.friendData,
            true // 啟用實時更新
        );
        
        if (!success) {
            console.error('加載朋友的魚缸失敗');
            // 顯示錯誤消息
            if (this.friendNameLabel) {
                this.friendNameLabel.string = '無法加載朋友的魚缸';
            }
        } else {
            console.log('成功加載朋友的魚缸');
            // 更新魚的數量顯示
            this.updateFishCount();
        }
    }
    
    /**
     * Update friend information display
     */
    private updateFriendInfo() {
        if (this.friendData) {
            // Update friend name
            if (this.friendNameLabel) {
                this.friendNameLabel.string = `${this.friendData.username || 'Friend'}'s Fish Tank`;
            }
        } else {
            // If no friend data, show default info
            if (this.friendNameLabel) {
                this.friendNameLabel.string = 'Friend\'s Fish Tank';
            }
        }
    }
    
    /**
     * 更新魚的數量顯示
     */
    private updateFishCount() {
        if (this.fishCountLabel && this.friendsFishTankManager) {
            const fishCount = this.friendsFishTankManager.getFishCount();
            this.fishCountLabel.string = `魚: ${fishCount}`;
        }
    }
    
    /**
     * 返回按鈕點擊處理
     */
    private onBackButtonClicked() {
        this.returnToMainScene();
    }
    
    /**
     * 偷魚按鈕點擊處理
     */
    private async onStealButtonClicked() {
        if (!this.friendsFishTankManager) {
            return;
        }
        
        // 檢查是否可以與朋友的魚互動
        const canInteract = await this.friendsFishTankManager.canInteractWithFish();
        if (!canInteract) {
            console.log('Cannot steal fish: Not friends with this user');
            // 可以顯示提示消息
            return;
        }
        
        // 獲取朋友的魚數據
        const fishData = this.friendsFishTankManager.getCurrentFishData();
        if (!fishData || fishData.length === 0) {
            console.log('No fish to steal');
            // 可以顯示提示消息
            return;
        }
        
        // 隨機選擇一條魚
        const randomIndex = Math.floor(Math.random() * fishData.length);
        const targetFish = fishData[randomIndex];
        
        // 嘗試偷魚
        const result = await this.friendsFishTankManager.stealFish(targetFish.id);
        
        console.log('Steal result:', result);
        // 根據結果顯示提示消息
        
        // 刷新朋友的魚缸
        await this.friendsFishTankManager.refreshFriendsFishTank();
        
        // 更新魚的數量顯示
        this.updateFishCount();
    }
    
    /**
     * 返回主場景
     */
    private returnToMainScene() {
        // 清理全局變量
        window['visitingFriendUid'] = null;
        window['visitingFriendData'] = null;
        
        // 返回主場景
        director.loadScene('aquarium');
    }
    
    onDestroy() {
        // 清理事件監聽
        if (this.backButton && this.backButton.node && this.backButton.node.isValid) {
            this.backButton.node.off(Button.EventType.CLICK, this.onBackButtonClicked, this);
        }
        
        if (this.stealButton && this.stealButton.node && this.stealButton.node.isValid) {
            this.stealButton.node.off(Button.EventType.CLICK, this.onStealButtonClicked, this);
        }
    }
}








