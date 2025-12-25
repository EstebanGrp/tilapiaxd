const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajustar tamaño del canvas
canvas.width = 800;
canvas.height = 600;

// Estado del juego
const gameState = {
    money: 100,
    fishes: [],
    foods: [],
    lastTime: 0
};

// Configuración de assets
const assets = {
    background: new Image(),
    spritesheet: new Image()
};

let assetsLoaded = 0;
const totalAssets = 2;

function onAssetLoad() {
    assetsLoaded++;
    if (assetsLoaded === totalAssets) {
        initGame();
    }
}

assets.background.src = 'aquarium1.png';
assets.background.onload = onAssetLoad;

assets.spritesheet.src = 'spritesheet.png';
assets.spritesheet.onload = onAssetLoad;

// Clases
class Fish {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 64; // Tamaño estimado, ajustable
        this.height = 64;
        this.vx = (Math.random() - 0.5) * 2; // Velocidad X
        this.vy = (Math.random() - 0.5) * 2; // Velocidad Y
        this.size = 1; // Factor de crecimiento
        this.hunger = 0; // 0 = lleno, 100 = hambriento
        this.maxHunger = 100;
        this.direction = 1; // 1 = derecha, -1 = izquierda
        
        // Animación
        this.frameX = 0;
        this.frameY = 0;
        this.maxFrame = 3; // Asumimos 4 frames de animación por ahora
        this.frameTimer = 0;
        this.frameInterval = 200; // ms por frame
    }

    update(deltaTime) {
        // Movimiento
        this.x += this.vx;
        this.y += this.vy;

        // Rebote en bordes
        if (this.x < 0 || this.x + this.width * this.size > canvas.width) {
            this.vx *= -1;
            this.direction *= -1;
        }
        if (this.y < 0 || this.y + this.height * this.size > canvas.height) {
            this.vy *= -1;
        }

        // Mantener dentro de los límites
        this.x = Math.max(0, Math.min(this.x, canvas.width - this.width * this.size));
        this.y = Math.max(0, Math.min(this.y, canvas.height - this.height * this.size));

        // Hambre
        this.hunger += deltaTime * 0.005; // Aumenta el hambre poco a poco
        if (this.hunger > this.maxHunger) this.hunger = this.maxHunger;

        // Buscar comida si tiene hambre
        if (this.hunger > 30) {
            this.findFood();
        }

        // Animación
        this.frameTimer += deltaTime;
        if (this.frameTimer > this.frameInterval) {
            this.frameX++;
            if (this.frameX > this.maxFrame) this.frameX = 0;
            this.frameTimer = 0;
        }
    }

    findFood() {
        let nearestFood = null;
        let minDist = Infinity;

        for (const food of gameState.foods) {
            const dx = food.x - (this.x + this.width/2);
            const dy = food.y - (this.y + this.height/2);
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < minDist) {
                minDist = dist;
                nearestFood = food;
            }
        }

        if (nearestFood) {
            // Moverse hacia la comida
            const dx = nearestFood.x - (this.x + this.width/2);
            const dy = nearestFood.y - (this.y + this.height/2);
            const angle = Math.atan2(dy, dx);
            
            this.vx = Math.cos(angle) * 2;
            this.vy = Math.sin(angle) * 2;
            
            // Orientación
            this.direction = this.vx > 0 ? 1 : -1;

            // Comer
            if (minDist < 30) {
                gameState.foods = gameState.foods.filter(f => f !== nearestFood);
                this.hunger = Math.max(0, this.hunger - 30);
                this.grow();
            }
        }
    }

    grow() {
        if (this.size < 3) { // Tamaño máximo
            this.size += 0.1;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + (this.width * this.size)/2, this.y + (this.height * this.size)/2);
        ctx.scale(this.direction * this.size, this.size); // Espejo si va a la izquierda
        
        // Dibujar frame del spritesheet
        // Asumiendo que el spritesheet es una tira horizontal de peces
        // Ajustaremos los valores de corte (sx, sy, sWidth, sHeight) según la imagen real
        // Por defecto usaremos el ancho total / 4 si no sabemos
        
        const spriteW = assets.spritesheet.width / 4; // Asumimos 4 columnas
        const spriteH = assets.spritesheet.height;    // 1 fila
        
        ctx.drawImage(
            assets.spritesheet,
            this.frameX * spriteW, 0, spriteW, spriteH, // Source
            -this.width/2, -this.height/2, this.width, this.height // Destination
        );

        ctx.restore();

        // Barra de hambre (debug/info)
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 10, this.width * this.size, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - 10, (this.width * this.size) * (1 - this.hunger/100), 5);
    }
}

class Food {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.vy = 1; // Cae lentamente
    }

    update() {
        this.y += this.vy;
        if (this.y > canvas.height) {
            // Eliminar si sale de la pantalla
            gameState.foods = gameState.foods.filter(f => f !== this);
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'brown';
        ctx.fill();
        ctx.closePath();
    }
}

// Funciones del juego
function initGame() {
    // Crear algunas tilapias iniciales
    addFish();
    addFish();

    // Event Listeners
    document.getElementById('feed-btn').addEventListener('click', feedFish);
    document.getElementById('buy-fish-btn').addEventListener('click', buyFish);
    
    // Click en canvas para alimentar
    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        spawnFood(x, y);
    });

    requestAnimationFrame(gameLoop);
}

function addFish() {
    const x = Math.random() * (canvas.width - 100);
    const y = Math.random() * (canvas.height - 100);
    gameState.fishes.push(new Fish(x, y));
    updateUI();
}

function buyFish() {
    if (gameState.money >= 20) {
        gameState.money -= 20;
        addFish();
        updateUI();
    }
}

function feedFish() {
    if (gameState.money >= 5) {
        gameState.money -= 5;
        // Tirar comida aleatoria
        for (let i = 0; i < 5; i++) {
            spawnFood(Math.random() * canvas.width, 0);
        }
        updateUI();
    }
}

function spawnFood(x, y) {
    gameState.foods.push(new Food(x, y));
}

function updateUI() {
    document.getElementById('fish-count').innerText = gameState.fishes.length;
    document.getElementById('money').innerText = gameState.money;
}

// Bucle principal
function gameLoop(timestamp) {
    const deltaTime = timestamp - gameState.lastTime;
    gameState.lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar fondo
    ctx.drawImage(assets.background, 0, 0, canvas.width, canvas.height);

    // Actualizar y dibujar comida
    gameState.foods.forEach(food => {
        food.update();
        food.draw(ctx);
    });

    // Actualizar y dibujar peces
    gameState.fishes.forEach(fish => {
        fish.update(deltaTime);
        fish.draw(ctx);
    });

    requestAnimationFrame(gameLoop);
}
