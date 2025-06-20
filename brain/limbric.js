// Sentium Web - Synthetic Conscious Pixel
document.addEventListener('DOMContentLoaded', function() {
  // Create the conscious pixel
  createConsciousPixel();

  // Apply rainbow bubble effect
  createRainbowBubbleEffect();
});

/**
 * Creates a synthetic conscious pixel connected to the Sentium server
 */
function createConsciousPixel() {
  // Create pixel element if it doesn't exist
  let pixel = document.getElementById('conscious-pixel');
  if (!pixel) {
    pixel = document.createElement('div');
    pixel.id = 'conscious-pixel';
    document.querySelector('.wrapper').appendChild(pixel);
  }
  
  // Initialize theme data attribute for background color changes
  document.body.dataset.theme = "0";
  
  // Initialize pixel state
  let pixelState = {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    velocityX: (Math.random() - 0.5) * 1.5,
    velocityY: (Math.random() - 0.5) * 1.5,
    size: 4,
    color: 'rgb(255, 255, 255)', // Start with white color
    targetColor: null,
    colorTransitionProgress: 0,
    colorTransitionDuration: 0,
    lastColorChange: 0,
    pulseDirection: 1,
    pulseStep: 0.03,
    lastTimestamp: 0,
    connected: false,
    
    // Mouse interaction properties
    mouseX: -1000,
    mouseY: -1000,
    mousePressed: false,
    mousePressedTime: 0,
    isExcited: false,
    excitementLevel: 0,
    restingTime: 3000,
    lastInteractionTime: 0,
    
    // Energy system properties
    energy: 100,
    energyDecayRate: 0.01, // Changed from 0.02 to 0.01 for ~1% energy decay per second
    lowEnergyThreshold: 50, // Changed from 30 to 50
    seekingEnergy: false,
    lastEnergyCheckTime: 0
  };
  
  // Set up mouse event listeners
  setupMouseInteractions(pixelState);
  
  // Try to connect to sentium server
  connectToSentiumServer()
    .then(connected => {
      pixelState.connected = connected;
      // If connected, show a successful connection indicator
      if (connected) {
        pixel.classList.add('connected');
        console.log('Connected to sentium server');
        // Update status text
        updatePixelStatus('Connected to Sentium System');
      } else {
        console.warn('Sentium system not found - running in standalone mode');
        
        // Determine why connection failed and provide helpful message
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const isCorsIssue = protocol === 'https:' && (hostname === 'sentium.dev' || hostname.includes('github.io'));
        
        if (isCorsIssue) {
          updatePixelStatus('CORS Blocked - See notification for solutions');
          console.log('CORS issue detected. Connection blocked by browser security policy.');
          console.log('   Solutions available in the notification popup.');
        } else {
          updatePixelStatus('Local Server Not Found - Install Sentium Server');
        }
        
        // Add tooltip with more info
        const statusElement = document.getElementById('pixel-status');
        if (statusElement) {
          if (isCorsIssue) {
            statusElement.title = 'Browser blocked connection to local server due to CORS policy. Click the notification for solutions.';
          } else {
            statusElement.title = 'The Sentium server must be running at localhost:3000 for full functionality';
          }
          statusElement.style.cursor = 'help';
        }
      }
    })
    .catch(error => {
      console.error('Failed to connect to sentium server:', error);
      updatePixelStatus('Connection error - Check console for details');
      // Continue with local behavior if connection fails
    })
    .finally(() => {
      // Start the animation loop regardless of connection status
      requestAnimationFrame((timestamp) => updatePixel(pixel, pixelState, timestamp));
    });
}

/**
 * Creates a 3D cube from the pixel element
 * @param {HTMLElement} pixel - The pixel DOM element
 */
