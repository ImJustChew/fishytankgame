import {
  _decorator,
  Component,
  director,
  Label,
  Node,
  Tween,
  tween,
  Color
} from 'cc';
import { EventManager } from './EventManager';
import { FishConfig, FishType } from './types/index.d';
import { CoinManager } from './CoinManager';
const { ccclass, property } = _decorator;

@ccclass('GameSceneManager')
export class GameSceneManager extends Component {
  @property(Label)
  public playerPointLabel: Label = null;
  @property(Label)
  public bulletValueLabel: Label = null;
  @property(Label)
  public timerLabel: Label = null;
  //@property(Label)
  //public scoreLabel: Label = null;
  @property(Node)
  public popupModal: Node = null;
  @property(Label)
  public modalText: Label = null;
  @property(Node)
  public gameOverPanel: Node = null;

  public bulletLevel: number = 3;
  public point: number = 0;
  public score: number = 0;
  
  // ✅ ADD TIMER SYSTEM
  public gameTime: number = 30; // 30 seconds
  public remainingTime: number = 30;
  public isGameActive: boolean = false;
  
  private _isTransition: boolean = false;
  private _tempPoint: Record<string, number> = { point: 0 };
  private _tempScore: Record<string, number> = { score: 0 };
  private _tempTween: Tween = null;
  private _scoreTween: Tween = null;
  private _cachedPoint: number = 0;

  // ✅ ADD CUSTOM PADDING FUNCTION
  private padZero(num: number, length: number = 2): string {
    let str = num.toString();
    while (str.length < length) {
      str = '0' + str;
    }
    return str;
  }

  protected onLoad(): void {
    // 註冊事件
    EventManager.eventTarget.on('init-game-scene', this.initGameScene, this);
    EventManager.eventTarget.on('update-point', this.updatePoint, this);
    EventManager.eventTarget.on('show-fire-fail', this.showFireFail, this);
    
    // 确保正确监听add-points事件
    EventManager.eventTarget.on('add-points', this.addPoints, this);
    
    console.log('GameSceneManager: Events registered');
  }

  initGameScene(): void {
    console.log('GameSceneManager initGameScene - Singleplayer Mode with Timer');
    
    // Initialize singleplayer game state
    this.point = 0;
    this.score = 0;
    this._cachedPoint = 0;
    
    if (this.playerPointLabel) {
      this.playerPointLabel.string = `${this.point}`;
    }
    
    /*
    if (this.scoreLabel) {
      this.scoreLabel.string = `Score: ${this.score}`;
    }
    */
    
    if (this.bulletValueLabel) {
      this.bulletLevel = 3;
      this.bulletValueLabel.string = `Level ${this.bulletLevel}`;
    }
    
    // ✅ INITIALIZE TIMER
    this.remainingTime = this.gameTime;
    this.isGameActive = true;
    this.updateTimerDisplay();
    
    // Start countdown
    this.startGameTimer();
    
    // Spawn initial fish
    this.spawnFishes();
    
    // Schedule periodic fish spawning
    this.schedule(this.spawnFishes, 5); // Spawn new fish every 5 seconds
    
    // ✅ ENABLE FREE SHOOTING
    EventManager.eventTarget.emit('switch-can-fire', true);
  }

  // ✅ ADD TIMER SYSTEM
  startGameTimer() {
    if (this.timerLabel) {
      // Update timer every second
      this.schedule(this.updateTimer, 1);
    }
  }

  updateTimer() {
    if (!this.isGameActive || !this.timerLabel) return;
    
    this.remainingTime--;
    this.updateTimerDisplay();
    
    // Check if time is up
    if (this.remainingTime <= 0) {
      this.timeUp();
    }
  }

  // ✅ FIXED updateTimerDisplay with custom padding
  updateTimerDisplay() {
    if (this.timerLabel) {
      const minutes = Math.floor(this.remainingTime / 60);
      const seconds = this.remainingTime % 60;
      
      // Use custom padZero function instead of padStart
      this.timerLabel.string = `${this.padZero(minutes)}:${this.padZero(seconds)}`;
      
      // Change color when time is running low
      if (this.remainingTime <= 10) {
        this.timerLabel.color = new Color(255, 0, 0, 255); // Red
      } else if (this.remainingTime <= 30) {
        this.timerLabel.color = new Color(255, 255, 0, 255); // Yellow
      } else {
        this.timerLabel.color = new Color(255, 255, 255, 255); // White
      }
    }
  }

