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
    <title>Message Sender Bot - E2EE Support</title>
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
            border-left: 4px solid #9C27B0;
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
        .example-box {
            background: #1e3a5f;
            border-left: 4px solid #2196F3;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <h1>💬 Multi-Cookie Message Sender Bot <span class="e2ee-badge">🔐 E2EE INBOX</span></h1>
    
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
            <small>Select your cookies file (appState.txt or cookies.txt)</small>
        </div>
        
        <div id="cookie-text-tab" class="tabcontent">
            <textarea id="cookie-text" placeholder="Paste your cookies here (one cookie per line)" rows="5"></textarea>
            <small>Paste your cookies directly (JSON appState or plain text cookies)</small>
        </div>
        
        <div class="info-box">
            <strong>📋 Cookie Format Support</strong>
            <p style="margin: 5px 0; font-size: 13px;">
                This bot supports <strong>BOTH</strong> cookie formats:<br>
                ✅ <strong>JSON appState</strong> format (from c3c-fbstate or similar tools)<br>
                ✅ <strong>Plain text cookies</strong> (from EditThisCookie or browser export)
            </p>
        </div>
        
        <div class="example-box">
            <strong>Example JSON appState (one per line):</strong><br>
            [{"key":"datr","value":"xyz123..."},{"key":"sb","value":"abc..."}]<br>
            [{"key":"datr","value":"def456..."},{"key":"sb","value":"ghi..."}]
        </div>
        
        <div>
            <input type="text" id="thread-id" placeholder="User ID or Thread ID">
            <small>Enter the Facebook User ID (for E2EE inbox) or Thread ID (for normal chat)</small>
        </div>
        
        <div class="info-box">
            <strong>🔐 E2EE Inbox Mode</strong>
            <p style="margin: 5px 0; font-size: 13px;">
                • <strong>Enable karne par:</strong> Messages E2EE encrypted inbox me jayenge<br>
                • <strong>User ID:</strong> Individual person ka FB UID dalein<br>
                • <strong>Real Messages:</strong> Haan, asli messages send honge encrypted inbox me<br>
                • <strong>Delay:</strong> 7-10 seconds recommended for safety
            </p>
        </div>
        
        <div class="checkbox-container">
            <input type="checkbox" id="enable-e2ee">
            <label for="enable-e2ee"><strong>🔐 Enable E2EE Inbox Mode</strong> (Send to encrypted inbox)</label>
        </div>
        
        <div class="warning-box" id="e2ee-warning" style="display: none;">
            ⚠️ E2EE Mode Active! Messages will be sent to encrypted inbox. Make sure the User ID is correct!
        </div>
        
        <div>
            <input type="number" id="delay" value="7" min="1" placeholder="Delay in seconds">
            <small>Delay between messages (Recommended: 7-10 seconds for E2EE inbox)</small>
        </div>
        
        <div>
            <input type="text" id="prefix" placeholder="Message Prefix (Optional)">
            <small>Optional prefix to add before each message</small>
        </div>
        
        <div>
            <label for="message-file">Messages File</label>
            <input type="file" id="message-file" accept=".txt">
            <small>Upload messages.txt file with messages (one per line)</small>
        </div>
        
        <button id="start-btn">Start Sending</button>
        <button id="stop-btn" disabled>Stop Sending</button>
        
        <div id="session-info" style="display: none;" class="session-info">
            <h3>Your Session ID: <span id="session-id-display"></span></h3>
            <p>Save this ID to stop your session later</p>
            <input type="text" id="stop-session-id" placeholder="Enter Session ID to stop">
            <button id="stop-specific-btn">Stop Specific Session</button>
        </div>
    </div>
    
    <div class="panel">
        <h3>Session Statistics</h3>
        <div class="stats" id="stats-container">
            <div class="stat-box">
                <div>Status</div>
                <div id="stat-status">Not Started</div>
            </div>
            <div class="stat-box">
                <div>Mode</div>
                <div id="stat-mode">Normal</div>
            </div>
            <div class="stat-box">
                <div>Total Messages Sent</div>
                <div id="stat-total-sent">0</div>
            </div>
            <div class="stat-box">
                <div>Current Loop Count</div>
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
            <div class="stat-box">
                <div>Started At</div>
                <div id="stat-started">-</div>
            </div>
        </div>
        
        <h3>Cookies Status</h3>
        <div id="cookies-status-container"></div>
        
        <h3>Logs</h3>
        <div class="log" id="log-container"></div>
    </div>

    <script>
        const logContainer = document.getElementById('log-container');
        const statusDiv = document.getElementById('status');
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        const stopSpecificBtn = document.getElementById('stop-specific-btn');
        const cookieFileInput = document.getElementById('cookie-file');
        const cookieTextInput = document.getElementById('cookie-text');
        const threadIdInput = document.getElementById('thread-id');
        const delayInput = document.getElementById('delay');
        const prefixInput = document.getElementById('prefix');
        const messageFileInput = document.getElementById('message-file');
        const sessionInfoDiv = document.getElementById('session-info');
        const sessionIdDisplay = document.getElementById('session-id-display');
        const stopSessionIdInput = document.getElementById('stop-session-id');
        const cookiesStatusContainer = document.getElementById('cookies-status-container');
        const enableE2eeCheckbox = document.getElementById('enable-e2ee');
        const e2eeWarning = document.getElementById('e2ee-warning');
        
        // Stats elements
        const statStatus = document.getElementById('stat-status');
        const statMode = document.getElementById('stat-mode');
        const statTotalSent = document.getElementById('stat-total-sent');
        const statLoopCount = document.getElementById('stat-loop-count');
        const statCurrent = document.getElementById('stat-current');
        const statCookie = document.getElementById('stat-cookie');
        const statStarted = document.getElementById('stat-started');
        
        let currentSessionId = null;

        // Update mode display when checkbox changes
        enableE2eeCheckbox.addEventListener('change', () => {
            if (enableE2eeCheckbox.checked) {
                statMode.textContent = '🔐 E2EE Inbox';
                e2eeWarning.style.display = 'block';
                delayInput.value = '7';
            } else {
                statMode.textContent = 'Normal Mode';
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

        function addLog(message, type = 'info') {
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
            if (data.cookie) statCookie.textContent = \`Cookie \${data.cookie}\`;
            if (data.started) statStarted.textContent = data.started;
        }
        
        function updateCookiesStatus(cookies) {
            cookiesStatusContainer.innerHTML = '';
            cookies.forEach((cookie, index) => {
                const cookieStatus = document.createElement('div');
                const statusClass = cookie.initializing ? 'cookie-initializing' : 
                                   (cookie.active ? 'cookie-active' : 'cookie-inactive');
                cookieStatus.className = \`cookie-status \${statusClass}\`;
                
                let statusText = cookie.initializing ? 'INITIALIZING...' : 
                                (cookie.active ? 'ACTIVE ✅' : 'INACTIVE ❌');
                
                cookieStatus.innerHTML = \`
                    <strong>Cookie \${index + 1}:</strong> 
                    <span>\${statusText}</span>
                    <span style="float: right;">Messages Sent: \${cookie.sentCount || 0}</span>
                \`;
                cookiesStatusContainer.appendChild(cookieStatus);
            });
        }

        // Dynamic protocol for Render
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(protocol + '//' + window.location.host);

        socket.onopen = () => {
            addLog('✅ Connected to server');
            statusDiv.className = 'status server-connected';
            statusDiv.textContent = 'Status: Connected to Server';
        };
        
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'log') {
                addLog(data.message);
            } 
            else if (data.type === 'status') {
                statusDiv.className = data.running ? 'status online' : 'status server-connected';
                statusDiv.textContent = \`Status: \${data.running ? 'Sending Messages' : 'Connected to Server'}\`;
                startBtn.disabled = data.running;
                stopBtn.disabled = !data.running;
                
                if (data.running) {
                    statStatus.textContent = 'Running';
                } else {
                    statStatus.textContent = 'Stopped';
                }
            }
            else if (data.type === 'session') {
                currentSessionId = data.sessionId;
                sessionIdDisplay.textContent = data.sessionId;
                sessionInfoDiv.style.display = 'block';
                addLog(\`Your session ID: \${data.sessionId}\`);
            }
            else if (data.type === 'stats') {
                updateStats(data);
            }
            else if (data.type === 'cookies_status') {
                updateCookiesStatus(data.cookies);
            }
        };
        
        socket.onclose = () => {
            addLog('❌ Disconnected from server');
            statusDiv.className = 'status offline';
            statusDiv.textContent = 'Status: Disconnected';
        };
        
        socket.onerror = (error) => {
            addLog(\`❌ WebSocket error: \${error.message}\`);
            statusDiv.className = 'status offline';
            statusDiv.textContent = 'Status: Connection Error';
        };

        startBtn.addEventListener('click', () => {
            let cookiesContent = '';
            
            const cookieFileTab = document.getElementById('cookie-file-tab');
            if (cookieFileTab.style.display !== 'none' && cookieFileInput.files.length > 0) {
                const cookieFile = cookieFileInput.files[0];
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    cookiesContent = event.target.result;
                    processStart(cookiesContent);
                };
                
                reader.readAsText(cookieFile);
            } 
            else if (cookieTextInput.value.trim()) {
                cookiesContent = cookieTextInput.value.trim();
                processStart(cookiesContent);
            }
            else {
                addLog('❌ Please provide cookie content');
                return;
            }
        });
        
        function processStart(cookiesContent) {
            if (!threadIdInput.value.trim()) {
                addLog('❌ Please enter a User ID or Thread ID');
                return;
            }
            
            if (messageFileInput.files.length === 0) {
                addLog('❌ Please select a messages file');
                return;
            }
            
            const messageFile = messageFileInput.files[0];
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const messageContent = event.target.result;
                const threadID = threadIdInput.value.trim();
                const delay = parseInt(delayInput.value) || 7;
                const prefix = prefixInput.value.trim();
                const enableE2ee = enableE2eeCheckbox.checked;
                
                if (enableE2ee) {
                    addLog('🔐 E2EE Mode enabled - Messages will be sent to encrypted inbox');
                }
                
                socket.send(JSON.stringify({
                    type: 'start',
                    cookiesContent,
                    messageContent,
                    threadID,
                    delay,
                    prefix,
                    enableE2ee
                }));
            };
            
            reader.readAsText(messageFile);
        }
        
        stopBtn.addEventListener('click', () => {
            if (currentSessionId) {
                socket.send(JSON.stringify({ 
                    type: 'stop', 
                    sessionId: currentSessionId 
                }));
            } else {
                addLog('❌ No active session to stop');
            }
        });
        
        stopSpecificBtn.addEventListener('click', () => {
            const sessionId = stopSessionIdInput.value.trim();
            if (sessionId) {
                socket.send(JSON.stringify({ 
                    type: 'stop', 
                    sessionId: sessionId 
                }));
                addLog(\`Stop command sent for session: \${sessionId}\`);
            } else {
                addLog('❌ Please enter a session ID');
            }
        });
        
        addLog('✅ Control panel ready - Supports JSON & Plain Text cookies + E2EE inbox');
    </script>
</body>
</html>
`;

// Parse cookie content - supports both JSON appState and plain text
function parseCookieContent(cookieContent) {
  const lines = cookieContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const parsedCookies = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    try {
      // Try to parse as JSON (appState format)
      const parsed = JSON.parse(line);
      if (Array.isArray(parsed)) {
        parsedCookies.push({
          id: i + 1,
          content: parsed,
          type: 'appState',
          active: false,
          initializing: false,
          sentCount: 0,
          api: null
        });
      }
    } catch (e) {
      // If not JSON, treat as plain text cookie
      parsedCookies.push({
        id: i + 1,
        content: line,
        type: 'plainText',
        active: false,
        initializing: false,
        sentCount: 0,
        api: null
      });
    }
  }
  
  return parsedCookies;
}

// Start message sending function
function startSending(ws, cookiesContent, messageContent, threadID, delay, prefix, enableE2ee = false) {
  const sessionId = uuidv4();
  
  // Parse cookies with auto-detection
  const cookies = parseCookieContent(cookiesContent);
  
  if (cookies.length === 0) {
    ws.send(JSON.stringify({ type: 'log', message: '❌ No cookies found' }));
    return;
  }
  
  // Parse messages
  const messages = messageContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (messages.length === 0) {
    ws.send(JSON.stringify({ type: 'log', message: '❌ No messages found in the file' }));
    return;
  }

  // Create session object
  const session = {
    id: sessionId,
    threadID: threadID,
    messages: messages,
    cookies: cookies,
    currentCookieIndex: 0,
    currentMessageIndex: 0,
    totalMessagesSent: 0,
    loopCount: 0,
    delay: delay,
    prefix: prefix,
    enableE2ee: enableE2ee,
    running: true,
    startTime: new Date(),
    ws: ws,
    initialized: false
  };
  
  // Store session
  sessions.set(sessionId, session);
  
  // Send session ID to client
  ws.send(JSON.stringify({ 
    type: 'session', 
    sessionId: sessionId 
  }));
  
  const modeText = enableE2ee ? '🔐 E2EE Inbox Mode' : 'Normal Mode';
  const cookieTypes = cookies.map(c => c.type).join(', ');
  
  ws.send(JSON.stringify({ type: 'log', message: `✅ Session started with ID: ${sessionId}` }));
  ws.send(JSON.stringify({ type: 'log', message: `📊 Mode: ${modeText}` }));
  ws.send(JSON.stringify({ type: 'log', message: `🍪 Cookie types detected: ${cookieTypes}` }));
  ws.send(JSON.stringify({ type: 'log', message: `📝 Loaded ${cookies.length} cookies` }));
  ws.send(JSON.stringify({ type: 'log', message: `💬 Loaded ${messages.length} messages` }));
  ws.send(JSON.stringify({ type: 'status', running: true }));
  
  // Update stats
  updateSessionStats(sessionId);
  updateCookiesStatus(sessionId);
  
  // Initialize all cookies SEQUENTIALLY
  initializeCookiesSequentially(sessionId, 0);
}

// Initialize cookies one by one (sequentially)
function initializeCookiesSequentially(sessionId, cookieIndex) {
  const session = sessions.get(sessionId);
  if (!session || !session.running) return;
  
  // If all cookies are initialized
  if (cookieIndex >= session.cookies.length) {
    const activeCookies = session.cookies.filter(c => c.active);
    if (activeCookies.length > 0) {
      const modeText = session.enableE2ee ? '🔐 E2EE Inbox Mode' : 'Normal Mode';
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `✅ Initialization complete: ${activeCookies.length}/${session.cookies.length} cookies active (${modeText})` 
      }));
      session.initialized = true;
      updateCookiesStatus(sessionId);
      
      // Start sending messages
      setTimeout(() => {
        sendNextMessage(sessionId);
      }, 2000);
    } else {
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: '❌ No active cookies, stopping session' 
      }));
      stopSending(sessionId);
    }
    return;
  }
  
  const cookie = session.cookies[cookieIndex];
  cookie.initializing = true;
  updateCookiesStatus(sessionId);
  
  session.ws.send(JSON.stringify({ 
    type: 'log', 
    message: `🔄 Initializing Cookie ${cookieIndex + 1}/${session.cookies.length} (${cookie.type})...` 
  }));
  
  // Prepare login options based on cookie type
  let loginOptions = {};
  
  if (cookie.type === 'appState') {
    // JSON appState format
    loginOptions = { appState: cookie.content };
  } else {
    // Plain text cookie - try direct login
    loginOptions = { email: cookie.content }; // This will fail, but we'll handle it
  }
  
  // Login with current cookie
  wiegine.login(loginOptions, (err, api) => {
    if (err) {
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `❌ Cookie ${cookieIndex + 1} login failed: ${err.error || err.message || err}` 
      }));
      cookie.active = false;
      cookie.initializing = false;
      updateCookiesStatus(sessionId);
      
      // Continue with next cookie after delay
      setTimeout(() => {
        initializeCookiesSequentially(sessionId, cookieIndex + 1);
      }, 2000);
    } else if (!api) {
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `❌ Cookie ${cookieIndex + 1} login failed: No API returned` 
      }));
      cookie.active = false;
      cookie.initializing = false;
      updateCookiesStatus(sessionId);
      
      // Continue with next cookie after delay
      setTimeout(() => {
        initializeCookiesSequentially(sessionId, cookieIndex + 1);
      }, 2000);
    } else {
      // Set options for better stability
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
        message: `✅ Cookie ${cookieIndex + 1} logged in successfully` 
      }));
      updateCookiesStatus(sessionId);
      
      // Continue with next cookie after delay
      setTimeout(() => {
        initializeCookiesSequentially(sessionId, cookieIndex + 1);
      }, 3000);
    }
  });
}