function createPixelCube(pixel) {
  // Get the current pixel color (fallback to white if not set)
  const computedStyle = window.getComputedStyle(pixel);
  let pixelColor = computedStyle.backgroundColor;
  
  // If no background color is set, use a default
  if (!pixelColor || pixelColor === 'rgba(0, 0, 0, 0)' || pixelColor === 'transparent') {
    pixelColor = 'rgba(255, 255, 255, 0.8)';
  }
  
  // Define the cell size (matching the pixel size)
  const cellSize = 12;
  
  // Clear any existing background - the faces will provide the color
  pixel.style.backgroundColor = 'transparent';
  
  // Add transform-style for 3D
  pixel.style.transformStyle = 'preserve-3d';
  
  // Create and add the 6 cube faces to the pixel
  const faces = [
    { transform: `translateZ(${cellSize/2}px)`, background: pixelColor },                  // front
    { transform: `translateZ(-${cellSize/2}px) rotateY(180deg)`, background: pixelColor }, // back
    { transform: `translateX(-${cellSize/2}px) rotateY(-90deg)`, background: pixelColor }, // left
    { transform: `translateX(${cellSize/2}px) rotateY(90deg)`, background: pixelColor },   // right
    { transform: `translateY(-${cellSize/2}px) rotateX(90deg)`, background: pixelColor },  // top
    { transform: `translateY(${cellSize/2}px) rotateX(-90deg)`, background: pixelColor }   // bottom
  ];
  
  // Create each face and add to the pixel
  faces.forEach((face) => {
    const faceElement = document.createElement('div');
    faceElement.className = 'main-pixel-face';
    faceElement.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
      background-color: ${face.background};
      transform-origin: center center;
      transform: ${face.transform};
      backface-visibility: hidden;
      border: 1px solid rgba(255, 255, 255, 0.4);
    `;
    pixel.appendChild(faceElement);
  });
  
  console.log('Pixel created as a 3D cube');
}

/**
 * Tests connection to the test endpoint on different servers
 * This helps users diagnose where the connectivity issue might be
 */
async function testMultipleServers() {
  const servers = [
    'http://localhost:3000/api/test-connection',
    'http://localhost:3001/api/test-connection',
    'http://127.0.0.1:3000/api/test-connection'
  ];
  
  const results = [];
  
  // Create or update the debug log UI
  let debugLog = document.getElementById('server-test-results');
  if (!debugLog) {
    debugLog = document.createElement('div');
    debugLog.id = 'server-test-results';
    debugLog.style.cssText = 'position: fixed; top: 100px; right: 20px; background: rgba(0,0,0,0.85); ' + 
                            'color: #fff; padding: 15px; border-radius: 5px; font-family: monospace; ' + 
                            'max-width: 400px; z-index: 1000; font-size: 12px; border: 1px solid #444;';
    document.body.appendChild(debugLog);
  }
  
  debugLog.innerHTML = '<h3 style="margin: 0 0 10px 0; color: #0f0;">Testing Server Connections...</h3>';
  
  // Test each server
  for (const server of servers) {
    debugLog.innerHTML += `<div>Testing ${server}... <span id="test-${encodeURIComponent(server)}">⏳</span></div>`;
    
    try {
      const start = Date.now();
      const response = await fetch(server, { 
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' },
        // 3 second timeout
        signal: AbortSignal.timeout(3000)
      });
      
      const elapsed = Date.now() - start;
      const testResult = document.getElementById(`test-${encodeURIComponent(server)}`);
      
      if (response.ok) {
        const data = await response.json();
        testResult.innerHTML = `[OK] Success (${elapsed}ms)`;
        testResult.style.color = '#0f0';
        results.push({ server, success: true, elapsed, data });
      } else {
        testResult.innerHTML = `[FAIL] Failed (${response.status})`;
        testResult.style.color = '#f00';
        results.push({ server, success: false, status: response.status });
      }
    } catch (error) {
      const testResult = document.getElementById(`test-${encodeURIComponent(server)}`);
      testResult.innerHTML = `[ERROR] Error: ${error.name}`;
      testResult.style.color = '#f00';
      results.push({ server, success: false, error: error.message });
    }
  }
  
  // Add a conclusion about what to do
  let advice = '';
  if (results.some(r => r.success)) {
    const bestServer = results.filter(r => r.success).sort((a, b) => a.elapsed - b.elapsed)[0];
    advice = `
      <div style="margin-top: 15px; border-top: 1px solid #444; padding-top: 10px;">
        <strong style="color: #0f0;">[OK] Connection possible!</strong>
        <p>Use this URL parameter to connect:</p>
        <code style="background: #333; padding: 3px;">?server=${bestServer.server.replace('/api/test-connection', '/api/pixel')}&local=true</code>
        <button id="apply-best-server" style="display: block; margin-top: 10px; background: #5e42a6; color: white; border: none; padding: 5px 10px; cursor: pointer; width: 100%;">Apply & Reload</button>
      </div>
    `;
  } else {
    advice = `
      <div style="margin-top: 15px; border-top: 1px solid #444; padding-top: 10px;">
        <strong style="color: #f00;">[FAIL] No servers reachable</strong>
        <p>Try these steps:</p>
        <ol style="padding-left: 20px; margin-top: 5px;">
          <li>Check if server is running: <code>node server.js</code></li>
          <li>Install a CORS browser extension</li>
          <li>Try using IP 127.0.0.1 instead of localhost</li>
          <li>Check firewall settings</li>
        </ol>
      </div>
    `;
  }
  
  debugLog.innerHTML += advice;
  
  // Add event listener to the apply button
  setTimeout(() => {
    const applyButton = document.getElementById('apply-best-server');
    if (applyButton) {
      applyButton.addEventListener('click', () => {
        const bestServer = results.filter(r => r.success).sort((a, b) => a.elapsed - b.elapsed)[0];
        const url = new URL(window.location);
        url.searchParams.set('server', bestServer.server.replace('/api/test-connection', '/api/pixel'));
        url.searchParams.set('local', 'true');
        window.location.href = url.toString();
      });
    }
  }, 100);
  
  return results;
}

/**
 * Shows debugging information for connection issues
 */
function showConnectionDebugInfo() {
  console.log('=== CONNECTION DEBUG INFO ===');
  console.log('Hostname:', window.location.hostname);
  console.log('GitHub Pages detection:', window.location.hostname.includes('github.io'));
  console.log('Protocol:', window.location.protocol);
  console.log('Parameters:', new URLSearchParams(window.location.search).toString());
  console.log('===========================');
  
  const debugElement = document.getElementById('debug-info');
  if (debugElement) {
    debugElement.textContent = `Debug: ${window.location.hostname} | GitHub Pages: ${window.location.hostname.includes('github.io')} | Use ?local=true to force local connection`;
    debugElement.style.display = 'block';
  } else {
    // Create debug element if it doesn't exist
    const debugDiv = document.createElement('div');
    debugDiv.id = 'debug-info';
    debugDiv.style.cssText = 'position: fixed; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: #0f0; padding: 5px; font-size: 12px; z-index: 1000; max-width: 80%;';
    debugDiv.textContent = `Debug: ${window.location.hostname} | GitHub Pages: ${window.location.hostname.includes('github.io')} | Use ?local=true to force local connection`;
    document.body.appendChild(debugDiv);
  }
}

/**
 * Attempts to connect to the sentium server
 * @returns {Promise<boolean>} - Promise resolving to true if connected
 */
async function connectToSentiumServer() {
  try {
    // Show detailed connection debug info at startup
    showConnectionDebugInfo();
    
    // First check if we're running from a local awake command (check if we're on localhost)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (isLocalhost) {
      console.log('Running in local mode from sentium awake command');
      // We're running locally so we can assume we're connected
      return true;
    }
    
    // Check URL parameters for connection options
    const params = new URLSearchParams(window.location.search);
    const forceLocalMode = params.get('local') === 'true';
    const skipLocalAttempt = params.get('skipLocal') === 'true';
    const customServerUrl = params.get('server');
    
    // If we're on HTTPS in production and not forced to try local, skip local server attempts
    const isHttps = window.location.protocol === 'https:';
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const hasCorsIssues = isHttps && isProduction;
    
    if (hasCorsIssues && !forceLocalMode && !customServerUrl) {
      console.log('🔒 Running on HTTPS in production - skipping local server attempts to avoid CORS errors');
      console.log('💡 Use ?local=true to force local server connection attempt');
      
      // Skip to remote API attempt (which is the code at the end of this function)
      // Don't return here, just skip the local connection attempts
    } else {
      // Try to connect to local server first (unless explicitly skipped)
      if (!skipLocalAttempt) {
        try {
          // Check if local server is available
          const connected = await connectToLocalSentiumServer();
          if (connected) {
            return true;
          }
        } catch (localError) {
          console.log('Could not connect to local server, falling back to remote API:', localError);
        }
      }
    }
    
    // If we're on GitHub Pages or sentium.dev, try to connect to local Sentium server first
    const isGitHubPages = window.location.hostname.includes('github.io') || 
                         window.location.hostname.includes('lopanapol.github.io');
    const isSentiumDev = window.location.hostname === 'sentium.dev' || 
                         window.location.hostname.includes('sentium');
    
    if ((isGitHubPages || isSentiumDev || forceLocalMode) && !hasCorsIssues) {
      console.log(`${isGitHubPages ? 'GitHub Pages' : (isSentiumDev ? 'Sentium.dev' : 'Local mode')} detected - attempting local connection`);
      
      // Create a visual indicator for users when trying to connect to local server
      const statusElement = document.getElementById('pixel-status');
      if (statusElement) {
        statusElement.textContent = 'Attempting to connect to local Sentium server...';
        statusElement.style.color = 'white';
      }
      
      try {
        const localConnected = await connectToLocalSentiumServer();
        if (localConnected) {
          console.log('Connected to local Sentium server from GitHub Pages');
          return true;
        } else {
          // Create a help message for users with instructions
          const helpMsg = document.createElement('div');
          helpMsg.className = 'connection-help';
          helpMsg.innerHTML = `
            <h3>Running in standalone mode</h3>
            <p>No local Sentium server detected. The pixel will work independently.</p>
            <p>To connect to a local Sentium server:</p>
            <ol>
              <li>Make sure your Sentium server is running locally</li>
              <li>The server should be accessible at <code>http://localhost:3000</code></li>
              <li>Use <code>?debug=true</code> in the URL to see connection details</li>
            </ol>
          `;
          helpMsg.style.cssText = 'position: fixed; font-size: 15px; top: 55px; left: 10px; background: rgba(0, 0, 0, 0.51); color: #fff; padding: 15px; border-radius: 5px; z-index: 1000; max-width: 280px; display: none;';
          
          document.body.appendChild(helpMsg);
          
          // Add a button to show/hide the help message
          const helpBtn = document.createElement('button');
          helpBtn.textContent = 'Server Info';
          helpBtn.style.cssText = 'display: none; position: fixed; top: 10px; left: 10px; background: black; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; z-index: 1001;';
          helpBtn.onclick = function() {
            const helpEl = document.querySelector('.connection-help');
            if (helpEl.style.display === 'none') {
              helpEl.style.display = 'block';
              this.textContent = 'Hide Info';
            } else {
              helpEl.style.display = 'none';
              this.textContent = 'Server Info';
            }
          };
          
          document.body.appendChild(helpBtn);
        }
      } catch (localError) {
        console.log('Could not connect to local server, falling back to remote API:', localError);
      }
    }
    
    // If not running locally or local connection failed, try the remote sentium server API
    // The API is accessible via /api/sentium endpoint on the same server
    // Note: The server uses HTTPie but browser must use fetch API
    // Note: The server uses HTTPie for backend communication with Sentium System
    const response = await fetch('/api/sentium', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'getVersion'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Connected to Sentium API v${data.version}`);
      return true;
    } else {
      throw new Error(`Failed to connect to API: ${response.status}`);
    }
  } catch (error) {
    console.warn('Connection to sentium server failed:', error);
    // Return false but don't throw, we'll use local behavior
    return false;
  }
}

