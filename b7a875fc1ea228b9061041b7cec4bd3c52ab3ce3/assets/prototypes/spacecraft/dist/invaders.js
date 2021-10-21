'use strict';

// polyfill for 'object doesn't support property or method 'find''
// https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
     // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return kValue.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return undefined.
      return undefined;
    },
    configurable: true,
    writable: true
  });
}

/* based on https://codepen.io/Krol22/full/RMBvRP/

0. Constants
1. Engine
1.1 Engine Object (game loop),
1.2 Entity Compoent System,
1.1.1 Entity,
1.1.2 ECS,
1.3 Input Manager,
1.4 Scene Manager
2. Game
2.1 Components,
2.2 Systems,
2.3 Entities,
2.4 Game Scene

*/

// 0. Constants

var COMPONENTS = {
    PLAYER: 'PLAYER_COMPONENT',
    POSITION: 'POSITION_COMPONENT',
    APPERANCE: 'APPERANCE_COMPONENT',
    ENEMY: 'ENEMY_COMPONENT',
    PHYSICS: 'PHYSICS_COMPONENT',
    NODE: 'NODE_COMPONENT',
    BULLET: 'BULLET_COMPONENT',
    COLLISION: 'COLLISION_COMPONENT',
    OBSTACLE: 'OBSTACLE_COMPONENT',
    LEVEL: 'LEVEL_COMPONENT',
    EXPLODE: 'EXPLODE_COMPONENT',
    BOSS: 'BOSS_COMPONENT'
};

var COLLISION_MASKS = {
    NO: 0,
    WORLD: 1,
    BULLET: 2,
    PLAYER: 4,
    ENEMY: 8,
    OBSTACLE: 16
};

var SCREEN_WIDTH = 1000;
var SCREEN_HEIGHT = 750;

var ENEMY_ROWS = 5;
var ENEMY_COLS = 8;

var OBSTACLE_WIDTH = 10;
var OBSTACLE_ROWS = 7;
var OBSTACLE_COLS = 10;

var PLAYER_X_SPEED = 5;

var obstacleMap = [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1];

var GAME_SCREEEN_ELEMENT = document.querySelector('#game-screen');

var SPEED_FACTOR = 1;

// 1. Engine
// 1.1 Engine Object (game loop)


var kt = {};

kt.Engine = {
    init: function init() {
        this.running = true;
        kt.Engine.InputManager.init('#game-screen');
        this.gameLoop();
    },
    gameLoop: function gameLoop() {
        var hardBind = this.gameLoop.bind(this);
        window.requestAnimationFrame(hardBind);
        kt.Engine.SceneManager.tick();
    }
};

// 1.2 ENTITY COMPONENT SYSTEM:

// 1.2.1 ENTITY

kt.Engine.Entity = function (name) {
    this.id = (Math.random() * 10000000).toString(16);
    this.name = name;
    this.components = {};
    return this;
};

kt.Engine.Entity.prototype.addComponent = function (component) {
    if (!component.name) {
        throw new Error('Component has to have a name!');
    }
    this.components[component.name] = component;
    return this;
};

kt.Engine.Entity.prototype.removeComponent = function (componentName) {
    var name = componentName;
    if (typeof componentName === 'function') {
        name = componentName.name;
    }
    delete this.components[name];
    return this;
};

kt.Engine.Entity.prototype.print = function () {
    console.log(JSON.stringify(this, null, 4));
    return this;
};

// 1.2.2 Entity component system

kt.Engine.EntityComponentSystem = function (entities, systems) {
    entities = entities || [];
    systems = systems || [];
    this.Entities = entities;
    this.Systems = systems;

    this.update = function () {
        var _this = this;

        if (!this.Systems) {
            return;
        }
        this.Systems.forEach(function (system) {
            system.tick(_this.Entities);
        });
    };

    this.destroy = function () {
        this.Systems = [];
        this.Entities = [];
    };
};

kt.Engine.EntityComponentSystem.prototype.addEntities = function (entities) {
    this.Entities = this.Entities.concat(entities);
};

kt.Engine.EntityComponentSystem.prototype.addSystems = function (systems) {
    var _this2 = this;

    systems.forEach(function (system) {
        if (system.init) system.init(_this2.Entities);
    });
    this.Systems = this.Systems.concat(systems);
};

// 1.3 Input manager
kt.Engine.InputManager = {
    update: function update() {
        var i = void 0;
        for (i = 8; i < 222; i++) {
            if (!this.keys[i].isDown) continue;
            this.keys[i].prevIsDown = this.keys[i].isDown;
        }
    },
    init: function init(selector) {
        var _this3 = this;

        this.keys = [];

        var _loop = function _loop(i) {
            _this3.keys[i] = {
                isDown: false,
                isPressed: function isPressed() {
                    return _this3.keys[i].isDown && !_this3.keys[i].prevIsDown;
                }
            };
        };

        for (var i = 8; i < 222; i++) {
            _loop(i);
        }

        window.addEventListener('keydown', function (event) {
            if (event.keyCode == 32) {
                event.preventDefault();
            }

            if (event.keyCode == 27) {
                // escape key
                $('#game-close').click();
            }

            _this3.keys[event.which].isDown = true;
        });

        window.addEventListener('keyup', function (event) {
            _this3.keys[event.which].isDown = false;
            _this3.keys[event.which].prevIsDown = false;
        });
    }

    // 1.4 Scene manager
};kt.Engine.Scene = function (config) {
    this.name = config.name;
    this.init = config.init;
    this.destroy = config.destroy;
    this.update = config.update;

    kt.Engine.SceneManager._scenes[this.name] = this;
};