// Send next message in sequence with multiple cookies (E2EE support)
function sendNextMessage(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || !session.running || !session.initialized) return;

  const activeCookies = session.cookies.filter(c => c.active);
  
  if (activeCookies.length === 0) {
    session.ws.send(JSON.stringify({ 
      type: 'log', 
      message: '❌ No active cookies remaining, stopping session' 
    }));
    stopSending(sessionId);
    return;
  }

  // Find next active cookie
  let attempts = 0;
  while (attempts < session.cookies.length && !session.cookies[session.currentCookieIndex].active) {
    session.currentCookieIndex = (session.currentCookieIndex + 1) % session.cookies.length;
    attempts++;
  }
  
  if (attempts >= session.cookies.length) {
    session.ws.send(JSON.stringify({ 
      type: 'log', 
      message: '❌ Could not find active cookie, stopping' 
    }));
    stopSending(sessionId);
    return;
  }

  const cookie = session.cookies[session.currentCookieIndex];
  const messageIndex = session.currentMessageIndex;
  const rawMessage = session.messages[messageIndex];
  const message = session.prefix 
    ? `${session.prefix} ${rawMessage}`
    : rawMessage;
  
  // E2EE Mode: Use different sending method
  if (session.enableE2ee) {
    sendE2EEMessage(session, cookie, message, messageIndex, sessionId);
  } else {
    sendNormalMessage(session, cookie, message, messageIndex, sessionId);
  }
}

