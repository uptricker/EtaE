const express = require('express');
const wiegine = require('fca-mafiya');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const sessions = new Map();
let wss;

const htmlControlPanel = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2EE Message Sender</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        
        .main-container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            border-radius: 25px;
            padding: 40px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.3);
        }
        
        h1 {
            text-align: center;
            color: #667eea;
            font-size: 36px;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .subtitle {
            text-align: center;
            color: #888;
            margin-bottom: 40px;
            font-size: 14px;
        }
        
        .status-bar {
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            margin-bottom: 30px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
        }
        
        .status-bar.running {
            background: linear-gradient(135deg, #10b981, #059669);
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3); }
            50% { box-shadow: 0 8px 30px rgba(16, 185, 129, 0.6); }
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        label {
            display: block;
            color: #333;
            font-weight: 600;
            margin-bottom: 10px;
            font-size: 15px;
        }
        
        label span {
            color: #667eea;
            font-size: 18px;
            margin-right: 8px;
        }
        
        textarea, input[type="text"], input[type="number"] {
            width: 100%;
            padding: 15px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-size: 15px;
            font-family: 'Poppins', sans-serif;
            transition: all 0.3s;
        }
        
        textarea {
            min-height: 100px;
            resize: vertical;
            font-family: monospace;
        }
        
        textarea:focus, input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .file-upload {
            position: relative;
            display: block;
            width: 100%;
        }
        
        .file-upload input[type="file"] {
            width: 100%;
            padding: 15px;
            border: 2px dashed #667eea;
            border-radius: 12px;
            cursor: pointer;
            background: #f8f9ff;
        }
        
        .file-upload input[type="file"]:hover {
            background: #eef2ff;
            border-color: #5568d3;
        }
        
        .helper-text {
            color: #6b7280;
            font-size: 13px;
            margin-top: 8px;
            display: block;
        }
        
        .info-box {
            background: #dbeafe;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 30px;
        }
        
        button {
            padding: 18px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            font-family: 'Poppins', sans-serif;
        }
        
        .btn-start {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
        }
        
        .btn-start:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(16, 185, 129, 0.4);
        }
        
        .btn-stop {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            box-shadow: 0 8px 20px rgba(239, 68, 68, 0.3);
        }
        
        .btn-stop:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(239, 68, 68, 0.4);
        }
        
        button:disabled {
            background: #d1d5db;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 25px 0;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #f8f9fa, #ffffff);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 2px solid #e5e7eb;
        }
        
        .stat-label {
            color: #6b7280;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .stat-value {
            color: #667eea;
            font-size: 28px;
            font-weight: 700;
        }
        
        .log-container {
            margin-top: 25px;
        }
        
        .log-box {
            background: #1f2937;
            color: #10b981;
            padding: 20px;
            border-radius: 12px;
            height: 300px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.8;
        }
        
        .log-box::-webkit-scrollbar {
            width: 8px;
        }
        
        .log-box::-webkit-scrollbar-track {
            background: #374151;
            border-radius: 4px;
        }
        
        .log-box::-webkit-scrollbar-thumb {
            background: #667eea;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="main-container">
        <h1>ðŸ” E2EE Message Sender</h1>
        <p class="subtitle">Simple â€¢ Fast â€¢ Secure</p>
        
        <div class="status-bar" id="status">
            âœ… Connected - Ready to Send
        </div>
        
        <div class="info-box">
            <strong>ðŸ“Œ Quick Guide:</strong><br>
            1. Paste your cookie below<br>
            2. Enter User ID (numbers only)<br>
            3. Upload messages file<br>
            4. Click START!
        </div>
        
        <!-- COOKIE INPUT -->
        <div class="form-group">
            <label><span>ðŸª</span> Your Cookie (Paste Here)</label>
            <textarea id="cookie" placeholder="sb=xxx;datr=yyy;c_user=zzz;xs=aaa;fr=bbb"></textarea>
            <small class="helper-text">Copy full cookie from browser and paste here</small>
        </div>
        
        <!-- USER ID INPUT -->
        <div class="form-group">
            <label><span>ðŸ‘¤</span> Target User ID</label>
            <input type="text" id="target" placeholder="100012345678">
            <small class="helper-text">Enter numeric User ID only (not Thread ID)</small>
        </div>
        
        <!-- DELAY INPUT -->
        <div class="form-group">
            <label><span>â±ï¸</span> Delay (Seconds)</label>
            <input type="number" id="delay" value="6" min="3" max="15">
            <small class="helper-text">Time between each message (6-10 recommended)</small>
        </div>
        
        <!-- PREFIX INPUT -->
        <div class="form-group">
            <label><span>âœï¸</span> Message Prefix (Optional)</label>
            <input type="text" id="prefix" placeholder="Enter prefix (optional)">
            <small class="helper-text">Text to add before each message</small>
        </div>
        
        <!-- FILE UPLOAD -->
        <div class="form-group">
            <label><span>ðŸ“„</span> Messages File</label>
            <div class="file-upload">
                <input type="file" id="messages" accept=".txt">
            </div>
            <small class="helper-text">Upload your messages.txt file</small>
        </div>
        
        <!-- BUTTONS -->
        <div class="buttons">
            <button class="btn-start" id="start">ðŸš€ START SENDING</button>
            <button class="btn-stop" id="stop" disabled>â¹ï¸ STOP</button>
        </div>
        
        <!-- STATS -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Messages Sent</div>
                <div class="stat-value" id="stat-sent">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Loop Count</div>
                <div class="stat-value" id="stat-loop">0</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Success Rate</div>
                <div class="stat-value" id="stat-rate">100%</div>
            </div>
        </div>
        
        <!-- LOGS -->
        <div class="log-container">
            <label><span>ðŸ“</span> Activity Log</label>
            <div class="log-box" id="log"></div>
        </div>
    </div>

    <script>
        const log = document.getElementById('log');
        const status = document.getElementById('status');
        const startBtn = document.getElementById('start');
        const stopBtn = document.getElementById('stop');
        
        function addLog(msg) {
            const entry = document.createElement('div');
            entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${msg}\`;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(protocol + '//' + window.location.host);

        socket.onopen = () => {
            addLog('âœ… Connected to server');
        };
        
        socket.onmessage = (e) => {
            const data = JSON.parse(e.data);
            
            if (data.type === 'log') {
                addLog(data.message);
            } else if (data.type === 'status') {
                if (data.running) {
                    status.textContent = 'ðŸš€ Sending Messages...';
                    status.className = 'status-bar running';
                    startBtn.disabled = true;
                    stopBtn.disabled = false;
                } else {
                    status.textContent = 'âœ… Connected - Ready to Send';
                    status.className = 'status-bar';
                    startBtn.disabled = false;
                    stopBtn.disabled = true;
                }
            } else if (data.type === 'stats') {
                if (data.sent !== undefined) document.getElementById('stat-sent').textContent = data.sent;
                if (data.loop !== undefined) document.getElementById('stat-loop').textContent = data.loop;
                if (data.rate !== undefined) document.getElementById('stat-rate').textContent = data.rate + '%';
            }
        };

        startBtn.addEventListener('click', () => {
            const cookie = document.getElementById('cookie').value.trim();
            const target = document.getElementById('target').value.trim();
            const delay = parseInt(document.getElementById('delay').value) || 6;
            const prefix = document.getElementById('prefix').value.trim();
            const file = document.getElementById('messages').files[0];
            
            if (!cookie) {
                alert('âš ï¸ Please paste your cookie!');
                return;
            }
            
            if (!target) {
                alert('âš ï¸ Please enter User ID!');
                return;
            }
            
            if (!/^\d+$/.test(target)) {
                alert('âš ï¸ User ID should be numbers only!\\nExample: 100012345678');
                return;
            }
            
            if (!file) {
                alert('âš ï¸ Please upload messages file!');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                socket.send(JSON.stringify({
                    type: 'start',
                    cookie: cookie,
                    target: target,
                    delay: delay,
                    prefix: prefix,
                    messages: e.target.result
                }));
            };
            reader.readAsText(file);
        });
        
        stopBtn.addEventListener('click', () => {
            socket.send(JSON.stringify({ type: 'stop' }));
        });
        
        addLog('âœ… System ready');
    </script>
</body>
</html>
`;

function startSession(ws, cookie, target, delay, prefix, messagesText) {
  const sessionId = uuidv4();
  
  ws.send(JSON.stringify({ type: 'log', message: 'ðŸ”„ Logging in...' }));
  ws.send(JSON.stringify({ type: 'status', running: true }));
  
  wiegine.login(cookie, (err, api) => {
    if (err || !api) {
      ws.send(JSON.stringify({ type: 'log', message: 'âŒ Login failed!' }));
      ws.send(JSON.stringify({ type: 'status', running: false }));
      return;
    }
    
    api.setOptions({
      listenEvents: false,
      selfListen: false,
      logLevel: "silent",
      updatePresence: false,
      forceLogin: true
    });
    
    ws.send(JSON.stringify({ type: 'log', message: 'âœ… Logged in!' }));
    ws.send(JSON.stringify({ type: 'log', message: \`ðŸŽ¯ Target: \${target}\` }));
    
    const messages = messagesText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (messages.length === 0) {
      ws.send(JSON.stringify({ type: 'log', message: 'âŒ No messages found!' }));
      ws.send(JSON.stringify({ type: 'status', running: false }));
      return;
    }
    
    const session = {
      id: sessionId,
      api: api,
      targetId: target,
      messages: messages,
      prefix: prefix,
      currentIndex: 0,
      totalSent: 0,
      totalFailed: 0,
      loopCount: 0,
      delay: delay * 1000,
      running: true,
      ws: ws
    };
    
    sessions.set(sessionId, session);
    
    ws.send(JSON.stringify({ type: 'log', message: \`ðŸ’¬ Loaded \${messages.length} messages\` }));
    ws.send(JSON.stringify({ type: 'log', message: 'ðŸš€ Starting...' }));
    
    setTimeout(() => sendNext(sessionId), 2000);
  });
}

function sendNext(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || !session.running) return;
  
  const msgIndex = session.currentIndex;
  let msg = session.messages[msgIndex];
  
  if (session.prefix) {
    msg = session.prefix + ' ' + msg;
  }
  
  session.api.sendMessage(msg, session.targetId, (err) => {
    if (err) {
      session.totalFailed++;
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: \`âš ï¸ Message \${msgIndex + 1} failed\` 
      }));
    } else {
      session.totalSent++;
      const preview = msg.length > 40 ? msg.substring(0, 40) + '...' : msg;
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: \`âœ… #\${session.totalSent}: \${preview}\` 
      }));
    }
    
    session.currentIndex++;
    
    if (session.currentIndex >= session.messages.length) {
      session.currentIndex = 0;
      session.loopCount++;
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: \`ðŸ”„ Loop \${session.loopCount} complete\` 
      }));
    }
    
    const successRate = session.totalSent > 0 
      ? Math.round((session.totalSent / (session.totalSent + session.totalFailed)) * 100)
      : 100;
    
    session.ws.send(JSON.stringify({
      type: 'stats',
      sent: session.totalSent,
      loop: session.loopCount,
      rate: successRate
    }));
    
    if (session.running) {
      setTimeout(() => sendNext(sessionId), session.delay);
    }
  });
}

function stopSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  session.running = false;
  
  if (session.api) {
    try {
      session.api.logout();
    } catch (e) {}
  }
  
  sessions.delete(sessionId);
  
  if (session.ws) {
    session.ws.send(JSON.stringify({ type: 'status', running: false }));
    session.ws.send(JSON.stringify({ type: 'log', message: 'ðŸ›‘ Stopped' }));
  }
}

app.get('/', (req, res) => {
  res.send(htmlControlPanel);
});

const server = app.listen(PORT, () => {
  console.log(\`âœ… Server running on http://localhost:\${PORT}\`);
});

wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'status', running: false }));
  
  let currentSessionId = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'start') {
        currentSessionId = uuidv4();
        startSession(ws, data.cookie, data.target, data.delay, data.prefix, data.messages);
      } else if (data.type === 'stop') {
        if (currentSessionId) {
          stopSession(currentSessionId);
          currentSessionId = null;
        }
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'log', message: \`Error: \${err.message}\` }));
    }
  });
  
  ws.on('close', () => {
    if (currentSessionId) {
      stopSession(currentSessionId);
    }
  });
});

setInterval(() => {
  for (const [sessionId, session] of sessions.entries()) {
    if (session.ws.readyState !== WebSocket.OPEN) {
      stopSession(sessionId);
    }
  }
}, 30000);
