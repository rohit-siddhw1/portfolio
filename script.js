// ==========================================
// Theme Management System
// ==========================================
class ThemeManager {
  constructor() {
    this.lightBtn = document.getElementById('theme-btn-light');
    this.darkBtn = document.getElementById('theme-btn-dark');
    this.systemBtn = document.getElementById('theme-btn-system');
    this.metaColorScheme = document.querySelector('meta[name="color-scheme"]');
    
    this.init();
  }

  init() {
    const savedTheme = localStorage.getItem('color-scheme') || 'system';
    this.applyTheme(savedTheme);

    // Event listeners
    this.lightBtn.addEventListener('click', () => this.applyTheme('light'));
    this.darkBtn.addEventListener('click', () => this.applyTheme('dark'));
    this.systemBtn.addEventListener('click', () => this.applyTheme('system'));

    // React to system preference changes if 'system' is active
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (localStorage.getItem('color-scheme') === 'system') {
        this.applyTheme('system', false);
      }
    });
  }

  applyTheme(theme, save = true) {
    if (save) {
      localStorage.setItem('color-scheme', theme);
    }

    // Reset styles
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';

    // Remove active class from buttons
    this.lightBtn.classList.remove('active');
    this.darkBtn.classList.remove('active');
    this.systemBtn.classList.remove('active');

    if (theme === 'system') {
      this.systemBtn.classList.add('active');
      this.metaColorScheme.content = 'light dark';
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.style.colorScheme = isSystemDark ? 'dark' : 'light';
    } else {
      if (theme === 'light') {
        this.lightBtn.classList.add('active');
      } else {
        this.darkBtn.classList.add('active');
      }
      this.metaColorScheme.content = theme;
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.colorScheme = theme;
    }
    
    // Broadcast theme update for any canvas or charts to redraft
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }));
  }
}

// ==========================================
// Systems Dashboard Metrics & Graph Generator
// ==========================================
class SparklineChart {
  constructor(canvasId, color, dataPointsCount = 20) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.color = color;
    this.dataPointsCount = dataPointsCount;
    this.data = Array.from({ length: dataPointsCount }, () => Math.random() * 40 + 30);
    
