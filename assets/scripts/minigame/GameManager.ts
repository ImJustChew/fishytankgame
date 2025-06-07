import { _decorator, Component, director } from 'cc';
import { EventManager } from './EventManager';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
  private static _instance: GameManager = null;
  public static get instance(): GameManager {
    return GameManager._instance;
  }

  protected onLoad(): void {
    console.log('GameManager onLoad - Singleplayer Mode');
    // Singleton pattern
    if (!GameManager._instance) {
      console.log('GameManager instance created');
      GameManager._instance = this;
    } else {
      this.destroy();
      return;
    }
    
    // Set as persistent node (prevent unloading when switching scenes)
    director.addPersistRootNode(this.node);
  }

  protected onDestroy(): void {
    console.log('GameManager onDestroy');
    if (GameManager._instance === this) {
      GameManager._instance = null;
    }
  }

  // Load game scene directly
  loadGameScene(): void {
    console.log('Loading game scene');
    
    director.loadScene('minigame_bombfish', (err, scene) => {
      if (err) {
        console.error('Failed to load game scene:', err);
        return;
      }
      console.log('Game scene loaded successfully');
      
      // Initialize game scene with default singleplayer data
      EventManager.eventTarget.emit('init-game-scene', {
        point: 1000,
        bulletLevel: 3
      });
    });
  }

  // 添加一個新方法來處理從朋友魚缸場景進入小遊戲的情況
  loadGameSceneForStealingFish(): void {
    console.log('Loading game scene for stealing fish');
    
    director.loadScene('minigame_bombfish', (err, scene) => {
      if (err) {
        console.error('Failed to load game scene:', err);
        return;
      }
      console.log('Game scene loaded successfully for stealing fish');
      
      // 初始化遊戲場景，設置較短的遊戲時間和較高的難度
      EventManager.eventTarget.emit('init-game-scene', {
        point: 0,
        bulletLevel: 2,
        gameTime: 60, // 設置較短的遊戲時間，例如60秒
        isStealingMode: true // 標記為偷魚模式
      });
    });
  }
}