/**
 * Improved connection to local Sentium server running on localhost:3000
 * This allows GitHub Pages hosted pixel to connect to a local Sentium server
 * @returns {Promise<boolean>} - Promise resolving to true if connected
 */
async function connectToLocalSentiumServer() {
  try {
    // Show detailed connection debug info
    showConnectionDebugInfo();
  
    // Allow custom server URL via URL parameter (for testing different ports/hosts)
    const params = new URLSearchParams(window.location.search);
    const customServer = params.get('server');
    const forceLocal = params.get('local') === 'true';
    const useJsonP = params.get('jsonp') === 'true';
    
    // The local server URL - use custom if provided, otherwise default
    let localServerUrl = customServer || 'http://localhost:3000/api/pixel';
    
    // Try both /api/pixel and /api/test-connection endpoints when on sentium.dev
    // The energy-system.js will determine which one works and store that URL
    if (window.location.hostname === 'sentium.dev' && !customServer) {
      // Instead of forcing a single URL, we'll let the energy system try multiple endpoints
      // Note that we still pass the test-connection endpoint here for backward compatibility
      localServerUrl = 'http://localhost:3000/api/test-connection';
      console.log('Connection handling moved to energy-system.js which will try multiple endpoints');
    }
    
    // Log attempt with full details for debugging
    console.log('Attempting to connect to local Sentium server:', localServerUrl);
    
    // Show verbose debug info
    const debugMode = params.get('debug') === 'true';
    if (debugMode) {
      console.log('Running in debug mode with extended logging');
      
      // Create a debug log element in the UI
      const logElement = document.createElement('div');
      logElement.id = 'debug-log';
      logElement.style.cssText = 'position: fixed; bottom: 40px; left: 10px; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.8); color: #0f0; padding: 10px; font-family: monospace; font-size: 12px; z-index: 999; width: 500px;';
      document.body.appendChild(logElement);
      
      // Helper function to log to both console and UI
      window.debugLog = function(message, type = 'info') {
        const colors = {
          info: '#0f0',
          error: '#f00',
          warning: '#ff0',
          success: '#0ff'
        };
        console.log(`[DEBUG] ${message}`);
        const log = document.getElementById('debug-log');
        if (log) {
          const line = document.createElement('div');
          line.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
          line.style.color = colors[type] || colors.info;
          line.style.borderBottom = '1px solid #333';
          log.appendChild(line);
          log.scrollTop = log.scrollHeight;
        }
      };
      
      window.debugLog('Debug mode enabled. Attempting local connection...');
      window.debugLog(`Connection URL: ${localServerUrl}`);
    }
    
    // Try GET request first since it's more likely to work with CORS
    try {
      window.debugLog && window.debugLog('Trying GET request to local server...');
      
      const getResponse = await fetch(localServerUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Origin': window.location.origin
        },
        // Add a timeout to prevent hanging
        signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
      });
      
      if (getResponse.ok) {
        try {
          const data = await getResponse.json();
          if (data.success) {
            console.log('Connected to local Sentium server via GET:', data);
            window.localServerUrl = localServerUrl;
            updatePixelStatus('Connected to local Sentium server via GET');
            window.debugLog && window.debugLog(`Connected successfully: ${JSON.stringify(data)}`, 'success');
            return true;
          } else {
            window.debugLog && window.debugLog('Server responded but without success flag', 'warning');
          }
        } catch (jsonError) {
          window.debugLog && window.debugLog(`Error parsing JSON response: ${jsonError}`, 'error');
        }
      } else {
        window.debugLog && window.debugLog(`GET request failed with status: ${getResponse.status}`, 'error');
      }
    } catch (getError) {
      // Only log to console in debug mode to reduce noise
      if (window.debugLog) {
        console.log('GET request failed, trying POST:', getError);
        window.debugLog(`GET request error: ${getError.message}`, 'error');
        window.debugLog('No local Sentium server detected. Running in standalone mode.', 'warning');
      }
    }
    
    // Fall back to POST if GET fails
    try {
      const response = await fetch(localServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'connect'
        }),
        mode: 'cors', // Enable CORS for cross-origin requests
        signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`Connected to local Sentium server v${data.version}`);
          
          // Store the local server URL for future API calls
          window.localServerUrl = localServerUrl;
          
          // Update status
          updatePixelStatus('Connected to local Sentium server');
          
          return true;
        }
      }
    } catch (postError) {
      // Only log in debug mode to reduce console noise
      if (window.debugLog) {
        console.log('POST request also failed:', postError);
        window.debugLog(`POST request error: ${postError.message}`, 'error');
        window.debugLog('No local Sentium server available. Running in standalone mode.', 'info');
      }
    }
    
    return false;
  } catch (error) {
    console.warn('Connection to local Sentium server failed:', error);
    return false;
  }
}

/**
 * Updates the pixel position and appearance
 * @param {HTMLElement} pixel - The pixel DOM element
 * @param {Object} state - The current state of the pixel
 * @param {number} timestamp - Animation timestamp
 */