    this.resizeCanvas();
    this.draw();

    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.draw();
    });

    window.addEventListener('theme-changed', () => {
      setTimeout(() => this.draw(), 50); // slight delay for layout adjustments
    });
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.width = rect.width;
    this.height = rect.height;
  }

  pushValue(val) {
    this.data.shift();
    this.data.push(val);
    this.draw();
  }

  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const min = Math.min(...this.data);
    const max = Math.max(...this.data);
    const range = max - min || 1;

    // Set line styles
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    
    const stepX = this.width / (this.dataPointsCount - 1);
    
    this.data.forEach((val, i) => {
      // Norm value from 0 to 1
      const normY = (val - min) / range;
      // Invert Y coordinate since 0 is top
      const y = this.height - 4 - normY * (this.height - 8);
      const x = i * stepX;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Fill area below chart
    ctx.lineTo(this.width, this.height);
    ctx.lineTo(0, this.height);
    ctx.closePath();
    
    const isDark = document.documentElement.style.colorScheme === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark';
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, this.color.replace(')', ', 0.15)').replace('rgb', 'rgba').replace('oklch', 'rgba')); // subtle opacity fill
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

class SystemMonitor {
  constructor() {
    this.loadEl = document.getElementById('status-load');
    this.latencyEl = document.getElementById('status-latency');
    this.qpsEl = document.getElementById('status-qps');
    this.cacheEl = document.getElementById('status-cache');
    this.uptimeEl = document.getElementById('status-uptime');
    this.ipEl = document.getElementById('live-client-ip');

    // Build charts
    const isDark = document.documentElement.style.colorScheme === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark';
    this.charts = {
      latency: new SparklineChart('chart-latency', '#38bdf8'),
      qps: new SparklineChart('chart-qps', '#4ade80'),
      geoip: new SparklineChart('chart-geoip', '#f97316'),
      adoption: new SparklineChart('chart-adoption', '#a78bfa')
    };

    this.uptime = 99.999712;
    this.currentQps = 12481;
    this.currentLatency = 1.18;
    this.currentCacheHit = 94.85;
    this.currentLoad = 0.24;

    this.init();
  }

  init() {
    this.resolveMockIP();
    
    // Periodical updates
    setInterval(() => this.jitterStats(), 2000);
  }

  resolveMockIP() {
    // Generate a clean mock external IP or pull connection address if possible
    const firstOctet = Math.floor(Math.random() * 223) + 1;
    const secondOctet = Math.floor(Math.random() * 255);
    const thirdOctet = Math.floor(Math.random() * 255);
    const fourthOctet = Math.floor(Math.random() * 254) + 1;
    this.clientIP = `${firstOctet}.${secondOctet}.${thirdOctet}.${fourthOctet}`;
    this.ipEl.textContent = this.clientIP;
  }

  jitterStats() {
    // Jitter live system stats
    this.uptime += 0.000001;
    this.currentQps += Math.floor(Math.random() * 300) - 150;
    this.currentLatency += (Math.random() * 0.08) - 0.04;
    this.currentCacheHit += (Math.random() * 0.1) - 0.05;
    this.currentLoad += (Math.random() * 0.02) - 0.01;

    // Keep constraints
    if (this.currentLatency < 0.8) this.currentLatency = 0.8;
    if (this.currentCacheHit > 99.9) this.currentCacheHit = 99.9;
    if (this.currentLoad < 0.1) this.currentLoad = 0.1;
    if (this.currentQps < 10000) this.currentQps = 10000;

    this.updateDom();
    
    // Push new values to charts
    this.charts.latency.pushValue(this.currentLatency * 50);
    this.charts.qps.pushValue(this.currentQps / 150);
    this.charts.geoip.pushValue(30 + Math.random() * 15);
    this.charts.adoption.pushValue(25 + (Math.random() * 2));
  }

  updateDom() {
    this.loadEl.textContent = `HEALTHY (${this.currentLoad.toFixed(2)})`;
    this.latencyEl.textContent = `${this.currentLatency.toFixed(2)} ms`;
    this.qpsEl.textContent = `${this.currentQps.toLocaleString()} QPS`;
    this.cacheEl.textContent = `${this.currentCacheHit.toFixed(1)}%`;
    this.uptimeEl.textContent = `${this.uptime.toFixed(6)}%`;
  }

  simulateLoadSpike() {
    // Force a visual systems spike
    this.currentQps = 32840;
    this.currentLatency = 0.72; // Decreases due to caching logic simulation
    this.currentCacheHit = 98.4;
    this.currentLoad = 0.68;
    
    this.updateDom();

    // Chart spikes
    this.charts.qps.pushValue(200);
    this.charts.latency.pushValue(15);
    this.charts.geoip.pushValue(10);
    
    // Recover to normal levels after 5 seconds
    setTimeout(() => {
      this.currentQps = 12480;
      this.currentLatency = 1.18;
      this.currentCacheHit = 94.8;
      this.currentLoad = 0.24;
      this.updateDom();
    }, 5000);
  }
}

// ==========================================
// Interactive System Architecture Simulator
// ==========================================
class ArchitectureVisualizer {
  constructor(systemMonitor) {
    this.sysMon = systemMonitor;
    this.tabs = document.querySelectorAll('.arch-tab-btn');
    this.diagrams = document.querySelectorAll('.arch-diagram');
    this.runBtn = document.getElementById('run-simulation-btn');
    this.activeTab = 'cache';

    this.init();
  }

  init() {
    // Tab switching
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        this.switchTab(target);
      });
    });

    // Run simulation handler
    this.runBtn.addEventListener('click', () => this.runSimulation());

    // Tree lookup IP search listeners
    const ipSearchBtn = document.getElementById('ip-search-btn');
    const ipRandomBtn = document.getElementById('ip-random-btn');
    if (ipSearchBtn && ipRandomBtn) {
      ipSearchBtn.addEventListener('click', () => this.runTreeSearch());
      ipRandomBtn.addEventListener('click', () => {
        const input = document.getElementById('ip-search-input');
        input.value = this.generateRandomIP();
        this.runTreeSearch();
      });
    }
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    this.tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    this.diagrams.forEach(diag => {
      diag.classList.toggle('active', diag.id === `diag-${tabName}`);
    });

    // Rename load test button action description
    if (tabName === 'cache') {
      this.runBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/></svg>
        Run Load Test
      `;
    } else {
      this.runBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/></svg>
        Trace Routing Path
      `;
    }
  }

  runSimulation() {
    if (this.activeTab === 'cache') {
      this.simulateCacheFlows();
    } else {
      this.runTreeSearch();
    }
  }

  animateNodeGlow(nodeId, glowClass, duration = 600) {
    const node = document.getElementById(nodeId);
    if (!node) return;
    node.classList.add(glowClass);
    setTimeout(() => node.classList.remove(glowClass), duration);
  }

  animatePathGlow(pathId, glowClass, duration = 600) {
    const path = document.getElementById(pathId);
    if (!path) return;
    path.classList.add(glowClass);
    setTimeout(() => path.classList.remove(glowClass), duration);
  }

  animatePacket(startNodeId, endNodeId, colorClass, duration = 600, callback) {
    const startNode = document.getElementById(startNodeId);
    const endNode = document.getElementById(endNodeId);
    if (!startNode || !endNode) return;
    
    const container = document.querySelector('.arch-canvas-container');
    const rectContainer = container.getBoundingClientRect();
    const rectStart = startNode.getBoundingClientRect();
    const rectEnd = endNode.getBoundingClientRect();
    
    // Calculate center relative coordinates
    const x1 = rectStart.left - rectContainer.left + rectStart.width / 2;
    const y1 = rectStart.top - rectContainer.top + rectStart.height / 2;
    const x2 = rectEnd.left - rectContainer.left + rectEnd.width / 2;
    const y2 = rectEnd.top - rectContainer.top + rectEnd.height / 2;
    
    const packet = document.createElement('div');
    packet.className = `packet ${colorClass}`;
    packet.style.left = `${x1 - 4}px`;
    packet.style.top = `${y1 - 4}px`;
    packet.style.setProperty('--flow-destination', `translate(${x2 - x1}px, ${y2 - y1}px)`);
    packet.style.animation = `packet-flow ${duration}ms cubic-bezier(0.25, 1, 0.5, 1) forwards`;
    
    container.appendChild(packet);
    setTimeout(() => {
      packet.remove();
      if (callback) callback();
    }, duration);
  }

  simulateCacheFlows() {
    this.sysMon.simulateLoadSpike();
    this.runBtn.disabled = true;

    // Simulate 3 successive requests flowing (2 hits, 1 miss)
    
    // Flow 1: Cache Hit
    setTimeout(() => {
      this.animateNodeGlow('node-client', 'active-glow', 400);
      this.animatePacket('node-client', 'node-lb', 'green', 400, () => {
        this.animateNodeGlow('node-lb', 'active-glow', 400);
        this.animatePathGlow('path-client-lb', 'active-path', 400);
        
        this.animatePacket('node-lb', 'node-cache', 'green', 400, () => {
          this.animateNodeGlow('node-cache', 'cache-hit-glow', 600);
          this.animatePathGlow('path-lb-cache', 'hit-path', 600);
          
          this.animatePacket('node-cache', 'node-client', 'green', 500, () => {
            this.animateNodeGlow('node-client', 'cache-hit-glow', 300);
          });
        });
      });
    }, 0);

    // Flow 2: Cache Hit
    setTimeout(() => {
      this.animateNodeGlow('node-client', 'active-glow', 400);
      this.animatePacket('node-client', 'node-lb', 'green', 400, () => {
        this.animatePacket('node-lb', 'node-cache', 'green', 400, () => {
          this.animateNodeGlow('node-cache', 'cache-hit-glow', 600);
          this.animatePacket('node-cache', 'node-client', 'green', 500, () => {});
        });
      });
    }, 800);

    // Flow 3: Cache Miss (Triggers Backend DB fallback lookup)
    setTimeout(() => {
      this.animateNodeGlow('node-client', 'active-glow', 400);
      this.animatePacket('node-client', 'node-lb', 'orange', 450, () => {
        this.animateNodeGlow('node-lb', 'active-glow', 400);
        this.animatePathGlow('path-client-lb', 'active-path', 450);

        this.animatePacket('node-lb', 'node-origin', 'orange', 450, () => {
          this.animateNodeGlow('node-origin', 'cache-miss-glow', 600);
          this.animatePathGlow('path-lb-origin', 'miss-path', 600);
          
          this.animatePacket('node-origin', 'node-db', 'orange', 450, () => {
            this.animateNodeGlow('node-db', 'active-glow', 500);
            this.animatePathGlow('path-origin-db', 'active-path', 500);

            this.animatePacket('node-db', 'node-origin', 'green', 450, () => {
              this.animatePacket('node-origin', 'node-cache', 'green', 400, () => {
                this.animateNodeGlow('node-cache', 'active-glow', 300);
                
                this.animatePacket('node-origin', 'node-client', 'orange', 600, () => {
                  this.animateNodeGlow('node-client', 'cache-miss-glow', 300);
                  this.runBtn.disabled = false;
                });
              });
            });
          });
        });
      });
    }, 1800);
  }

  generateRandomIP() {
    return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
  }

  runTreeSearch() {
    const input = document.getElementById('ip-search-input');
    const msg = document.getElementById('tree-search-msg');
    const ip = input.value.trim();

    // Basic IP validation
    const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (!ipPattern.test(ip)) {
      msg.textContent = 'Error: Invalid IPv4 Address format.';
      msg.style.color = '#ef4444';
      return;
    }

    msg.style.color = 'var(--text-muted)';
    this.runBtn.disabled = true;

    // Reset tree highlights
    document.querySelectorAll('.tree-node').forEach(node => {
      node.classList.remove('highlighted', 'resolved');
    });

    const octets = ip.split('.').map(Number);
    const firstOctet = octets[0];
    const pathNodes = [];

    // Simulate binary search choices based on first octet range
    pathNodes.push('tree-node-root');

    let level1Node = '';
    let level2Node = '';
    let leafNode = '';
    let location = '';
    let latency = 0;

    if (firstOctet < 128) {
      level1Node = 'tree-node-L1';
      if (firstOctet < 64) {
        level2Node = 'tree-node-L2';
        leafNode = 'tree-leaf-1';
        location = 'US (North America / East Coast)';
        latency = 8;
      } else {
        level2Node = 'tree-node-M2';
        leafNode = 'tree-leaf-2';
        location = 'EU (Europe / Frankfurt)';
        latency = 22;
      }
    } else {
      level1Node = 'tree-node-R1';
      level2Node = 'tree-node-R2';
      if (firstOctet < 192) {
        leafNode = 'tree-leaf-3';
        location = 'AP (Asia-Pacific / Singapore)';
        latency = 48;
      } else {
        leafNode = 'tree-leaf-4';
        location = 'IN (India / Mumbai DC)';
        latency = 2;
      }
    }

    pathNodes.push(level1Node, level2Node, leafNode);

    // Sequence highlights with timeouts
    let i = 0;
    const step = () => {
      if (i < pathNodes.length) {
        const nodeId = pathNodes[i];
        const node = document.getElementById(nodeId);
        
        if (node) {
          if (i === pathNodes.length - 1) {
            node.classList.add('resolved');
            msg.innerHTML = `<span style="color: var(--accent-green)">SUCCESS:</span> Resolved IP <strong>${ip}</strong> to region <strong>${location}</strong> in <strong>${latency}ms</strong> (via Quad Tree Segment).`;
            this.runBtn.disabled = false;
          } else {
            node.classList.add('highlighted');
            msg.textContent = `Traversing node ${node.textContent}...`;
          }
        }
        i++;
        setTimeout(step, 450);
      }
    };
    
    step();
  }
}

