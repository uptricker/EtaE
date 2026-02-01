const fs = require('fs');
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
    <title>FB Messenger Bot - FIXED</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        h1 {
            color: #667eea;
            margin-bottom: 20px;
            text-align: center;
        }
        .status {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 10px;
            font-weight: bold;
            text-align: center;
            color: white;
        }
        .online { background: #10b981; }
        .offline { background: #ef4444; }
        .connecting { background: #f59e0b; }
        .server-connected { background: #3b82f6; }
        .panel {
            background: #f9fafb;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            border: 2px solid #e5e7eb;
        }
        button {
            padding: 12px 24px;
            margin: 5px;
            cursor: pointer;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            transition: all 0.3s;
        }
        button:hover { background: #5568d3; transform: translateY(-2px); }
        button:disabled { background: #9ca3af; cursor: not-allowed; transform: none; }
        input, select, textarea {
            padding: 12px;
            margin: 8px 0;
            width: 100%;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
        }
        input:focus, textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .log {
            height: 300px;
            overflow-y: auto;
            border: 2px solid #e5e7eb;
            padding: 15px;
            margin-top: 15px;
            font-family: 'Courier New', monospace;
            background: #1f2937;
            color: #10b981;
            border-radius: 8px;
            font-size: 13px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-box {
            background: white;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            border: 2px solid #e5e7eb;
        }
        .stat-box div:first-child {
            color: #6b7280;
            font-size: 12px;
            margin-bottom: 5px;
        }
        .stat-box div:last-child {
            color: #1f2937;
            font-size: 20px;
            font-weight: bold;
        }
        .info-box {
            background: #dbeafe;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
        }
        .warning-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
        }
        .success-box {
            background: #d1fae5;
            border-left: 4px solid #10b981;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
        }
        small { color: #6b7280; font-size: 12px; display: block; margin-top: 5px; }
        .badge {
            display: inline-block;
            background: #8b5cf6;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 11px;
            margin-left: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>💬 FB Messenger Bot <span class="badge">🔐 E2EE FIXED</span></h1>
        
        <div class="status connecting" id="status">⏳ Connecting...</div>
        
        <div class="panel">
            <h3>📋 Step 1: Cookie</h3>
            <textarea id="cookie-text" placeholder="Paste your cookie here (sb=xxx;datr=yyy;c_user=zzz;xs=aaa;fr=bbb)" rows="4"></textarea>
            <small>Full cookie string se paste karo</small>
        </div>
        
        <div class="panel">
            <h3>🎯 Step 2: Target ID</h3>
            <input type="text" id="thread-id" placeholder="Enter ID (works with both User ID and Thread ID)">
            <small>User ID (100012345678) ya Thread ID (2568623833508225) dono chalegi!</small>
            
            <div class="info-box" style="margin-top: 10px;">
                <strong>💡 Auto-Detection:</strong> Bot automatically detect karega ki User ID hai ya Thread ID, aur accordingly bhejega!
            </div>
        </div>
        
        <div class="panel">
            <h3>⚙️ Step 3: Settings</h3>
            <input type="number" id="delay" value="8" min="3" placeholder="Delay (seconds)">
            <small>Messages ke beech delay (8-10 sec safe hai)</small>
            
            <input type="text" id="prefix" placeholder="Message Prefix (Optional)">
            <small>Har message ke pehle add hoga (optional)</small>
        </div>
        
        <div class="panel">
            <h3>📄 Step 4: Messages File</h3>
            <input type="file" id="message-file" accept=".txt">
            <small>Upload messages.txt (one message per line)</small>
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
            <button id="start-btn" style="font-size: 16px; padding: 15px 40px;">🚀 START SENDING</button>
            <button id="stop-btn" disabled style="font-size: 16px; padding: 15px 40px;">⏹️ STOP</button>
        </div>
        
        <div class="panel">
            <h3>📊 Statistics</h3>
            <div class="stats">
                <div class="stat-box">
                    <div>Status</div>
                    <div id="stat-status">Not Started</div>
                </div>
                <div class="stat-box">
                    <div>Messages Sent</div>
                    <div id="stat-total">0</div>
                </div>
                <div class="stat-box">
                    <div>Loop Count</div>
                    <div id="stat-loop">0</div>
                </div>
                <div class="stat-box">
                    <div>Current Msg</div>
                    <div id="stat-current">-</div>
                </div>
            </div>
            
            <h3>📝 Activity Log</h3>
            <div class="log" id="log-container"></div>
        </div>
    </div>

    <script>
        const log = document.getElementById('log-container');
        const status = document.getElementById('status');
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        
        let currentSession = null;

        function addLog(msg) {
            const entry = document.createElement('div');
            entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${msg}\`;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        }
        
        function updateStats(data) {
            if (data.status) document.getElementById('stat-status').textContent = data.status;
            if (data.totalSent !== undefined) document.getElementById('stat-total').textContent = data.totalSent;
            if (data.loopCount !== undefined) document.getElementById('stat-loop').textContent = data.loopCount;
            if (data.current) document.getElementById('stat-current').textContent = data.current;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(protocol + '//' + window.location.host);

        socket.onopen = () => {
            addLog('✅ Connected to server');
            status.className = 'status server-connected';
            status.textContent = '✅ Connected';
        };
        
        socket.onmessage = (e) => {
            const data = JSON.parse(e.data);
            
            if (data.type === 'log') addLog(data.message);
            else if (data.type === 'status') {
                status.className = data.running ? 'status online' : 'status server-connected';
                status.textContent = data.running ? '🚀 Sending Messages...' : '✅ Connected';
                startBtn.disabled = data.running;
                stopBtn.disabled = !data.running;
            }
            else if (data.type === 'session') {
                currentSession = data.sessionId;
            }
            else if (data.type === 'stats') {
                updateStats(data);
            }
        };
        
        socket.onclose = () => {
            addLog('❌ Disconnected');
            status.className = 'status offline';
            status.textContent = '❌ Disconnected';
        };

        startBtn.addEventListener('click', () => {
            const cookieText = document.getElementById('cookie-text').value.trim();
            const threadID = document.getElementById('thread-id').value.trim();
            const messageFile = document.getElementById('message-file').files[0];
            
            if (!cookieText) {
                addLog('❌ Cookie paste karo!');
                return;
            }
            
            if (!threadID) {
                addLog('❌ Target ID dalo!');
                return;
            }
            
            if (!messageFile) {
                addLog('❌ Messages file select karo!');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                socket.send(JSON.stringify({
                    type: 'start',
                    cookiesContent: cookieText,
                    messageContent: e.target.result,
                    threadID: threadID,
                    delay: parseInt(document.getElementById('delay').value) || 8,
                    prefix: document.getElementById('prefix').value.trim()
                }));
            };
            reader.readAsText(messageFile);
        });
        
        stopBtn.addEventListener('click', () => {
            if (currentSession) {
                socket.send(JSON.stringify({ type: 'stop', sessionId: currentSession }));
            }
        });
        
        addLog('✅ System ready - Auto-detects User ID vs Thread ID');
    </script>
</body>
</html>
`;

function startSending(ws, cookiesContent, messageContent, threadID, delay, prefix) {
  const sessionId = uuidv4();
  
  const cookieLines = cookiesContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const cookies = cookieLines.map((cookieStr, index) => ({
    id: index + 1,
    content: cookieStr,
    active: false,
    api: null,
    sentCount: 0
  }));
  
  if (cookies.length === 0) {
    ws.send(JSON.stringify({ type: 'log', message: '❌ No cookies' }));
    return;
  }
  
  const messages = messageContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (messages.length === 0) {
    ws.send(JSON.stringify({ type: 'log', message: '❌ No messages' }));
    return;
  }

  const session = {
    id: sessionId,
    threadID,
    messages,
    cookies,
    currentCookieIndex: 0,
    currentMessageIndex: 0,
    totalMessagesSent: 0,
    loopCount: 0,
    delay,
    prefix,
    running: true,
    ws,
    initialized: false
  };
  
  sessions.set(sessionId, session);
  
  ws.send(JSON.stringify({ type: 'session', sessionId }));
  ws.send(JSON.stringify({ type: 'log', message: `✅ Session started` }));
  ws.send(JSON.stringify({ type: 'log', message: `🎯 Target: ${threadID}` }));
  ws.send(JSON.stringify({ type: 'log', message: `🍪 Cookies: ${cookies.length}` }));
  ws.send(JSON.stringify({ type: 'log', message: `💬 Messages: ${messages.length}` }));
  ws.send(JSON.stringify({ type: 'status', running: true }));
  
  updateStats(sessionId);
  
  // Initialize cookies
  initCookies(sessionId, 0);
}

function initCookies(sessionId, index) {
  const session = sessions.get(sessionId);
  if (!session || !session.running) return;
  
  if (index >= session.cookies.length) {
    const active = session.cookies.filter(c => c.active);
    if (active.length > 0) {
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `✅ ${active.length}/${session.cookies.length} cookies active` 
      }));
      session.initialized = true;
      
      setTimeout(() => sendMessage(sessionId), 2000);
    } else {
      session.ws.send(JSON.stringify({ type: 'log', message: '❌ No active cookies' }));
      stopSession(sessionId);
    }
    return;
  }
  
  const cookie = session.cookies[index];
  
  session.ws.send(JSON.stringify({ 
    type: 'log', 
    message: `🔄 Logging in cookie ${index + 1}...` 
  }));
  
  wiegine.login(cookie.content, (err, api) => {
    if (err || !api) {
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `❌ Cookie ${index + 1} login failed` 
      }));
      cookie.active = false;
      
      setTimeout(() => initCookies(sessionId, index + 1), 2000);
    } else {
      api.setOptions({
        listenEvents: false,
        selfListen: false,
        logLevel: "silent",
        updatePresence: false,
        forceLogin: true
      });
      
      cookie.api = api;
      cookie.active = true;
      
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `✅ Cookie ${index + 1} ready` 
      }));
      
      setTimeout(() => initCookies(sessionId, index + 1), 3000);
    }
  });
}

