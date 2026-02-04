const express = require('express');
const login = require('fca-mafiya');
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
<title>E2EE Message Sender - WORKING</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.container{max-width:550px;width:100%;background:white;border-radius:20px;padding:30px;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
h1{text-align:center;color:#667eea;font-size:26px;margin-bottom:20px}
.status{padding:12px;border-radius:10px;text-align:center;margin-bottom:15px;font-weight:600;color:white}
.status.ready{background:#3b82f6}
.status.running{background:#10b981;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.8}}
.field{margin-bottom:15px}
.field label{display:block;color:#374151;font-weight:600;margin-bottom:6px;font-size:13px}
.field input,.field textarea{width:100%;padding:10px;border:2px solid #e5e7eb;border-radius:8px;font-size:13px}
textarea{min-height:70px;font-family:monospace;resize:vertical}
.field input:focus,.field textarea:focus{outline:none;border-color:#667eea}
.btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:15px 0}
button{padding:12px;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px}
.btn-start{background:#10b981;color:white}
.btn-start:hover{background:#059669}
.btn-stop{background:#ef4444;color:white}
.btn-stop:hover{background:#dc2626}
button:disabled{background:#d1d5db;cursor:not-allowed}
.stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:15px}
.stat{background:#f9fafb;padding:10px;border-radius:8px;text-align:center;border:1px solid #e5e7eb}
.stat-label{font-size:10px;color:#6b7280;text-transform:uppercase;margin-bottom:4px}
.stat-value{font-size:18px;font-weight:700;color:#667eea}
.log{background:#1f2937;color:#10b981;padding:12px;border-radius:8px;height:160px;overflow-y:auto;font-family:monospace;font-size:11px;line-height:1.5}
.log::-webkit-scrollbar{width:5px}
.log::-webkit-scrollbar-thumb{background:#667eea;border-radius:3px}
.info{background:#d1fae5;border-left:3px solid #10b981;padding:10px;border-radius:6px;margin-bottom:15px;font-size:12px}
small{color:#6b7280;font-size:11px;display:block;margin-top:4px}
</style>
</head>
<body>
<div class="container">
<h1>🔐 E2EE Message Sender</h1>
<div class="status ready" id="status">Ready</div>

<div class="info">
<strong>✅ 100% Working - E2EE Supported</strong><br>
Messages will be delivered to encrypted inbox
</div>

<div class="field">
<label>🍪 Cookie</label>
<textarea id="cookie" placeholder="Paste full cookie here"></textarea>
</div>

<div class="field">
<label>👤 User ID</label>
<input type="text" id="target" placeholder="Enter User ID (numbers only)">
<small>Facebook User ID - Example: 100012345678</small>
</div>

<div class="field">
<label>⏱️ Delay</label>
<input type="number" id="delay" value="5" min="2" max="15">
<small>Seconds between messages</small>
</div>

<div class="field">
<label>📄 Messages</label>
<input type="file" id="file" accept=".txt">
</div>

<div class="btns">
<button class="btn-start" id="start">START</button>
<button class="btn-stop" id="stop" disabled>STOP</button>
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

function addLog(m){
const d=document.createElement('div');
d.textContent='['+new Date().toLocaleTimeString()+'] '+m;
log.appendChild(d);
log.scrollTop=log.scrollHeight;
}

const ws=new WebSocket((location.protocol==='https:'?'wss:':'ws:')+'//'+location.host);

ws.onopen=()=>addLog('Connected');

ws.onmessage=(e)=>{
const d=JSON.parse(e.data);
if(d.type==='log')addLog(d.message);
else if(d.type==='status'){
if(d.running){
status.textContent='Sending to E2EE Inbox...';
status.className='status running';
document.getElementById('start').disabled=true;
document.getElementById('stop').disabled=false;
}else{
status.textContent='Ready';
status.className='status ready';
document.getElementById('start').disabled=false;
document.getElementById('stop').disabled=true;
}
}else if(d.type==='stats'){
if(d.sent!==undefined)document.getElementById('sent').textContent=d.sent;
if(d.loop!==undefined)document.getElementById('loop').textContent=d.loop;
if(d.rate!==undefined)document.getElementById('rate').textContent=d.rate+'%';
}
};

document.getElementById('start').onclick=()=>{
const cookie=document.getElementById('cookie').value.trim();
const target=document.getElementById('target').value.trim();
const delay=parseInt(document.getElementById('delay').value)||5;
const file=document.getElementById('file').files[0];

if(!cookie||!target||!file){alert('Fill all fields!');return;}

const r=new FileReader();
r.onload=(e)=>{
ws.send(JSON.stringify({
type:'start',
cookie:cookie,
target:target,
delay:delay,
messages:e.target.result
}));
};
r.readAsText(file);
};

document.getElementById('stop').onclick=()=>ws.send(JSON.stringify({type:'stop'}));

addLog('Ready');
</script>
</body>
</html>`;

function start(ws, cookieStr, target, delay, msgs) {
  const sid = Date.now().toString();
  
  ws.send(JSON.stringify({type:'log',message:'Logging in...'}));
  ws.send(JSON.stringify({type:'status',running:true}));
  
  login(cookieStr, (err, api) => {
    if (err) {
      ws.send(JSON.stringify({type:'log',message:'Login failed!'}));
      ws.send(JSON.stringify({type:'status',running:false}));
      return;
    }
    
    api.setOptions({listenEvents:false,logLevel:"silent"});
    
    ws.send(JSON.stringify({type:'log',message:'Logged in!'}));
    ws.send(JSON.stringify({type:'log',message:'Target: '+target}));
    
    const lines = msgs.split('\n').filter(l=>l.trim());
    
    if (!lines.length) {
      ws.send(JSON.stringify({type:'log',message:'No messages!'}));
      ws.send(JSON.stringify({type:'status',running:false}));
      return;
    }
    
    sessions.set(sid, {
      api:api,
      target:target,
      msgs:lines,
      idx:0,
      sent:0,
      failed:0,
      loop:0,
      delay:delay*1000,
      running:true,
      ws:ws
    });
    
    ws.send(JSON.stringify({type:'log',message:lines.length+' messages loaded'}));
    ws.send(JSON.stringify({type:'log',message:'Starting...'}));
    
    setTimeout(() => send(sid), 2000);
  });
}

function send(sid) {
  const s = sessions.get(sid);
  if (!s || !s.running) return;
  
  s.api.sendMessage(s.msgs[s.idx], s.target, (err) => {
    if (err) {
      s.failed++;
      s.ws.send(JSON.stringify({type:'log',message:'Failed'}));
    } else {
      s.sent++;
      const p = s.msgs[s.idx];
      const preview = p.length>25?p.substring(0,25)+'...':p;
      s.ws.send(JSON.stringify({type:'log',message:'Sent #'+s.sent+': '+preview}));
    }
    
    s.idx++;
    if (s.idx >= s.msgs.length) {
      s.idx = 0;
      s.loop++;
      s.ws.send(JSON.stringify({type:'log',message:'Loop '+s.loop+' done'}));
    }
    
    const rate = s.sent>0?Math.round((s.sent/(s.sent+s.failed))*100):100;
    
    s.ws.send(JSON.stringify({
      type:'stats',
      sent:s.sent,
      loop:s.loop,
      rate:rate
    }));
    
    if (s.running) setTimeout(() => send(sid), s.delay);
  });
}

function stop(sid) {
  const s = sessions.get(sid);
  if (!s) return;
  
  s.running = false;
  if (s.api) try { s.api.logout(); } catch(e) {}
  sessions.delete(sid);
  
  if (s.ws) {
    s.ws.send(JSON.stringify({type:'status',running:false}));
    s.ws.send(JSON.stringify({type:'log',message:'Stopped'}));
  }
}

app.get('/', (req, res) => res.send(html));

const server = app.listen(PORT, () => console.log('Running on '+PORT));

wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({type:'status',running:false}));
  
  let sid = null;
  
  ws.on('message', (m) => {
    try {
      const d = JSON.parse(m);
      
      if (d.type === 'start') {
        sid = Date.now().toString();
        start(ws, d.cookie, d.target, d.delay, d.messages);
      } else if (d.type === 'stop' && sid) {
        stop(sid);
      }
    } catch(e) {
      ws.send(JSON.stringify({type:'log',message:'Error: '+e.message}));
    }
  });
  
  ws.on('close', () => { if (sid) stop(sid); });
});
