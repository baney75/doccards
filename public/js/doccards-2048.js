(function (root) {
  "use strict";

  var SIZE = 4;
  var BEST_KEY = "doccards_2048_best";
  var STATE_KEY = "doccards_2048_state";

  var TILE_COLORS = {
    2: { bg: "#F8F1E3", fg: "#0D2240" },
    4: { bg: "#E8D5A3", fg: "#0D2240" },
    8: { bg: "#C9A961", fg: "#fff" },
    16: { bg: "#B8894A", fg: "#fff" },
    32: { bg: "#9C7A4A", fg: "#fff" },
    64: { bg: "#9C1E1E", fg: "#fff" },
    128: { bg: "#0F5C2F", fg: "#fff" },
    256: { bg: "#0D2240", fg: "#fff" },
    512: { bg: "#7A5230", fg: "#fff" },
    1024: { bg: "#5a3d8a", fg: "#fff" },
    2048: { bg: "#C9A961", fg: "#0D2240" }
  };

  function emptyGrid() {
    var g = [];
    var r;
    for (r = 0; r < SIZE; r++) g.push([0, 0, 0, 0]);
    return g;
  }

  function cloneGrid(g) {
    return g.map(function (row) { return row.slice(); });
  }

  function randEmptyCell(grid) {
    var cells = [];
    var r;
    var c;
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) {
        if (!grid[r][c]) cells.push({ r: r, c: c });
      }
    }
    if (!cells.length) return null;
    return cells[Math.floor(Math.random() * cells.length)];
  }

  function spawnTile(grid) {
    var cell = randEmptyCell(grid);
    if (!cell) return false;
    grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  function slideLine(line) {
    var arr = line.filter(function (v) { return v > 0; });
    var out = [];
    var score = 0;
    var i = 0;
    while (i < arr.length) {
      if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
        var merged = arr[i] * 2;
        out.push(merged);
        score += merged;
        i += 2;
      } else {
        out.push(arr[i]);
        i++;
      }
    }
    while (out.length < SIZE) out.push(0);
    return { line: out, score: score, moved: line.join(",") !== out.join(",") };
  }

  function moveGrid(grid, dir) {
    var g = cloneGrid(grid);
    var totalScore = 0;
    var moved = false;
    var r;
    var c;
    var res;

    if (dir === "left") {
      for (r = 0; r < SIZE; r++) {
        res = slideLine(g[r]);
        g[r] = res.line;
        totalScore += res.score;
        if (res.moved) moved = true;
      }
    } else if (dir === "right") {
      for (r = 0; r < SIZE; r++) {
        var rev = g[r].slice().reverse();
        res = slideLine(rev);
        g[r] = res.line.reverse();
        totalScore += res.score;
        if (res.moved) moved = true;
      }
    } else if (dir === "up") {
      for (c = 0; c < SIZE; c++) {
        var col = [];
        for (r = 0; r < SIZE; r++) col.push(g[r][c]);
        res = slideLine(col);
        for (r = 0; r < SIZE; r++) g[r][c] = res.line[r];
        totalScore += res.score;
        if (res.moved) moved = true;
      }
    } else if (dir === "down") {
      for (c = 0; c < SIZE; c++) {
        col = [];
        for (r = SIZE - 1; r >= 0; r--) col.push(g[r][c]);
        res = slideLine(col);
        for (r = 0; r < SIZE; r++) g[SIZE - 1 - r][c] = res.line[r];
        totalScore += res.score;
        if (res.moved) moved = true;
      }
    }
    return { grid: g, score: totalScore, moved: moved };
  }

  function canMove(grid) {
    var dirs = ["left", "right", "up", "down"];
    var i;
    for (i = 0; i < dirs.length; i++) {
      if (moveGrid(grid, dirs[i]).moved) return true;
    }
    return false;
  }

  function gridScore(grid) {
    var s = 0;
    var r;
    var c;
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) s += grid[r][c];
    }
    return s;
  }

  var G = {
    _root: null,
    _mounted: false,
    _paused: false,
    _grid: null,
    _score: 0,
    _best: 0,
    _won: false,
    _over: false,
    _touchStart: null,
    _onKey: null,
    _shell: null,

    mount: function (rootEl) {
      if (!rootEl) return;
      this._root = rootEl;
      if (!this._mounted) {
        this._mounted = true;
        this._best = DCPuzzle.loadInt(BEST_KEY, 0);
        if (!this._loadState()) this.newGame(false);
      }
      this._render();
    },

    pause: function () {
      this._paused = true;
      this._unbindKeys();
    },
    resume: function () {
      this._paused = false;
      if (this._mounted) this._render();
      if (!this._over) {
        this._bindKeys();
        this._focusBoard();
      }
    },

    newGame: function (playSound) {
      this._grid = emptyGrid();
      this._score = 0;
      this._won = false;
      this._over = false;
      spawnTile(this._grid);
      spawnTile(this._grid);
      this._saveState();
      var over = document.getElementById("dc-2048-over");
      if (over) over.classList.add("hidden");
      this._render();
      if (!this._paused) {
        this._bindKeys();
        this._focusBoard();
      }
      if (playSound !== false && typeof DCSound !== "undefined" && DCSound.deal) DCSound.deal();
    },

    _unbindKeys: function () {
      if (this._onKey) {
        document.removeEventListener("keydown", this._onKey);
        this._onKey = null;
      }
    },

    _bindKeys: function () {
      var self = this;
      this._unbindKeys();
      this._onKey = function (e) {
        if (self._paused || self._over) return;
        var t = e.target && e.target.tagName;
        if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
        if (e.target && e.target.isContentEditable) return;
        var map = {
          ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
          a: "left", A: "left", d: "right", D: "right",
          w: "up", W: "up", s: "down", S: "down"
        };
        var dir = map[e.key];
        if (!dir) return;
        e.preventDefault();
        self._move(dir);
      };
      document.addEventListener("keydown", this._onKey, { passive: false });
    },

    _focusBoard: function () {
      var board = document.getElementById("dc-2048-board");
      if (!board) return;
      try { board.focus({ preventScroll: true }); } catch (e) {
        try { board.focus(); } catch (e2) {}
      }
    },

    _loadState: function () {
      try {
        var raw = localStorage.getItem(STATE_KEY);
        if (!raw) return false;
        var data = JSON.parse(raw);
        if (!data || !data.grid) return false;
        this._grid = data.grid;
        this._score = data.score || 0;
        this._won = !!data.won;
        this._over = !!data.over;
        if (!this._over && !canMove(this._grid)) this._over = true;
        return true;
      } catch (e) {
        return false;
      }
    },

    _saveState: function () {
      try {
        localStorage.setItem(STATE_KEY, JSON.stringify({
          grid: this._grid,
          score: this._score,
          won: this._won,
          over: this._over
        }));
      } catch (e) {}
      if (this._score > this._best) {
        this._best = this._score;
        DCPuzzle.saveInt(BEST_KEY, this._best);
      }
    },

    _render: function () {
      if (!this._root || this._paused) return;
      var self = this;
      if (!this._shell) {
        this._root.innerHTML =
          '<div class="dc-pz-shell dc-pz-2048">' +
          DCPuzzle.topBarHtml({ score: this._score, best: this._best, scoreId: "dc-2048-score", bestId: "dc-2048-best" }) +
          '<p class="dc-pz-hint">Arrows or WASD · swipe · merge matching tiles</p>' +
          '<div class="dc-2048-board" id="dc-2048-board" tabindex="0" role="application" aria-label="2048 board"></div>' +
          '<div class="dc-pz-over hidden" id="dc-2048-over" role="dialog" aria-modal="true" aria-labelledby="dc-2048-over-title">' +
          '<div class="dc-pz-over-card"><p class="dc-pz-over-title" id="dc-2048-over-title">No moves left</p>' +
          '<p class="dc-pz-over-score">Score <strong id="dc-2048-over-score">0</strong></p>' +
          '<button type="button" class="doccards-btn" id="dc-2048-retry">Play again</button></div></div>' +
          "</div>";
        this._shell = this._root.querySelector(".dc-pz-shell");
        DCPuzzle.bindChrome(this._shell, function () { self.newGame(); }, "Start a fresh 2048 board?");
        document.getElementById("dc-2048-retry").addEventListener("click", function () {
          document.getElementById("dc-2048-over").classList.add("hidden");
          self.newGame();
        });
        var board = document.getElementById("dc-2048-board");
        board.addEventListener("touchstart", function (e) {
          if (!e.touches || !e.touches[0]) return;
          self._touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }, { passive: true });
        board.addEventListener("touchend", function (e) {
          if (!self._touchStart || !e.changedTouches || !e.changedTouches[0]) return;
          var t = e.changedTouches[0];
          var dx = t.clientX - self._touchStart.x;
          var dy = t.clientY - self._touchStart.y;
          self._touchStart = null;
          if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
          if (Math.abs(dx) > Math.abs(dy)) self._move(dx > 0 ? "right" : "left");
          else self._move(dy > 0 ? "down" : "up");
        });
      }
      this._paint();
      this._updateHud();
      if (this._over) {
        var over = document.getElementById("dc-2048-over");
        var scoreEl = document.getElementById("dc-2048-over-score");
        if (scoreEl) scoreEl.textContent = String(this._score);
        if (over) over.classList.remove("hidden");
      } else if (!this._paused) {
        this._bindKeys();
        this._focusBoard();
      }
    },

    _move: function (dir) {
      var result = moveGrid(this._grid, dir);
      if (!result.moved) {
        if (typeof DCPuzzle !== "undefined" && DCPuzzle.feedbackInvalid) DCPuzzle.feedbackInvalid();
        return;
      }
      this._grid = result.grid;
      this._score += result.score;
      spawnTile(this._grid);
      if (typeof DCSound !== "undefined" && DCSound.cardPlace) DCSound.cardPlace();

      var r;
      var c;
      var hit2048 = false;
      for (r = 0; r < SIZE; r++) {
        for (c = 0; c < SIZE; c++) {
          if (this._grid[r][c] >= 2048) hit2048 = true;
        }
      }
      if (hit2048 && !this._won) {
        this._won = true;
        if (typeof DCFX !== "undefined" && DCFX.burstConfetti) DCFX.burstConfetti(32, true);
        if (typeof DCUI !== "undefined" && DCUI._showToast) DCUI._showToast("2048! Keep going!", "win");
      }

      this._saveState();
      this._paint();
      this._updateHud();

      if (!canMove(this._grid)) {
        this._endGame();
      }
    },

    _paint: function () {
      var board = document.getElementById("dc-2048-board");
      if (!board) return;
      var html = "";
      var r;
      var c;
      for (r = 0; r < SIZE; r++) {
        for (c = 0; c < SIZE; c++) {
          var v = this._grid[r][c];
          var style = TILE_COLORS[v] || { bg: "#3d2817", fg: "#fff" };
          html += '<div class="dc-2048-cell' + (v ? " has-tile" : "") + '" style="--tile-bg:' + style.bg + ";--tile-fg:" + style.fg + '">' +
            (v ? "<span>" + v + "</span>" : "") + "</div>";
        }
      }
      board.innerHTML = html;
    },

    _updateHud: function () {
      var scoreEl = document.getElementById("dc-2048-score");
      var bestEl = document.getElementById("dc-2048-best");
      if (scoreEl) {
        scoreEl.textContent = String(this._score);
        DCPuzzle.bumpScore(scoreEl);
      }
      if (bestEl) bestEl.textContent = String(this._best);
    },

    _endGame: function () {
      this._over = true;
      this._unbindKeys();
      this._saveState();
      var over = document.getElementById("dc-2048-over");
      var scoreEl = document.getElementById("dc-2048-over-score");
      if (scoreEl) scoreEl.textContent = String(this._score);
      if (over) over.classList.remove("hidden");
      if (typeof DCSound !== "undefined" && DCSound.milestone) DCSound.milestone();
    }
  };

  root.DC2048 = G;
})(this);