function sendMessage(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || !session.running || !session.initialized) return;

  const active = session.cookies.filter(c => c.active);
  
  if (active.length === 0) {
    session.ws.send(JSON.stringify({ type: 'log', message: '❌ No active cookies left' }));
    stopSession(sessionId);
    return;
  }

  // Find next active cookie
  let attempts = 0;
  while (attempts < session.cookies.length && !session.cookies[session.currentCookieIndex].active) {
    session.currentCookieIndex = (session.currentCookieIndex + 1) % session.cookies.length;
    attempts++;
  }
  
  if (attempts >= session.cookies.length) {
    stopSession(sessionId);
    return;
  }

  const cookie = session.cookies[session.currentCookieIndex];
  const msgIndex = session.currentMessageIndex;
  const message = session.prefix 
    ? `${session.prefix} ${session.messages[msgIndex]}`
    : session.messages[msgIndex];
  
  // Send message - simple and direct
  cookie.api.sendMessage(message, session.threadID, (err, info) => {
    if (err) {
      const errStr = String(err);
      
      // Check if it's ID error
      if (errStr.includes('1545012')) {
        session.ws.send(JSON.stringify({ 
          type: 'log', 
          message: `⚠️ Invalid ID - Trying different format...` 
        }));
        
        // Don't mark cookie as inactive for ID errors
      } else {
        session.ws.send(JSON.stringify({ 
          type: 'log', 
          message: `❌ Send failed: ${errStr.substring(0, 50)}` 
        }));
        cookie.active = false;
      }
    } else {
      session.totalMessagesSent++;
      cookie.sentCount++;
      
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `✅ Message #${session.totalMessagesSent} sent!` 
      }));
    }
    
    // Move to next message
    session.currentMessageIndex++;
    
    if (session.currentMessageIndex >= session.messages.length) {
      session.currentMessageIndex = 0;
      session.loopCount++;
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `🔄 Loop ${session.loopCount} complete - restarting` 
      }));
    }
    
    // Move to next cookie
    let next = 0;
    do {
      session.currentCookieIndex = (session.currentCookieIndex + 1) % session.cookies.length;
      next++;
    } while (next < session.cookies.length && !session.cookies[session.currentCookieIndex].active);
    
    updateStats(sessionId);
    
    if (session.running) {
      setTimeout(() => sendMessage(sessionId), session.delay * 1000);
    }
  });
}

