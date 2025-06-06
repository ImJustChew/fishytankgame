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
const { ccclass, property } = _decorator;

@ccclass('GameSceneManager')
export class GameSceneManager extends Component {
  @property(Label)
  public playerPointLabel: Label = null;
  @property(Label)
  public bulletValueLabel: Label = null;
  @property(Label)
  public timerLabel: Label = null;
  @property(Label)
  public scoreLabel: Label = null; // ✅ ADD SCORE LABEL
  @property(Node)
  public popupModal: Node = null;
  @property(Label)
  public modalText: Label = null;

  public bulletLevel: number = 3;
  public point: number = 0;
  public score: number = 0; // ✅ ADD SCORE PROPERTY
  
  // ✅ ADD TIMER SYSTEM
  public gameTime: number = 30; // 30 seconds
  public remainingTime: number = 30;
  public isGameActive: boolean = false;
  
  private _isTransition: boolean = false;
  private _tempPoint: Record<string, number> = { point: 0 };
  private _tempScore: Record<string, number> = { score: 0 }; // ✅ ADD SCORE TRANSITION
  private _tempTween: Tween = null;
  private _scoreTween: Tween = null; // ✅ ADD SCORE TWEEN
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
    EventManager.eventTarget.on('add-points', this.addPoints, this); // Handle point awards
    EventManager.eventTarget.on('add-score', this.addScore, this); // ✅ ADD SCORE EVENT

    this.initGameScene();
  }

  initGameScene(): void {
    console.log('GameSceneManager initGameScene - Singleplayer Mode with Timer');
    
    // Initialize singleplayer game state
    this.point = 0; // Start with 0 points
    this.score = 0; // ✅ INITIALIZE SCORE
    this._cachedPoint = 0;
    this.playerPointLabel.string = `${this.point}`;
    this.scoreLabel.string = `Score: ${this.score}`; // ✅ INITIALIZE SCORE DISPLAY
    this.bulletLevel = 3;
    this.bulletValueLabel.string = `Level ${this.bulletLevel}`;
    
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
    // Update timer every second
    this.schedule(this.updateTimer, 1);
  }

  updateTimer() {
    if (!this.isGameActive) return;
    
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
    console.log('Time is up!');
    this.isGameActive = false;
    
    // Stop all timers
    this.unschedule(this.updateTimer);
    this.unschedule(this.spawnFishes);
    
    // ✅ STOP ALL FISH MOVEMENT
    EventManager.eventTarget.emit('stop-all-fish');
    
    // Disable shooting
    EventManager.eventTarget.emit('switch-can-fire', false);
    
    // Show time up popup
    this.showTimeUpPopup();
  }

  showTimeUpPopup() {
    const finalScore = this.score; // ✅ USE SCORE INSTEAD OF POINTS
    this.showPopupModal(`Time's Up！\nFinal Score: ${finalScore}`);
  }

  spawnFishes() {
    if (!this.isGameActive) return; // Don't spawn fish when game is over
    
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
    if (this._isTransition) {
      this.playerPointLabel.string = `${Math.floor(this._tempPoint.point)}`;
      this.point = Math.floor(this._tempPoint.point);
    }
    
    // ✅ UPDATE SCORE DISPLAY
    if (this._scoreTween && this._scoreTween.running) {
      this.scoreLabel.string = `Score: ${Math.floor(this._tempScore.score)}`;
      this.score = Math.floor(this._tempScore.score);
    }
  }

  protected onDestroy(): void {
    // 註銷事件
    EventManager.eventTarget.off('init-game-scene', this.initGameScene, this);
    EventManager.eventTarget.off('update-point', this.updatePoint, this);
    EventManager.eventTarget.off('show-fire-fail', this.showFireFail, this);
    EventManager.eventTarget.off('add-points', this.addPoints, this);
    EventManager.eventTarget.off('add-score', this.addScore, this); // ✅ UNREGISTER SCORE EVENT
    
    // Unschedule all timers
    this.unschedule(this.spawnFishes);
    this.unschedule(this.updateTimer);
  }

  // Add points to player score (keep for compatibility)
  addPoints(points: number) {
    if (!this.isGameActive) return; // Don't add points when game is over
    
    const newTotal = this.point + points;
    this.updatePoint(newTotal, true);
    
    // ✅ ALSO ADD TO SCORE
    this.addScore(points);
  }

  // ✅ ADD SCORE SYSTEM
  addScore(points: number) {
    if (!this.isGameActive) return; // Don't add score when game is over
    
    const newScore = this.score + points;
    this.updateScore(newScore, true);
    console.log(`Score increased by ${points}! Total: ${newScore}`);
  }

  // ✅ ADD SCORE UPDATE METHOD
  updateScore(newScore: number, animated: boolean = false) {
    if (this._scoreTween && this._scoreTween.running) {
      this._scoreTween.stop();
    }
    
    if (animated) {
      this._tempScore.score = this.score;
      this._scoreTween = tween(this._tempScore)
        .delay(0.2) // Small delay for visual effect
        .to(0.5, { score: newScore })
        .call(() => {
          this.scoreLabel.string = `Score: ${newScore}`;
          this.score = newScore;
          this._scoreTween = null;
        })
        .start();
    } else {
      this.score = newScore;
      this.scoreLabel.string = `Score: ${newScore}`;
    }
  }

  // Simplified affordability check (always true during game time)
  checkAffordability() {
    EventManager.eventTarget.emit('switch-can-fire', this.isGameActive);
  }

  onClickClose() {
    this.popupModal.active = false;
    this.modalText.string = '';
  }

  onClickConfirm() {
    this.popupModal.active = false;
    this.modalText.string = '';
    
    // Return to start scene after confirming time up
    if (!this.isGameActive) {
      this.onClickQuitRoom();
    }
  }

  onClickQuitRoom() {
    this.scheduleOnce(() => {
      this.playerPointLabel.string = '';
      this.scoreLabel.string = 'Score: 0'; // ✅ RESET SCORE DISPLAY
      this.popupModal.active = false;
      director.loadScene('01-start-scene', (err, scene) => {
        if (!err) {
          console.log('Returned to start scene');
          EventManager.eventTarget.emit('init-start-scene');
        }
      });
    }, 0.5);
  }

  updatePoint(currentPoint: number, delay: boolean) {
    if (this._tempTween && this._tempTween.running) {
      this._tempTween.stop();
    }
    this._isTransition = true;
    this._tempPoint.point = this.point;
    this._cachedPoint = currentPoint;
    this._tempTween = tween(this._tempPoint)
      .delay(delay ? 0.8 : 0)
      .to(0.3, { point: currentPoint })
      .call(() => {
        this._isTransition = false;
        this.playerPointLabel.string = `${currentPoint}`;
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
    this.popupModal.active = true;
    this.modalText.string = text;
  }

  // ✅ ADD RESTART GAME METHOD
  restartGame() {
    this.isGameActive = false;
    this.unschedule(this.updateTimer);
    this.unschedule(this.spawnFishes);
    this.initGameScene();
  }
}