kt.Engine.SceneManager = {
    _scenes: {},
    scenesStack: [],
    pushScene: function pushScene(sceneName, payload) {
        var scene = this._scenes[sceneName];
        if (scene.init) {
            scene.init(payload);
        }
        this.scenesStack.push(scene);
    },
    popScene: function popScene() {
        this.scenesStack[this.scenesStack.length - 1].destroy();
        this.scenesStack.pop();
    },
    changeScene: function changeScene(sceneName, payload) {
        this.popScene();
        this.pushScene(sceneName, payload);
    },
    tick: function tick() {
        var currentScene = this.scenesStack[this.scenesStack.length - 1];
        currentScene.update();
    }
};

// 2 GAME

// 2.1 Components

var PositionComponent = function PositionComponent(x, y, width, height, visible) {
    x = x || 0;
    y = y || 0;
    width = width || 0;
    height = height || 0;
    visible = visible || false;

    return {
        name: COMPONENTS.POSITION,
        x: x,
        y: y,
        width: width,
        height: height,
        visible: visible
    };
};

var ApperanceComponent = function ApperanceComponent(assetClass, totalFrames) {
    totalFrames = totalFrames || 1;
    return {
        name: COMPONENTS.APPERANCE,
        frame: 0,
        totalFrames: totalFrames,
        assetClass: assetClass
    };
};

var PhysicsComponent = function PhysicsComponent(vx, vy, ax, ay) {
    vx = vx || 0;
    vy = vy || 0;
    ax = ax || 0;
    ay = ay || 0;
    return {
        name: COMPONENTS.PHYSICS,
        vx: vx,
        vy: vy,
        ax: ax,
        ay: ay
    };
};

var CollisionComponent = function CollisionComponent(collisionId, collisionMask) {
    collisionId = collisionId || COLLISION_MASKS.NO;
    collisionMask = collisionMask || COLLISION_MASKS.NO;
    return {
        name: COMPONENTS.COLLISION,
        collisions: [],
        collisionId: collisionId,
        collisionMask: collisionMask
    };
};

var EnemyComponent = function EnemyComponent(directionX, type) {
    return {
        name: COMPONENTS.ENEMY,
        live: true,
        directionX: directionX,
        type: type
    };
};

var PlayerComponent = function PlayerComponent(lives) {
    lives = lives || 3;
    return {
        name: COMPONENTS.PLAYER,
        live: true,
        lives: lives,
        explode: false,
        timer: 0,
        explodeTimer: 2
    };
};

var LevelComponent = function LevelComponent(score) {
    score == score || 0;
    return {
        name: COMPONENTS.LEVEL,
        score: score
    };
};

var BulletComponent = function BulletComponent(isPlayerBullet) {
    return {
        name: COMPONENTS.BULLET,
        isPlayerBullet: isPlayerBullet,
        hit: true
    };
};

var NodeComponent = function NodeComponent(domNode) {
    return {
        name: COMPONENTS.NODE,
        domNode: domNode
    };
};

var ObstacleComponent = function ObstacleComponent(group, type) {
    return {
        name: COMPONENTS.OBSTACLE,
        lives: 1,
        group: group,
        type: type
    };
};

var ExplodeComponent = function ExplodeComponent() {
    return {
        name: COMPONENTS.EXPLODE,
        explode: false,
        explodeTimer: 0,
        explodeTime: 50
    };
};

var BossComponent = function BossComponent() {
    return {
        name: COMPONENTS.BOSS,
        bossTimer: 0,
        bossTime: 600,
        bossSpawned: false,
        bossSpawnTimes: 0,
        bossMaxSpawnTimes: 2,
        bossMinNumberOfEnemiesSpawn: 15,
        bossSpawnCooldown: 500
    };
};

// 2.2 Systems

var RenderSystem = {
    init: function init(entities) {
        entities.filter(function (entity) {
            return entity.components[COMPONENTS.POSITION] && entity.components[COMPONENTS.NODE];
        }).map(function (entity) {
            var newElement = document.createElement('div');
            newElement.classList.add('position-component');

            newElement.style.top = entity.components[COMPONENTS.POSITION].y + 'px';
            newElement.style.left = entity.components[COMPONENTS.POSITION].x + 'px';
            newElement.style.width = entity.components[COMPONENTS.POSITION].width + 'px';
            newElement.style.height = entity.components[COMPONENTS.POSITION].height + 'px';

            var apperanceComponent = entity.components[COMPONENTS.APPERANCE];
            if (apperanceComponent) {
                newElement.classList.add(apperanceComponent.assetClass);
            }

            entity.components[COMPONENTS.NODE].domNode = newElement;

            GAME_SCREEEN_ELEMENT.appendChild(newElement);
        });
    },
    tick: function tick(entities) {
        entities.filter(function (entity) {
            return entity.components[COMPONENTS.POSITION] && entity.components[COMPONENTS.NODE] && entity.components[COMPONENTS.APPERANCE];
        }).map(function (entity) {
            var domElement = entity.components[COMPONENTS.NODE].domNode;
            var position = entity.components[COMPONENTS.POSITION];

            domElement.style.display = position.visible ? 'block' : 'none';

            domElement.style.left = position.x + 'px';
            domElement.style.top = position.y + 'px';
        });
    }
};