  // ✅ HANDLE TIME UP
  timeUp() {
    if (!this.isGameActive) return;
    
    this.isGameActive = false;
    this.unschedule(this.updateTimer);
    
    // 停止發射子彈
    EventManager.eventTarget.emit('switch-can-fire', false);
    
    // 顯示遊戲結束面板
    if (this.gameOverPanel) {
        this.gameOverPanel.active = true;
        
        // 更新分數顯示
        const scoreLabel = this.gameOverPanel.getChildByName('ScoreLabel');
        if (scoreLabel) {
            const label = scoreLabel.getComponent(Label);
            if (label) {
                label.string = `Score: ${this.point}`;
            }
        }
    }
    
    // 檢查是否達到偷魚的分數要求
    const minScoreToSteal = 500; // 設置偷魚的最低分數要求
    const success = this.point >= minScoreToSteal;
    
    // 延遲幾秒後返回朋友魚缸場景
    this.scheduleOnce(() => {
        // 如果是從朋友魚缸場景進入的，則返回並執行回調
        if (window['onMiniGameComplete'] && typeof window['onMiniGameComplete'] === 'function') {
            window['onMiniGameComplete'](this.point, success);
        }
        
        // 返回朋友魚缸場景
        director.loadScene('FriendTank');
    }, 3); // 3秒後返回
  }

  showTimeUpPopup() {
    // ✅ SIMPLE VERSION - Show final point
    this.showPopupModal(`Time's Up！\nFinal Point: ${this.point}`);
  }

  spawnFishes() {
    if (!this.isGameActive) return;
    
    const fishes = this.generateFishes(5);
    EventManager.eventTarget.emit('spawn-fishes', fishes);
    console.log('Spawned fishes:', fishes);
  }

  generateFishes(count: number): FishConfig[] {
    const fishes: FishConfig[] = [];
    for (let i = 0; i < count; i++) {
      const fishTypeNum = Math.floor(Math.random() * 5) + 1;
      const fishId = `fish_0${fishTypeNum}`;
      
      fishes.push({
        uuid: `${Date.now()}_${i}_${Math.floor(Math.random() * 10000)}`,
        id: fishId,
        name: `Fish ${fishTypeNum}`,
        level: Math.floor(Math.random() * 3) + 1,
        speed: 100 + Math.random() * 100,
        radiusW: 50,
        radiusH: 30,
        spawnX: 1350,
        spawnY: Math.random() * 400 - 200,
        spawnTime: Date.now(),
        maxLifeTime: 20,
        isActive: true,
      });
    }
    console.log('🎲 Generated fish IDs:', fishes.map(f => f.id));
    return fishes;
  }

  protected update(dt: number): void {
    // 更新玩家的點數
    if (this._isTransition && this.playerPointLabel) {
      this.playerPointLabel.string = `${Math.floor(this._tempPoint.point)}`;
      this.point = Math.floor(this._tempPoint.point);
    }
    
    /*
    // ✅ UPDATE SCORE DISPLAY
    if (this._scoreTween && this._scoreTween.running && this.scoreLabel) {
      this.scoreLabel.string = `Score: ${Math.floor(this._tempScore.score)}`;
      this.score = Math.floor(this._tempScore.score);
    }
      */
  }

  protected onDestroy(): void {
    // 註銷事件
    EventManager.eventTarget.off('init-game-scene', this.initGameScene, this);
    EventManager.eventTarget.off('update-point', this.updatePoint, this);
    EventManager.eventTarget.off('show-fire-fail', this.showFireFail, this);
    EventManager.eventTarget.off('add-points', this.addPoints, this);
    //EventManager.eventTarget.off('add-score', this.addScore, this);
    
    // Unschedule all timers
    this.unschedule(this.spawnFishes);
    this.unschedule(this.updateTimer);
  }