// ==========================================
// Experience Editor Controllers
// ==========================================
class ExperienceTabs {
  constructor() {
    this.jobButtons = document.querySelectorAll('.company-tab-btn');
    this.panes = document.querySelectorAll('.editor-pane');
    this.viewButtons = document.querySelectorAll('.editor-view-btn');
    this.fileNameTab = document.getElementById('editor-tab-file');

    this.activeJob = 'atlassian';
    this.activeView = 'code';

    this.init();
  }

  init() {
    // Job list buttons (Left side timeline)
    this.jobButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const job = btn.dataset.job;
        this.switchJob(job);
      });
    });

    // View toggler: Code View / Formatted
    this.viewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });
  }

  switchJob(jobName) {
    this.activeJob = jobName;
    
    // Update timeline buttons
    this.jobButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.job === jobName);
    });

    // Update active editor panes
    this.panes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `pane-${jobName}`);
    });

    // Update Tab label
    this.fileNameTab.textContent = jobName === 'atlassian' ? 'atlassian.json' : 'medianet.yaml';

    this.syncView();
  }

  switchView(viewName) {
    this.activeView = viewName;
    
    // Update toggle buttons
    this.viewButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    this.syncView();
  }

  syncView() {
    // Inside active pane, show corresponding view (code vs formatted)
    const activePane = document.getElementById(`pane-${this.activeJob}`);
    if (!activePane) return;

    const codeView = activePane.querySelector('.code-view');
    const formattedView = activePane.querySelector('.formatted-view');

    if (this.activeView === 'code') {
      codeView.classList.add('active');
      formattedView.classList.remove('active');
    } else {
      codeView.classList.remove('active');
      formattedView.classList.add('active');
    }
  }
}

