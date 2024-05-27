const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 640,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 500 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

let carrotCollected = 0;
let carrotsCollectedText;
let gameOverText;
let restartText;
let isGameOver = false;
let highestScoreText;
let highestScore = localStorage.getItem('highestScore');
if (!highestScore) {
  highestScore = 0;
} else {
  highestScore = parseInt(highestScore);
}

const game = new Phaser.Game(config);
function preload() {
  this.load.setBaseURL('src/assets/')
  this.load.image('background', 'Background/bg_layer1.png')
  this.load.image('cloud', 'Enemies/cloud.png')
  this.load.image('platform', 'Environment/ground_sand.png')

  this.load.image('bunny-stand', 'Players/bunny2_stand.png')
  this.load.image('bunny-jump', 'Players/bunny2_jump.png')
  this.load.image('bunny-lose', 'Players/bunny2_hurt.png')
  this.load.image('carrot', 'Items/carrot.png')

  this.load.audio('main-music', 'Audio/loop.mp3')
  this.load.audio('jump', 'Audio/jump.wav')
  this.load.audio('pickup', "Audio/pickup.wav")

  this.cursors = this.input.keyboard.createCursorKeys();
  this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
}

function create() {
  this.add.image(240, 320, 'background').setScrollFactor(1, 0)
  this.clouds = this.add.group();
  for (let index = 0; index < 3; index++) {
    const x = Phaser.Math.Between(0, 480)
    const y = 250 * index;
    this.clouds.add(this.add.image(x, y, 'cloud'))
  }
  this.platforms = this.physics.add.staticGroup()

  const base = this.platforms.create(240, 550, 'platform');
  base.setScale(0.25);
  const _body = base.body
  _body.updateFromGameObject()
  for (let i = 0; i < 5; i++) {
    const x = Phaser.Math.Between(80, 400)
    const y = 150 * i;
    const platform = this.platforms.create(x, y, 'platform')
    platform.setScale(0.25)

    const body = platform.body
    body.updateFromGameObject()

  }

  // create a bunny sprite
  this.player = this.physics.add.sprite(240, 320, 'bunny-stand').setScale(0.5)
  this.player.body.checkCollision.up = false
  this.player.body.checkCollision.left = false
  this.player.body.checkCollision.right = false

  this.physics.add.collider(this.platforms, this.player)

  this.cameras.main.startFollow(this.player)
  this.cameras.main.setDeadzone(this.scale.width * 1.5)

  this.carrots = this.physics.add.group({
    key: 'carrot',
    repeat: 0,
    setScale: { x: 0.5, y: 0.5 }
  })

  this.physics.add.collider(this.platforms, this.carrots)

  const style = { color: '#fff', fontSize: 24, fontStyle: 'bold', backgroundColor: '#e467f0', }
  carrotsCollectedText = this.add.text(80, 10, 'Carrots: 0', style).setScrollFactor(0).setOrigin(0.5, 0).setDepth(1);
  highestScoreText = this.add.text(400, 10, 'Highest: 0', style).setScrollFactor(0).setOrigin(0.5, 0).setDepth(1);
  updateHighestScore();
  this.sound.add('pickup');
  this.physics.add.overlap(this.player, this.carrots, (player, carrot) => {
    collectCarrot(player, carrot, carrotsCollectedText, this.sound);
  });
  gameOverText = this.add.text(240, 320, 'Nice Try', {
    fontSize: '64px',
    fill: '#000',
    stroke: '#fff',
    strokeThickness: 6
  })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setVisible(false);

  restartText = this.add.text(240, 400, 'Press SPACE to try again', {
    fontSize: '32px',
    fill: '#000',
    stroke: '#fff',
    strokeThickness: 4
  })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setVisible(false);

  this.input.keyboard.on('keydown-SPACE', function (event) {
    restartGame.call(this);
  }, this);
  
  this.gameMusic = this.sound.add('main-music', { loop: true })
  this.gameMusic.play()
}

function update() {
  this.platforms.children.iterate(child => {
    const platform = child

    const scrollY = this.cameras.main.scrollY
    if (platform.y >= scrollY + 640) {
      platform.y = scrollY - Phaser.Math.Between(80, 120)
      platform.x = Phaser.Math.Between(40, 440)
      platform.body.updateFromGameObject()

      addCarrotAbove.call(this, platform);
    }
  })

  this.clouds.children.iterate(child => {
    const cloud = child

    const scrollY = this.cameras.main.scrollY
    if (cloud.y >= scrollY + 800) {
      cloud.y = scrollY - Phaser.Math.Between(20, 60)
    }
  })

  const touchingDown = this.player.body.touching.down;

  if (touchingDown) {
    this.player.setVelocityY(-450)

    this.player.setTexture('bunny-jump')
    this.sound.play('jump')
  }

  const vy = this.player.body.velocity.y
  if (vy > 0 && this.player.texture.key !== 'bunny-stand') {
    this.player.setTexture('bunny-stand')
  }


  if (this.cursors.left.isDown && !touchingDown) {
    this.player.setVelocityX(-200)
  }
  else if (this.cursors.right.isDown && !touchingDown) {
    this.player.setVelocityX(200)
  }
  else {
    this.player.setVelocityX(0)
  }

  horizontalLimit(this.player, this.scale.width);

  const bottomPlatform = findLowestPlatform.call(this);
  if (this.player.y > bottomPlatform.y + 200) {
    this.registry.set('final-score', carrotsCollectedText.text);
    gameOver.call(this);
  }
}

function horizontalLimit(sprit, gameWidth) {
  const halfWidth = sprit.displayWidth * 0.5
  if (sprit.x < -halfWidth) {
    sprit.x = gameWidth + halfWidth
  }
  else if (sprit.x > gameWidth + halfWidth) {
    sprit.x = -halfWidth
  }
}


function addCarrotAbove(sprite) {
  const y = sprite.y - sprite.displayHeight;
  const carrot = this.carrots.get(sprite.x, y, 'carrot');
  carrot.setActive(true);
  carrot.setVisible(true);
  carrot.setScale(0.5);
  this.add.existing(carrot);
  carrot.body.setSize(carrot.width, carrot.height);
  this.physics.world.enable(carrot);
  return carrot;
}


function collectCarrot(player, carrot, carrotsCollectedText, sound) {
  carrot.setVisible(false);
  carrot.setActive(false);
  carrot.body.enable = false;
  carrotCollected++;
  sound.play('pickup');
  carrotsCollectedText.text = `Carrots: ${carrotCollected}`;
  if (carrotCollected > highestScore) {
    highestScore = carrotCollected;
    localStorage.setItem('highestScore', highestScore);
    updateHighestScore();
  }
}

function findLowestPlatform() {
  const platforms = this.platforms.getChildren()
  let lowestPlatform = platforms[0]

  for (let i = 1; i < platforms.length; i++) {
    const platform = platforms[i]
    if (platform.y < lowestPlatform.y) {
      continue;
    }
    lowestPlatform = platform;
  }
  return lowestPlatform;
}

function gameOver() {
  this.physics.pause();
  this.player.setTint(0xff0000);
  this.player.setTexture('bunny-lose');
  gameOverText.setVisible(true);
  restartText.setVisible(true);
  this.gameMusic.stop();
}

function updateHighestScore() {
  highestScoreText.text = `Highest: ${highestScore}`;
}

function restartGame() {
  carrotCollected = 0;
  isGameOver = false;
  this.scene.restart();
}