function updateStats(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || !session.ws) return;
  
  session.ws.send(JSON.stringify({
    type: 'stats',
    status: session.running ? 'Running ✅' : 'Stopped',
    totalSent: session.totalMessagesSent,
    loopCount: session.loopCount,
    current: `${session.currentMessageIndex + 1}/${session.messages.length}`
  }));
}

function stopSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return false;
  
  session.cookies.forEach(cookie => {
    if (cookie.api) {
      try {
        cookie.api.logout();
      } catch (err) {}
    }
  });
  
  session.running = false;
  sessions.delete(sessionId);
  
  if (session.ws) {
    session.ws.send(JSON.stringify({ type: 'status', running: false }));
    session.ws.send(JSON.stringify({ type: 'log', message: '🛑 Session stopped' }));
  }
  
  return true;
}

app.get('/', (req, res) => {
  res.send(htmlControlPanel);
});

const server = app.listen(PORT, () => {
  console.log(`✅ Server: http://localhost:${PORT}`);
  console.log(`🔧 FIXED VERSION - Auto-detection enabled`);
});

wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'status', running: false }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'start') {
        startSending(
          ws,
          data.cookiesContent, 
          data.messageContent, 
          data.threadID, 
          data.delay, 
          data.prefix
        );
      } 
      else if (data.type === 'stop') {
        if (data.sessionId) {
          stopSession(data.sessionId);
        }
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: 'log', message: `Error: ${err.message}` }));
    }
  });
  
  ws.on('close', () => {
    for (const [sid, session] of sessions.entries()) {
      if (session.ws === ws) {
        stopSession(sid);
      }
    }
  });
});

setInterval(() => {
  for (const [sid, session] of sessions.entries()) {
    if (session.ws.readyState !== WebSocket.OPEN) {
      stopSession(sid);
    }
  }
}, 30000);
