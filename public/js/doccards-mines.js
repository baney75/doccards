(function (root) {
  "use strict";

  var ROWS = 9;
  var COLS = 9;
  var MINES = 10;
  var BEST_KEY = "doccards_mines_best";

  function emptyGrid() {
    var g = [];
    var r;
    for (r = 0; r < ROWS; r++) {
      g.push(new Array(COLS).fill(0));
    }
    return g;
  }

  function neighbors(r, c) {
    var out = [];
    var dr;
    var dc;
    for (dr = -1; dr <= 1; dr++) {
      for (dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var nr = r + dr;
        var nc = c + dc;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push({ r: nr, c: nc });
      }
    }
    return out;
  }

  function placeMines(grid, safeR, safeC) {
    var placed = 0;
    while (placed < MINES) {
      var r = Math.floor(Math.random() * ROWS);
      var c = Math.floor(Math.random() * COLS);
      if (grid[r][c] === -1) continue;
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      grid[r][c] = -1;
      placed++;
    }
    var rr;
    var cc;
    for (rr = 0; rr < ROWS; rr++) {
      for (cc = 0; cc < COLS; cc++) {
        if (grid[rr][cc] === -1) continue;
        var n = 0;
        var i;
        var nb = neighbors(rr, cc);
        for (i = 0; i < nb.length; i++) {
          if (grid[nb[i].r][nb[i].c] === -1) n++;
        }
        grid[rr][cc] = n;
      }
    }
  }

  var G = {
    _root: null,
    _mounted: false,
    _paused: false,
    _mines: null,
    _revealed: null,
    _flagged: null,
    _started: false,
    _over: false,
    _won: false,
    _seconds: 0,
    _timerId: null,
    _bestTime: null,
    _flagMode: false,
    _longPressTimer: null,
    _suppressClick: false,

    mount: function (rootEl) {
      if (!rootEl) return;
      this._root = rootEl;
      if (!this._mounted) {
        this._mounted = true;
        this._bestTime = DCPuzzle.loadInt(BEST_KEY, 0);
        this.newGame(false);
      }
      this._render();
    },

    pause: function () {
      this._paused = true;
      this._stopTimer();
    },

    resume: function () {
      this._paused = false;
      if (this._mounted) this._render();
      if (this._started && !this._over) this._startTimer();
    },

    newGame: function (playSound) {
      this._mines = emptyGrid();
      this._revealed = emptyGrid().map(function (row) { return row.map(function () { return false; }); });
      this._flagged = emptyGrid().map(function (row) { return row.map(function () { return false; }); });
      this._started = false;
      this._over = false;
      this._won = false;
      this._seconds = 0;
      this._flagMode = false;
      this._stopTimer();
      this._render();
      if (playSound !== false && typeof DCSound !== "undefined" && DCSound.deal) DCSound.deal();
    },

    _stopTimer: function () {
      if (this._timerId) {
        clearInterval(this._timerId);
        this._timerId = null;
      }
    },

    _startTimer: function () {
      var self = this;
      if (this._timerId) return;
      this._timerId = setInterval(function () {
        self._seconds++;
        var el = document.getElementById("dc-mines-time");
        if (el) el.textContent = String(self._seconds);
      }, 1000);
    },

    _render: function () {
      if (!this._root || this._paused) return;
      var self = this;
      if (!this._shell) {
        this._root.innerHTML =
          '<div class="dc-pz-shell dc-pz-mines">' +
          '<div class="dc-pz-top">' +
          '<div class="dc-pz-stat"><span class="dc-pz-stat-label">Flags</span><span class="dc-pz-stat-val" id="dc-mines-flags">' + MINES + "</span></div>" +
          '<div class="dc-pz-stat"><span class="dc-pz-stat-label">Time</span><span class="dc-pz-stat-val" id="dc-mines-time">0</span></div>' +
          '<div class="dc-pz-stat"><span class="dc-pz-stat-label">Best</span><span class="dc-pz-stat-val" id="dc-mines-best">' + (this._bestTime || "—") + "</span></div>" +
          '<button type="button" class="doccards-btn doccards-btn-secondary dc-mines-flag" id="dc-mines-flag">Flag</button>' +
          '<button type="button" class="doccards-btn doccards-btn-secondary dc-pz-games" data-dc-pz-games>Games</button>' +
          '<button type="button" class="doccards-btn doccards-btn-secondary dc-pz-new" data-dc-pz-new>New</button>' +
          "</div>" +
          '<p class="dc-pz-hint">Tap to reveal · hold or Flag mode to mark mines</p>' +
          '<div class="dc-mines-board" id="dc-mines-board" role="grid"></div>' +
          '<div class="dc-pz-over hidden" id="dc-mines-over" role="dialog" aria-modal="true">' +
          '<div class="dc-pz-over-card"><p class="dc-pz-over-title" id="dc-mines-over-title">Boom!</p>' +
          '<button type="button" class="doccards-btn" id="dc-mines-retry">Try again</button></div></div>' +
          "</div>";
        this._shell = this._root.querySelector(".dc-pz-shell");
        DCPuzzle.bindChrome(this._shell, function () { self.newGame(); }, "Start a fresh minefield?");
        document.getElementById("dc-mines-retry").addEventListener("click", function () {
          document.getElementById("dc-mines-over").classList.add("hidden");
          self.newGame();
        });
        document.getElementById("dc-mines-flag").addEventListener("click", function () {
          self._flagMode = !self._flagMode;
          document.getElementById("dc-mines-flag").classList.toggle("active", self._flagMode);
        });
      }
      this._paint();
    },

    _paint: function () {
      var board = document.getElementById("dc-mines-board");
      if (!board) return;
      var self = this;
      board.innerHTML = "";
      var r;
      var c;
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "dc-mines-cell";
          btn.dataset.r = String(r);
          btn.dataset.c = String(c);
          btn.setAttribute("aria-label", "Cell " + (r + 1) + " " + (c + 1));
          this._styleCell(btn, r, c);
          this._bindCell(btn, r, c);
          board.appendChild(btn);
        }
      }
      this._updateFlags();
    },

    _styleCell: function (btn, r, c) {
      btn.className = "dc-mines-cell";
      btn.textContent = "";
      if (this._flagged[r][c]) {
        btn.classList.add("flagged");
        btn.textContent = "⚑";
        return;
      }
      if (!this._revealed[r][c]) {
        btn.classList.add("hidden-cell");
        return;
      }
      btn.classList.add("revealed");
      var v = this._mines[r][c];
      if (v === -1) {
        btn.classList.add("mine");
        btn.textContent = "💥";
      } else if (v > 0) {
        btn.classList.add("n" + v);
        btn.textContent = String(v);
      }
    },

    _bindCell: function (btn, r, c) {
      var self = this;
      var pressTimer = null;
      var longPressed = false;

      btn.addEventListener("click", function (e) {
        if (self._over) return;
        if (longPressed || self._suppressClick) {
          longPressed = false;
          self._suppressClick = false;
          if (e && e.preventDefault) e.preventDefault();
          return;
        }
        if (self._flagMode || self._flagged[r][c]) {
          self._toggleFlag(r, c);
          return;
        }
        self._reveal(r, c);
      });

      btn.addEventListener("contextmenu", function (e) {
        e.preventDefault();
      });

      btn.addEventListener("touchstart", function () {
        if (self._over) return;
        longPressed = false;
        pressTimer = setTimeout(function () {
          pressTimer = null;
          longPressed = true;
          self._suppressClick = true;
          self._toggleFlag(r, c);
          if (typeof DCSound !== "undefined" && DCSound.cardPlace) DCSound.cardPlace();
        }, 450);
      }, { passive: true });

      btn.addEventListener("touchend", function () {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      });

      btn.addEventListener("touchcancel", function () {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      });
    },

    _toggleFlag: function (r, c) {
      if (this._revealed[r][c] || this._over) return;
      this._flagged[r][c] = !this._flagged[r][c];
      this._paint();
    },

    _updateFlags: function () {
      var left = MINES;
      var r;
      var c;
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          if (this._flagged[r][c]) left--;
        }
      }
      var el = document.getElementById("dc-mines-flags");
      if (el) el.textContent = String(Math.max(0, left));
    },

    _reveal: function (r, c) {
      if (this._over || this._flagged[r][c] || this._revealed[r][c]) return;

      if (!this._started) {
        placeMines(this._mines, r, c);
        this._started = true;
        this._startTimer();
      }

      if (this._mines[r][c] === -1) {
        this._gameOver(false);
        return;
      }

      this._flood(r, c);
      if (typeof DCSound !== "undefined" && DCSound.cardPlace) DCSound.cardPlace();
      this._paint();

      if (this._checkWin()) {
        this._gameOver(true);
      }
    },

    _flood: function (r, c) {
      if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return;
      if (this._revealed[r][c] || this._flagged[r][c]) return;
      this._revealed[r][c] = true;
      if (this._mines[r][c] === 0) {
        var nb = neighbors(r, c);
        var i;
        for (i = 0; i < nb.length; i++) {
          this._flood(nb[i].r, nb[i].c);
        }
      }
    },

    _checkWin: function () {
      var r;
      var c;
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          if (this._mines[r][c] !== -1 && !this._revealed[r][c]) return false;
        }
      }
      return true;
    },

    _gameOver: function (won) {
      this._over = true;
      this._won = won;
      this._stopTimer();
      var r;
      var c;
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          if (this._mines[r][c] === -1) this._revealed[r][c] = true;
        }
      }
      this._paint();
      var over = document.getElementById("dc-mines-over");
      var title = document.getElementById("dc-mines-over-title");
      if (title) title.textContent = won ? "Field cleared!" : "Boom!";
      if (over) over.classList.remove("hidden");
      if (won) {
        if (this._bestTime === 0 || this._seconds < this._bestTime) {
          this._bestTime = this._seconds;
          DCPuzzle.saveInt(BEST_KEY, this._bestTime);
          var bestEl = document.getElementById("dc-mines-best");
          if (bestEl) bestEl.textContent = String(this._bestTime);
        }
        if (typeof DCFX !== "undefined" && DCFX.burstConfetti) DCFX.burstConfetti(28, true);
        if (typeof DCSound !== "undefined" && DCSound.milestone) DCSound.milestone();
      } else if (typeof DCSound !== "undefined" && DCSound.cardPlace) {
        DCSound.cardPlace();
      }
    }
  };

  root.DCMines = G;
})(this);