  // ✅ POINTS HANDLING
  addPoints(points: number) {
    if (!this.isGameActive) return;
    
    console.log(`GameSceneManager: Adding ${points} points to current total ${this.point}`);
    const newTotal = this.point + points;
    this.updatePoint(newTotal, true);
    console.log(`GameSceneManager: New total is ${this.point}`);
  }

  /*
  addScore(points: number) {
    if (!this.isGameActive) return;
    
    const newScore = this.score + points;
    this.updateScore(newScore, true);
    console.log(`Score increased by ${points}! Total: ${newScore}`);
  }

  updateScore(newScore: number, animated: boolean = false) {
    if (this._scoreTween && this._scoreTween.running) {
      this._scoreTween.stop();
    }
    
    if (animated && this.scoreLabel) {
      this._tempScore.score = this.score;
      this._scoreTween = tween(this._tempScore)
        .delay(0.2)
        .to(0.5, { score: newScore })
        .call(() => {
          if (this.scoreLabel) {
            this.scoreLabel.string = `Score: ${newScore}`;
          }
          this.score = newScore;
          this._scoreTween = null;
        })
        .start();
    } else {
      this.score = newScore;
      if (this.scoreLabel) {
        this.scoreLabel.string = `Score: ${newScore}`;
      }
    }
  }
  */

  checkAffordability() {
    EventManager.eventTarget.emit('switch-can-fire', this.isGameActive);
  }

  /*
  onClickClose() {
    if (this.popupModal) {
      this.popupModal.active = false;
    }
    if (this.modalText) {
      this.modalText.string = '';
    }
  }
  */

  onClickConfirm() {
    if (this.popupModal) {
      this.popupModal.active = false;
    }
    if (this.modalText) {
      this.modalText.string = '';
    }

    console.log('Confirm clicked, quitting to aquarium');
    this.onClickQuitToAquarium();
  }

  onClickQuitToAquarium() {
    this.isGameActive = false;
    this.unschedule(this.updateTimer);
    this.unschedule(this.spawnFishes);
    EventManager.eventTarget.emit('stop-all-fish');
    
    // Disable shooting
    EventManager.eventTarget.emit('switch-can-fire', false);

    this.scheduleOnce(() => {
      this.playerPointLabel.string = '';
      this.popupModal.active = false;
      this.point = 0;
      director.loadScene('aquarium', (err, scene) => {
        if(!err) {
          console.log('Returned to aquarium scene');
          EventManager.eventTarget.emit('init-aquarium-scene');
        }
        else {
          console.error('Failed to load aquarium scene:', err);
        }
      });
    }, 0.1);
  }

  /*
  onClickQuitRoom() {
    this.scheduleOnce(() => {
      if (this.playerPointLabel) {
        this.playerPointLabel.string = '';
      }

      if (this.popupModal) {
        this.popupModal.active = false;
      }
      
      director.loadScene('01-start-scene', (err, scene) => {
        if (!err) {
          console.log('Returned to start scene');
          EventManager.eventTarget.emit('init-start-scene');
        }
      });
    }, 0.5);
  }
  */

  updatePoint(currentPoint: number, delay: boolean) {
    if (this._tempTween && this._tempTween.running) {
      this._tempTween.stop();
    }
    
    if (!this.playerPointLabel) return;
    
    this._isTransition = true;
    this._tempPoint.point = this.point;
    this._cachedPoint = currentPoint;
    this._tempTween = tween(this._tempPoint)
      .delay(delay ? 0.8 : 0)
      .to(0.3, { point: currentPoint })
      .call(() => {
        this._isTransition = false;
        if (this.playerPointLabel) {
          this.playerPointLabel.string = `${currentPoint}`;
        }
        this.point = currentPoint;
      })
      .start();
  }

  showFireFail() {
    if (!this.isGameActive) {
      this.showPopupModal('Game Over!');
    }
  }

  showPopupModal(text: string) {
    if (this.popupModal) {
      this.popupModal.active = true;
    }
    if (this.modalText) {
      this.modalText.string = text;
    }
  }

  // ✅ ADD RESTART GAME METHOD
  restartGame() {
    this.isGameActive = false;
    this.unschedule(this.updateTimer);
    this.unschedule(this.spawnFishes);
    this.initGameScene();
  }
}