var PhysicsSystem = {
    init: function init() {},
    tick: function tick(entities) {
        entities.filter(function (entity) {
            return entity.components[COMPONENTS.PHYSICS] && entity.components[COMPONENTS.POSITION].visible;
        }).map(function (entity) {
            var position = entity.components[COMPONENTS.POSITION];
            var physics = entity.components[COMPONENTS.PHYSICS];
            var enemy = entity.components[COMPONENTS.ENEMY];

            position.x += physics.vx;
            position.y += physics.vy;
        });
    }
};

var ControllSystem = {
    init: function init() {},
    tick: function tick(entities) {
        var playerEntity = entities.find(function (entity) {
            return entity.components[COMPONENTS.PLAYER];
        });

        playerEntity.components[COMPONENTS.PHYSICS].vx = 0;

        if (playerEntity.components[COMPONENTS.EXPLODE].explodeTimerStarted) {
            return;
        }

        if (kt.Engine.InputManager.keys[37].isDown) {
            var position = playerEntity.components[COMPONENTS.PHYSICS];
            position.vx -= PLAYER_X_SPEED * SPEED_FACTOR;
        }

        if (kt.Engine.InputManager.keys[39].isDown) {
            var _position = playerEntity.components[COMPONENTS.PHYSICS];
            _position.vx += PLAYER_X_SPEED * SPEED_FACTOR;
        }

        if (kt.Engine.InputManager.keys[32].isPressed()) {
            var playerPosition = entities.find(function (entity) {
                return entity.components[COMPONENTS.PLAYER];
            }).components[COMPONENTS.POSITION];
            var bulletEntity = entities.find(function (entity) {
                return entity.components[COMPONENTS.BULLET];
            });

            var bullet = bulletEntity.components[COMPONENTS.BULLET];

            if (bullet.hit) {
                bullet.hit = false;
                bulletEntity.components[COMPONENTS.POSITION].visible = true;
                bulletEntity.components[COMPONENTS.POSITION].y = 720;
                bulletEntity.components[COMPONENTS.PHYSICS].vy = -10 * SPEED_FACTOR;
                bulletEntity.components[COMPONENTS.POSITION].x = playerPosition.x + playerPosition.width / 2 - bulletEntity.components[COMPONENTS.POSITION].width / 2;
            }
        }
    }
};

var EnemySystem = {
    init: function init(entities) {
        this.timer = 0;

        entities.filter(function (entity) {
            return entity.components[COMPONENTS.ENEMY];
        }).map(function (enemy) {
            var node = enemy.components[COMPONENTS.NODE].domNode;
            var enemyComponent = enemy.components[COMPONENTS.ENEMY];

            node.classList.add('type-' + enemyComponent.type);
        });
    },
    tick: function tick(entities) {
        this.timer++;

        var enemies = entities.filter(function (entity) {
            return entity.components[COMPONENTS.ENEMY] && entity.components[COMPONENTS.ENEMY].type !== 3;
        });
        var visibleEnemies = enemies.filter(function (entity) {
            return entity.components[COMPONENTS.POSITION].visible;
        });

        SPEED_FACTOR = 1 + (40 - visibleEnemies.length) / 40;

        enemies.filter(function (entity) {
            return entity.components[COMPONENTS.ENEMY];
        }).map(function (entity) {
            var physics = entity.components[COMPONENTS.PHYSICS];
            var enemy = entity.components[COMPONENTS.ENEMY];
        });

        var enemyBullets = entities.filter(function (entity) {
            return entity.components[COMPONENTS.BULLET] && !entity.components[COMPONENTS.BULLET].isPlayerBullet && entity.components[COMPONENTS.BULLET].hit;
        });

        if (enemyBullets.length && Math.random() * 100 + 1 > 99.9 || enemyBullets.length === 3) {
            var livingEnemies = enemies.filter(function (enemy) {
                return enemy.components[COMPONENTS.ENEMY].live;
            });

            var enemyIndex = Math.round(Math.random() * livingEnemies.length);
            var shootingEnemy = livingEnemies[enemyIndex];

            if (!shootingEnemy) {
                return;
            }

            var bulletPosition = enemyBullets[0].components[COMPONENTS.POSITION];
            var enemyPosition = shootingEnemy.components[COMPONENTS.POSITION];

            bulletPosition.visible = true;
            bulletPosition.x = enemyPosition.x + enemyPosition.width + (Math.random() * enemyPosition.width / 2 - enemyPosition.width);
            bulletPosition.y = enemyPosition.y;
            enemyBullets[0].components[COMPONENTS.BULLET].hit = false;
            enemyBullets[0].components[COMPONENTS.PHYSICS].vy = 5 * SPEED_FACTOR;
        }

        enemies.map(function (enemy) {
            enemy.components[COMPONENTS.PHYSICS].vx = 0;
        });

        if (this.timer > 200 / (SPEED_FACTOR * 5)) {
            this.timer = 0;
            enemies.map(function (enemy) {
                enemy.components[COMPONENTS.APPERANCE].frame += 1;
                enemy.components[COMPONENTS.PHYSICS].vx = enemy.components[COMPONENTS.ENEMY].directionX;
            });
        }
    }
};

