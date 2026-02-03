const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const healthFill = document.getElementById('healthFill');
const dashFill = document.getElementById('dashFill');
const spikeFill = document.getElementById('spikeFill');
const scoreEl = document.getElementById('score');

const state = {
  running: false,
  time: 0,
  score: 0,
  spikeTimer: 60,
  dashCooldown: 0,
  abilityCooldowns: { smoke: 0, recon: 0 },
};

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 14,
  speed: 2.6,
  health: 100,
  dash: 100,
};

const projectiles = [];
const enemies = [];
const smokes = [];
const scans = [];

const keys = new Set();
let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function spawnEnemies() {
  enemies.length = 0;
  for (let i = 0; i < 6; i += 1) {
    enemies.push({
      x: 80 + Math.random() * (canvas.width - 160),
      y: 80 + Math.random() * (canvas.height - 160),
      radius: 16,
      health: 40,
      angle: Math.random() * Math.PI * 2,
    });
  }
}

function resetRound() {
  state.running = false;
  state.time = 0;
  state.spikeTimer = 60;
  state.dashCooldown = 0;
  state.abilityCooldowns = { smoke: 0, recon: 0 };
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.health = 100;
  player.dash = 100;
  projectiles.length = 0;
  smokes.length = 0;
  scans.length = 0;
  spawnEnemies();
  overlay.classList.remove('hidden');
  overlay.querySelector('h2').textContent = 'Round Start';
  overlay.querySelector('p').textContent = 'Eliminate the bots before the spike detonates.';
  startBtn.textContent = 'Start Round';
}

function startRound() {
  state.running = true;
  overlay.classList.add('hidden');
}

function shoot() {
  if (!state.running) return;
  const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  projectiles.push({
    x: player.x,
    y: player.y,
    vx: Math.cos(angle) * 6,
    vy: Math.sin(angle) * 6,
    life: 60,
  });
}

function deploySmoke() {
  if (!state.running || state.abilityCooldowns.smoke > 0) return;
  smokes.push({ x: mouse.x, y: mouse.y, radius: 60, life: 240 });
  state.abilityCooldowns.smoke = 400;
}

function deployRecon() {
  if (!state.running || state.abilityCooldowns.recon > 0) return;
  scans.push({ x: mouse.x, y: mouse.y, radius: 0, life: 120 });
  state.abilityCooldowns.recon = 500;
}

function dash() {
  if (!state.running || player.dash < 100 || state.dashCooldown > 0) return;
  const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  player.x += Math.cos(angle) * 80;
  player.y += Math.sin(angle) * 80;
  player.x = clamp(player.x, player.radius, canvas.width - player.radius);
  player.y = clamp(player.y, player.radius, canvas.height - player.radius);
  player.dash = 0;
  state.dashCooldown = 120;
}

function handleInput() {
  if (!state.running) return;
  let dx = 0;
  let dy = 0;
  if (keys.has('w')) dy -= 1;
  if (keys.has('s')) dy += 1;
  if (keys.has('a')) dx -= 1;
  if (keys.has('d')) dx += 1;
  const length = Math.hypot(dx, dy) || 1;
  player.x += (dx / length) * player.speed;
  player.y += (dy / length) * player.speed;
  player.x = clamp(player.x, player.radius, canvas.width - player.radius);
  player.y = clamp(player.y, player.radius, canvas.height - player.radius);
}

function updateProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const shot = projectiles[i];
    shot.x += shot.vx;
    shot.y += shot.vy;
    shot.life -= 1;
    if (shot.life <= 0) {
      projectiles.splice(i, 1);
      continue;
    }
    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - shot.x, enemy.y - shot.y);
      if (dist < enemy.radius) {
        enemy.health -= 20;
        shot.life = 0;
        if (enemy.health <= 0) {
          state.score += 150;
        }
        break;
      }
    }
  }
}