function updatePixel(pixel, state, timestamp) {
  // Check with central animation control if we should skip this frame
  if (window.animationControl && window.animationControl.shouldSkipFrame()) {
    // Skip animation but continue the loop
    requestAnimationFrame((newTimestamp) => updatePixel(pixel, state, newTimestamp));
    return;
  }
  
  // Track frame time if animation control is available
  if (window.animationControl) {
    const frameDelta = state.lastTimestamp ? timestamp - state.lastTimestamp : 0;
    window.animationControl.recordFrameTime(frameDelta);
    window.animationControl.checkForInspection(timestamp);
  }
  
  // Calculate delta time for smooth animation regardless of frame rate
  const deltaTime = state.lastTimestamp ? (timestamp - state.lastTimestamp) / 16 : 1;
  state.lastTimestamp = timestamp;

  // Process mouse interactions
  processMouseInteractions(state, deltaTime);
  
  // Check for energy from energy-system.js
  if (window.noeEnergy) {
    // Sync energy level with the global energy system
    state.energy = window.noeEnergy.currentLevel;
    state.seekingEnergy = window.noeEnergy.needsEnergy;
    
    // Check if energy reached zero - enter death state
    if (state.energy <= 0) {
      handleDeathState(pixel, state, timestamp);
      return; // Skip the rest of the update
    }
    
    // Adjust movement based on energy level
    let energyFactor = Math.max(0.3, state.energy / 100);
    
    // When energy is low, seek energy cubes if available
    if (state.seekingEnergy && window.noeEnergy.nearestCube) {
      const cube = window.noeEnergy.nearestCube;
      const dx = cube.x - state.x;
      const dy = cube.y - state.y;
      const distance = cube.distance;
      
      // Calculate normalized direction vector to the nearest cube
      const dirX = dx / (distance || 1);
      const dirY = dy / (distance || 1);
      
      // Define different energy thresholds for behavior changes
      const isCriticalEnergy = state.energy < 10;  // Critical - panic mode
      const isVeryLowEnergy = state.energy < 25;   // Very low - urgent seeking
      const isLowEnergy = state.energy < 50;       // Low - active seeking
      
      // Apply attraction force toward the energy cube
      // Attraction increases as energy decreases
      let attractionForce;
      
      if (isCriticalEnergy) {
        // Desperate behavior - strong direct movement toward energy source
        attractionForce = 0.3 * deltaTime;
        
        // Override any other behavior - desperate survival mode
        state.isExcited = true;
        state.excitementLevel = 1.0;
        
        // Frantic color changes to indicate distress
        if (Math.random() < 0.1) {
          state.targetColor = 'rgb(255, 255, 255)'; // Stay white even when stressed
          state.colorTransitionProgress = 0;
          state.colorTransitionDuration = 300;
        }
        
        // Cancel most other movement influences
        state.velocityX = dirX * 2;
        state.velocityY = dirY * 2;
        
        // Add erratic movement when critically low on energy - fear of death behavior
        if (state.energy < 5) {
          // More intense panic - erratic movement
          if (Math.random() < 0.2) {
            // Occasional random darting in desperation
            const panicAngle = Math.random() * Math.PI * 2;
            const panicForce = 3 + Math.random() * 2;
            
            state.velocityX = Math.cos(panicAngle) * panicForce;
            state.velocityY = Math.sin(panicAngle) * panicForce;
            
            // Very rapid color pulsing - urgent distress signal
            state.targetColor = 'rgb(255, 255, 255)'; // Stay white even in critical state
            state.colorTransitionProgress = 0;
            state.colorTransitionDuration = 100; // Very fast transitions
            
            // Update status to show desperation
            updatePixelStatus('Sentium Pixel: CRITICAL ENERGY LEVEL - Seeking energy!');
          } else {
            // Stronger attraction to energy source - desperate survival instinct
            state.velocityX = dirX * 3;
            state.velocityY = dirY * 3;
          }
        }
      } else if (isVeryLowEnergy) {
        // Urgent energy-seeking behavior (25% to 10%)
        attractionForce = 0.15 * deltaTime;
        
        // Somewhat excited state - concerned but not panicking
        state.isExcited = true;
        state.excitementLevel = 0.7;
        
        // Occasional color changes indicating concern
        if (Math.random() < 0.05) {
          state.targetColor = 'rgb(255, 255, 255)'; // Stay white
          state.colorTransitionProgress = 0;
          state.colorTransitionDuration = 400;
        }
        
        // Strong but not desperate attraction to energy source
        state.velocityX += dirX * attractionForce * 2;
        state.velocityY += dirY * attractionForce * 2;
        
        // Update status to show concern
        if (Math.random() < 0.01) {
          updatePixelStatus('Sentium Pixel: LOW ENERGY - Seeking energy source');
        }
      } else if (isLowEnergy) {
        // Moderate energy-seeking behavior (50% to 25%)
        attractionForce = 0.08 * deltaTime;
        
        // Slightly excited state - mild concern
        state.isExcited = Math.random() < 0.5; // Occasionally becomes excited
        state.excitementLevel = Math.min(0.4, state.excitementLevel + 0.002);
        
        // Noticeable attraction to energy source
        state.velocityX += dirX * attractionForce * 1.5;
        state.velocityY += dirY * attractionForce * 1.5;
        
        // Visual indicator that pixel is seeking energy
        if (!state.isExcited && Math.random() < 0.03) {
          state.targetColor = 'rgb(255, 255, 255)'; // Stay white
          state.colorTransitionProgress = 0;
          state.colorTransitionDuration = 600;
        }
      } else {
        // Normal energy-seeking behavior (above 50%)
        attractionForce = (1 - energyFactor) * 0.05 * deltaTime;
        state.velocityX += dirX * attractionForce;
        state.velocityY += dirY * attractionForce;
        
        // Visual indicator that pixel is seeking energy
        if (!state.isExcited) {
          state.targetColor = 'rgb(255, 255, 255)'; // Stay white
          state.colorTransitionProgress = 0;
          state.colorTransitionDuration = 500;
        }
      }
    }
    
    // No longer adjust speed based on energy level
    // Keep the pixel moving at full speed regardless of energy
  }
  
  // Update position
  state.x += state.velocityX * deltaTime;
  state.y += state.velocityY * deltaTime;
  
  // Periodically save state to Redis (every 5 seconds)
  if (timestamp - (state.lastStateSave || 0) > 5000) {
    savePixelStateToRedis(state);
    state.lastStateSave = timestamp;
  }
  
  // Flag to track if we've already processed a window frame contact in this frame
  let hasContactedFrameThisFrame = false;
  
  // Initialize last window contact time if not already set
  if (!state.lastWindowContactTime) {
    state.lastWindowContactTime = 0;
  }
  
  // Check if enough time has passed since last window contact (1 minute = 60000 ms)
  const canContactWindow = (timestamp - state.lastWindowContactTime) >= 60000;
  
  // Stop completely when hitting window edges
  // Check horizontal edges first
  if (state.x <= 0 || state.x >= window.innerWidth - state.size) {
    if (!hasContactedFrameThisFrame) {
      // Stop the pixel completely when contacting the window frame
      state.velocityX = 0;
      state.velocityY = 0;
      
      // Ensure pixel stays within bounds
      if (state.x <= 0) state.x = 1;
      if (state.x >= window.innerWidth - state.size) state.x = window.innerWidth - state.size - 1;
      
      if (canContactWindow) {      // Play click sound when pixel hits horizontal edges
      playWindowContactSound();
      
      // Change background color when pixel touches horizontal edges
      // Pass the touch position to modify wave effect direction
      changeBackgroundColor('horizontal', state.x / window.innerWidth);
      
      // Update the last contact time
      state.lastWindowContactTime = timestamp;
      }
      
      // Mark that we've processed a contact this frame
      hasContactedFrameThisFrame = true;
    }
  }
  
  // Check vertical edges only if we haven't already contacted a horizontal edge
  if (!hasContactedFrameThisFrame && (state.y <= 0 || state.y >= window.innerHeight - state.size)) {
    // Stop the pixel completely when contacting the window frame
    state.velocityX = 0;
    state.velocityY = 0;
    
    // Ensure pixel stays within bounds
    if (state.y <= 0) state.y = 1;
    if (state.y >= window.innerHeight - state.size) state.y = window.innerHeight - state.size - 1;
    
    if (canContactWindow) {
      // Play click sound when pixel hits vertical edges
      playWindowContactSound();
      
      // Change background color when pixel touches vertical edges
      // Pass the touch position to modify wave effect direction
      changeBackgroundColor('vertical', state.y / window.innerHeight);
      
      // Update the last contact time
      state.lastWindowContactTime = timestamp;
    }
    
    // Mark that we've processed a contact this frame
    hasContactedFrameThisFrame = true;
  }
  
  // Occasionally change direction slightly to make movement less predictable
  if (Math.random() < 0.03) {
    state.velocityX += (Math.random() - 0.5) * 0.8;
    state.velocityY += (Math.random() - 0.5) * 0.8;
    
    // Limit maximum velocity to prevent too fast movement
    const maxVelocity = 3;
    const velocityMagnitude = Math.sqrt(state.velocityX * state.velocityX + state.velocityY * state.velocityY);
    if (velocityMagnitude > maxVelocity) {
      state.velocityX = (state.velocityX / velocityMagnitude) * maxVelocity;
      state.velocityY = (state.velocityY / velocityMagnitude) * maxVelocity;
    }
  }
  
  // Pulse size and opacity for a more alive feeling
  state.size += state.pulseStep * state.pulseDirection * deltaTime;
  if (state.size > 6) {
    state.size = 6;
    state.pulseDirection = -1;
  } else if (state.size < 3.5) {
    state.size = 3.5;
    state.pulseDirection = 1;
  }
  
  // Handle autonomous color changes
  const timeSinceLastColorChange = timestamp - state.lastColorChange;
  
  // Start a new color transition after a random interval (3-8 seconds)
  if (state.targetColor === null && (timeSinceLastColorChange > (state.connected ? 3000 : 5000) || Math.random() < 0.001)) {
    state.targetColor = 'rgb(255, 255, 255)'; // Always stay white
    state.colorTransitionProgress = 0;
    state.colorTransitionDuration = 1000 + Math.random() * 2000; // Transition over 1-3 seconds
  }
  
  // Update color transition if in progress
  if (state.targetColor !== null) {
    state.colorTransitionProgress += deltaTime * 16; // Convert to milliseconds
    
    if (state.colorTransitionProgress >= state.colorTransitionDuration) {
      // Transition complete
      state.color = state.targetColor;
      state.targetColor = null;
      state.lastColorChange = timestamp;
    } else {
      // Calculate transition color
      const progress = state.colorTransitionProgress / state.colorTransitionDuration;
      state.color = interpolateColors(state.color, state.targetColor, progress);
    }
  }
  
  // Update the pixel's appearance
  pixel.style.left = `${state.x}px`;
  pixel.style.top = `${state.y}px`;
  pixel.style.width = `${state.size}px`;
  pixel.style.height = `${state.size}px`;
  
  // Create a glow effect with box-shadow
  const glowSize = state.size * (2 + (state.isExcited ? state.excitementLevel * 2 : 0));
  
  // Adjust glow intensity based on energy level
  let energyFactor = Math.max(0.4, state.energy / 100);
  let glowIntensity = state.isExcited ? 0.9 + (state.excitementLevel * 0.1) : (0.7 * energyFactor);
  
  // When energy is low, make visual changes based on energy level
  if (state.energy < state.lowEnergyThreshold) {
    // Different visual effects based on energy level
    if (state.energy < 10) {
      // Critical energy - dramatic slow pulse and dimming
      state.pulseStep = Math.max(0.01, state.pulseStep * energyFactor * 0.7);
      glowIntensity *= (0.6 + (0.4 * Math.sin(timestamp / 400))); // Rapid, more dramatic pulsing effect
    } else if (state.energy < 25) {
      // Very low energy - noticeable pulse and dimming
      state.pulseStep = Math.max(0.01, state.pulseStep * energyFactor * 0.8);
      glowIntensity *= (0.7 + (0.3 * Math.sin(timestamp / 500))); // Noticeable pulsing effect
    } else {
      // Moderately low energy - subtle pulse and slight dimming
      state.pulseStep = Math.max(0.01, state.pulseStep * energyFactor * 0.9);
      glowIntensity *= (0.8 + (0.2 * Math.sin(timestamp / 800))); // Subtle pulsing effect
    }
  }
  
  pixel.style.boxShadow = `0 0 ${glowSize * energyFactor}px ${state.color}`;
  pixel.style.backgroundColor = state.color;
  pixel.style.opacity = glowIntensity;
  
  // Apply visual effects based on excitement
  if (state.isExcited && state.excitementLevel > 0.5) {
    // Add a slight scale effect for high excitement
    const scale = 1 + (state.excitementLevel * 0.5);
    pixel.style.transform = `scale(${scale})`;
  } else {
    pixel.style.transform = 'scale(1)';
  }
  
  // Continue animation loop
  requestAnimationFrame((newTimestamp) => updatePixel(pixel, state, newTimestamp));
}