var CollisionSystem = {
    init: function init(entities) {
        var collisionEntities = entities.filter(function (entity) {
            return entity.components[COMPONENTS.COLLISION];
        });
        collisionEntities.map(function (entity) {
            var collisionComponent = entity.components[COMPONENTS.COLLISION];
            var physicsComponent = entity.components[COMPONENTS.PHYSICS];

            collisionEntities.map(function (innerEntity) {
                if (entity.id === innerEntity.id) {
                    return;
                }

                var innerEntityCollision = innerEntity.components[COMPONENTS.COLLISION];

                var canCollide = innerEntityCollision.collisionId & collisionComponent.collisionMask;
                if (canCollide) {
                    collisionComponent.collisions.push({
                        entity: innerEntity,
                        mask: canCollide,
                        checked: false
                    });
                }
            });
        });
    },
    tick: function tick(entities) {
        var _this4 = this;

        entities.filter(function (entity) {
            return entity.components[COMPONENTS.COLLISION];
        }).map(function (entity) {
            var collisionComponent = entity.components[COMPONENTS.COLLISION];
            if (!entity.components[COMPONENTS.POSITION].visible || entity.components[COMPONENTS.EXPLODE] && entity.components[COMPONENTS.EXPLODE].explodeTimerStarted) {
                return;
            }

            collisionComponent.collisions.map(function (collision) {
                switch (collision.mask) {
                    case COLLISION_MASKS.WORLD:
                        _this4.handleCollisionWithWorld(entity, collision, entities);
                        break;
                    case COLLISION_MASKS.BULLET:
                        _this4.handleCollisionWithBullet(entity, collision, entities);
                        break;
                    case COLLISION_MASKS.ENEMY:
                        _this4.handleCollisionWithEnemy(entity, collision, entities);
                }
            });
        });
    },
    handleCollisionWithWorld: function handleCollisionWithWorld(entity, collision, entities) {
        var collideX = false;
        var collideY = false;
        var worldBounds = collision.entity.components[COMPONENTS.POSITION];
        var entityPosition = entity.components[COMPONENTS.POSITION];
        var entityPhysics = entity.components[COMPONENTS.PHYSICS];

        // Check if entity collides with world.
        if (entityPosition.x < worldBounds.x || entityPosition.x + entityPosition.width > worldBounds.width) {
            collideX = true;
        }

        if (entityPosition.y < worldBounds.y || entityPosition.y + entityPosition.height > worldBounds.height) {
            collideY = true;
        }

        if (!collideX && !collideY) {
            return false; // no collision detected
        }

        // Player - world collision,
        if (entity.components[COMPONENTS.COLLISION].collisionId === COLLISION_MASKS.PLAYER) {
            if (collideX) {
                entityPosition.x -= entityPhysics.vx * SPEED_FACTOR;
            }

            if (collideY) {
                entityPosition.y -= entityPhysics.vy * SPEED_FACTOR;
            }
        }

        // Enemy - world collision,
        if (entity.components[COMPONENTS.COLLISION].collisionId === COLLISION_MASKS.ENEMY) {
            if (collideX) {

                if (entity.components[COMPONENTS.BOSS]) {
                    entity.components[COMPONENTS.PHYSICS].vx *= -1;
                    return;
                }

                entities.filter(function (innerEntity) {
                    return innerEntity.components[COMPONENTS.ENEMY] && !innerEntity.components[COMPONENTS.BOSS];
                }).map(function (enemyEntity) {
                    enemyEntity.components[COMPONENTS.POSITION].x -= enemyEntity.components[COMPONENTS.ENEMY].directionX * 2;
                    enemyEntity.components[COMPONENTS.ENEMY].directionX *= -1;
                    enemyEntity.components[COMPONENTS.POSITION].y += 20;
                });
            }
        }

        // Bullet - world collision,
        if (entity.components[COMPONENTS.COLLISION].collisionId === COLLISION_MASKS.BULLET) {
            entity.components[COMPONENTS.BULLET].hit = true;
            entity.components[COMPONENTS.POSITION].visible = false;
            entity.components[COMPONENTS.POSITION].y = -250;
        }

        return true;
    },
    handleCollisionWithBullet: function handleCollisionWithBullet(entity, collision, entities) {
        var collide = false;

        var bulletPosition = collision.entity.components[COMPONENTS.POSITION];
        var entityPosition = entity.components[COMPONENTS.POSITION];
        var levelEntity = entities.find(function (entity) {
            return entity.components[COMPONENTS.LEVEL];
        });

        if (bulletPosition.x < entityPosition.x + entityPosition.width && bulletPosition.x + bulletPosition.width > entityPosition.x && bulletPosition.y < entityPosition.y + entityPosition.height && bulletPosition.y + bulletPosition.height > entityPosition.y) {
            collide = true;
        }

        if (!collide) {
            return;
        }

        // Enemy - player bullet collision
        if (entity.components[COMPONENTS.COLLISION].collisionId === COLLISION_MASKS.ENEMY && collision.entity.components[COMPONENTS.BULLET].isPlayerBullet) {
            if (entity.components[COMPONENTS.PLAYER]) {
                collision.entity.components[COMPONENTS.BULLET].hit = false;
            } else {
                collision.entity.components[COMPONENTS.BULLET].hit = true;
                /* move to bullet and enemy systems */
                collision.entity.components[COMPONENTS.POSITION].visible = false;
                collision.entity.components[COMPONENTS.POSITION].x = -20;
                collision.entity.components[COMPONENTS.POSITION].y = -20;

                /* applyScore */
                if (entity.components[COMPONENTS.ENEMY]) {
                    levelEntity.components[COMPONENTS.LEVEL].score += 100 * (entity.components[COMPONENTS.ENEMY].type + 1);

                    entity.components[COMPONENTS.EXPLODE].explode = true;
                    entity.components[COMPONENTS.ENEMY].live = false;
                } else {
                    levelEntity.components[COMPONENTS.LEVEL].score += 500;
                    entity.components[COMPONENTS.EXPLODE].explode = true;
                }
            }
        }

        // player - bullet collision
        if (entity.components[COMPONENTS.COLLISION].collisionId === COLLISION_MASKS.PLAYER && !collision.entity.components[COMPONENTS.BULLET].isPlayerBullet) {
            collision.entity.components[COMPONENTS.BULLET].hit = true;
            collision.entity.components[COMPONENTS.POSITION].visible = false;
            collision.entity.components[COMPONENTS.POSITION].x = -40;
            collision.entity.components[COMPONENTS.POSITION].y = -40;
            entity.components[COMPONENTS.EXPLODE].explode = true;
        }

        // obstacle - bullet collision
        if (entity.components[COMPONENTS.COLLISION].collisionId === COLLISION_MASKS.OBSTACLE && entity.components[COMPONENTS.OBSTACLE].lives > 0) {
            collision.entity.components[COMPONENTS.BULLET].hit = true;
            collision.entity.components[COMPONENTS.POSITION].visible = false;
            collision.entity.components[COMPONENTS.POSITION].x = -40;
            collision.entity.components[COMPONENTS.POSITION].y = -40;
            entity.components[COMPONENTS.OBSTACLE].hit = true;
        }
    },
    handleCollisionWithEnemy: function handleCollisionWithEnemy(entity, collision, entities) {
        var collide = false;
        var enemyPosition = collision.entity.components[COMPONENTS.POSITION];
        var entityPosition = entity.components[COMPONENTS.POSITION];

        if (enemyPosition.x < entityPosition.x + entityPosition.width && enemyPosition.x + enemyPosition.width > entityPosition.x && enemyPosition.y < entityPosition.y + entityPosition.height && enemyPosition.y + enemyPosition.height > entityPosition.y) {
            collide = true;
        }

        if (!collide) {
            return;
        }

        var playerEntity = entities.find(function (entity) {
            return entity.components[COMPONENTS.PLAYER];
        });

        if (entity.components[COMPONENTS.COLLISION].collisionId === COLLISION_MASKS.OBSTACLE && entity.components[COMPONENTS.OBSTACLE].lives > 0) {
            playerEntity.components[COMPONENTS.PLAYER].lives = 0;
        }
    }
};

