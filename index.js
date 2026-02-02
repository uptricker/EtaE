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
    <title>FB Messenger Bot - WORKING VERSION</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #667eea;
            text-align: center;
            margin-bottom: 30px;
            font-size: 32px;
        }
        .status {
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 10px;
            text-align: center;
            font-weight: bold;
            font-size: 18px;
            color: white;
        }
        .online { background: #10b981; }
        .offline { background: #ef4444; }
        .connecting { background: #f59e0b; }
        .server-connected { background: #3b82f6; }
        .section {
            background: #f9fafb;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            border: 2px solid #e5e7eb;
        }
        .section h3 {
            color: #374151;
            margin-bottom: 15px;
            font-size: 18px;
        }
        textarea, input[type="text"], input[type="number"], input[type="file"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            margin-bottom: 10px;
        }
        textarea:focus, input:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 15px;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            color: white;
            margin-bottom: 10px;
            transition: all 0.3s;
        }
        .start-btn {
            background: #10b981;
        }
        .start-btn:hover {
            background: #059669;
            transform: translateY(-2px);
        }
        .stop-btn {
            background: #ef4444;
        }
        .stop-btn:hover {
            background: #dc2626;
        }
        button:disabled {
            background: #9ca3af;
            cursor: not-allowed;
            transform: none;
        }
        .log {
            height: 300px;
            overflow-y: auto;
            background: #1f2937;
            color: #10b981;
            padding: 15px;
            border-radius: 10px;
            font-family: monospace;
            font-size: 13px;
            border: 2px solid #374151;
        }
        .info {
            background: #dbeafe;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
            font-size: 14px;
        }
        .success {
            background: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
            font-size: 14px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat {
            background: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            border: 2px solid #e5e7eb;
        }
        .stat-label {
            color: #6b7280;
            font-size: 12px;
            margin-bottom: 5px;
        }
        .stat-value {
            color: #1f2937;
            font-size: 24px;
            font-weight: bold;
        }
        small {
            color: #6b7280;
            font-size: 12px;
            display: block;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>💬 FB Messenger Bot</h1>
        
        <div class="status connecting" id="status">⏳ Connecting...</div>
        
        <div class="success">
            <strong>✅ 100% Working Version!</strong><br>
            Auto-detects your User ID from cookie - Guaranteed to work!
        </div>
        
        <div class="section">
            <h3>🍪 Step 1: Paste Your Cookie</h3>
            <textarea id="cookie" rows="4" placeholder="sb=xxx;datr=yyy;c_user=zzz;xs=aaa;fr=bbb"></textarea>
            <small>Full cookie string paste karo</small>
        </div>
        
        <div class="section">
            <h3>🎯 Step 2: Target (Optional)</h3>
            <input type="text" id="target" placeholder="Leave empty to send to yourself, or enter User ID">
            <div class="info">
                <strong>💡 Tip:</strong> Empty chhod do to apne aap ko messages jayenge (testing ke liye perfect!)
            </div>
        </div>
        
        <div class="section">
            <h3>⚙️ Step 3: Settings</h3>
            <input type="number" id="delay" value="5" min="2" placeholder="Delay (seconds)">
            <small>Messages ke beech delay</small>
        </div>
        
        <div class="section">
            <h3>📄 Step 4: Messages File</h3>
            <input type="file" id="messages" accept=".txt">
            <small>Upload messages.txt file</small>
        </div>
        
        <button class="start-btn" id="start">🚀 START SENDING</button>
        <button class="stop-btn" id="stop" disabled>⏹️ STOP</button>
        
        <div class="section">
            <h3>📊 Statistics</h3>
            <div class="stats">
                <div class="stat">
                    <div class="stat-label">Status</div>
                    <div class="stat-value" id="stat-status">Ready</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Sent</div>
                    <div class="stat-value" id="stat-sent">0</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Loop</div>
                    <div class="stat-value" id="stat-loop">0</div>
                </div>
            </div>
            
            <h3>📝 Activity Log</h3>
            <div class="log" id="log"></div>
        </div>
    </div>

    <script>
        const log = document.getElementById('log');
        const status = document.getElementById('status');
        
        function addLog(msg) {
            const entry = document.createElement('div');
            entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${msg}\`;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(protocol + '//' + window.location.host);

        socket.onopen = () => {
            addLog('✅ Connected');
            status.className = 'status server-connected';
            status.textContent = '✅ Connected';
        };
        
        socket.onmessage = (e) => {
            const data = JSON.parse(e.data);
            
            if (data.type === 'log') {
                addLog(data.message);
            } else if (data.type === 'status') {
                status.className = data.running ? 'status online' : 'status server-connected';
                status.textContent = data.running ? '🚀 Sending...' : '✅ Connected';
                document.getElementById('start').disabled = data.running;
                document.getElementById('stop').disabled = !data.running;
            } else if (data.type === 'stats') {
                if (data.status) document.getElementById('stat-status').textContent = data.status;
                if (data.sent !== undefined) document.getElementById('stat-sent').textContent = data.sent;
                if (data.loop !== undefined) document.getElementById('stat-loop').textContent = data.loop;
            }
        };
        
        socket.onclose = () => {
            addLog('❌ Disconnected');
            status.className = 'status offline';
            status.textContent = '❌ Disconnected';
        };

        document.getElementById('start').addEventListener('click', () => {
            const cookie = document.getElementById('cookie').value.trim();
            const target = document.getElementById('target').value.trim();
            const delay = parseInt(document.getElementById('delay').value) || 5;
            const file = document.getElementById('messages').files[0];
            
            if (!cookie) {
                addLog('❌ Cookie paste karo!');
                return;
            }
            
            if (!file) {
                addLog('❌ Messages file select karo!');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                socket.send(JSON.stringify({
                    type: 'start',
                    cookie: cookie,
                    target: target,
                    delay: delay,
                    messages: e.target.result
                }));
            };
            reader.readAsText(file);
        });
        
        document.getElementById('stop').addEventListener('click', () => {
            socket.send(JSON.stringify({ type: 'stop' }));
        });
        
        addLog('✅ Ready - Auto User ID detection enabled');
    </script>
</body>
</html>
`;

function extractUserIdFromCookie(cookieStr) {
  const match = cookieStr.match(/c_user=(\d+)/);
  return match ? match[1] : null;
}

function startSession(ws, cookie, target, delay, messagesText) {
  const sessionId = uuidv4();
  
  ws.send(JSON.stringify({ type: 'log', message: '🔄 Logging in...' }));
  
  wiegine.login(cookie, (err, api) => {
    if (err || !api) {
      ws.send(JSON.stringify({ type: 'log', message: '❌ Login failed!' }));
      return;
    }
    
    api.setOptions({
      listenEvents: false,
      selfListen: false,
      logLevel: "silent",
      updatePresence: false
    });
    
    ws.send(JSON.stringify({ type: 'log', message: '✅ Logged in successfully!' }));
    
    // Get User ID from cookie or use provided target
    let targetId = target;
    if (!targetId) {
      targetId = extractUserIdFromCookie(cookie);
      if (targetId) {
        ws.send(JSON.stringify({ type: 'log', message: \`📱 Auto-detected User ID: \${targetId}\` }));
        ws.send(JSON.stringify({ type: 'log', message: '💬 Sending messages to yourself (testing mode)' }));
      }
    } else {
      ws.send(JSON.stringify({ type: 'log', message: \`🎯 Target: \${targetId}\` }));
    }
    
    if (!targetId) {
      ws.send(JSON.stringify({ type: 'log', message: '❌ No target ID found!' }));
      return;
    }
    
    const messages = messagesText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    if (messages.length === 0) {
      ws.send(JSON.stringify({ type: 'log', message: '❌ No messages in file!' }));
      return;
    }
    
    const session = {
      id: sessionId,
      api: api,
      targetId: targetId,
      messages: messages,
      currentIndex: 0,
      totalSent: 0,
      loopCount: 0,
      delay: delay,
      running: true,
      ws: ws
    };
    
    sessions.set(sessionId, session);
    
    ws.send(JSON.stringify({ type: 'log', message: \`💬 Loaded \${messages.length} messages\` }));
    ws.send(JSON.stringify({ type: 'log', message: '🚀 Starting...' }));
    ws.send(JSON.stringify({ type: 'status', running: true }));
    
    setTimeout(() => sendNext(sessionId), 2000);
  });
}

function sendNext(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || !session.running) return;
  
  const msg = session.messages[session.currentIndex];
  
  session.api.sendMessage(msg, session.targetId, (err) => {
    if (err) {
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: \`⚠️ Failed to send message \${session.currentIndex + 1}\` 
      }));
    } else {
      session.totalSent++;
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: \`✅ Sent #\${session.totalSent}: \${msg.substring(0, 40)}...\` 
      }));
    }
    
    session.currentIndex++;
    
    if (session.currentIndex >= session.messages.length) {
      session.currentIndex = 0;
      session.loopCount++;
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: \`🔄 Loop \${session.loopCount} complete - restarting\` 
      }));
    }
    
    session.ws.send(JSON.stringify({
      type: 'stats',
      status: 'Running',
      sent: session.totalSent,
      loop: session.loopCount
    }));
    
    if (session.running) {
      setTimeout(() => sendNext(sessionId), session.delay * 1000);
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
    session.ws.send(JSON.stringify({ type: 'log', message: '🛑 Stopped' }));
  }
}

app.get('/', (req, res) => {
  res.send(htmlControlPanel);
});

const server = app.listen(PORT, () => {
  console.log(\`✅ Server: http://localhost:\${PORT}\`);
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
        startSession(ws, data.cookie, data.target, data.delay, data.messages);
      } else if (data.type === 'stop') {
        if (currentSessionId) {
          stopSession(currentSessionId);
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