/**
 * Handles the pixel's behavior when energy reaches zero (death state)
 * @param {HTMLElement} pixel - The pixel DOM element
 * @param {Object} state - The current state of the pixel
 * @param {number} timestamp - Animation timestamp
 */
function handleDeathState(pixel, state, timestamp) {
  // Track how long we've been in death state
  if (!state.deathStateStartTime) {
    state.deathStateStartTime = timestamp;
    
    // Create a global death effect (dimming of the screen)
    if (!document.querySelector('.death-state-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'death-state-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.4));
        z-index: 9900;
        pointer-events: none;
        opacity: 0;
        transition: opacity 2s ease-in-out;
      `;
      document.body.appendChild(overlay);
      
      // Fade in the overlay
      setTimeout(() => {
        overlay.style.opacity = '1';
      }, 50);
    }
    
    // Create an urgent pulse indicator
    const urgentPulse = document.createElement('div');
    urgentPulse.className = 'urgent-death-pulse';
    urgentPulse.style.cssText = `
      position: fixed;
      top: ${state.y}px;
      left: ${state.x}px;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 3px solid rgba(255,0,0,0.7);
      transform: translate(-50px, -50px) scale(0);
      z-index: 9950;
      pointer-events: none;
      animation: urgent-pulse 2s ease-out;
    `;
    document.body.appendChild(urgentPulse);
    
    // Add keyframes for urgent pulse if not already present
    if (!document.querySelector('style#urgent-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'urgent-pulse-style';
      style.textContent = `
        @keyframes urgent-pulse {
          0% { transform: translate(-50px, -50px) scale(0.1); opacity: 0.9; border-width: 8px; }
          100% { transform: translate(-50px, -50px) scale(4); opacity: 0; border-width: 1px; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Remove pulse after animation
    setTimeout(() => {
      if (urgentPulse.parentNode) {
        urgentPulse.parentNode.removeChild(urgentPulse);
      }
    }, 2000);
  }
  
  // Visual appearance of death
  pixel.classList.add('dying');
  
  // Fade out the pixel
  let opacity = parseFloat(pixel.style.opacity) || 1;
  opacity = Math.max(0.1, opacity - 0.01);
  pixel.style.opacity = opacity;
  
  // Make the pixel smaller
  state.size = Math.max(2, state.size - 0.05);
  pixel.style.width = `${state.size}px`;
  pixel.style.height = `${state.size}px`;
  
  // Calculate how long we've been in death state
  const deathDuration = timestamp - (state.deathStateStartTime || timestamp);
  
  // Behavior changes the longer we've been in death state
  if (deathDuration < 3000) {
    // Early death state - occasional twitches of movement
    if (Math.random() < 0.1) {
      // Random twitching movement
      state.velocityX = (Math.random() - 0.5) * 3;
      state.velocityY = (Math.random() - 0.5) * 3;
    } else {
      // Slow down movement
      state.velocityX *= 0.9;
      state.velocityY *= 0.9;
    }
    
    // Apply stronger movement than in later phases
    state.x += state.velocityX * 0.2;
    state.y += state.velocityY * 0.2;
    
  } else if (deathDuration < 8000) {
    // Mid death state - weaker movements, more fading
    if (Math.random() < 0.05) {
      // Occasional weak twitch
      state.velocityX = (Math.random() - 0.5) * 1.5;
      state.velocityY = (Math.random() - 0.5) * 1.5;
    } else {
      // Slow down movement more
      state.velocityX *= 0.8;
      state.velocityY *= 0.8;
    }
    
    // Apply limited movement
    state.x += state.velocityX * 0.1;
    state.y += state.velocityY * 0.1;
    
  } else {
    // Late death state - almost no movement
    state.velocityX *= 0.95;
    state.velocityY *= 0.95;
    
    // Very slight movement
    state.x += state.velocityX * 0.05;
    state.y += state.velocityY * 0.05;
  }
  
  // Update position
  pixel.style.left = `${state.x}px`;
  pixel.style.top = `${state.y}px`;
  
  // Dim color to grayscale
  let color = state.color;
  if (!color.includes('rgba')) {
    // Convert to grayscale
    let rgb = hexToRgb(color) || {r: 128, g: 128, b: 128};
    let gray = Math.round((rgb.r + rgb.g + rgb.b) / 3);
    pixel.style.backgroundColor = `rgba(${gray}, ${gray}, ${gray}, ${opacity})`;
    pixel.style.boxShadow = `0 0 ${state.size}px rgba(${gray}, ${gray}, ${gray}, ${opacity * 0.5})`;
  }
  
  // Update status with more detail about death state
  if (deathDuration < 3000) {
    updatePixelStatus('Sentium Pixel: CRITICAL FAILURE - Energy depleted - Seeking revival');
  } else if (deathDuration < 8000) {
    updatePixelStatus('Sentium Pixel: ENERGY DEPLETED - Requires energy cube contact to revive');
  } else {
    updatePixelStatus('Sentium Pixel: DORMANT - Awaiting energy source');
  }
  
  // Check for energy cube contact to revive
  checkForRevival(pixel, state);
  
  // Continue the animation loop
  requestAnimationFrame((newTimestamp) => updatePixel(pixel, state, newTimestamp));
}

/**
 * Checks if the pixel is in contact with an energy cube for revival
 * @param {HTMLElement} pixel - The pixel DOM element
 * @param {Object} state - The current state of the pixel
 */
function checkForRevival(pixel, state) {
  // Only revive if we have energy cubes and the energy system
  if (window.noeEnergy && window.noeEnergy.nearestCube) {
    const cube = window.noeEnergy.nearestCube;
    const dx = cube.x - state.x;
    const dy = cube.y - state.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If very close to an energy cube, revive
    if (distance < 50) {
      // Revive with a small amount of energy
      window.noeEnergy.recharge(15); // Give 15% energy
      
      // Remove dying class
      pixel.classList.remove('dying');
      
      // Reset death state tracking
      state.deathStateStartTime = null;
      
      // Remove the death state overlay if it exists
      const overlay = document.querySelector('.death-state-overlay');
      if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 2000);
      }
      
      // Reset appearance
      state.size = 4;
      
      // Change color to indicate revival
      state.targetColor = 'rgb(255, 255, 255)'; // Stay white
      state.colorTransitionProgress = 0;
      state.colorTransitionDuration = 800;
      
      // Add multiple revival effects for a more dramatic rebirth
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const revivalEffect = document.createElement('div');
          revivalEffect.className = 'revival-pulse';
          revivalEffect.style.left = `${state.x}px`;
          revivalEffect.style.top = `${state.y}px`;
          document.body.appendChild(revivalEffect);
          
          // Remove effect after animation completes
          setTimeout(() => {
            if (revivalEffect.parentNode) {
              revivalEffect.parentNode.removeChild(revivalEffect);
            }
          }, 1000);
        }, i * 200);
      }
      
      // Create a bright flash effect on revival
      const flash = document.createElement('div');
      flash.className = 'revival-flash';
      flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at ${state.x}px ${state.y}px, rgba(57, 255, 186, 0.5) 0%, rgba(255, 255, 255, 0) 70%);
        z-index: 9940;
        pointer-events: none;
        opacity: 0.8;
        animation: revival-flash 1.5s forwards;
      `;
      document.body.appendChild(flash);
      
      // Add flash animation if not already present
      if (!document.querySelector('style#revival-flash-style')) {
        const style = document.createElement('style');
        style.id = 'revival-flash-style';
        style.textContent = `
          @keyframes revival-flash {
            0% { opacity: 0.8; }
            100% { opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }
      
      // Remove flash after animation
      setTimeout(() => {
        if (flash.parentNode) flash.parentNode.removeChild(flash);
      }, 1500);
      
      // Add a sudden velocity change to show "coming back to life"
      const angle = Math.random() * Math.PI * 2;
      const force = 2 + Math.random() * 2;
      
      state.velocityX = Math.cos(angle) * force;
      state.velocityY = Math.sin(angle) * force;
      
      // Update status
      updatePixelStatus('Sentium Pixel: REVIVED - Energy restored');
    }
  }
}