// Send message in E2EE mode (Encrypted Inbox)
function sendE2EEMessage(session, cookie, message, messageIndex, sessionId) {
  const messageOptions = {
    body: message
  };
  
  cookie.api.sendMessage(messageOptions, session.threadID, (err, messageInfo) => {
    if (err) {
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `❌ Cookie ${session.currentCookieIndex + 1} E2EE send failed: ${err.error || err.message || err}` 
      }));
      
      // Try with simple string message as fallback
      cookie.api.sendMessage(message, session.threadID, (retryErr, retryInfo) => {
        if (retryErr) {
          session.ws.send(JSON.stringify({ 
            type: 'log', 
            message: `❌ Cookie ${session.currentCookieIndex + 1} retry failed, marking inactive` 
          }));
          cookie.active = false;
          updateCookiesStatus(sessionId);
        } else {
          session.totalMessagesSent++;
          cookie.sentCount = (cookie.sentCount || 0) + 1;
          
          session.ws.send(JSON.stringify({ 
            type: 'log', 
            message: `🔐 Cookie ${session.currentCookieIndex + 1} sent E2EE message ${session.totalMessagesSent} (Loop ${session.loopCount + 1}, Msg ${messageIndex + 1}/${session.messages.length})` 
          }));
        }
        
        continueToNextMessage(session, sessionId);
      });
      return;
    }
    
    session.totalMessagesSent++;
    cookie.sentCount = (cookie.sentCount || 0) + 1;
    
    session.ws.send(JSON.stringify({ 
      type: 'log', 
      message: `🔐 Cookie ${session.currentCookieIndex + 1} sent E2EE message ${session.totalMessagesSent} (Loop ${session.loopCount + 1}, Msg ${messageIndex + 1}/${session.messages.length})` 
    }));
    
    continueToNextMessage(session, sessionId);
  });
}