// ==========================================
// Developer Console Terminal
// ==========================================
class DeveloperTerminal {
  constructor(sysMon) {
    this.sysMon = sysMon;
    this.drawer = document.getElementById('terminal-drawer');
    this.header = document.getElementById('terminal-header');
    this.input = document.getElementById('terminal-input');
    this.historyContainer = document.getElementById('terminal-history');
    this.body = document.getElementById('terminal-body');
    
    this.history = [];
    this.historyIndex = -1;
    this.isExpanded = false;

    this.init();
  }

  init() {
    // Header click toggles expand
    this.header.addEventListener('click', (e) => {
      // Prevent collapse if clicking the close icon button specifically, but header click is fine
      this.toggle();
    });

    // Trigger buttons elsewhere on page
    const consoleBtn = document.getElementById('hero-terminal-trigger');
    if (consoleBtn) {
      consoleBtn.addEventListener('click', () => {
        this.expand();
      });
    }

    // Input submission
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const command = this.input.value.trim();
        this.executeCommand(command);
        this.input.value = '';
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory(1);
      }
    });

    // Click inside body focuses input
    this.body.addEventListener('click', () => {
      this.input.focus();
    });
  }

  toggle() {
    if (this.isExpanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }

  expand() {
    this.drawer.classList.add('expanded');
    this.isExpanded = true;
    setTimeout(() => this.input.focus(), 250);
  }

  collapse() {
    this.drawer.classList.remove('expanded');
    this.isExpanded = false;
  }

  navigateHistory(direction) {
    if (this.history.length === 0) return;

    if (direction === -1) { // Up
      if (this.historyIndex === -1) {
        this.historyIndex = this.history.length - 1;
      } else if (this.historyIndex > 0) {
        this.historyIndex--;
      }
    } else { // Down
      if (this.historyIndex !== -1) {
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
        } else {
          this.historyIndex = -1;
        }
      }
    }

    this.input.value = this.historyIndex === -1 ? '' : this.history[this.historyIndex];
  }

  writeLine(text, type = 'output-line') {
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    line.innerHTML = text;
    this.historyContainer.appendChild(line);
    
    // Scroll to bottom
    this.body.scrollTop = this.body.scrollHeight;
  }

  executeCommand(cmd) {
    // Print input line in logs
    this.writeLine(`<div class="terminal-prompt">rohit@backend:<span class="path">~</span>$</div><span>${cmd}</span>`, 'input-line');
    
    if (!cmd) return;
    
    this.history.push(cmd);
    this.historyIndex = -1;
    
    const parts = cmd.toLowerCase().split(' ');
    const core = parts[0];
    
    switch (core) {
      case 'help':
        this.writeLine(
          `Available commands:<br>` +
          `  - <strong>about</strong>      : Career profile summary<br>` +
          `  - <strong>experience</strong> : Formatted work tenure details<br>` +
          `  - <strong>skills</strong>     : Technical capability checklist<br>` +
          `  - <strong>projects</strong>   : Side projects detail listings<br>` +
          `  - <strong>stats</strong>      : Print realtime host statistics<br>` +
          `  - <strong>theme [l|d|s]</strong>: Swap theme (light / dark / system)<br>` +
          `  - <strong>clear</strong>      : Clear terminal outputs<br>` +
          `  - <strong>exit</strong>       : Close developer console`
        );
        break;
      case 'about':
        this.writeLine(
          `Rohit Siddheshwar is a Senior Software Engineer with 9+ years of industry experience.<br>` +
          `Specialized in scalable distributed backends, ad-tech, video streaming pipelines, and reliability.<br>` +
          `Current Stack: Go, Redis, Kafka, Kubernetes, GCP, Aerospike, SQL, Shell scripting.`
        );
        break;
      case 'experience':
        this.writeLine(
          `<strong>ATLASSIAN</strong> (Senior Software Engineer, Backend) [Dec 2024 – Present]<br>` +
          `  * Jira org-wide dashboard generation templates adopted by 25+ teams.<br>` +
          `  * Designed attachment consolidating routing API, search improved by 12%.<br>` +
          `<strong>MEDIA.NET</strong> (Manager - Web Tech) [July 2016 – Dec 2024]<br>` +
          `  * Engineered customized Prebid systems increasing video engagement by 18%.<br>` +
          `  * Built SERP ad-selection graph engine, response times reduced by 40%.<br>` +
          `  * Overhauled ad-serving cache, saving 15% infrastructure cost, +40% QPS per server.<br>` +
          `  * IP-to-Geo prefix database lookup speeds increased by 45%.`
        );
        break;
      case 'skills':
        this.writeLine(
          `<strong>Languages:</strong> Go, JavaScript, NodeJS, PHP, Java, SQL, HTML/CSS<br>` +
          `<strong>Technologies:</strong> Akamai CDN, GCP, Redis, Aerospike, Kafka, Kubernetes, Docker, Linux, CI/CD<br>` +
          `<strong>Data Structures:</strong> Segment Trees, Quad Trees, DAG dependency models, Finite Automata`
        );
        break;
      case 'projects':
        this.writeLine(
          `<strong>Debug+</strong>: Chrome Extension for request interception and diff analysis (Internal).<br>` +
          `<strong>Tree-Leveled Cipher</strong>: Custom matrix encryption cipher using binary tree traversal.<br>` +
          `  ↳ GitHub: <a href="https://github.com/rohit-siddhw1/tree-leveled-cipher" target="_blank">tree-leveled-cipher</a><br>` +
          `<strong>Red-Black Tree</strong>: Java implementation of a self-balancing binary search tree.<br>` +
          `  ↳ GitHub: <a href="https://github.com/rohit-siddhw1/red-black-tree" target="_blank">red-black-tree</a><br>` +
          `<strong>Flappy Bird OpenGL</strong>: Real-time game engine clone in C using OpenGL and GLUT.<br>` +
          `  ↳ GitHub: <a href="https://github.com/rohit-siddhw1/flappy-bird-opengl" target="_blank">flappy-bird-opengl</a><br>` +
          `<strong>Modern JS Slides</strong>: Reveal.js presentation detailing ES6+ features and client performance.<br>` +
          `  ↳ GitHub: <a href="https://github.com/rohit-siddhw1/Modern-Javascript-on-the-Browser" target="_blank">Modern-Javascript-on-the-Browser</a>`
        );
        break;
      case 'stats':
        this.writeLine(
          `HOST STATUS     : OK<br>` +
          `CLIENT SOURCE IP: ${this.sysMon.clientIP}<br>` +
          `LOAD INDEX      : ${this.sysMon.currentLoad.toFixed(2)}<br>` +
          `LATENCY AVERAGE : ${this.sysMon.currentLatency.toFixed(2)}ms<br>` +
          `THROUGHPUT RATE : ${this.sysMon.currentQps.toLocaleString()} QPS<br>` +
          `CACHE HIT RATIO : ${this.sysMon.currentCacheHit.toFixed(1)}%<br>` +
          `UPTIME          : ${this.sysMon.uptime.toFixed(5)}%`,
          'output-line success'
        );
        break;
      case 'theme':
        const target = parts[1];
        if (target === 'light' || target === 'l') {
          window.themeManager.applyTheme('light');
          this.writeLine('Theme updated to light mode.', 'output-line success');
        } else if (target === 'dark' || target === 'd') {
          window.themeManager.applyTheme('dark');
          this.writeLine('Theme updated to dark mode.', 'output-line success');
        } else if (target === 'system' || target === 's') {
          window.themeManager.applyTheme('system');
          this.writeLine('Theme updated to system default preference.', 'output-line success');
        } else {
          this.writeLine('Usage: theme [light | dark | system]', 'output-line error');
        }
        break;
      case 'clear':
        this.historyContainer.innerHTML = '';
        break;
      case 'exit':
        this.collapse();
        break;
      case 'sudo':
        if (parts[1] === 'rm' && cmd.includes('-rf')) {
          this.writeLine('Executing: rm -rf /', 'output-line error');
          this.writeLine('WARNING: INITIATING DESTRUCTION PROTOCOLS...', 'output-line error');
          setTimeout(() => {
            this.writeLine('PERMISSION DENIED. Nice try! 😜 (Host access requires SSH keys).', 'output-line success');
          }, 600);
        } else {
          this.writeLine("Error: command not found or permission denied. Sudo is restricted.", 'output-line error');
        }
        break;
      default:
        this.writeLine(`Command not recognized: '${cmd}'. Type 'help' for options.`, 'output-line error');
    }
  }
}