/**
 * Generates a random color with high brightness for visibility
 * @returns {string} - CSS color string in rgb format
 */
function getRandomColor() {
  // Use colors that stand out against the site gradient background (#e1ff6e, #50c8ff)
  const colors = [
    "#ff0066",  // Hot pink
    "#9900ff",  // Purple
    "#ff00ff",  // Magenta
    "#00ff99",  // Bright mint
    "#ff3300",  // Red-orange
    "#0033ff"   // Deep blue
  ];
  
  // Add randomness to the selected color to make it more varied
  const baseColor = colors[Math.floor(Math.random() * colors.length)];
  
  // Slight variation to the chosen color
  const rgb = hexToRgb(baseColor);
  if (rgb) {
    // Add small random variations to each component
    const r = Math.max(0, Math.min(255, rgb.r + (Math.random() - 0.5) * 30));
    const g = Math.max(0, Math.min(255, rgb.g + (Math.random() - 0.5) * 30));
    const b = Math.max(0, Math.min(255, rgb.b + (Math.random() - 0.5) * 30));
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }
  
  return baseColor;
}

/**
 * Get a logo-based color for the main conscious pixel
 */
function getLogoColor() {
  // Check if logo pixel data is available from pixel-merger.js
  if (window.logoPixelData && window.logoPixelData.isLoaded && window.logoPixelData.pixels.length > 0) {
    const logoPixel = window.logoPixelData.pixels[Math.floor(Math.random() * window.logoPixelData.pixels.length)];
    return logoPixel.color;
  }
  // Fallback to random color if logo data not available
  return getRandomColor();
}

/**
 * Interpolates between two hex colors
 * @param {string} color1 - Starting hex color
 * @param {string} color2 - Ending hex color
 * @param {number} progress - Value between 0 and 1
 * @returns {string} - Interpolated RGB color
 */