var AnimationSystem = {
    init: function init() {},
    tick: function tick(entities) {
        var animationEntities = entities.filter(function (entity) {
            return entity.components[COMPONENTS.APPERANCE];
        });
        animationEntities.map(function (animationEntity) {
            var frame = animationEntity.components[COMPONENTS.APPERANCE].frame;
            var totalFrames = animationEntity.components[COMPONENTS.APPERANCE].totalFrames;

            animationEntity.components[COMPONENTS.APPERANCE].frame = frame % totalFrames;

            if (animationEntity.components[COMPONENTS.ENEMY]) {
                var node = animationEntity.components[COMPONENTS.NODE].domNode;
                var prevFrame = frame - 1 < 0 ? totalFrames - 1 : frame;
                node.classList.remove('frame-' + prevFrame);
                node.classList.add('frame-' + frame);
            }
        });
    }
};

var ObstacleSystem = {
    init: function init(entities) {
        entities.filter(function (entity) {
            return entity.components[COMPONENTS.OBSTACLE];
        }).map(function (obstacle) {
            var nodeComponent = obstacle.components[COMPONENTS.NODE].domNode;
            var obstacleComponent = obstacle.components[COMPONENTS.OBSTACLE];

            nodeComponent.classList.add('obstacle-asset-full-' + obstacleComponent.type);
        });
    },
    tick: function tick(entities) {
        var _this5 = this;

        var obstacles = entities.filter(function (entity) {
            return entity.components[COMPONENTS.OBSTACLE];
        });

        obstacles.map(function (entity) {
            var obstacleComponent = entity.components[COMPONENTS.OBSTACLE];
            var nodeComponent = entity.components[COMPONENTS.NODE].domNode;

            if (obstacleComponent.hit) {
                nodeComponent.classList.remove('obstacle-asset-full');
                nodeComponent.classList.add('obstacle-asset-destroy');

                obstacleComponent.lives--;
                obstacleComponent.hit = false;

                var siblingObstacles = obstacles.filter(function (obstacle) {
                    return obstacle.components[COMPONENTS.OBSTACLE].group === obstacleComponent.group;
                });

                siblingObstacles.map(function (siblingObstacle) {
                    for (var i = -1; i < 2; i++) {
                        for (var j = -1; j < 2; j++) {
                            if (i === j || i === -1 && j === 1 || i === 1 && j === -1) {
                                continue;
                            }
                            _this5.breakSiblingObstacle({
                                x: i,
                                y: j
                            }, siblingObstacle, entity);
                        }
                    }
                });
            }
        });
    },
    breakSiblingObstacle: function breakSiblingObstacle(coords, siblingObstacle, hitObstacle) {
        var xFound = void 0,
            yFound = void 0;
        var siblingObstaclePosition = siblingObstacle.components[COMPONENTS.POSITION];
        var hitObstaclePosition = hitObstacle.components[COMPONENTS.POSITION];

        xFound = siblingObstaclePosition.x === hitObstaclePosition.x + hitObstaclePosition.width * coords.x;
        yFound = siblingObstaclePosition.y === hitObstaclePosition.y + hitObstaclePosition.height * coords.y;

        if (xFound && yFound && siblingObstacle.components[COMPONENTS.OBSTACLE].lives > 0) {
            siblingObstacle.components[COMPONENTS.NODE].domNode.classList.add('obstacle-asset-destroy');
            siblingObstacle.components[COMPONENTS.OBSTACLE].lives--;
            return true;
        }
    }
};