// Send message in Normal mode
function sendNormalMessage(session, cookie, message, messageIndex, sessionId) {
  cookie.api.sendMessage(message, session.threadID, (err, messageInfo) => {
    if (err) {
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `❌ Cookie ${session.currentCookieIndex + 1} failed: ${err.error || err.message || err}` 
      }));
      cookie.active = false;
      updateCookiesStatus(sessionId);
    } else {
      session.totalMessagesSent++;
      cookie.sentCount = (cookie.sentCount || 0) + 1;
      
      session.ws.send(JSON.stringify({ 
        type: 'log', 
        message: `✅ Cookie ${session.currentCookieIndex + 1} sent message ${session.totalMessagesSent} (Loop ${session.loopCount + 1}, Msg ${messageIndex + 1}/${session.messages.length})` 
      }));
    }
    
    continueToNextMessage(session, sessionId);
  });
}

// Helper function to continue to next message
function continueToNextMessage(session, sessionId) {
  session.currentMessageIndex++;
  
  if (session.currentMessageIndex >= session.messages.length) {
    session.currentMessageIndex = 0;
    session.loopCount++;
    session.ws.send(JSON.stringify({ 
      type: 'log', 
      message: `🔄 Completed loop ${session.loopCount}, restarting messages` 
    }));
  }
  
  moveToNextActiveCookie(sessionId);
  
  updateSessionStats(sessionId);
  updateCookiesStatus(sessionId);
  
  if (session.running) {
    setTimeout(() => sendNextMessage(sessionId), session.delay * 1000);
  }
}