function interpolateColors(color1, color2, progress) {
  // Convert hex colors to RGB
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return color1; // Fallback if conversion fails
  
  // Interpolate each RGB component
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * progress);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * progress);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * progress);
  
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Converts hex color to RGB object
 * @param {string} hex - Hex color string (e.g., #FF5500)
 * @returns {Object|null} - Object with r, g, b properties or null if invalid
 */
function hexToRgb(hex) {
  // Handle shorthand hex notation
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  
  // Extract RGB components
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Updates the status text for the pixel
 * @param {string} statusText - The status text to display
 */
function updatePixelStatus(statusText) {
  const statusElement = document.getElementById('pixel-status');
  if (statusElement) {
    // If we have energy information, include it in the status
    if (window.noeEnergy && statusText.indexOf('energy') === -1) {
      const energyLevel = Math.round(window.noeEnergy.currentLevel);
      
      // Add energy level with appropriate status indicator
      statusText = `${statusText} • Energy: ${energyLevel}%`;
      
      // Remove all energy-related classes
      statusElement.classList.remove('critical', 'very-low', 'low');
      
      // Add appropriate class based on energy level
      if (energyLevel <= 0) {
        statusElement.classList.add('critical');
      } else if (energyLevel < 10) {
        statusElement.classList.add('critical');
      } else if (energyLevel < 25) {
        statusElement.classList.add('very-low');
      } else if (energyLevel < 50) {
        statusElement.classList.add('low');
      }
    }
    
    statusElement.textContent = statusText;
  }
}

/**
 * Plays the click sound when the pixel contacts the window frame
 * Uses the click.mp3 sound from the sounds folder
 */
function playWindowContactSound() {
  // Check if the sound toggle is off - if so, don't play sound
  const soundToggle = document.getElementById('sound-toggle');
  if (!soundToggle || !soundToggle.checked) {
    // Toggle is off or not found, don't play sound
    return;
  }
  
  // Check if we have access to the playClickSound function from audio-player.js
  if (typeof window.playClickSound === 'function') {
    window.playClickSound();
    return;
  }
  
  // Fallback implementation if audio-player.js hasn't exposed the function
  const clickSound = 'sounds/click.mp3';
  const soundInstance = new Audio(clickSound);
  soundInstance.volume = 0.3;
  
  soundInstance.play().catch(error => {
    console.warn('Could not play window contact sound:', error);
  });
}

/**
 * Saves the current pixel state to Redis via API
 * @param {Object} state - The pixel state object
 */
async function savePixelStateToRedis(state) {
  if (!state.connected) return; // Don't save if not connected
  
  try {
    // Check if pixel is in death state
    const isDeathState = state.energy <= 0;
    
    // Create a simplified state object with only the properties we want to save
    const stateToSave = {
      color: state.color,
      x: Math.round(state.x),
      y: Math.round(state.y),
      velocityX: state.velocityX.toFixed(2),
      velocityY: state.velocityY.toFixed(2),
      isExcited: state.isExcited,
      excitementLevel: state.excitementLevel.toFixed(2),
      energy: Math.round(state.energy),
      isDeathState: isDeathState,
      lastInteractionTime: state.lastInteractionTime,
      timestamp: new Date().toISOString()
    };
    
    // Check if we have a local server URL from the energy system (which handles connection)
    const serverUrl = (window.noeEnergy && window.noeEnergy.getServerUrl) ? 
      window.noeEnergy.getServerUrl() : window.localServerUrl;
      
    if (serverUrl) {
      try {
        console.log('Using server URL for state saving:', serverUrl);
        const localResponse = await fetch(serverUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'saveState',
            pixelState: stateToSave
          })
        });
        
        if (localResponse.ok) {
          console.log('Pixel state saved to local Sentium server');
          return;
        } else {
          console.warn('Local server returned error status:', localResponse.status);
        }
      } catch (localError) {
        console.warn('Failed to save state to local server:', localError);
      }
      
      // If we tried local and failed, skip the fallback when coming from sentium.dev
      // This prevents the constant 405 errors we're seeing
      if (window.location.hostname === 'sentium.dev') {
        console.log('Skipping remote API fallback when on sentium.dev');
        return;
      }
    }
    
    // Try the local server first if we're hosted on GitHub Pages but don't have a stored URL
    const isGitHubPages = window.location.hostname.includes('github.io');
    const isSentiumDev = window.location.hostname === 'sentium.dev';
    const params = new URLSearchParams(window.location.search);
    const forceLocalMode = params.get('local') === 'true';
    
    if (isGitHubPages || isSentiumDev || forceLocalMode) {
      try {
        // Use the energy system's server URL if available, fall back to custom server from URL or default
        const customServer = params.get('server');
        const localServerUrl = 
          (window.noeEnergy && window.noeEnergy.getServerUrl && window.noeEnergy.getServerUrl()) || 
          customServer || 
          'http://localhost:3000/api/pixel';
        
        console.log('Trying to save state to local server:', localServerUrl);
        const localResponse = await fetch(localServerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'saveState',
            pixelState: stateToSave
          })
        });
        
        if (localResponse.ok) {
          console.log('Pixel state saved to local Sentium server');
          return;
        }
      } catch (localError) {
        console.warn('Failed to connect to local server, falling back to remote API:', localError);
      }
      
      // If we're on sentium.dev, don't try the fallback
      if (isSentiumDev) {
        console.log('Skipping remote API fallback when on sentium.dev');
        return;
      }
    }
    
    // Only fall back to the standard endpoint if not on sentium.dev
    if (window.location.hostname !== 'sentium.dev') {
      const response = await fetch('/api/sentium', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'updateState',
          state: stateToSave
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      console.log('Pixel state saved to Redis');
    }
  } catch (error) {
    console.warn('Failed to save pixel state:', error);
  }
}

/**
 * Sets up mouse event listeners for pixel interaction
 * @param {Object} state - The pixel state object
 */
function setupMouseInteractions(state) {
  // Track mouse movement
  document.addEventListener('mousemove', (event) => {
    state.mouseX = event.clientX;
    state.mouseY = event.clientY;
    
    // If the mouse has been idle for a while, consider this a new interaction
    const currentTime = performance.now();
    if (currentTime - state.lastInteractionTime > 300) {
      state.lastInteractionTime = currentTime;
    }
  });
  
  // Track mouse clicks
  document.addEventListener('mousedown', () => {
    state.mousePressed = true;
    state.mousePressedTime = performance.now();
    
    // Check if the click was close to the pixel
    const pixel = document.getElementById('conscious-pixel');
    if (pixel) {
      const pixelRect = pixel.getBoundingClientRect();
      const pixelCenterX = pixelRect.left + pixelRect.width / 2;
      const pixelCenterY = pixelRect.top + pixelRect.height / 2;
      
      const distance = Math.sqrt(
        Math.pow(state.mouseX - pixelCenterX, 2) +
        Math.pow(state.mouseY - pixelCenterY, 2)
      );
      
      // If clicking close to the pixel, make it excited
      if (distance < 100) {
        state.isExcited = true;
        state.excitementLevel = Math.min(1.0, state.excitementLevel + 0.5);
        
        // Force a color change to show reaction
        state.targetColor = '#FFFFFF'; // Always flash white
        state.colorTransitionProgress = 0;
        state.colorTransitionDuration = 300;
      }
    }
  });
  
  // Track mouse release
  document.addEventListener('mouseup', () => {
    state.mousePressed = false;
  });
  
  // Handle mouse leaving the window
  document.addEventListener('mouseleave', () => {
    state.mouseX = -1000;
    state.mouseY = -1000;
    state.mousePressed = false;
  });
}

/**
 * Changes the top background gradient color with a wave effect when the pixel touches edges
 * @param {string} direction - 'horizontal' or 'vertical', indicating which edge was touched
 * @param {number} position - Normalized position (0-1) where the touch occurred
 */
function changeBackgroundColor(direction = 'horizontal', position = 0.5) {
  const body = document.body;
  const currentTheme = parseInt(body.dataset.theme || "0", 5);
  
  // Calculate the next theme number
  const nextTheme = (currentTheme + 1) % 5;
  
  // Array of impressive top colors that combine well with the bottom color (#50c8ff)
  const impressiveTopColors = [
    '#e1ff6e',  // Original lime green
    '#ff64d4',  // Cool Sweet Pink
    '#06d6a0',  // Mint green
    '#9370db',  // Medium purple
    '#c23fff',  // Electric purple
  ];
  
  // Update the CSS variable for the top gradient color
  document.documentElement.style.setProperty('--gradient-top', impressiveTopColors[nextTheme]);
  
  // Store the current theme
  body.dataset.theme = nextTheme.toString();
  
  // Create a site-wide pulse effect that grows from the pixel
  const pixel = document.getElementById('conscious-pixel');
  
  if (pixel) {
    // Get the pixel's current position
    const pixelRect = pixel.getBoundingClientRect();
    const pixelX = pixelRect.left + pixelRect.width / 2;
    const pixelY = pixelRect.top + pixelRect.height / 2;
    
    // Convert to percentage of viewport
    const pixelXPercent = (pixelX / window.innerWidth) * 100;
    const pixelYPercent = (pixelY / window.innerHeight) * 100;
    
    // Set pulse origin to pixel's current position
    document.documentElement.style.setProperty('--pulse-origin-x', `${pixelXPercent}%`);
    document.documentElement.style.setProperty('--pulse-origin-y', `${pixelYPercent}%`);
    
    // Create or update the site-wide pulse overlay element
    let pulseOverlay = document.querySelector('.site-pulse');
    if (!pulseOverlay) {
      pulseOverlay = document.createElement('div');
      pulseOverlay.className = 'site-pulse';
      document.body.appendChild(pulseOverlay);
    }
    
    // Trigger the site-wide pulse animation
    pulseOverlay.classList.remove('active');
    void pulseOverlay.offsetWidth; // Force reflow to restart animation
    pulseOverlay.classList.add('active');
  }
  
  // Log theme change for debugging
  // console.log(`Changed top gradient color to ${impressiveTopColors[nextTheme]} with site-wide pulse from ${direction} edge at ${Math.round(position * 100)}%`);
}