function updateEnemies() {
  for (const enemy of enemies) {
    if (enemy.health <= 0) continue;
    enemy.angle += (Math.random() - 0.5) * 0.2;
    enemy.x += Math.cos(enemy.angle) * 1.2;
    enemy.y += Math.sin(enemy.angle) * 1.2;
    enemy.x = clamp(enemy.x, enemy.radius, canvas.width - enemy.radius);
    enemy.y = clamp(enemy.y, enemy.radius, canvas.height - enemy.radius);

    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist < enemy.radius + player.radius + 4) {
      player.health -= 0.2;
    }
  }
}

function updateAbilities() {
  for (let i = smokes.length - 1; i >= 0; i -= 1) {
    smokes[i].life -= 1;
    if (smokes[i].life <= 0) smokes.splice(i, 1);
  }
  for (let i = scans.length - 1; i >= 0; i -= 1) {
    scans[i].life -= 1;
    scans[i].radius += 2.5;
    if (scans[i].life <= 0) scans.splice(i, 1);
  }
  state.abilityCooldowns.smoke = Math.max(0, state.abilityCooldowns.smoke - 1);
  state.abilityCooldowns.recon = Math.max(0, state.abilityCooldowns.recon - 1);
}

function updateTimers() {
  state.time += 1;
  if (state.running && state.time % 60 === 0) {
    state.spikeTimer = Math.max(0, state.spikeTimer - 1);
  }
  if (state.spikeTimer <= 0) {
    state.running = false;
    overlay.classList.remove('hidden');
    overlay.querySelector('h2').textContent = 'Spike Detonated';
    overlay.querySelector('p').textContent = 'Reset and try to clear the site faster.';
    startBtn.textContent = 'Restart Round';
  }
}

function updateUI() {
  healthFill.style.width = `${clamp(player.health, 0, 100)}%`;
  dashFill.style.width = `${player.dash}%`;
  spikeFill.style.width = `${(state.spikeTimer / 60) * 100}%`;
  scoreEl.textContent = state.score;
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(80, 100, 150, 0.2)';
  ctx.lineWidth = 1;
  for (let x = 40; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 40; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.fillStyle = '#24d17e';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  ctx.strokeStyle = '#eef1ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(player.x + Math.cos(angle) * 22, player.y + Math.sin(angle) * 22);
  ctx.stroke();
}

function drawEnemies() {
  for (const enemy of enemies) {
    if (enemy.health <= 0) continue;
    ctx.fillStyle = '#ff4655';
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(enemy.x - 18, enemy.y - enemy.radius - 10, 36, 4);
    ctx.fillStyle = '#ff9aa3';
    ctx.fillRect(enemy.x - 18, enemy.y - enemy.radius - 10, 36 * (enemy.health / 40), 4);
  }
}

function drawProjectiles() {
  ctx.fillStyle = '#8cc7ff';
  for (const shot of projectiles) {
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAbilities() {
  for (const smoke of smokes) {
    ctx.fillStyle = 'rgba(120, 140, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(smoke.x, smoke.y, smoke.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const scan of scans) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(scan.x, scan.y, scan.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawAbilities();
  drawProjectiles();
  drawEnemies();
  drawPlayer();
}

function tick() {
  if (state.running) {
    handleInput();
    updateProjectiles();
    updateEnemies();
    updateAbilities();
    updateTimers();

    if (player.health <= 0) {
      state.running = false;
      overlay.classList.remove('hidden');
      overlay.querySelector('h2').textContent = 'Agent Down';
      overlay.querySelector('p').textContent = 'Re-enter the arena and try again.';
      startBtn.textContent = 'Restart Round';
    }

    player.dash = clamp(player.dash + 0.5, 0, 100);
    if (state.dashCooldown > 0) state.dashCooldown -= 1;
  }

  updateUI();
  render();
  requestAnimationFrame(tick);
}

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse = {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
});

canvas.addEventListener('mousedown', () => {
  shoot();
});

window.addEventListener('keydown', (event) => {
  keys.add(event.key.toLowerCase());
  if (event.key === 'Shift') dash();
  if (event.key.toLowerCase() === 'q') deploySmoke();
  if (event.key.toLowerCase() === 'e') deployRecon();
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.key.toLowerCase());
});

startBtn.addEventListener('click', () => {
  resetRound();
  startRound();
});

resetRound();
requestAnimationFrame(tick);