var ExplodeSystem = {
    init: function init() {},
    tick: function tick(entities) {
        entities.filter(function (entity) {
            return entity.components[COMPONENTS.EXPLODE];
        }).map(function (entity) {

            var explodeComponent = entity.components[COMPONENTS.EXPLODE];

            if (explodeComponent.explode) {
                explodeComponent.explode = false;
                explodeComponent.explodeTimerStarted = true;
                entity.components[COMPONENTS.NODE].domNode.classList.add('explode');
                entity.components[COMPONENTS.PHYSICS].vx = 0;
            }

            if (explodeComponent.explodeTimer > explodeComponent.explodeTime && explodeComponent.explodeTimerStarted) {

                // player explode
                if (entity.components[COMPONENTS.COLLISION].collisionId === COLLISION_MASKS.PLAYER) {
                    entity.components[COMPONENTS.PLAYER].lives--;
                    entity.components[COMPONENTS.POSITION].x = 400;
                    entity.components[COMPONENTS.NODE].domNode.classList.remove('explode');
                }

                // enemy explode
                if (entity.components[COMPONENTS.COLLISION].collisionId === COLLISION_MASKS.ENEMY) {
                    if (entity.components[COMPONENTS.ENEMY]) {
                        entity.components[COMPONENTS.ENEMY].live = false;
                    } else {
                        entity.components[COMPONENTS.BOSS].bossSpawned = false;
                    }
                    entity.components[COMPONENTS.POSITION].visible = false;
                    entity.components[COMPONENTS.POSITION].x = 800;
                }

                explodeComponent.explodeTimerStarted = false;
                explodeComponent.explodeTimer = 0;
            }

            if (explodeComponent.explodeTimerStarted) {
                explodeComponent.explodeTimer++;
            }
        });
    }
};

var BossSpawnSystem = {
    init: function init() {},
    tick: function tick(entities) {
        if (!entities.find(function (entity) {
            return entity.components[COMPONENTS.POSITION] && entity.components[COMPONENTS.POSITION].y < 200 && entity.components[COMPONENTS.POSITION].visible && entity.components[COMPONENTS.ENEMY];
        })) {

            var boss = entities.find(function (entity) {
                return entity.components[COMPONENTS.BOSS];
            });
            var bossComponent = boss.components[COMPONENTS.BOSS];
            var numberOfVisibleEnemies = entities.filter(function (entity) {
                return entity.components[COMPONENTS.ENEMY] && entity.components[COMPONENTS.POSITION].visible;
            }).length;

            if (!boss.components[COMPONENTS.POSITION].visible) {
                bossComponent.bossSpawnCooldown--;
            }

            if (!bossComponent.bossSpawned && bossComponent.bossSpawnTimes < bossComponent.bossMaxSpawnTimes && bossComponent.bossSpawnCooldown < 0 && numberOfVisibleEnemies > bossComponent.bossMinNumberOfEnemiesSpawn && Math.random() * 100 + 1 > 99.99999999999999999999) {

                boss.components[COMPONENTS.NODE].domNode.classList.contains('explode') && boss.components[COMPONENTS.NODE].domNode.classList.remove('explode');
                boss.components[COMPONENTS.POSITION].visible = true;
                boss.components[COMPONENTS.POSITION].x = 300;
                boss.components[COMPONENTS.PHYSICS].vx = 4 * SPEED_FACTOR;
                bossComponent.bossSpawned = true;
                bossComponent.bossSpawnTimes++;
                bossComponent.bossTimer++;
                bossComponent.bossSpawnCooldown = 500;
            }

            if (bossComponent.bossTimer && bossComponent.bossTimer > bossComponent.bossTime) {
                bossComponent.bossTimer = 0;
                bossComponent.bossSpawned = false;
                boss.components[COMPONENTS.POSITION].visible = false;
            }

            if (bossComponent.bossTimer) {
                bossComponent.bossTimer++;
            }
        }
    }
};

// 2.4 Scenes