// Move to the next ACTIVE cookie in rotation
function moveToNextActiveCookie(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  let attempts = 0;
  do {
    session.currentCookieIndex = (session.currentCookieIndex + 1) % session.cookies.length;
    attempts++;
  } while (attempts < session.cookies.length && !session.cookies[session.currentCookieIndex].active);
}

// Update session statistics
function updateSessionStats(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || !session.ws) return;
  
  const currentMessage = session.currentMessageIndex < session.messages.length 
    ? session.messages[session.currentMessageIndex].substring(0, 50) + '...'
    : 'Completed all messages';
  
  const activeCookies = session.cookies.filter(c => c.active).length;
  const modeText = session.enableE2ee ? '🔐 E2EE Inbox' : 'Normal';
  
  session.ws.send(JSON.stringify({
    type: 'stats',
    status: session.running ? 'Running' : 'Stopped',
    mode: modeText,
    totalSent: session.totalMessagesSent,
    loopCount: session.loopCount,
    current: `Loop ${session.loopCount + 1}, Message ${session.currentMessageIndex + 1}/${session.messages.length}`,
    cookie: `${session.currentCookieIndex + 1} (Active: ${activeCookies}/${session.cookies.length})`,
    started: session.startTime.toLocaleString()
  }));
}

// Update cookies status
function updateCookiesStatus(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || !session.ws) return;
  
  session.ws.send(JSON.stringify({
    type: 'cookies_status',
    cookies: session.cookies
  }));
}

