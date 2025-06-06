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
    
    director.loadScene('02-game-scene', (err, scene) => {
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
}