new kt.Engine.Scene({
    name: 'GameScene',
    init: function init(payload) {
        this.currentLevel = payload.level;
        this.playerLives = payload.lives;
        this.score = payload.score;

        this.GameECS = new kt.Engine.EntityComponentSystem();

        this.entities = [new kt.Engine.Entity('PLAYER_ENTITY').addComponent(new PositionComponent(400, 720, 44, 30, true)).addComponent(new NodeComponent()).addComponent(new PlayerComponent(this.playerLives)).addComponent(new PhysicsComponent()).addComponent(new ApperanceComponent('player-asset')).addComponent(new CollisionComponent(COLLISION_MASKS.PLAYER, 3)).addComponent(new ExplodeComponent()), new kt.Engine.Entity('PLAYER_BULLET').addComponent(new PositionComponent(0, 720, 2, 15)).addComponent(new NodeComponent()).addComponent(new BulletComponent(true)).addComponent(new PhysicsComponent(0, -10)).addComponent(new ApperanceComponent('bullet-asset')).addComponent(new CollisionComponent(COLLISION_MASKS.BULLET, 9)), new kt.Engine.Entity('WORLD').addComponent(new PositionComponent(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, false)).addComponent(new CollisionComponent(COLLISION_MASKS.WORLD))];

        for (var i = 1; i <= 9; i++) {
            for (var j = 1; j <= 5; j++) {
                var type = j === 1 ? 2 : j > 1 && j < 4 ? 1 : 0;

                this.entities.push(new kt.Engine.Entity('ENEMY_' + i + '_ENTITY').addComponent(new PositionComponent(80 * i + 100, 40 * j + 100, 40, 30, true)).addComponent(new NodeComponent()).addComponent(new EnemyComponent(20, type)).addComponent(new PhysicsComponent(1, 0)).addComponent(new ApperanceComponent('enemy-asset', 2)).addComponent(new ExplodeComponent()).addComponent(new CollisionComponent(COLLISION_MASKS.ENEMY, 3)));
            }
        }

        for (var _i = 0; _i < 3; _i++) {
            this.entities.push(new kt.Engine.Entity('ENEMY_BULLET_' + _i + '_ENTITY').addComponent(new PositionComponent(-100, -100, 3, 15)).addComponent(new NodeComponent()).addComponent(new BulletComponent()).addComponent(new ApperanceComponent('enemy-bullet-asset')).addComponent(new PhysicsComponent(0, 5)).addComponent(new CollisionComponent(COLLISION_MASKS.BULLET, 21)));
        };

        for (var k = 0; k < 4; k++) {
            for (var _i2 = 0; _i2 < OBSTACLE_ROWS; _i2++) {
                for (var _j = 0; _j < OBSTACLE_COLS; _j++) {
                    if (!obstacleMap[_j + _i2 * OBSTACLE_COLS]) {
                        continue;
                    }

                    this.entities.push(new kt.Engine.Entity('OBSTACLE_' + (_j + _i2 * OBSTACLE_COLS + k * OBSTACLE_ROWS * OBSTACLE_COLS)).addComponent(new PositionComponent(75 + OBSTACLE_WIDTH * _j + k * 250, 600 + OBSTACLE_WIDTH * _i2, OBSTACLE_WIDTH, OBSTACLE_WIDTH, true)).addComponent(new NodeComponent()).addComponent(new CollisionComponent(COLLISION_MASKS.OBSTACLE, 10)).addComponent(new ObstacleComponent('obstacle-1', 0)));
                }
            }
        }

        this.entities.push(new kt.Engine.Entity('BOSS').addComponent(new PositionComponent(0, 150, 80, 35, false)).addComponent(new NodeComponent()).addComponent(new BossComponent()).addComponent(new PhysicsComponent(3, 0)).addComponent(new ApperanceComponent('boss-asset')).addComponent(new ExplodeComponent()).addComponent(new CollisionComponent(COLLISION_MASKS.ENEMY, 3)));

        this.entities.push(new kt.Engine.Entity('SCORE').addComponent(new LevelComponent(this.score)));

        this.GameECS.addEntities(this.entities);
        this.GameECS.addSystems([RenderSystem, ControllSystem, PhysicsSystem, EnemySystem, CollisionSystem, ObstacleSystem, AnimationSystem, ExplodeSystem, BossSpawnSystem]);

        this.ui = document.createElement('div');
        this.ui.classList.add('game-ui');
        this.ui.innerHTML = '\n<div class="game-ui">\n<div class="game-ui__menu game-ui-__menu--top">\n<div class="game-ui__group">\n<div class="game-ui__text">SCORE</div>\n<div class="game-ui__value" id="score"></div>\n</div>\n<div class="game-ui__group">\n<div class="game-ui__text">HI-SCORE</div>\n<div class="game-ui__value" id="hi-score"></div>\n</div>\n<div class="game-ui__group">\n<div class="game-ui__text">LEVEL</div>\n<div class="game-ui__value" id="level"></div>\n</div>\n<div class="game-ui__group">\n<div class="game-ui__text">LIVES</div>\n<div class="game-ui__value" id="lives"></div>\n</div>\n</div>\n</div>\n';
        GAME_SCREEEN_ELEMENT.appendChild(this.ui);

        this.hiScore = localStorage.getItem('hiScore');
        this.hiScore = this.hiScore ? this.hiScore : 0;

        this.domElements = {
            level: document.querySelector('#level'),
            lives: document.querySelector('#lives'),
            score: document.querySelector('#score'),
            hiScore: document.querySelector('#hi-score')
        };

        this.domElements.hiScore.innerHTML = '' + this.hiScore;
        this.domElements.level.innerHTML = '' + this.currentLevel;
    },
    update: function update() {
        this.GameECS.update();
        kt.Engine.InputManager.update();

        var playerLives = this.entities.find(function (entity) {
            return entity.components[COMPONENTS.PLAYER];
        }).components[COMPONENTS.PLAYER].lives;
        var enemies = this.entities.filter(function (entity) {
            return entity.components[COMPONENTS.ENEMY] && entity.components[COMPONENTS.POSITION].visible;
        });
        var level = this.entities.find(function (entity) {
            return entity.components[COMPONENTS.LEVEL];
        }).components[COMPONENTS.LEVEL];

        this.domElements.score.innerHTML = '' + level.score;
        this.domElements.lives.innerHTML = '' + playerLives;

        if (!playerLives) {
            if (localStorage.getItem('hiScore') === null || localStorage.getItem('hiScore') < level.score) {
                localStorage.setItem('hiScore', level.score);
            }

            localStorage.setItem('lastScore', level.score);

            kt.Engine.SceneManager.changeScene('GameoverScene');

            this.currentLevel = 0;
            this.score = 0;

            this.hiScore = localStorage.getItem('hiScore');
            this.hiScore = this.hiScore ? this.hiScore : 0;
        }

        if (!enemies.length) {
            this.currentLevel++;
            this.playerLives = playerLives + 1;
            this.score = level.score;

            kt.Engine.SceneManager.changeScene('LoadScene', {
                level: this.currentLevel,
                lives: this.playerLives,
                score: this.score
            });
        }
    },
    destroy: function destroy() {
        var gameNode = document.querySelector('#game-screen');
        while (gameNode.firstChild) {
            gameNode.removeChild(gameNode.firstChild);
        }
    }
});

