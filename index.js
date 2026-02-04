const express = require('express');
const login = require('fca-unofficial');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;
const sessions = new Map();
let wss;

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Universal Message Sender</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.container{max-width:600px;width:100%;background:rgba(255,255,255,0.98);border-radius:20px;padding:30px;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:slideIn 0.5s ease}
@keyframes slideIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
h1{text-align:center;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:28px;font-weight:700;margin-bottom:8px}
.subtitle{text-align:center;color:#6b7280;font-size:13px;margin-bottom:20px}
.status{padding:15px;border-radius:12px;text-align:center;margin-bottom:20px;font-weight:600;color:white;transition:all 0.3s}
.status.ready{background:linear-gradient(135deg,#3b82f6,#2563eb)}
.status.running{background:linear-gradient(135deg,#10b981,#059669);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 20px rgba(16,185,129,0.4)}50%{box-shadow:0 0 30px rgba(16,185,129,0.6)}}
.grid{display:grid;gap:15px}
.field label{display:block;color:#374151;font-weight:600;margin-bottom:8px;font-size:14px}
.field input,.field textarea{width:100%;padding:12px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;transition:all 0.3s;font-family:inherit}
.field input:focus,.field textarea:focus{outline:none;border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,0.1)}
textarea{min-height:80px;resize:vertical;font-family:monospace}
.btn-group{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}
button{padding:14px;border:none;border-radius:10px;font-weight:600;font-size:15px;cursor:pointer;transition:all 0.3s;position:relative;overflow:hidden}
button::before{content:'';position:absolute;top:50%;left:50%;width:0;height:0;border-radius:50%;background:rgba(255,255,255,0.3);transform:translate(-50%,-50%);transition:width 0.6s,height 0.6s}
button:hover::before{width:300px;height:300px}
.btn-start{background:linear-gradient(135deg,#10b981,#059669);color:white;box-shadow:0 4px 15px rgba(16,185,129,0.3)}
.btn-start:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(16,185,129,0.4)}
.btn-stop{background:linear-gradient(135deg,#ef4444,#dc2626);color:white;box-shadow:0 4px 15px rgba(239,68,68,0.3)}
.btn-stop:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(239,68,68,0.4)}
button:disabled{background:#d1d5db;cursor:not-allowed;transform:none;box-shadow:none}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:15px 0}
.stat{background:linear-gradient(135deg,#f9fafb,#fff);padding:12px;border-radius:10px;text-align:center;border:2px solid #e5e7eb;transition:all 0.3s}
.stat:hover{transform:translateY(-3px);border-color:#667eea;box-shadow:0 4px 12px rgba(102,126,234,0.2)}
.stat-label{font-size:11px;color:#6b7280;text-transform:uppercase;margin-bottom:4px;font-weight:600}
.stat-value{font-size:20px;font-weight:700;background:linear-gradient(135deg,#667eea,#764ba2);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.log{background:#1f2937;color:#10b981;padding:15px;border-radius:10px;height:180px;overflow-y:auto;font-family:monospace;font-size:12px;line-height:1.6;margin-top:15px}
.log::-webkit-scrollbar{width:6px}
.log::-webkit-scrollbar-track{background:#374151;border-radius:3px}
.log::-webkit-scrollbar-thumb{background:#667eea;border-radius:3px}
.info{background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-left:4px solid #10b981;padding:12px;border-radius:8px;margin-bottom:15px;font-size:13px;line-height:1.5}
small{color:#6b7280;font-size:12px;margin-top:5px;display:block}
.badge{background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;margin-left:8px}
</style>
</head>
<body>
<div class="container">
<h1>🌐 Universal Sender <span class="badge">ALL IDs</span></h1>
<p class="subtitle">Works with User ID • Thread ID • Page ID • Group ID</p>
<div class="status ready" id="status">✅ Ready to Send</div>

<div class="info">
<strong>✅ Works with ANY ID type:</strong><br>
User ID, Thread ID, Page ID, Group ID - Just paste and go!
</div>

<div class="grid">
<div class="field">
<label>🍪 Cookie</label>
<textarea id="cookie" placeholder="sb=xxx;datr=yyy;c_user=zzz;xs=aaa"></textarea>
</div>

<div class="field">
<label>🎯 Target ID (Any Type)</label>
<input type="text" id="target" placeholder="Paste any ID here">
<small>User ID, Thread ID, Page ID, Group ID - ALL work!</small>
</div>

<div class="field">
<label>⏱️ Delay (seconds)</label>
<input type="number" id="delay" value="6" min="3" max="15">
</div>

<div class="field">
<label>📄 Messages File</label>
<input type="file" id="file" accept=".txt">
</div>
</div>

<div class="btn-group">
<button class="btn-start" id="start">🚀 START</button>
<button class="btn-stop" id="stop" disabled>⏹️ STOP</button>
</div>

<div class="stats">
<div class="stat">
<div class="stat-label">Sent</div>
<div class="stat-value" id="sent">0</div>
</div>
<div class="stat">
<div class="stat-label">Loop</div>
<div class="stat-value" id="loop">0</div>
</div>
<div class="stat">
<div class="stat-label">Rate</div>
<div class="stat-value" id="rate">100%</div>
</div>
</div>

<div class="log" id="log"></div>
</div>

<script>
const log=document.getElementById('log');
const status=document.getElementById('status');
const startBtn=document.getElementById('start');
const stopBtn=document.getElementById('stop');

function addLog(msg){
const d=document.createElement('div');
d.textContent='['+new Date().toLocaleTimeString()+'] '+msg;
log.appendChild(d);
log.scrollTop=log.scrollHeight;
}

const ws=new WebSocket((location.protocol==='https:'?'wss:':'ws:')+'//'+location.host);

ws.onopen=()=>{
addLog('✅ Connected');
};

ws.onmessage=(e)=>{
const data=JSON.parse(e.data);
if(data.type==='log'){
addLog(data.message);
}else if(data.type==='status'){
if(data.running){
status.textContent='🚀 Sending Messages...';
status.className='status running';
startBtn.disabled=true;
stopBtn.disabled=false;
}else{
status.textContent='✅ Ready to Send';
status.className='status ready';
startBtn.disabled=false;
stopBtn.disabled=true;
}
}else if(data.type==='stats'){
if(data.sent!==undefined)document.getElementById('sent').textContent=data.sent;
if(data.loop!==undefined)document.getElementById('loop').textContent=data.loop;
if(data.rate!==undefined)document.getElementById('rate').textContent=data.rate+'%';
}
};

startBtn.onclick=()=>{
const cookie=document.getElementById('cookie').value.trim();
const target=document.getElementById('target').value.trim();
const delay=parseInt(document.getElementById('delay').value)||6;
const file=document.getElementById('file').files[0];

if(!cookie){alert('⚠️ Paste cookie!');return;}
if(!target){alert('⚠️ Enter target ID!');return;}
if(!file){alert('⚠️ Upload messages file!');return;}

const reader=new FileReader();
reader.onload=(e)=>{
ws.send(JSON.stringify({
type:'start',
cookie:cookie,
target:target,
delay:delay,
messages:e.target.result
}));
};
reader.readAsText(file);
};

stopBtn.onclick=()=>{
ws.send(JSON.stringify({type:'stop'}));
};

addLog('✅ System ready - Works with ALL ID types');
</script>
</body>
</html>`;

function cookieToAppState(cookieString) {
  const cookies = [];
  const parts = cookieString.split(';');
  
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    
    const [key, value] = part.split('=');
    if (key && value) {
      cookies.push({
        key: key.trim(),
        value: decodeURIComponent(value.trim()),
        domain: ".facebook.com",
        path: "/",
        hostOnly: false,
        creation: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
      });
    }
  }
  
  return cookies;
}

function start(ws, cookieStr, target, delay, messagesText) {
  const sid = Date.now().toString();
  
  ws.send(JSON.stringify({type:'log',message:'🔄 Converting cookie...'}));
  
  const appState = cookieToAppState(cookieStr);
  
  ws.send(JSON.stringify({type:'log',message:'🔄 Logging in...'}));
  ws.send(JSON.stringify({type:'status',running:true}));
  
  login({appState:appState}, (err, api) => {
    if (err) {
      ws.send(JSON.stringify({type:'log',message:'❌ Login failed: ' + (err.error || err.message || err)}));
      ws.send(JSON.stringify({type:'status',running:false}));
      return;
    }
    
    api.setOptions({listenEvents:false,selfListen:false,logLevel:"silent"});
    
    ws.send(JSON.stringify({type:'log',message:'✅ Logged in!'}));
    ws.send(JSON.stringify({type:'log',message:'🎯 Target: '+target}));
    
    const msgs = messagesText.split('\n').filter(l=>l.trim());
    
    if (!msgs.length) {
      ws.send(JSON.stringify({type:'log',message:'❌ No messages'}));
      ws.send(JSON.stringify({type:'status',running:false}));
      return;
    }
    
    const session = {
      api:api,
      target:target,
      msgs:msgs,
      idx:0,
      sent:0,
      failed:0,
      consecutiveFails:0,
      loop:0,
      delay:delay*1000,
      running:true,
      ws:ws
    };
    
    sessions.set(sid, session);
    
    ws.send(JSON.stringify({type:'log',message:'💬 Loaded '+msgs.length+' messages'}));
    ws.send(JSON.stringify({type:'log',message:'🚀 Starting...'}));
    
    setTimeout(() => send(sid), 2000);
  });
}

function send(sid) {
  const s = sessions.get(sid);
  if (!s || !s.running) return;
  
  const msg = s.msgs[s.idx];
  
  // Try sending with multiple methods
  s.api.sendMessage(msg, s.target, (err, info) => {
    if (err) {
      s.failed++;
      s.consecutiveFails++;
      
      let errMsg = 'Unknown';
      if (err.error) errMsg = String(err.error);
      else if (err.message) errMsg = String(err.message);
      else errMsg = String(err);
      
      // Check if we should continue or stop
      if (s.consecutiveFails >= 5 && s.sent === 0) {
        s.ws.send(JSON.stringify({
          type:'log',
          message:'❌ Too many failures. ID might be invalid or blocked.'
        }));
        stop(sid);
        return;
      }
      
      s.ws.send(JSON.stringify({
        type:'log',
        message:'⚠️ Failed ('+s.consecutiveFails+'/5): '+errMsg.substring(0,50)
      }));
      
    } else {
      s.sent++;
      s.consecutiveFails = 0; // Reset on success
      const preview = msg.length>30?msg.substring(0,30)+'...':msg;
      s.ws.send(JSON.stringify({type:'log',message:'✅ #'+s.sent+': '+preview}));
    }
    
    s.idx++;
    if (s.idx >= s.msgs.length) {
      s.idx = 0;
      s.loop++;
      s.ws.send(JSON.stringify({type:'log',message:'🔄 Loop '+s.loop+' done'}));
    }
    
    const rate = s.sent>0?Math.round((s.sent/(s.sent+s.failed))*100):0;
    
    s.ws.send(JSON.stringify({
      type:'stats',
      sent:s.sent,
      loop:s.loop,
      rate:rate
    }));
    
    if (s.running) {
      setTimeout(() => send(sid), s.delay);
    }
  });
}

function stop(sid) {
  const s = sessions.get(sid);
  if (!s) return;
  
  s.running = false;
  if (s.api) {
    try { s.api.logout(); } catch(e) {}
  }
  sessions.delete(sid);
  
  if (s.ws) {
    s.ws.send(JSON.stringify({type:'status',running:false}));
    s.ws.send(JSON.stringify({type:'log',message:'🛑 Stopped - Total sent: '+s.sent}));
  }
}

app.get('/', (req, res) => res.send(html));

const server = app.listen(PORT, () => {
  console.log('Universal Sender running on port ' + PORT);
});

wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({type:'status',running:false}));
  
  let currentSid = null;
  
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      
      if (data.type === 'start') {
        currentSid = Date.now().toString();
        start(ws, data.cookie, data.target, data.delay, data.messages);
      } else if (data.type === 'stop') {
        if (currentSid) {
          stop(currentSid);
          currentSid = null;
        }
      }
    } catch(e) {
      ws.send(JSON.stringify({type:'log',message:'Error: '+e.message}));
    }
  });
  
  ws.on('close', () => {
    if (currentSid) stop(currentSid);
  });
});

setInterval(() => {
  for (const [sid, s] of sessions.entries()) {
    if (s.ws.readyState !== WebSocket.OPEN) {
      stop(sid);
    }
  }
}, 30000);