// ==========================================
// Scroll Reveal Controller
// ==========================================
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        obs.unobserve(entry.target); // trigger animation once
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

// ==========================================
// Initialization Orchestrator
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Theme Manager First
  window.themeManager = new ThemeManager();
  
  // Setup Live Dashboard
  const sysMon = new SystemMonitor();
  
  // Setup Diagrams Visualizer
  const visualizer = new ArchitectureVisualizer(sysMon);

  // Bind Metrics selection cards with Architecture tabs
  const metricCards = document.querySelectorAll('.metric-card');
  metricCards.forEach(card => {
    card.addEventListener('click', () => {
      metricCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const target = card.dataset.metricTarget;
      if (target === 'latency' || target === 'qps') {
        visualizer.switchTab('cache');
        // Scroll into view of visualizer
        document.getElementById('architecture').scrollIntoView({ behavior: 'smooth' });
      } else if (target === 'geoip') {
        visualizer.switchTab('tree');
        document.getElementById('architecture').scrollIntoView({ behavior: 'smooth' });
      } else if (target === 'adoption') {
        // Just scroll directly to Experience where Atlassian dashboards are details
        document.getElementById('experience').scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Experience code panes init
  const expManager = new ExperienceTabs();

  // Bind Navbar Experience Tab to also update tab panel
  document.querySelectorAll('.main-nav a[href="#experience"]').forEach(link => {
    link.addEventListener('click', () => {
      expManager.switchJob('atlassian');
    });
  });

  // Setup Terminal Drawer
  const terminal = new DeveloperTerminal(sysMon);

  // Setup Scroll reveals
  initScrollReveal();
});