new kt.Engine.Scene({
    name: 'GameoverScene',
    init: function init() {
        var _this6 = this;

        this.ui = document.createElement('div');
        this.ui.classList.add('game-over');
        this.ui.innerHTML = '\n<div class="game-over__text-group">\n<h2 class="game-over__primary-header">GAME OVER</h2>\n<p class="game-over__score"></p>\n<h3 id="restart-text" class="game-over__secondary-header">Press SPACE to restart</h3>\n</div>\n';

        GAME_SCREEEN_ELEMENT.appendChild(this.ui);

        document.querySelector('.game-over__score').innerHTML = 'You scored: ' + localStorage.getItem('lastScore') + ' pts';

        this.elements = {
            restartText: document.querySelector('#restart-text')
        };

        this.interval = setInterval(function () {
            _this6.elements.restartText.classList.toggle('invisible');
        }, 700);
    },
    update: function update() {
        if (kt.Engine.InputManager.keys[32].isPressed()) {
            kt.Engine.SceneManager.changeScene('MenuScene');
        }

        kt.Engine.InputManager.update();
    },
    destroy: function destroy() {
        var gameNode = document.querySelector('#game-screen');
        while (gameNode.firstChild) {
            gameNode.removeChild(gameNode.firstChild);
        }
    }
});

new kt.Engine.Scene({
    name: 'MenuScene',
    init: function init() {
        var _this7 = this;

        this.ui = document.createElement('div');
        this.ui.classList.add('game-menu');
        this.ui.innerHTML = '\n<div class="game-menu">\n<div class="game-menu__header">\n<h2 class="game-menu__primary-heading">SPACECRAFT</h2>\n<h3 class="game-menu__secondary-heading">INVADERS</h3>\n</div>\n<div class="game-menu__enemies">\n<figure class="game-menu__group">\n<div id="type-0" class=" game-menu__group--enemy enemy-asset type-0 frame-0"></div>\n<figcaption class="game-menu__group game-menu__group--points">= 100 pts</figcaption>\n</figure>\n<figure class="game-menu__group">\n<div id="type-1" class="game-menu__group game-menu__group--enemy enemy-asset type-1 frame-0"></div>\n<figcaption class="game-menu__group game-menu__group--points">= 200 pts</figcaption>\n</figure>\n<figure class="game-menu__group">\n<div id="type-2" class="game-menu__group game-menu__group--enemy enemy-asset type-2 frame-0"></div>\n<figcaption class="game-menu__group game-menu__group--points"> = 300 pts </figcaption>\n</figure>\n<figure class="game-menu__group">\n<div class="game-menu__group game-menu__group--enemy boss-asset"></div>\n<figcaption class="game-menu__group game-menu__group--points"> = 600 pts </figcaption>\n</figure>\n</div>\n<div id="start-text" class="game-menu__start">\nPRESS &lt;SPACE&gt; TO START\n</div>\n\n</div>\n';

        GAME_SCREEEN_ELEMENT.appendChild(this.ui);

        this.elements = {
            type0: document.querySelector('#type-0'),
            type1: document.querySelector('#type-1'),
            type2: document.querySelector('#type-2'),
            startText: document.querySelector('#start-text')
        };

        this.interval = setInterval(function () {
            _this7.elements.type0.classList.toggle('frame-1');
            _this7.elements.type1.classList.toggle('frame-1');
            _this7.elements.type2.classList.toggle('frame-1');
            _this7.elements.startText.classList.toggle('invisible');
        }, 700);
    },
    update: function update() {
        if (kt.Engine.InputManager.keys[32].isPressed()) {
            kt.Engine.SceneManager.changeScene('LoadScene', {
                lives: 3,
                score: 0,
                level: 1
            });
        }

        kt.Engine.InputManager.update();
    },
    destroy: function destroy() {
        var gameNode = document.querySelector('#game-screen');
        while (gameNode.firstChild) {
            gameNode.removeChild(gameNode.firstChild);
        }
        clearInterval(this.interval);
    }
});

new kt.Engine.Scene({
    name: 'LoadScene',
    init: function init(payload) {
        this.ui = document.createElement('div');
        this.ui.innerHTML = '\n<div class="load-level">\n<div class="load-level__heading-primary">LEVEL ' + payload.level + '</div>\n<div class="load-level__heading-secondary">GET READY!</div>\n</div>\n';

        setTimeout(function () {
            kt.Engine.SceneManager.changeScene('GameScene', payload);
        }, 700);

        GAME_SCREEEN_ELEMENT.appendChild(this.ui);
    },
    update: function update() {},
    destroy: function destroy() {
        var gameNode = document.querySelector('#game-screen');
        while (gameNode.firstChild) {
            gameNode.removeChild(gameNode.firstChild);
        }
    }
});

kt.Engine.SceneManager.pushScene('MenuScene', {
    level: 1,
    lives: 3,
    score: 0
});
kt.Engine.init();