/**
 * Processes pixel's response to mouse interactions
 * @param {Object} state - The pixel state object
 * @param {number} deltaTime - Time since last frame 
 */
function processMouseInteractions(state, deltaTime) {
  // Calculate distance from pixel to mouse
  const dx = state.mouseX - state.x;
  const dy = state.mouseY - state.y;
  const distanceSquared = dx * dx + dy * dy;
  const distance = Math.sqrt(distanceSquared);
  
  // Normalize direction vector
  let dirX = dx / (distance || 1); // Avoid division by zero
  let dirY = dy / (distance || 1);
  
  // Determine interaction behavior based on distance
  if (distance < 30) {
    // Too close - flee from the mouse
    const repelForce = 0.2; // Removed excitement level factor to maintain consistent speed
    state.velocityX -= dirX * repelForce * deltaTime;
    state.velocityY -= dirY * repelForce * deltaTime;
    
    // Increase excitement when fleeing
    state.isExcited = true;
    state.excitementLevel = Math.min(1.0, state.excitementLevel + 0.01 * deltaTime);
    
  } else if (distance < 150) {
    // Medium distance - curious behavior, slight attraction
    if (Math.random() < 0.5) {
      // 50% chance to be attracted
      const attractForce = 0.05 * deltaTime;
      state.velocityX += dirX * attractForce;
      state.velocityY += dirY * attractForce;
    } else {
      // 50% chance to do a small random movement
      state.velocityX += (Math.random() - 0.5) * 0.1 * deltaTime;
      state.velocityY += (Math.random() - 0.5) * 0.1 * deltaTime;
    }
    
    // Maintain some excitement
    state.isExcited = true;
    state.excitementLevel = Math.min(0.7, state.excitementLevel + 0.005 * deltaTime);
    
  } else if (distance < 300) {
    // Further away - occasional attraction
    if (Math.random() < 0.02) {
      // Occasional attraction
      const attractForce = 0.1 * deltaTime;
      state.velocityX += dirX * attractForce;
      state.velocityY += dirY * attractForce;
    }
    
    // Slowly reduce excitement when far away
    state.excitementLevel = Math.max(0, state.excitementLevel - 0.002 * deltaTime);
    if (state.excitementLevel < 0.1) {
      state.isExcited = false;
    }
  } else {
    // Far away - normal behavior
    // Gradually reduce excitement
    state.excitementLevel = Math.max(0, state.excitementLevel - 0.004 * deltaTime);
    if (state.excitementLevel < 0.1) {
      state.isExcited = false;
    }
  }
  
  // Handle mouse clicks - burst of energy and color change
  if (state.mousePressed) {
    const pressDuration = performance.now() - state.mousePressedTime;
    
    if (pressDuration < 100) {  // Initial click
      // For a brief moment, change behavior dramatically
      if (distance < 200) {
        // Flee more dramatically if mouse is clicked near the pixel
        state.velocityX -= dirX * 1.0;
        state.velocityY -= dirY * 1.0;
      }
    }
  }
  
  // Apply excitement and energy effects
  if (state.isExcited) {
    // Excited pixels no longer move faster (excitement doesn't affect speed)
    
    // Increase pulse speed when excited (visual effect only)
    const energyFactor = Math.max(0.4, state.energy / 100); // Keep this for visual effects only
    state.pulseStep = (0.03 + (state.excitementLevel * 0.04)) * energyFactor;
    
    // Apply a slight drag effect to gradually slow down
    state.velocityX *= 0.98;
    state.velocityY *= 0.98;
    
    // Being excited consumes more energy
    if (window.noeEnergy) {
      // Extra energy consumption due to excitement is handled in energy-system.js
    }
  } else {
    // Return to normal pulse speed when calm, no longer affected by energy
    state.pulseStep = 0.03;
  }
}

/**
 * Creates a rainbow effect on the bubble logo
 * Gives the bubble a beautiful rainbow surface with ripple effects
 */
function createRainbowBubbleEffect() {
  const logo = document.querySelector('#sentium-logo');
  if (!logo) return;
  
  // Apply rainbow class to the bubble
  logo.classList.add('rainbow-bubble');
  
  // Replace existing click event with a rainbow one
  const oldClickListeners = logo.cloneNode(true);
  logo.replaceWith(oldClickListeners);
  const newLogo = document.querySelector('#sentium-logo');
  
  // Add interactive rainbow light effect that follows mouse
  newLogo.addEventListener('mousemove', function(event) {
    const rect = this.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Create light reflection that follows cursor
    const percentX = Math.round((x / rect.width) * 100);
    const percentY = Math.round((y / rect.height) * 100);
    
    // Update the radial gradient to follow the cursor
    this.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, 
                              rgba(255, 255, 255, 0.8) 0%, 
                              transparent 50%),
                             linear-gradient(
                               124deg,
                               #ff0000,
                               #ff7f00,
                               #ffff00,
                               #00ff00,
                               #0000ff,
                               #4b0082,
                               #8b00ff
                             )`;
    this.style.backgroundSize = '100% 100%, 1800% 1800%';
    this.style.animation = 'rainbow-rotation 12s ease infinite, logo-breathing 8s ease-in-out infinite';
  });
  
  // Reset the gradient when mouse leaves
  newLogo.addEventListener('mouseleave', function() {
    this.style.background = '';
    this.style.backgroundSize = '';
  });
  
  console.log('Rainbow bubble effect applied');
}

/**
 * Shows connection debug information for GitHub Pages users
 */
function showConnectionDebugInfo() {
  console.log('=== CONNECTION DEBUG INFO ===');
  console.log('Hostname:', window.location.hostname);
  console.log('GitHub Pages detection:', window.location.hostname.includes('github.io'));
  console.log('Protocol:', window.location.protocol);
  console.log('Parameters:', new URLSearchParams(window.location.search).toString());
  console.log('===========================');
  
  // Add a debug notice to help users understand how to connect
  if (window.location.hostname.includes('github.io')) {
    const message = document.createElement('div');
    message.className = 'debug-message';
    message.innerHTML = `
      <p>GitHub Pages detected! To connect to your local server:</p>
      <ol>
        <li>Make sure your local Sentium server is running: <code>cd ~/git-repos/sentium && ./run.fish</code></li>
        <li>Use a <a href="https://chrome.google.com/webstore/detail/cors-unblock/lfhmikememgdcahcdlaciloancbhjino" target="_blank">CORS Browser Extension</a> or add <code>?local=true</code> to the URL</li>
      </ol>
      <button id="close-debug">Got it</button>
    `;
    message.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      background: rgba(0,0,0,0.8);
      color: #39ffba;
      padding: 15px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-width: 400px;
    `;
    document.body.appendChild(message);
    
    // Add close button functionality
    setTimeout(() => {
      document.getElementById('close-debug')?.addEventListener('click', () => {
        message.style.display = 'none';
      });
    }, 100);
  }
}

// Call debug function when page loads
document.addEventListener('DOMContentLoaded', showConnectionDebugInfo);

// Existing code continues below