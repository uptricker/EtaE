const fs = require('fs');
const express = require('express');
const wiegine = require('fca-mafiya');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration and session storage
const sessions = new Map();
let wss;

// HTML Control Panel
const htmlControlPanel = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FB Message Sender - E2EE Support</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #1a1a1a;
            color: #e0e0e0;
        }
        .status {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
            font-weight: bold;
            text-align: center;
        }
        .online { background: #4CAF50; color: white; }
        .offline { background: #f44336; color: white; }
        .connecting { background: #ff9800; color: white; }
        .server-connected { background: #2196F3; color: white; }
        .panel {
            background: #2d2d2d;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            margin-bottom: 20px;
        }
        button {
            padding: 10px 15px;
            margin: 5px;
            cursor: pointer;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            transition: all 0.3s;
        }
        button:hover {
            background: #0b7dda;
            transform: scale(1.02);
        }
        button:disabled {
            background: #555555;
            cursor: not-allowed;
        }
        input, select, textarea {
            padding: 10px;
            margin: 5px 0;
            width: 100%;
            border: 1px solid #444;
            border-radius: 4px;
            background: #333;
            color: white;
        }
        .log {
            height: 300px;
            overflow-y: auto;
            border: 1px solid #444;
            padding: 10px;
            margin-top: 20px;
            font-family: monospace;
            background: #222;
            color: #00ff00;
            border-radius: 4px;
        }
        small {
            color: #888;
            font-size: 12px;
        }
        h1, h2, h3 {
            color: #2196F3;
        }
        .session-info {
            background: #333;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 10px;
        }
        .tab {
            overflow: hidden;
            border: 1px solid #444;
            background-color: #2d2d2d;
            border-radius: 4px;
            margin-bottom: 15px;
        }
        .tab button {
            background-color: inherit;
            float: left;
            border: none;
            outline: none;
            cursor: pointer;
            padding: 14px 16px;
            transition: 0.3s;
        }
        .tab button:hover {
            background-color: #444;
        }
        .tab button.active {
            background-color: #2196F3;
        }
        .tabcontent {
            display: none;
            padding: 6px 12px;
            border: 1px solid #444;
            border-top: none;
            border-radius: 0 0 4px 4px;
        }
        .active-tab {
            display: block;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-bottom: 15px;
        }
        .stat-box {
            background: #333;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
        }
        .cookie-status {
            margin-top: 10px;
            padding: 10px;
            border-radius: 5px;
            background: #333;
        }
        .cookie-active {
            border-left: 5px solid #4CAF50;
        }
        .cookie-inactive {
            border-left: 5px solid #f44336;
        }
        .cookie-initializing {
            border-left: 5px solid #ff9800;
        }
        .e2ee-badge {
            background: #9C27B0;
            color: white;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 11px;
            margin-left: 5px;
        }
        .checkbox-container {
            display: flex;
            align-items: center;
            margin: 10px 0;
        }
        .checkbox-container input[type="checkbox"] {
            width: auto;
            margin-right: 10px;
        }
        .info-box {
            background: #2c3e50;
            border-left: 4px solid #2196F3;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
        }
        .warning-box {
            background: #ff9800;
            color: #000;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>💬 FB Message Sender <span class="e2ee-badge">🔐 E2EE INBOX</span></h1>
    
    <div class="status connecting" id="status">
        Status: Connecting to server...
    </div>
    
    <div class="panel">
        <div class="tab">
            <button class="tablinks active" onclick="openTab(event, 'cookie-file-tab')">Cookie File</button>
            <button class="tablinks" onclick="openTab(event, 'cookie-text-tab')">Paste Cookies</button>
        </div>
        
        <div id="cookie-file-tab" class="tabcontent active-tab">
            <input type="file" id="cookie-file" accept=".txt">
            <small>Upload cookie file (one cookie per line)</small>
        </div>
        
        <div id="cookie-text-tab" class="tabcontent">
            <textarea id="cookie-text" placeholder="Paste cookies here (one per line)&#10;&#10;Example:&#10;sb=xxx;datr=yyy;c_user=zzz;xs=aaa;fr=bbb" rows="8"></textarea>
            <small>Paste full cookie string (sb=xxx;datr=yyy;c_user=zzz;xs=aaa;fr=bbb)</small>
        </div>
        
        <div class="info-box">
            <strong>🍪 Cookie Format</strong>
            <div style="margin-top: 5px; font-size: 12px;">
                Simply paste your full cookie string:<br>
                <code>sb=xxx;datr=yyy;c_user=zzz;xs=aaa;fr=bbb;presence=xxx</code><br><br>
                Multiple cookies? One per line!
            </div>
        </div>
        
        <div>
            <input type="text" id="thread-id" placeholder="User ID or Thread ID">
            <small>Facebook User ID (for E2EE) or Thread ID (for groups)</small>
        </div>
        
        <div class="checkbox-container">
            <input type="checkbox" id="enable-e2ee">
            <label for="enable-e2ee"><strong>🔐 Enable E2EE Inbox Mode</strong></label>
        </div>
        
        <div class="warning-box" id="e2ee-warning" style="display: none;">
            ⚠️ E2EE Active! Messages will go to encrypted inbox
        </div>
        
        <div>
            <input type="number" id="delay" value="7" min="1" placeholder="Delay in seconds">
            <small>Delay between messages (7-10 sec recommended)</small>
        </div>
        
        <div>
            <input type="text" id="prefix" placeholder="Message Prefix (Optional)">
            <small>Optional prefix for each message</small>
        </div>
        
        <div>
            <label for="message-file">Messages File</label>
            <input type="file" id="message-file" accept=".txt">
            <small>Upload messages.txt (one message per line)</small>
        </div>
        
        <button id="start-btn">Start Sending</button>
        <button id="stop-btn" disabled>Stop Sending</button>
        
        <div id="session-info" style="display: none;" class="session-info">
            <h3>Session ID: <span id="session-id-display"></span></h3>
            <input type="text" id="stop-session-id" placeholder="Session ID to stop">
            <button id="stop-specific-btn">Stop Session</button>
        </div>
    </div>
    
    <div class="panel">
        <h3>Session Statistics</h3>
        <div class="stats">
            <div class="stat-box">
                <div>Status</div>
                <div id="stat-status">Not Started</div>
            </div>
            <div class="stat-box">
                <div>Mode</div>
                <div id="stat-mode">Normal</div>
            </div>
            <div class="stat-box">
                <div>Messages Sent</div>
                <div id="stat-total-sent">0</div>
            </div>
            <div class="stat-box">
                <div>Loop Count</div>
                <div id="stat-loop-count">0</div>
            </div>
            <div class="stat-box">
                <div>Current Message</div>
                <div id="stat-current">-</div>
            </div>
            <div class="stat-box">
                <div>Current Cookie</div>
                <div id="stat-cookie">-</div>
            </div>
        </div>
        
        <h3>Cookies Status</h3>
        <div id="cookies-status-container"></div>
        
        <h3>Activity Logs</h3>
        <div class="log" id="log-container"></div>
    </div>

    <script>
        const logContainer = document.getElementById('log-container');
        const statusDiv = document.getElementById('status');
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        const enableE2eeCheckbox = document.getElementById('enable-e2ee');
        const e2eeWarning = document.getElementById('e2ee-warning');
        
        const statStatus = document.getElementById('stat-status');
        const statMode = document.getElementById('stat-mode');
        const statTotalSent = document.getElementById('stat-total-sent');
        const statLoopCount = document.getElementById('stat-loop-count');
        const statCurrent = document.getElementById('stat-current');
        const statCookie = document.getElementById('stat-cookie');
        
        let currentSessionId = null;

        enableE2eeCheckbox.addEventListener('change', () => {
            if (enableE2eeCheckbox.checked) {
                statMode.textContent = '🔐 E2EE Inbox';
                e2eeWarning.style.display = 'block';
            } else {
                statMode.textContent = 'Normal';
                e2eeWarning.style.display = 'none';
            }
        });

        function openTab(evt, tabName) {
            const tabcontent = document.getElementsByClassName("tabcontent");
            for (let i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
            }
            
            const tablinks = document.getElementsByClassName("tablinks");
            for (let i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }
            
            document.getElementById(tabName).style.display = "block";
            evt.currentTarget.className += " active";
        }

        function addLog(message) {
            const logEntry = document.createElement('div');
            logEntry.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
            logContainer.appendChild(logEntry);
            logContainer.scrollTop = logContainer.scrollHeight;
        }
        
        function updateStats(data) {
            if (data.status) statStatus.textContent = data.status;
            if (data.mode) statMode.textContent = data.mode;
            if (data.totalSent !== undefined) statTotalSent.textContent = data.totalSent;
            if (data.loopCount !== undefined) statLoopCount.textContent = data.loopCount;
            if (data.current) statCurrent.textContent = data.current;
            if (data.cookie) statCookie.textContent = data.cookie;
        }
        
        function updateCookiesStatus(cookies) {
            const container = document.getElementById('cookies-status-container');
            container.innerHTML = '';
            cookies.forEach((cookie, index) => {
                const div = document.createElement('div');
                const statusClass = cookie.initializing ? 'cookie-initializing' : 
                                   (cookie.active ? 'cookie-active' : 'cookie-inactive');
                div.className = \`cookie-status \${statusClass}\`;
                
                let statusText = cookie.initializing ? 'INITIALIZING...' : 
                                (cookie.active ? 'ACTIVE ✅' : 'INACTIVE ❌');
                
                div.innerHTML = \`
                    <strong>Cookie \${index + 1}:</strong> 
                    <span>\${statusText}</span>
                    <span style="float: right;">Sent: \${cookie.sentCount || 0}</span>
                \`;
                container.appendChild(div);
            });
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(protocol + '//' + window.location.host);

        socket.onopen = () => {
            addLog('✅ Connected to server');
            statusDiv.className = 'status server-connected';
            statusDiv.textContent = 'Status: Connected';
        };
        
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'log') {
                addLog(data.message);
            } 
            else if (data.type === 'status') {
                statusDiv.className = data.running ? 'status online' : 'status server-connected';
                statusDiv.textContent = \`Status: \${data.running ? 'Sending...' : 'Connected'}\`;
                startBtn.disabled = data.running;
                stopBtn.disabled = !data.running;
                statStatus.textContent = data.running ? 'Running' : 'Stopped';
            }
            else if (data.type === 'session') {
                currentSessionId = data.sessionId;
                document.getElementById('session-id-display').textContent = data.sessionId;
                document.getElementById('session-info').style.display = 'block';
            }
            else if (data.type === 'stats') {
                updateStats(data);
            }
            else if (data.type === 'cookies_status') {
                updateCookiesStatus(data.cookies);
            }
        };
        
        socket.onclose = () => {
            addLog('❌ Disconnected');
            statusDiv.className = 'status offline';
            statusDiv.textContent = 'Status: Disconnected';
        };

        startBtn.addEventListener('click', () => {
            const cookieFile = document.getElementById('cookie-file').files[0];
            const cookieText = document.getElementById('cookie-text').value.trim();
            
            if (cookieFile) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    processStart(e.target.result);
                };
                reader.readAsText(cookieFile);
            } else if (cookieText) {
                processStart(cookieText);
            } else {
                addLog('❌ Please provide cookies');
            }
        });
        
        function processStart(cookiesContent) {
            const threadID = document.getElementById('thread-id').value.trim();
            const messageFile = document.getElementById('message-file').files[0];
            
            if (!threadID) {
                addLog('❌ Please enter Thread/User ID');
                return;
            }
            
            if (!messageFile) {
                addLog('❌ Please select messages file');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                socket.send(JSON.stringify({
                    type: 'start',
                    cookiesContent: cookiesContent,
                    messageContent: e.target.result,
                    threadID: threadID,
                    delay: parseInt(document.getElementById('delay').value) || 7,
                    prefix: document.getElementById('prefix').value.trim(),
                    enableE2ee: enableE2eeCheckbox.checked
                }));
            };
            reader.readAsText(messageFile);
        }
        
        stopBtn.addEventListener('click', () => {
            if (currentSessionId) {
                socket.send(JSON.stringify({ type: 'stop', sessionId: currentSessionId }));
            }
        });
        
        document.getElementById('stop-specific-btn').addEventListener('click', () => {
            const sid = document.getElementById('stop-session-id').value.trim();
            if (sid) {
                socket.send(JSON.stringify({ type: 'stop', sessionId: sid }));
            }
        });
        
        addLog('✅ Ready - Direct cookie login support');
    </script>
</body>
</html>
`;

function startSending(ws, cookiesContent, messageContent, threadID, delay, prefix, enableE2ee = false) {
  const sessionId = uuidv4();
  
  // Parse cookies - just split by newline, keep as plain text
  const cookieLines = cookiesContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const cookies = cookieLines.map((cookieStr, index) => ({
    id: index + 1,
    content: cookieStr,
    active: false,
    initializing: false,
    sentCount: 0,
    api: null
  }));
  
  if (cookies.length === 0) {
    ws.send(JSON.stringify({ type: 'log', message: '❌ No cookies found' }));
    return;
  }
  
  const messages = messageContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  if (messages.length === 0) {
    ws.send(JSON.stringify({ type: 'log', message: '❌ No messages found' }));
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
    enableE2ee,
    running: true,
    startTime: new Date(),
    ws,
    initialized: false
  };
  
  sessions.set(sessionId, session);
  
  ws.send(JSON.stringify({ type: 'session', sessionId }));
  
  const modeText = enableE2ee ? '🔐 E2EE Inbox' : 'Normal';
  ws.send(JSON.stringify({ type: 'log', message: `✅ Session: ${sessionId.substring(0, 8)}...` }));
  ws.send(JSON.stringify({ type: 'log', message: `📊 Mode: ${modeText}` }));
  ws.send(JSON.stringify({ type: 'log', message: `🍪 Cookies: ${cookies.length}` }));
  ws.send(JSON.stringify({ type: 'log', message: `💬 Messages: ${messages.length}` }));
  ws.send(JSON.stringify({ type: 'status', running: true }));
  
  updateSessionStats(sessionId);
  updateCookiesStatus(sessionId);
  
  initializeCookiesSequentially(sessionId, 0);
}

function initializeCookiesSequentially(sessionId, cookieIndex) {
  const session = sessions.get(sessionId);
  if (!session || !session.running) return;
  
  if (cookieIndex >= session.cookies.length) {
    const activeCookies = session.cookies.filter(c => c.active);
    if (activeCookies.length > 0) {
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `✅ Ready: ${activeCookies.length}/${session.cookies.length} active` 
      }));
      session.initialized = true;
      updateCookiesStatus(sessionId);
      
      setTimeout(() => sendNextMessage(sessionId), 2000);
    } else {
      session.ws.send(JSON.stringify({ type: 'log', message: '❌ No active cookies' }));
      stopSending(sessionId);
    }
    return;
  }
  
  const cookie = session.cookies[cookieIndex];
  cookie.initializing = true;
  updateCookiesStatus(sessionId);
  
  session.ws.send(JSON.stringify({ 
    type: 'log', 
    message: `🔄 Init Cookie ${cookieIndex + 1}/${session.cookies.length}...` 
  }));
  
  // Use direct cookie string login
  wiegine.login(cookie.content, (err, api) => {
    if (err || !api) {
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `❌ Cookie ${cookieIndex + 1} failed: ${err?.error || err?.message || 'Login error'}` 
      }));
      cookie.active = false;
      cookie.initializing = false;
      updateCookiesStatus(sessionId);
      
      setTimeout(() => initializeCookiesSequentially(sessionId, cookieIndex + 1), 2000);
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
      cookie.initializing = false;
      
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `✅ Cookie ${cookieIndex + 1} logged in` 
      }));
      updateCookiesStatus(sessionId);
      
      setTimeout(() => initializeCookiesSequentially(sessionId, cookieIndex + 1), 3000);
    }
  });
}

