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

    this.attachmentsPaginationMode = 'cursor';
    this.graphRoutingStrategy = 'parallel';

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

    // Attachments API toggles
    const attCursorBtn = document.getElementById('att-pag-cursor');
    const attOffsetBtn = document.getElementById('att-pag-offset');
    const attQueryDetails = document.getElementById('attachments-query-type');
    if (attCursorBtn && attOffsetBtn) {
      attCursorBtn.addEventListener('click', () => {
        attCursorBtn.classList.add('active');
        attOffsetBtn.classList.remove('active');
        this.attachmentsPaginationMode = 'cursor';
        attQueryDetails.textContent = 'Cursor: cursor_x9281';
      });
      attOffsetBtn.addEventListener('click', () => {
        attOffsetBtn.classList.add('active');
        attCursorBtn.classList.remove('active');
        this.attachmentsPaginationMode = 'offset';
        attQueryDetails.textContent = 'Offset: Page 3 (Limit 20)';
      });
    }

    // PurePlay Video triggers
    const videoSimBtn = document.getElementById('video-simulate-btn');
    if (videoSimBtn) {
      videoSimBtn.addEventListener('click', () => this.simulatePureplayFlow());
    }

    // Graph Strategy toggles
    const graphParallelBtn = document.getElementById('graph-strat-parallel');
    const graphWaterfallBtn = document.getElementById('graph-strat-waterfall');
    if (graphParallelBtn && graphWaterfallBtn) {
      graphParallelBtn.addEventListener('click', () => {
        graphParallelBtn.classList.add('active');
        graphWaterfallBtn.classList.remove('active');
        this.graphRoutingStrategy = 'parallel';
      });
      graphWaterfallBtn.addEventListener('click', () => {
        graphWaterfallBtn.classList.add('active');
        graphParallelBtn.classList.remove('active');
        this.graphRoutingStrategy = 'waterfall';
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
      this.runBtn.style.display = 'inline-flex';
    } else if (tabName === 'tree') {
      this.runBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/></svg>
        Trace Routing Path
      `;
      this.runBtn.style.display = 'inline-flex';
    } else if (tabName === 'reliability') {
      this.runBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/></svg>
        Trigger Incident
      `;
      this.runBtn.style.display = 'inline-flex';
    } else if (tabName === 'attachments') {
      this.runBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/></svg>
        Fetch Attachments
      `;
      this.runBtn.style.display = 'inline-flex';
    } else if (tabName === 'pureplay') {
      this.runBtn.style.display = 'none'; // Controlled by classifier search bar buttons
    } else if (tabName === 'graph') {
      this.runBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/></svg>
        Execute Ad Selection
      `;
      this.runBtn.style.display = 'inline-flex';
    }
  }

  runSimulation() {
    if (this.activeTab === 'cache') {
      this.simulateCacheFlows();
    } else if (this.activeTab === 'tree') {
      this.runTreeSearch();
    } else if (this.activeTab === 'reliability') {
      this.simulateReliabilityFlow();
    } else if (this.activeTab === 'attachments') {
      this.simulateAttachmentsFlow();
    } else if (this.activeTab === 'graph') {
      this.simulateGraphFlow();
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
    if (!input || !msg) return;
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

  simulateReliabilityFlow() {
    this.runBtn.disabled = true;

    // Get nodes/paths details to modify & restore
    const nodeSfxDetails = document.querySelector('#node-signalfx .details');
    const nodeOgDetails = document.querySelector('#node-opsgenie .details');
    const nodeSlackDetails = document.querySelector('#node-slack .details');
    
    // Save original values
    const origSfx = nodeSfxDetails.innerHTML;
    const origOg = nodeOgDetails.innerHTML;
    const origSlack = nodeSlackDetails.innerHTML;

    // 1. Terraform -> Sauron
    this.animateNodeGlow('node-tf', 'active-glow', 400);
    this.animatePacket('node-tf', 'node-sauron', 'green', 400, () => {
      this.animateNodeGlow('node-sauron', 'active-glow', 400);
      this.animatePathGlow('path-tf-sauron', 'active-path', 400);

      // 2. Sauron -> SignalFx
      this.animatePacket('node-sauron', 'node-signalfx', 'green', 400, () => {
        this.animateNodeGlow('node-signalfx', 'active-glow', 600);
        this.animatePathGlow('path-sauron-sfx', 'active-path', 600);

        // 3. SignalFx anomaly detect
        setTimeout(() => {
          this.animateNodeGlow('node-signalfx', 'cache-miss-glow', 1500);
          nodeSfxDetails.innerHTML = `<span style="color: var(--accent-orange); font-weight: bold;">CPU > 90% Alert</span>`;

          // 4. Alert OpsGenie & Slack in parallel
          setTimeout(() => {
            // Animate to OpsGenie
            this.animatePacket('node-signalfx', 'node-opsgenie', 'orange', 500, () => {
              this.animateNodeGlow('node-opsgenie', 'cache-miss-glow', 1000);
              nodeOgDetails.innerHTML = `<span style="color: var(--accent-orange); font-weight: bold;">Paging On-Call...</span>`;
            });
            this.animatePathGlow('path-sfx-og', 'miss-path', 1000);

            // Animate to Slack
            this.animatePacket('node-signalfx', 'node-slack', 'orange', 500, () => {
              this.animateNodeGlow('node-slack', 'cache-miss-glow', 1000);
              nodeSlackDetails.innerHTML = `<span style="color: var(--accent-orange); font-weight: bold;">SEV-2 Incident</span>`;
            });
            this.animatePathGlow('path-sfx-slack', 'miss-path', 1000);

            // 5. Restore after incident settles
            setTimeout(() => {
              nodeSfxDetails.innerHTML = origSfx;
              nodeOgDetails.innerHTML = origOg;
              nodeSlackDetails.innerHTML = origSlack;
              this.runBtn.disabled = false;
            }, 3000);

          }, 600);
        }, 300);
      });
    });
  }

  simulateAttachmentsFlow() {
    this.runBtn.disabled = true;

    const nodeClientDetails = document.querySelector('#node-client-att .details');
    const nodeSorterDetails = document.querySelector('#node-sorter .details');
    const origClient = nodeClientDetails.innerHTML;
    const origSorter = nodeSorterDetails.innerHTML;

    // 1. Client -> Aggregator
    this.animateNodeGlow('node-client-att', 'active-glow', 400);
    this.animatePacket('node-client-att', 'node-aggregator', 'green', 400, () => {
      this.animateNodeGlow('node-aggregator', 'active-glow', 500);
      this.animatePathGlow('path-cli-agg', 'active-path', 500);

      // 2. Parallel fan-out to 4 datasources
      const sources = ['node-ds-static', 'node-ds-confluence', 'node-ds-whiteboard', 'node-ds-loom'];
      const forwardPaths = ['path-agg-static', 'path-agg-conf', 'path-agg-white', 'path-agg-loom'];
      
      let responsesCount = 0;
      
      sources.forEach((source, idx) => {
        this.animatePacket('node-aggregator', source, 'green', 500, () => {
          this.animateNodeGlow(source, 'active-glow', 400);
          this.animatePathGlow(forwardPaths[idx], 'active-path', 400);

          // 3. Fan-in from datasources to Sorter node
          const returnPaths = ['path-static-sort', 'path-conf-sort', 'path-white-sort', 'path-loom-sort'];
          setTimeout(() => {
            this.animatePacket(source, 'node-sorter', 'green', 500, () => {
              responsesCount++;
              if (responsesCount === 4) {
                // All datasources returned payloads to Sorter
                this.animateNodeGlow('node-sorter', 'active-glow', 800);
                nodeSorterDetails.innerHTML = `<span style="color: var(--accent-green); font-weight: bold;">Sorting 40 records...</span>`;

                // 4. Return to Client
                setTimeout(() => {
                  this.animatePacket('node-sorter', 'node-client-att', 'green', 600, () => {
                    this.animateNodeGlow('node-client-att', 'cache-hit-glow', 1500);
                    
                    if (this.attachmentsPaginationMode === 'cursor') {
                      nodeClientDetails.innerHTML = `<span style="color: var(--accent-green); font-weight: bold;">Loaded: cursor_x9282</span>`;
                    } else {
                      nodeClientDetails.innerHTML = `<span style="color: var(--accent-green); font-weight: bold;">Loaded: Page 3 (Limit 20)</span>`;
                    }

                    // Reset & Enable
                    setTimeout(() => {
                      nodeClientDetails.innerHTML = origClient;
                      nodeSorterDetails.innerHTML = origSorter;
                      this.runBtn.disabled = false;
                    }, 3000);
                  });
                  this.animatePathGlow('path-sort-cli', 'hit-path', 600);
                }, 600);
              }
            });
            this.animatePathGlow(returnPaths[idx], 'hit-path', 500);
          }, 300);
        });
      });
    });
  }

  simulatePureplayFlow() {
    const simBtn = document.getElementById('video-simulate-btn');
    if (simBtn) simBtn.disabled = true;

    const tagInput = document.getElementById('video-tag-input');
    const tagVal = (tagInput ? tagInput.value : 'Tech Review').trim().toLowerCase();

    // Determine category details based on input tag
    let category = 'IAB: General / Ent. (IAB1)';
    let cpm = '$2.50 CPM';
    let adText = 'Ad Overlay: E-Commerce Shop';
    let videoPreview = '🎬 Video Content';

    if (tagVal.includes('game') || tagVal.includes('play') || tagVal.includes('xbox') || tagVal.includes('ps5')) {
      category = 'IAB: Games (IAB14)';
      cpm = '$4.80 CPM';
      adText = 'Ad Overlay: Razer Gaming Gear';
      videoPreview = '🎮 Gaming Shorts';
    } else if (tagVal.includes('tech') || tagVal.includes('review') || tagVal.includes('phone') || tagVal.includes('laptop') || tagVal.includes('device')) {
      category = 'IAB: Technology (IAB19)';
      cpm = '$5.50 CPM';
      adText = 'Ad Overlay: Cloud Hosting VPN';
      videoPreview = '💻 Tech Review';
    } else if (tagVal.includes('vlog') || tagVal.includes('lifestyle') || tagVal.includes('travel') || tagVal.includes('trip') || tagVal.includes('food')) {
      category = 'IAB: Travel (IAB20)';
      cpm = '$3.20 CPM';
      adText = 'Ad Overlay: Travel Booking App';
      videoPreview = '✈️ Travel Vlog';
    }

    const catEl = document.getElementById('pureplay-category');
    const fillEl = document.getElementById('pureplay-ad-fill');
    const feedEl = document.getElementById('player-feed');
    const adDetailsEl = document.getElementById('player-ad-details');

    const origCat = catEl.innerHTML;
    const origFill = fillEl.innerHTML;
    const origFeed = feedEl.innerHTML;
    const origAdDetails = adDetailsEl.innerHTML;

    // Reset player states visually
    feedEl.textContent = '[Analysing...]';
    adDetailsEl.textContent = 'Ad Overlay: Loading...';

    // 1. Publisher -> Classifier
    this.animateNodeGlow('node-publisher', 'active-glow', 400);
    this.animatePacket('node-publisher', 'node-classifier', 'blue', 400, () => {
      this.animateNodeGlow('node-classifier', 'active-glow', 600);
      this.animatePathGlow('path-pub-class', 'active-path', 600);
      
      catEl.innerHTML = `<span style="color: var(--accent-green); font-weight: bold;">${category}</span>`;

      // 2. Classifier -> Prebid
      setTimeout(() => {
        this.animatePacket('node-classifier', 'node-prebid', 'blue', 400, () => {
          this.animateNodeGlow('node-prebid', 'active-glow', 600);
          this.animatePathGlow('path-class-prebid', 'active-path', 600);

          fillEl.innerHTML = `<span style="color: var(--accent-green); font-weight: bold;">Bid Win: ${cpm}</span>`;

          // 3. Prebid -> Player
          setTimeout(() => {
            this.animatePacket('node-prebid', 'node-player', 'green', 500, () => {
              this.animateNodeGlow('node-player', 'cache-hit-glow', 1500);
              
              feedEl.textContent = videoPreview;
              adDetailsEl.innerHTML = `<span style="color: var(--accent-green)">${adText} (${cpm})</span>`;

              // Restore
              setTimeout(() => {
                catEl.innerHTML = origCat;
                fillEl.innerHTML = origFill;
                feedEl.innerHTML = origFeed;
                adDetailsEl.innerHTML = origAdDetails;
                if (simBtn) simBtn.disabled = false;
              }, 4000);
            });
            this.animatePathGlow('path-prebid-player', 'hit-path', 500);
          }, 400);
        });
      }, 400);
    });
  }

  simulateGraphFlow() {
    this.runBtn.disabled = true;

    const routerStatus = document.getElementById('graph-resolver-status');
    const provAStatus = document.getElementById('graph-prov-a-status');
    const provBStatus = document.getElementById('graph-prov-b-status');
    const backfillDetails = document.querySelector('#node-backfill .details');

    const origRouter = routerStatus.innerHTML;
    const origProvA = provAStatus.innerHTML;
    const origProvB = provBStatus.innerHTML;
    const origBackfill = backfillDetails.innerHTML;

    // 1. SERP Ad Call -> DAG Router
    this.animateNodeGlow('node-graph-req', 'active-glow', 400);
    this.animatePacket('node-graph-req', 'node-dag-router', 'blue', 400, () => {
      this.animateNodeGlow('node-dag-router', 'active-glow', 500);
      this.animatePathGlow('path-req-router', 'active-path', 500);
      routerStatus.innerHTML = `<span style="color: var(--accent-blue)">Evaluating routes...</span>`;

      if (this.graphRoutingStrategy === 'parallel') {
        // Parallel Strategy
        setTimeout(() => {
          routerStatus.innerHTML = `<span style="color: var(--accent-blue)">Parallel dispatch to Providers...</span>`;

          // Fire A and B concurrently
          this.animatePacket('node-dag-router', 'node-prov-a', 'blue', 500, () => {
            this.animateNodeGlow('node-prov-a', 'active-glow', 500);
            provAStatus.innerHTML = `<span style="color: var(--accent-green); font-weight: bold;">Returned Bid ($3.20 CPM)</span>`;
          });
          this.animatePathGlow('path-router-a', 'active-path', 500);

          this.animatePacket('node-dag-router', 'node-prov-b', 'blue', 500, () => {
            this.animateNodeGlow('node-prov-b', 'active-glow', 500);
            provBStatus.innerHTML = `No Bid (Low CPM)`;
          });
          this.animatePathGlow('path-router-b', 'active-path', 500);

          // Once query resolves (say 800ms)
          setTimeout(() => {
            routerStatus.innerHTML = `<span style="color: var(--accent-green)">Winner: Provider A (Direct)</span>`;
            
            // Animate packet from Provider A back to DAG router
            this.animatePacket('node-prov-a', 'node-dag-router', 'green', 500, () => {
              this.animateNodeGlow('node-dag-router', 'cache-hit-glow', 1000);
              
              setTimeout(() => {
                routerStatus.innerHTML = origRouter;
                provAStatus.innerHTML = origProvA;
                provBStatus.innerHTML = origProvB;
                backfillDetails.innerHTML = origBackfill;
                this.runBtn.disabled = false;
              }, 2500);
            });
          }, 900);

        }, 400);

      } else {
        // Waterfall / Sequential Fallback Strategy
        setTimeout(() => {
          routerStatus.innerHTML = `<span style="color: var(--accent-orange)">Trying Provider A...</span>`;
          
          // Query Prov A
          this.animatePacket('node-dag-router', 'node-prov-a', 'orange', 500, () => {
            this.animateNodeGlow('node-prov-a', 'cache-miss-glow', 500);
            provAStatus.innerHTML = `<span style="color: var(--accent-orange)">No Bid (Timeout)</span>`;

            // Provider A failed. Try Provider B.
            setTimeout(() => {
              routerStatus.innerHTML = `<span style="color: var(--accent-orange)">Trying Provider B...</span>`;
              
              this.animatePacket('node-dag-router', 'node-prov-b', 'orange', 500, () => {
                this.animateNodeGlow('node-prov-b', 'cache-miss-glow', 500);
                provBStatus.innerHTML = `<span style="color: var(--accent-orange)">No Bid (No Match)</span>`;

                // Both A and B failed. Fallback to Backfill Ad!
                setTimeout(() => {
                  routerStatus.innerHTML = `<span style="color: var(--accent-orange)">Triggering Backfill Waterfall...</span>`;

                  this.animatePacket('node-dag-router', 'node-backfill', 'orange', 600, () => {
                    this.animateNodeGlow('node-backfill', 'cache-hit-glow', 1000);
                    backfillDetails.innerHTML = `<span style="color: var(--accent-green); font-weight: bold;">Served ($0.80 CPM)</span>`;
                    routerStatus.innerHTML = `<span style="color: var(--accent-green)">Waterfall Complete (Backfill)</span>`;

                    // Reset & Enable
                    setTimeout(() => {
                      routerStatus.innerHTML = origRouter;
                      provAStatus.innerHTML = origProvA;
                      provBStatus.innerHTML = origProvB;
                      backfillDetails.innerHTML = origBackfill;
                      this.runBtn.disabled = false;
                    }, 3000);
                  });
                }, 500);
              });
              this.animatePathGlow('path-router-b', 'miss-path', 500);
            }, 500);
          });
          this.animatePathGlow('path-router-a', 'miss-path', 500);

        }, 400);
      }
    });
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
// AI Chatbot Controller
// ==========================================
class AIChatbot {
  constructor() {
    this.container = document.getElementById('ai-chatbot');
    this.fab = document.getElementById('chatbot-fab');
    this.window = document.getElementById('chatbot-window');
    this.closeBtn = document.getElementById('chatbot-close');
    this.messagesContainer = document.getElementById('chatbot-messages');
    this.form = document.getElementById('chatbot-form');
    this.input = document.getElementById('chatbot-input');
    this.chips = document.querySelectorAll('.chatbot-quick-chips .chip');

    this.messages = [];
    this.isOpen = false;

    if (this.container && this.fab && this.window) {
      this.init();
    }
  }

  init() {
    // Open/Close close button (click listener remains on close button)
    this.closeBtn.addEventListener('click', () => this.close());

    // Submit handler
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleUserSubmit();
    });

    // Suggestion chips handler
    this.chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const question = chip.dataset.question;
        if (question) {
          this.sendMessage(question);
        }
      });
    });

    // Close on click outside on mobile
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.container.contains(e.target)) {
        this.close();
      }
    });

    // Setup drag and drop for the floating action button
    this.setupDraggable();

    // Restore previously saved coordinates if any
    this.restorePosition();

    // Load history or initialize welcome message
    this.loadHistory();
  }

  setupDraggable() {
    let isDragging = false;
    let startX, startY;
    let initialLeft, initialTop;
    const dragThreshold = 5; // px
    let hasMoved = false;

    const onStart = (e) => {
      // Don't drag if clicking close button or input, only when clicking FAB
      if (e.target !== this.fab && !this.fab.contains(e.target)) return;

      isDragging = true;
      hasMoved = false;

      // Get current coordinates
      const rect = this.container.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      // Reset bottom/right styles and set left/top to allow absolute dragging
      this.container.style.bottom = 'auto';
      this.container.style.right = 'auto';
      this.container.style.left = `${initialLeft}px`;
      this.container.style.top = `${initialTop}px`;
      this.container.classList.add('dragged');

      const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;

      if (e.type === 'touchstart') {
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
      } else {
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
      }
      
      if (e.cancelable) e.preventDefault();
    };

    const onMove = (e) => {
      if (!isDragging) return;

      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

      const dx = clientX - startX;
      const dy = clientY - startY;

      if (!hasMoved && (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold)) {
        hasMoved = true;
      }

      if (hasMoved) {
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        // Keep inside viewport boundaries
        const padding = 10;
        const fabRect = this.fab.getBoundingClientRect();
        const minLeft = padding;
        const maxLeft = window.innerWidth - fabRect.width - padding;
        const minTop = padding;
        const maxTop = window.innerHeight - fabRect.height - padding;

        newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
        newTop = Math.max(minTop, Math.min(newTop, maxTop));

        this.container.style.left = `${newLeft}px`;
        this.container.style.top = `${newTop}px`;

        this.updateDirectionAndAlignment();
      }

      if (e.cancelable) e.preventDefault();
    };

    const onEnd = (e) => {
      isDragging = false;

      if (e.type === 'touchend') {
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
      } else {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
      }

      if (!hasMoved) {
        this.toggle();
      } else {
        sessionStorage.setItem('chatbot_dragged_left', this.container.style.left);
        sessionStorage.setItem('chatbot_dragged_top', this.container.style.top);
      }
    };

    this.fab.addEventListener('mousedown', onStart);
    this.fab.addEventListener('touchstart', onStart, { passive: false });
  }

  restorePosition() {
    const left = sessionStorage.getItem('chatbot_dragged_left');
    const top = sessionStorage.getItem('chatbot_dragged_top');
    
    if (left && top) {
      this.container.style.bottom = 'auto';
      this.container.style.right = 'auto';
      this.container.style.left = left;
      this.container.style.top = top;
      this.container.classList.add('dragged');
      
      setTimeout(() => this.updateDirectionAndAlignment(), 100);
    }
  }

  updateDirectionAndAlignment() {
    const rect = this.container.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Render below if in the top half of the screen
    const isTopHalf = rect.top + rect.height / 2 < viewportHeight / 2;
    if (isTopHalf) {
      this.container.classList.add('render-below');
    } else {
      this.container.classList.remove('render-below');
    }

    // Align left if in the left half of the screen
    const isLeftHalf = rect.left + rect.width / 2 < viewportWidth / 2;
    if (isLeftHalf) {
      this.container.classList.add('render-left');
    } else {
      this.container.classList.remove('render-left');
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.updateDirectionAndAlignment();
    this.isOpen = true;
    this.container.classList.add('open');
    this.window.setAttribute('aria-hidden', 'false');
    
    // Hide notification dot if visible
    const dot = this.container.querySelector('.fab-notification-dot');
    if (dot) dot.style.display = 'none';

    // Focus input on desktop
    setTimeout(() => {
      if (window.innerWidth > 768) {
        this.input.focus();
      }
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }, 300);
  }

  close() {
    this.isOpen = false;
    this.container.classList.remove('open');
    this.window.setAttribute('aria-hidden', 'true');
    this.input.blur();
  }

  loadHistory() {
    const saved = sessionStorage.getItem('portfolio_chat_history');
    if (saved) {
      try {
        this.messages = JSON.parse(saved);
        this.renderAllMessages();
        return;
      } catch (e) {
        console.error("Failed to parse chat history:", e);
      }
    }

    // Default Greeting
    this.messages = [
      {
        role: 'assistant',
        content: `Hi! I'm Rohit's AI Assistant. Ask me anything about his backend and systems engineering experience at Atlassian and Media.net, his technical skills, or his projects. How can I help you today?`
      }
    ];
    this.renderAllMessages();
  }

  saveHistory() {
    sessionStorage.setItem('portfolio_chat_history', JSON.stringify(this.messages));
  }

  renderAllMessages() {
    this.messagesContainer.innerHTML = '';
    this.messages.forEach(msg => {
      this.appendMessageElement(msg.role, msg.content);
    });
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  appendMessageElement(role, text, isError = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chatbot-message ${role}${isError ? ' system-error' : ''}`;
    
    if (role === 'assistant' && !isError) {
      msgDiv.innerHTML = this.formatMarkdown(text);
    } else {
      msgDiv.textContent = text;
    }
    
    this.messagesContainer.appendChild(msgDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  formatMarkdown(text) {
    // 1. Escaping HTML first to prevent XSS
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // 2. Bold text **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 3. Inline code `code`
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');

    // 4. Links [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // 5. Line items: lines starting with "- " or "* "
    const lines = html.split('\n');
    let inList = false;
    let result = [];

    for (let line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) {
          inList = true;
          result.push('<ul>');
        }
        result.push(`<li>${trimmed.substring(2)}</li>`);
      } else {
        if (inList) {
          inList = false;
          result.push('</ul>');
        }
        if (trimmed) {
          result.push(`<p>${trimmed}</p>`);
        }
      }
    }
    if (inList) {
      result.push('</ul>');
    }

    return result.join('\n');
  }

  handleUserSubmit() {
    const text = this.input.value.trim();
    if (!text) return;
    this.input.value = '';
    this.sendMessage(text);
  }

  async sendMessage(text) {
    // Add user message to state and UI
    this.messages.push({ role: 'user', content: text });
    this.appendMessageElement('user', text);
    this.saveHistory();

    // Show typing indicator
    this.showTypingIndicator();

    try {
      // Call Netlify serverless function
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: this.messages
        })
      });

      this.removeTypingIndicator();

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      const reply = data.reply || "I'm sorry, I encountered an empty response. Please try again.";

      // Add assistant message to state and UI
      this.messages.push({ role: 'assistant', content: reply });
      this.appendMessageElement('assistant', reply);
      this.saveHistory();

    } catch (err) {
      console.error("Chat communication error:", err);
      this.removeTypingIndicator();
      this.appendMessageElement('assistant', "Sorry, I'm having trouble connecting to the backend. Please try again in a moment.", true);
    }
  }

  showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'chatbot-message assistant';
    indicator.id = 'typing-indicator';
    indicator.style.borderBottomLeftRadius = '2px';
    indicator.innerHTML = `
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    this.messagesContainer.appendChild(indicator);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
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
        visualizer.switchTab('reliability');
        document.getElementById('architecture').scrollIntoView({ behavior: 'smooth' });
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

  // Setup AI Chatbot
  const chatbot = new AIChatbot();

  // Setup Scroll reveals
  initScrollReveal();
});