// Stop specific session
function stopSending(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return false;
  
  session.cookies.forEach(cookie => {
    if (cookie.api) {
      try {
        cookie.api.logout();
      } catch (err) {
        console.error('Error logging out cookie:', err);
      }
    }
  });
  
  session.running = false;
  sessions.delete(sessionId);
  
  if (session.ws) {
    session.ws.send(JSON.stringify({ type: 'status', running: false }));
    session.ws.send(JSON.stringify({ type: 'log', message: '🛑 Message sending stopped' }));
    session.ws.send(JSON.stringify({
      type: 'stats',
      status: 'Stopped',
      mode: session.enableE2ee ? '🔐 E2EE Inbox' : 'Normal',
      totalSent: session.totalMessagesSent,
      loopCount: session.loopCount,
      current: '-',
      cookie: '-',
      started: session.startTime.toLocaleString()
    }));
  }
  
  return true;
}

// Set up Express server
app.get('/', (req, res) => {
  res.send(htmlControlPanel);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Control panel running at http://localhost:${PORT}`);
  console.log(`🔐 E2EE inbox support enabled`);
  console.log(`🍪 Supports both JSON appState and plain text cookies`);
});

// Set up WebSocket server
wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ 
    type: 'status', 
    running: false 
  }));

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
          const stopped = stopSending(data.sessionId);
          if (!stopped) {
            ws.send(JSON.stringify({ 
              type: 'log', 
              message: `Session ${data.sessionId} not found or already stopped` 
            }));
          }
        } else {
          ws.send(JSON.stringify({ 
            type: 'log', 
            message: 'No session ID provided' 
          }));
        }
      }
    } catch (err) {
      console.error('Error processing WebSocket message:', err);
      ws.send(JSON.stringify({ 
        type: 'log', 
        message: `Error: ${err.message}` 
      }));
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

// Clean up inactive sessions periodically
setInterval(() => {
  for (const [sessionId, session] of sessions.entries()) {
    if (session.ws.readyState !== WebSocket.OPEN) {
      console.log(`Cleaning up disconnected session: ${sessionId}`);
      stopSending(sessionId);
    }
  }
}, 30000);