function sendNextMessage(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || !session.running || !session.initialized) return;

  const activeCookies = session.cookies.filter(c => c.active);
  
  if (activeCookies.length === 0) {
    session.ws.send(JSON.stringify({ type: 'log', message: '❌ No active cookies' }));
    stopSending(sessionId);
    return;
  }

  let attempts = 0;
  while (attempts < session.cookies.length && !session.cookies[session.currentCookieIndex].active) {
    session.currentCookieIndex = (session.currentCookieIndex + 1) % session.cookies.length;
    attempts++;
  }
  
  if (attempts >= session.cookies.length) {
    stopSending(sessionId);
    return;
  }

  const cookie = session.cookies[session.currentCookieIndex];
  const messageIndex = session.currentMessageIndex;
  const message = session.prefix 
    ? `${session.prefix} ${session.messages[messageIndex]}`
    : session.messages[messageIndex];
  
  cookie.api.sendMessage(message, session.threadID, (err) => {
    if (err) {
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `❌ Cookie ${session.currentCookieIndex + 1}: ${err.error || err.message || 'Send failed'}` 
      }));
      cookie.active = false;
      updateCookiesStatus(sessionId);
    } else {
      session.totalMessagesSent++;
      cookie.sentCount++;
      
      const icon = session.enableE2ee ? '🔐' : '✅';
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `${icon} Cookie ${session.currentCookieIndex + 1} sent #${session.totalMessagesSent}` 
      }));
    }
    
    session.currentMessageIndex++;
    
    if (session.currentMessageIndex >= session.messages.length) {
      session.currentMessageIndex = 0;
      session.loopCount++;
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `🔄 Loop ${session.loopCount} complete` 
      }));
    }
    
    let nextAttempts = 0;
    do {
      session.currentCookieIndex = (session.currentCookieIndex + 1) % session.cookies.length;
      nextAttempts++;
    } while (nextAttempts < session.cookies.length && !session.cookies[session.currentCookieIndex].active);
    
    updateSessionStats(sessionId);
    updateCookiesStatus(sessionId);
    
    if (session.running) {
      setTimeout(() => sendNextMessage(sessionId), session.delay * 1000);
    }
  });
}

