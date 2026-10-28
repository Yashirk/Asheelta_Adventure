(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const startBtn = document.getElementById('startBtn');
  const heartsEl = document.getElementById('hearts');
  const rosesEl = document.getElementById('roses');
  const scoreEl = document.getElementById('score');
  const worldNameEl = document.getElementById('worldName');
  const soundBtn = document.getElementById('soundBtn');
  const weaponNameEl = document.getElementById('weaponName');
  const levelNameEl = document.getElementById('levelName');
  const cheatForm = document.getElementById('cheatForm');
  const cheatInput = document.getElementById('cheatInput');

  const W = canvas.width, H = canvas.height, FLOOR = 456;
  const keys = {left:false,right:false,jump:false,attack:false,heavy:false,dash:false};
  let mode = 'title', lastTime = 0, elapsed = 0, score = 0, roses = 0, soundOn = false, audioCtx = null;
  let cameraX = 0, shake = 0, toast = '', toastTimer = 0;
  const weapons = [{name:'Bare Hands',damage:1,range:30,cooldown:.36,color:'#fff1b0'},{name:'Wooden Sword',damage:2,range:44,cooldown:.31,color:'#d9b07c'},{name:'Steel Blade',damage:3,range:54,cooldown:.27,color:'#c9edff'},{name:'Roseblade',damage:4,range:66,cooldown:.23,color:'#ff8eb4'}];
  let weaponIndex=0, unlockedWeapons=[true,false,false,false], secretChests=[], cheatFlags={};
  const stageNames=['Green Kingdom','Mushroom Woods','Shadow Pass','Dragon Valley'];
  const worldWidth = 3600;
  const player = {x:70,y:FLOOR-48,w:30,h:44,vx:0,vy:0,face:1,grounded:false,hp:3,invuln:0,attackTimer:0,attackCooldown:0};
  let platforms = [], enemies = [], roseItems = [], particles = [], checkpoints = [], boss = null, bossShots = [];

  function resetGame(){
    player.x=70; player.y=FLOOR-player.h; player.vx=0; player.vy=0; player.hp=3; player.face=1; player.invuln=0; player.attackTimer=0; player.attackCooldown=0; player.heavyTimer=0; player.dashTimer=0; player.dashCooldown=0;
    score=0; roses=0; cameraX=0; elapsed=0; shake=0; toast=''; toastTimer=0; weaponIndex=0; unlockedWeapons=[true,false,false,false]; cheatFlags={};
    platforms=[
      {x:0,y:FLOOR,w:720,h:100},{x:790,y:FLOOR,w:520,h:100},{x:1380,y:FLOOR,w:580,h:100},
      {x:2040,y:FLOOR,w:490,h:100},{x:2610,y:FLOOR,w:990,h:100},
      {x:260,y:370,w:110,h:18},{x:440,y:310,w:115,h:18},{x:610,y:365,w:95,h:18},
      {x:900,y:360,w:125,h:18},{x:1090,y:300,w:110,h:18},{x:1250,y:365,w:90,h:18},
      {x:1510,y:355,w:120,h:18},{x:1700,y:295,w:115,h:18},{x:1880,y:360,w:100,h:18},
      {x:2160,y:355,w:120,h:18},{x:2360,y:300,w:120,h:18},{x:2510,y:365,w:80,h:18},
      {x:2820,y:360,w:120,h:18},{x:3020,y:310,w:120,h:18},{x:3220,y:360,w:120,h:18}
    ];
    enemies=[
      makeEnemy(360, FLOOR-30, 'slime', 330, 520, 1.1),
      makeEnemy(970, FLOOR-30, 'slime', 850, 1190, 1.4),
      makeEnemy(1580, FLOOR-34, 'knight', 1450, 1900, 1.05),
      makeEnemy(2180, FLOOR-30, 'slime', 2100, 2470, 1.5),
      makeEnemy(620, FLOOR-34, 'knight', 560, 710, 1.15),
      makeEnemy(1180, FLOOR-30, 'slime', 1050, 1280, 1.8),
      makeEnemy(1850, FLOOR-34, 'knight', 1750, 1950, 1.35),
      makeEnemy(2460, FLOOR-34, 'knight', 2350, 2540, 1.5)
    ];
    roseItems=[{x:478,y:275,taken:false},{x:1128,y:265,taken:false},{x:2398,y:265,taken:false}];
    particles=[]; bossShots=[]; checkpoints=[{x:70,active:true},{x:920,active:false},{x:1820,active:false},{x:2720,active:false}];
    secretChests=[{x:665,y:FLOOR-28,opened:false,reward:'wood'},{x:1470,y:FLOOR-28,opened:false,reward:'steel'},{x:2470,y:FLOOR-28,opened:false,reward:'rose'}];
    boss={x:2830,y:FLOOR-72,w:66,h:72,hp:5,maxHp:5,vx:1.25,alive:true,hitFlash:0,attackClock:0};
    worldNameEl.textContent='Green Kingdom';
    updateHud();
  }
  function makeEnemy(x,y,type,min,max,speed){return {x,y,w:type==='knight'?34:32,h:type==='knight'?44:30,type,min,max,speed,dir:1,alive:true,hitFlash:0};}
  function updateHud(){
    weaponNameEl.textContent=weapons[weaponIndex].name;
    levelNameEl.textContent=`${Math.min(4,Math.floor(player.x/900)+1)} / 4`;
    heartsEl.textContent = Array.from({length:3},(_,i)=>i<player.hp?'♥':'♡').join(' ');
    rosesEl.textContent = `${roses} / 3`;
    scoreEl.textContent = String(score).padStart(4,'0');
  }
  function showOverlay(title,text,button='Play again ↻'){
    overlayTitle.textContent=title; overlayText.textContent=text; startBtn.textContent=button; overlay.classList.remove('hidden');
  }
  function hideOverlay(){overlay.classList.add('hidden');}
  function sound(freq=440,duration=.08,type='square'){
    if(!soundOn)return;
    try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)(); const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=.045;o.connect(g);g.connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.stop(audioCtx.currentTime+duration);}catch(e){}
  }
  function burst(x,y,color,count=8){
    for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*220,vy:-Math.random()*180-25,life:.45+Math.random()*.45,color,size:3+Math.random()*4});
  }
  function overlap(a,b){return a.x < b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;}
  function hurt(){
    if(player.invuln>0 || mode!=='playing' || cheatFlags.godmode)return;
    player.hp--;player.invuln=1.2;player.vy=-280;player.vx=-player.face*160;shake=10;burst(player.x+15,player.y+20,'#ff6f9f',10);sound(120,.18,'sawtooth');updateHud();
    if(player.hp<=0){mode='dead';showOverlay('Quest paused 💔','Nichel got knocked down, but heroes can try again. You’ve got this!','Try again ↻');}
  }
  function startGame(){resetGame();mode='playing';hideOverlay();lastTime=performance.now();requestAnimationFrame(loop);}

  function update(dt){
    elapsed+=dt;
    if(toastTimer>0)toastTimer-=dt;
    if(shake>0)shake=Math.max(0,shake-dt*24);
    if(player.invuln>0)player.invuln-=dt;
    if(player.attackCooldown>0)player.attackCooldown-=dt;
    if(player.attackTimer>0)player.attackTimer-=dt;
    if(player.heavyTimer>0)player.heavyTimer-=dt;
    if(player.dashTimer>0)player.dashTimer-=dt;
    if(player.dashCooldown>0)player.dashCooldown-=dt;
    const accel=1800, maxSpeed=260;
    if(player.dashTimer>0)player.vx=player.face*560;
    if(keys.left){player.vx-=accel*dt;player.face=-1;}
    if(keys.right){player.vx+=accel*dt;player.face=1;}
    if(!keys.left&&!keys.right)player.vx*=Math.pow(.0008,dt);
    player.vx=Math.max(-maxSpeed,Math.min(maxSpeed,player.vx));
    if(keys.jump&&player.grounded){player.vy=cheatFlags.bigjump?-790:-570;player.grounded=false;sound(330,.07);}
    keys.jump=false;
    if(keys.attack&&player.attackCooldown<=0){player.attackTimer=.22;player.attackCooldown=weapons[weaponIndex].cooldown;sound(230,.06,'triangle');}
    if(keys.heavy&&player.attackCooldown<=0){player.heavyTimer=.42;player.attackCooldown=.72;player.vx=player.face*90;sound(115,.16,'sawtooth');}
    if(keys.dash&&player.dashCooldown<=0){player.dashTimer=.16;player.dashCooldown=.9;player.invuln=Math.max(player.invuln,.22);burst(player.x+15,player.y+25,'#c9edff',5);sound(360,.07,'triangle');}
    keys.attack=false;keys.heavy=false;keys.dash=false;
    player.vy+=1500*dt;player.vy=Math.min(player.vy,850);
    const oldY=player.y;player.x+=player.vx*dt;player.y+=player.vy*dt;player.grounded=false;
    if(player.x<0){player.x=0;player.vx=0;} if(player.x>worldWidth-player.w)player.x=worldWidth-player.w;
    for(const p of platforms){
      if(player.vy>=0 && oldY+player.h<=p.y+5 && player.y+player.h>=p.y && player.x+player.w>p.x && player.x<p.x+p.w){player.y=p.y-player.h;player.vy=0;player.grounded=true;}
      else if(player.vy<0 && oldY>=p.y+p.h-2 && player.y<=p.y+p.h && player.x+player.w>p.x && player.x<p.x+p.w){player.y=p.y+p.h;player.vy=0;}
    }
    if(player.y>H+100){hurt();if(mode==='playing'){player.x=Math.max(70,player.x-120);player.y=FLOOR-player.h-50;player.vy=0;}}
    for(const cp of checkpoints){if(player.x>cp.x&&!cp.active){cp.active=true;const stage=Math.min(4,Math.floor(cp.x/900)+1);toast=stage>1?`LEVEL ${stage} UNLOCKED! ✦`:'Checkpoint reached! ✦';toastTimer=1.8;sound(600,.12,'sine');}}
    const stage=Math.min(3,Math.floor(player.x/900));
    worldNameEl.textContent=stageNames[stage];

    for(const e of enemies){
      if(!e.alive)continue;
      e.x+=e.dir*e.speed*60*dt;if(e.x<e.min||e.x+e.w>e.max)e.dir*=-1;
      if(e.hitFlash>0)e.hitFlash-=dt;
      const weap=weapons[weaponIndex];
      const attackBox={x:player.face===1?player.x+player.w:player.x-weap.range,y:player.y+4,w:weap.range,h:player.h-8};
      if((player.attackTimer>0||player.heavyTimer>0)&&overlap(attackBox,e)){e.hp=(e.hp===undefined?(e.type==='knight'?2:1):e.hp)-(player.heavyTimer>0?weap.damage+1:weap.damage);e.hitFlash=.13;player.attackTimer=0;player.heavyTimer=0;if(e.hp<=0){e.alive=false;score+=100;burst(e.x+e.w/2,e.y+e.h/2,'#9cf5c5',12);toast='Enemy defeated! +100';toastTimer=1.1;sound(540,.1,'triangle');}else{e.x+=player.face*16;toast='Hit! Keep pressure on them';toastTimer=.5;sound(300,.07,'triangle');}}
      else if(overlap(player,e)){if(player.vy>80&&oldY+player.h<=e.y+12){e.alive=false;player.vy=-330;score+=100;burst(e.x+15,e.y,'#9cf5c5',10);sound(520,.08);}else hurt();}
    }
    for(const r of roseItems){if(!r.taken&&overlap(player,{x:r.x-10,y:r.y-10,w:25,h:30})){r.taken=true;roses++;score+=250;burst(r.x,r.y,'#ff8eb4',14);toast='A rose for Asheelta! +250';toastTimer=1.5;sound(720,.16,'sine');updateHud();}}
    for(const chest of secretChests){if(!chest.opened&&overlap(player,{x:chest.x-8,y:chest.y-24,w:38,h:28})){chest.opened=true;score+=300;burst(chest.x+10,chest.y-10,'#ffd477',18);if(chest.reward==='wood')unlockWeapon(1);if(chest.reward==='steel')unlockWeapon(2);if(chest.reward==='rose')unlockWeapon(3);toast=`SECRET CHEST: ${weapons[weaponIndex].name}!`;toastTimer=2;sound(850,.2,'sine');updateHud();}}
    if(boss.alive){
      boss.x+=boss.vx*60*dt;if(boss.x<2790||boss.x>3160)boss.vx*=-1;
      boss.attackClock+=dt;if(boss.hitFlash>0)boss.hitFlash-=dt;
      if(boss.attackClock>1.7 && Math.abs(player.x-boss.x)<520){boss.attackClock=0;bossShots.push({x:boss.x+(boss.vx>0?0:boss.w),y:boss.y+28,vx:player.x<boss.x?-250:250,life:3});sound(190,.08,'sawtooth');}
      const weap=weapons[weaponIndex];
      const attackBox={x:player.face===1?player.x+player.w:player.x-weap.range,y:player.y+5,w:weap.range,h:player.h-10};
      if((player.attackTimer>0||player.heavyTimer>0)&&overlap(attackBox,boss)){boss.hp-=weap.damage+(player.heavyTimer>0?2:0);boss.hitFlash=.15;player.attackTimer=0;player.heavyTimer=0;score+=150;burst(boss.x+boss.w/2,boss.y+20,'#ffcc73',10);sound(160,.12,'sawtooth');toast='Dragon hit!';toastTimer=.7;if(boss.hp<=0){boss.alive=false;score+=500;toast='Dragon defeated! +500';toastTimer=2;burst(boss.x+30,boss.y+25,'#ffd477',35);sound(780,.3,'sine');}}
      else if(overlap(player,boss)){if(player.vy>100&&oldY+player.h<=boss.y+14){boss.hp--;player.vy=-390;boss.hitFlash=.18;score+=150;burst(boss.x+30,boss.y,'#ffd477',10);if(boss.hp<=0){boss.alive=false;score+=500;toast='Dragon defeated! +500';toastTimer=2;}}else hurt();}
    }
    for(const shot of bossShots){shot.x+=shot.vx*dt;shot.life-=dt;const box={x:shot.x-8,y:shot.y-8,w:16,h:16};if(overlap(player,box)){hurt();shot.life=0;burst(shot.x,shot.y,'#ff9c6b',7);}}bossShots=bossShots.filter(s=>s.life>0);
    if(player.x>3340&&boss.alive){toast='Defeat the dragon first!';toastTimer=.8;player.x=3335;}
    if(player.x>3470&& !boss.alive){mode='won';sound(880,.35,'sine');showOverlay('You made it, Nichel! ❤️','Every monster, every trap, every step led here. You have one final question for Asheelta…','See the ending ♡');}
    cameraX=Math.max(0,Math.min(worldWidth-W,player.x-W*.38));
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=450*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);
    updateHud();
  }

  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function drawBackground(){
    const stage=Math.min(3,Math.floor(player.x/900));
    const palettes=[['#6fc5f7','#c6e9ee','#f8d5d5'],['#7255a7','#d3a4e8','#f7c5dc'],['#29284f','#5c5a8a','#a19dc8'],['#f48b69','#ffd08c','#ffe5bb']][stage];
    const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,palettes[0]);grad.addColorStop(.65,palettes[1]);grad.addColorStop(1,palettes[2]);ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    // Pixel clouds
    for(let i=0;i<9;i++){let x=((i*177-cameraX*.18)%(W+160)+W+160)%(W+160)-80;let y=55+(i%3)*44;rect(x,y,54,14,'#f6fbff');rect(x+12,y-10,26,12,'#f6fbff');rect(x+38,y+4,23,10,'#f6fbff');}
    // distant hills
    for(let i=0;i<8;i++){let x=i*180-cameraX*.32;rect(x,330,130,120,i%2?'#89cfae':'#9bdcb5');rect(x+24,306,78,24,i%2?'#89cfae':'#9bdcb5');}
    // sunset glimmer
    rect(790,92,42,42,'#ffe8a8');rect(800,82,22,10,'#ffe8a8');
  }
  function drawPlatform(p){
    const x=p.x-cameraX;if(x+p.w<0||x>W)return;
    rect(x,p.y,p.w,p.h,'#6b493e');rect(x,p.y,p.w,10,'#7cdb91');rect(x,p.y+10,p.w,5,'#48a96d');
    for(let xx=x+8;xx<x+p.w;xx+=28){rect(xx,p.y+22,12,5,'#835447');rect(xx+9,p.y+48,10,5,'#563c49');}
    rect(x,p.y,p.w,2,'#b0f7a4');
  }
  function drawHero(){
    const x=player.x-cameraX,y=player.y;
    if(player.invuln>0&&Math.floor(elapsed*18)%2===0)return;
    // shadow
    rect(x-4,y+player.h-2,38,5,'#4c6380aa');
    // cape
    rect(x+5,y+17,20,22,'#d95d86');rect(x+2,y+20,6,14,'#d95d86');
    // legs
    rect(x+5,y+34,8,10,'#28375f');rect(x+18,y+34,8,10,'#28375f');rect(x+3,y+42,11,4,'#4a3156');rect(x+17,y+42,12,4,'#4a3156');
    // body
    rect(x+5,y+17,21,19,'#4d75d8');rect(x+7,y+20,17,8,'#77a9ff');
    // face and hair
    rect(x+6,y+3,20,16,'#f6bd91');rect(x+4,y+2,22,7,'#4a2d39');rect(x+3,y+6,6,8,'#4a2d39');rect(x+21,y+4,6,5,'#4a2d39');
    rect(x+(player.face===1?19:9),y+9,3,3,'#302747');
    rect(x+12,y+15,8,2,'#b85e70');
    // heart emblem
    rect(x+13,y+23,4,4,'#ff8eb4');rect(x+17,y+23,4,4,'#ff8eb4');rect(x+15,y+27,4,3,'#ff8eb4');
    if(player.attackTimer>0||player.heavyTimer>0){const w=weapons[weaponIndex];const range=player.heavyTimer>0?w.range+12:w.range;const ax=player.face===1?x+27:x+player.w-range;rect(ax,y+(player.heavyTimer>0?11:17),range,player.heavyTimer>0?9:5,w.color);rect(ax+range/2-3,y+8,6,player.heavyTimer>0?18:12,'#fff4d4');}
  }
  function drawEnemy(e){
    const x=e.x-cameraX,y=e.y;if(x<-70||x>W+70)return;
    if(e.type==='slime'){
      rect(x+5,y+8,23,19,e.hitFlash>0?'#fff':'#59c88b');rect(x+1,y+15,30,12,e.hitFlash>0?'#fff':'#59c88b');rect(x+8,y+4,16,7,'#7ee6a6');
      rect(x+9,y+14,4,5,'#20344e');rect(x+21,y+14,4,5,'#20344e');rect(x+9,y+14,2,2,'#fff');rect(x+21,y+14,2,2,'#fff');
    }else{
      rect(x+7,y+5,22,15,e.hitFlash>0?'#fff':'#8c88bd');rect(x+5,y+20,25,20,e.hitFlash>0?'#fff':'#595a93');rect(x+2,y+40,12,4,'#393457');rect(x+21,y+40,12,4,'#393457');rect(x+11,y+11,4,4,'#ffdc8a');rect(x+22,y+11,4,4,'#ffdc8a');
    }
  }
  function drawChest(chest){const x=chest.x-cameraX,y=chest.y;if(x<-40||x>W+40)return;if(chest.opened){rect(x,y-13,28,13,'#8a6c54');rect(x+2,y-11,24,9,'#c89c6b');return;}rect(x,y-18,28,18,'#9c5e45');rect(x,y-18,28,7,'#dca95e');rect(x+11,y-14,6,13,'#ffe39b');rect(x+3,y-4,22,4,'#613d50');}
  function unlockWeapon(index){if(index<0||index>=weapons.length)return;unlockedWeapons[index]=true;weaponIndex=Math.max(weaponIndex,index);toast=`WEAPON UNLOCKED: ${weapons[index].name}!`;toastTimer=2.3;updateHud();}
  function useCheat(code){const c=code.trim().toUpperCase();if(!c)return;const cheats={ROSEPOWER:()=>{player.hp=3;roses=3;score+=500;toast='ROSEPOWER: full hearts + roses';},SWORDUP:()=>{unlockWeapon(3);toast='SWORDUP: Roseblade unlocked';},GODMODE:()=>{cheatFlags.godmode=!cheatFlags.godmode;toast=`GODMODE ${cheatFlags.godmode?'ON':'OFF'}`;},BIGJUMP:()=>{cheatFlags.bigjump=!cheatFlags.bigjump;toast=`BIGJUMP ${cheatFlags.bigjump?'ON':'OFF'}`;},COINRAIN:()=>{score+=1000;burst(player.x+15,player.y,'#ffd477',30);toast='COINRAIN: +1000 score';}};if(cheats[c]){cheats[c]();toastTimer=2.2;sound(800,.15,'sine');updateHud();}else{toast='Nope! That code is still a mystery.';toastTimer=1.6;sound(130,.1,'square');}}
  function drawRose(r){const x=r.x-cameraX,y=r.y;if(x<-20||x>W+20)return;rect(x+7,y+10,4,15,'#50ba83');rect(x+3,y+16,6,4,'#50ba83');rect(x+5,y+3,7,7,'#ff8eb4');rect(x+11,y+3,7,7,'#ff8eb4');rect(x+8,y+8,7,7,'#ff8eb4');rect(x+8,y+5,4,4,'#ffe3a9');}
  function drawBoss(){
    if(!boss.alive)return;const x=boss.x-cameraX,y=boss.y;
    rect(x+12,y+18,43,46,boss.hitFlash>0?'#fff':'#9b4e67');rect(x+3,y+29,16,23,boss.hitFlash>0?'#fff':'#9b4e67');rect(x+48,y+29,16,23,boss.hitFlash>0?'#fff':'#9b4e67');
    rect(x+12,y+6,43,24,boss.hitFlash>0?'#fff':'#c46c73');rect(x+8,y,15,13,'#f6b85f');rect(x+44,y,15,13,'#f6b85f');
    rect(x+22,y+13,7,7,'#fff0b5');rect(x+40,y+13,7,7,'#fff0b5');rect(x+25,y+15,3,4,'#342440');rect(x+42,y+15,3,4,'#342440');
    rect(x+20,y+34,29,5,'#492e50');
    // boss health bar
    rect(x-4,y-18,76,9,'#33213e');rect(x-2,y-16,72*(boss.hp/boss.maxHp),5,'#ff779b');
    rect(x+15,y+63,13,9,'#59374b');rect(x+40,y+63,13,9,'#59374b');
  }
  function drawGate(){
    const x=3480-cameraX;rect(x,340,72,116,'#7c5b9e');rect(x+12,352,48,104,'#f8b8d4');rect(x+20,360,32,96,'#fff0dc');rect(x+24,370,24,14,'#ff8eb4');
    // Asheelta, pixel-art heroine
    const ax=3510-cameraX, ay=FLOOR-52;
    rect(ax+5,ay+8,22,27,'#7654ac');rect(ax+3,ay+5,26,13,'#f5c3e6');rect(ax+5,ay+15,22,20,'#f0bd91');
    rect(ax+3,ay+5,26,8,'#56326c');rect(ax,ay+10,7,18,'#56326c');rect(ax+24,ay+10,7,18,'#56326c');
    rect(ax+8,ay+20,3,3,'#35274b');rect(ax+21,ay+20,3,3,'#35274b');rect(ax+12,ay+27,7,2,'#bf657b');
    rect(ax+5,ay+35,9,14,'#c87ac0');rect(ax+17,ay+35,9,14,'#c87ac0');rect(ax+5,ay+47,10,5,'#57395e');rect(ax+17,ay+47,11,5,'#57395e');
    rect(ax+13,ay+9,5,5,'#ffe5a1');
  }
  function draw(){
    ctx.save();if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
    drawBackground();
    for(const p of platforms)drawPlatform(p);
    secretChests.forEach(drawChest);
    // scenery
    for(let i=0;i<18;i++){const x=i*215-cameraX*.98;if(x<-30||x>W+30)continue;rect(x,FLOOR-18,5,18,'#3e8c63');rect(x-6,FLOOR-27,17,13,'#5ab982');rect(x-2,FLOOR-32,9,8,'#73d49a');}
    for(const cp of checkpoints){const x=cp.x-cameraX;if(x>0&&x<W){rect(x,FLOOR-66,5,66,'#705b84');rect(x+5,FLOOR-65,24,17,cp.active?'#8ee6b1':'#9d8bc7');rect(x+8,FLOOR-61,16,9,'#fff2d9');}}
    roseItems.forEach(r=>{if(!r.taken)drawRose(r);});
    enemies.forEach(e=>{if(e.alive)drawEnemy(e);});
    drawBoss();for(const shot of bossShots){rect(shot.x-cameraX-7,shot.y-7,14,14,'#ff9c6b');rect(shot.x-cameraX-3,shot.y-3,6,6,'#fff1b0');}drawGate();drawHero();
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life);rect(p.x-cameraX,p.y,p.size,p.size,p.color);}ctx.globalAlpha=1;
    // world labels and controls hints
    rect(18,18,235,30,'#201b3dbb');ctx.fillStyle='#fff2d9';ctx.font="12px 'Press Start 2P', monospace";ctx.fillText('NICHEL QUEST',28,38);
    ctx.fillStyle='#fff2d9';ctx.font="10px 'Press Start 2P', monospace";ctx.fillText(`LEVEL ${Math.min(4,Math.floor(player.x/900)+1)}: ${stageNames[Math.min(3,Math.floor(player.x/900))].toUpperCase()}`,28,66);
    if(boss.alive&&player.x>2500){rect(650,18,290,30,'#201b3dbb');ctx.fillStyle='#ffd9e6';ctx.font="10px 'Press Start 2P', monospace";ctx.fillText('BOSS: HEARTBREAKER',663,37);}
    if(toastTimer>0){ctx.font="bold 18px Nunito, sans-serif";const width=ctx.measureText(toast).width+32;rect(W/2-width/2,70,width,36,'#201b3de8');ctx.fillStyle='#ffe8b0';ctx.textAlign='center';ctx.fillText(toast,W/2,94);ctx.textAlign='left';}
    ctx.restore();
  }
  function loop(now){
    if(mode!=='playing'){draw();return;}
    const dt=Math.min(.033,(now-lastTime)/1000||0);lastTime=now;
    update(dt);draw();
    if(mode==='playing')requestAnimationFrame(loop);else draw();
  }

  function keyDown(e){
    const k=e.key.toLowerCase();
    if(['arrowleft','arrowright','arrowup',' ','a','d','w','j'].includes(k))e.preventDefault();
    if(k==='arrowleft'||k==='a')keys.left=true;
    if(k==='arrowright'||k==='d')keys.right=true;
    if(k==='arrowup'||k==='w'||k===' ')keys.jump=true;
    if(k==='j'||k==='x')keys.attack=true;
    if(k==='k')keys.heavy=true;
    if(k==='shift')keys.dash=true;
    if(k==='enter'&&mode!=='playing'){if(mode==='won'){showEnding();}else startGame();}
  }
  function keyUp(e){const k=e.key.toLowerCase();if(k==='arrowleft'||k==='a')keys.left=false;if(k==='arrowright'||k==='d')keys.right=false;}
  window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);
  document.querySelectorAll('[data-control]').forEach(btn=>{
    const action=btn.dataset.control;
    const down=e=>{e.preventDefault();btn.classList.add('pressed');if(action==='left'||action==='right')keys[action]=true;else keys[action]=true;};
    const up=e=>{e.preventDefault();btn.classList.remove('pressed');if(action==='left'||action==='right')keys[action]=false;else keys[action]=false;};
    btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up);
  });
  function showEnding(){
    mode='ending';
    overlayTitle.textContent='Asheelta, I made it… ♡';
    overlayText.textContent='I crossed the Green Kingdom, braved the Cursed Forest, and faced the Heartbreaker Dragon. But the best part of this whole adventure is getting to ask you something: Asheelta, my love my cinnamon roll, will you go out with me? -Nichel ❤️';
    startBtn.textContent='Play the adventure again ↻';overlay.classList.remove('hidden');
  }
  startBtn.addEventListener('click',()=>{if(mode==='won'){showEnding();}else if(mode==='ending'){startGame();}else startGame();});
  soundBtn.addEventListener('click',()=>{soundOn=!soundOn;soundBtn.textContent=`♪ Sound: ${soundOn?'On':'Off'}`;if(soundOn)sound(600,.1,'sine');});
  cheatForm.addEventListener('submit',e=>{e.preventDefault();useCheat(cheatInput.value);cheatInput.value='';});
  resetGame();
  // Draw an inviting still screen until the player starts.
  draw();
})();