function updateSessionStats(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || !session.ws) return;
  
  const activeCookies = session.cookies.filter(c => c.active).length;
  const modeText = session.enableE2ee ? '🔐 E2EE' : 'Normal';
  
  session.ws.send(JSON.stringify({
    type: 'stats',
    status: session.running ? 'Running' : 'Stopped',
    mode: modeText,
    totalSent: session.totalMessagesSent,
    loopCount: session.loopCount,
    current: `Loop ${session.loopCount + 1}, Msg ${session.currentMessageIndex + 1}/${session.messages.length}`,
    cookie: `${session.currentCookieIndex + 1} (${activeCookies} active)`
  }));
}

function updateCookiesStatus(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || !session.ws) return;
  
  session.ws.send(JSON.stringify({
    type: 'cookies_status',
    cookies: session.cookies
  }));
}

function stopSending(sessionId) {
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
    session.ws.send(JSON.stringify({ type: 'log', message: '🛑 Stopped' }));
  }
  
  return true;
}

app.get('/', (req, res) => {
  res.send(htmlControlPanel);
});

const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🍪 Direct plain text cookie login`);
  console.log(`🔐 E2EE inbox support enabled`);
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
          data.prefix,
          data.enableE2ee || false
        );
      } 
      else if (data.type === 'stop') {
        if (data.sessionId) {
          stopSending(data.sessionId);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      ws.send(JSON.stringify({ type: 'log', message: `Error: ${err.message}` }));
    }
  });
  
  ws.on('close', () => {
    for (const [sessionId, session] of sessions.entries()) {
      if (session.ws === ws) {
        stopSending(sessionId);
      }
    }
  });
});

setInterval(() => {
  for (const [sessionId, session] of sessions.entries()) {
    if (session.ws.readyState !== WebSocket.OPEN) {
      console.log(`Cleaning up session: ${sessionId}`);
      stopSending(sessionId);
    }
  }
}, 30000);
