(function (root) {
  "use strict";

  var COLS = 16;
  var ROWS = 20;
  var BEST_KEY = "doccards_snake_best";
  var TICK_START = 140;

  var G = {
    _root: null,
    _mounted: false,
    _paused: false,
    _shell: null,
    _snake: [],
    _dir: { x: 1, y: 0 },
    _nextDir: { x: 1, y: 0 },
    _food: null,
    _score: 0,
    _best: 0,
    _tickMs: TICK_START,
    _timer: null,
    _over: false,
    _started: false,
    _touchStart: null,
    _onKey: null,

    mount: function (rootEl) {
      if (!rootEl) return;
      this._root = rootEl;
      if (!this._mounted) {
        this._mounted = true;
        this._best = DCPuzzle.loadInt(BEST_KEY, 0);
      }
      // Hub clears the DOM; always rebuild the shell for this root.
      this._shell = null;
      this._stopLoop();
      var needsNew = this._over || !this._snake || !this._snake.length;
      // Clear stale over before paint so the overlay does not flash on entry.
      if (needsNew) this._over = false;
      this._render();
      if (needsNew) {
        this.newGame(false);
      } else {
        this._paint();
        this._updateHud();
        this._updateHint();
      }
    },

    pause: function () {
      this._paused = true;
      this._stopLoop();
      this._unbindKeys();
    },

    resume: function () {
      this._paused = false;
      if (!this._mounted || !this._root) return;
      if (!this._shell) this._render();
      if (this._over) {
        this._showOver();
        this._updateHint();
        // Rebind so Enter/Space can restart after chooser/confirm pause.
        this._bindKeys();
        return;
      }
      this._paint();
      this._updateHud();
      this._updateHint();
      this._bindKeys();
      this._focusBoard();
      if (this._started) this._startLoop();
    },

    newGame: function (playSound) {
      this._stopLoop();
      this._over = false;
      this._started = false;
      this._score = 0;
      this._tickMs = TICK_START;
      var midX = Math.floor(COLS / 2);
      var midY = Math.floor(ROWS / 2);
      this._snake = [
        { x: midX, y: midY },
        { x: midX - 1, y: midY },
        { x: midX - 2, y: midY }
      ];
      this._dir = { x: 1, y: 0 };
      this._nextDir = { x: 1, y: 0 };
      this._spawnFood();
      if (!this._shell) this._render();
      this._hideOver();
      this._paint();
      this._updateHud();
      this._updateHint();
      if (!this._paused) {
        this._bindKeys();
        this._focusBoard();
      }
      // Do not auto-run — wait for first arrow/WASD/swipe/D-pad input.
      if (playSound !== false && typeof DCSound !== "undefined" && DCSound.deal) DCSound.deal();
    },

    _hideOver: function () {
      var over = document.getElementById("dc-snake-over");
      if (over) over.classList.add("hidden");
    },

    _showOver: function () {
      var over = document.getElementById("dc-snake-over");
      var el = document.getElementById("dc-snake-over-score");
      if (el) el.textContent = String(this._score);
      if (over) over.classList.remove("hidden");
      this._updateHint();
    },

    _updateHint: function () {
      var hint = document.getElementById("dc-snake-hint");
      if (!hint) return;
      if (this._over) {
        hint.textContent = "Game over — tap Play again";
      } else if (!this._started) {
        hint.textContent = "Press an arrow key or WASD to start · swipe · D-pad";
      } else {
        hint.textContent = "Arrows / WASD · swipe · D-pad · eat gold";
      }
    },

    _unbindKeys: function () {
      if (this._onKey) {
        document.removeEventListener("keydown", this._onKey);
        this._onKey = null;
      }
    },

    _uiBlocked: function () {
      var chooser = document.getElementById("game-chooser");
      if (chooser && chooser.classList.contains("show")) return true;
      var confirm = document.getElementById("dc-confirm");
      if (confirm && !confirm.classList.contains("hidden")) return true;
      return false;
    },

    _bindKeys: function () {
      var self = this;
      this._unbindKeys();
      this._onKey = function (e) {
        if (self._paused) return;
        if (self._uiBlocked()) return;
        var t = e.target && e.target.tagName;
        if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
        if (e.target && e.target.isContentEditable) return;
        if (self._over) {
          var restartMap = {
            ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
            w: [0, -1], W: [0, -1], s: [0, 1], S: [0, 1],
            a: [-1, 0], A: [-1, 0], d: [1, 0], D: [1, 0]
          };
          if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
            e.preventDefault();
            self.newGame();
            return;
          }
          var restartDir = restartMap[e.key];
          if (restartDir) {
            e.preventDefault();
            self.newGame();
            self._setDir(restartDir[0], restartDir[1]);
          }
          return;
        }
        var map = {
          ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
          w: [0, -1], W: [0, -1], s: [0, 1], S: [0, 1],
          a: [-1, 0], A: [-1, 0], d: [1, 0], D: [1, 0]
        };
        var dir = map[e.key];
        if (!dir) return;
        e.preventDefault();
        self._setDir(dir[0], dir[1]);
      };
      document.addEventListener("keydown", this._onKey, { passive: false });
    },

    _focusBoard: function () {
      var board = document.getElementById("dc-snake-board");
      if (!board) return;
      try {
        board.focus({ preventScroll: true });
      } catch (e) {
        try { board.focus(); } catch (e2) {}
      }
    },

    _stopLoop: function () {
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    },

    _startLoop: function () {
      var self = this;
      this._stopLoop();
      if (this._over || this._paused || !this._started) return;
      this._timer = setInterval(function () { self._tick(); }, this._tickMs);
    },

    _spawnFood: function () {
      var empty = [];
      var r;
      var c;
      var i;
      var onSnake;
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          onSnake = false;
          for (i = 0; i < this._snake.length; i++) {
            if (this._snake[i].x === c && this._snake[i].y === r) {
              onSnake = true;
              break;
            }
          }
          if (!onSnake) empty.push({ x: c, y: r });
        }
      }
      if (!empty.length) {
        this._win();
        return;
      }
      this._food = empty[Math.floor(Math.random() * empty.length)];
    },

    _wouldHit: function (x, y) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
      var i;
      for (i = 0; i < this._snake.length; i++) {
        if (this._snake[i].x === x && this._snake[i].y === y) return true;
      }
      return false;
    },

    _setDir: function (dx, dy) {
      if (this._over || this._paused || this._uiBlocked()) return;
      if (!this._snake || !this._snake.length) return;
      if (!this._started) {
        // Block 180° vs idle facing AND any first step that would die immediately
        // (idle body trails left, so Left/A would suicide into the neck).
        if (dx === -this._dir.x && dy === -this._dir.y) {
          if (typeof DCPuzzle !== "undefined" && DCPuzzle.feedbackInvalid) {
            DCPuzzle.feedbackInvalid(DCPuzzle.INVALID && DCPuzzle.INVALID.snake);
          }
          return;
        }
        var nx = this._snake[0].x + dx;
        var ny = this._snake[0].y + dy;
        if (this._wouldHit(nx, ny)) {
          if (typeof DCPuzzle !== "undefined" && DCPuzzle.feedbackInvalid) {
            DCPuzzle.feedbackInvalid(DCPuzzle.INVALID && DCPuzzle.INVALID.snake);
          }
          return;
        }
        this._dir = { x: dx, y: dy };
        this._nextDir = { x: dx, y: dy };
        this._started = true;
        this._updateHint();
        this._startLoop();
        return;
      }
      // Block 180° against the already-queued turn this tick (not only current dir).
      var against = this._nextDir || this._dir;
      if (dx === -against.x && dy === -against.y) {
        if (typeof DCPuzzle !== "undefined" && DCPuzzle.feedbackInvalid) {
          DCPuzzle.feedbackInvalid(DCPuzzle.INVALID && DCPuzzle.INVALID.snake);
        }
        return;
      }
      this._nextDir = { x: dx, y: dy };
    },

    _tick: function () {
      if (this._over || this._paused || !this._started) return;
      if (!this._snake || !this._snake.length) {
        this._gameOver();
        return;
      }
      this._dir = this._nextDir || this._dir;
      var head = {
        x: this._snake[0].x + this._dir.x,
        y: this._snake[0].y + this._dir.y
      };
      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
        this._gameOver();
        return;
      }
      var i;
      for (i = 0; i < this._snake.length; i++) {
        if (this._snake[i].x === head.x && this._snake[i].y === head.y) {
          this._gameOver();
          return;
        }
      }
      this._snake.unshift(head);
      if (this._food && head.x === this._food.x && head.y === this._food.y) {
        this._score += 10;
        if (this._score > this._best) {
          this._best = this._score;
          DCPuzzle.saveInt(BEST_KEY, this._best);
        }
        this._tickMs = Math.max(70, TICK_START - Math.floor(this._snake.length / 2) * 4);
        this._startLoop();
        this._spawnFood();
        if (typeof DCSound !== "undefined" && DCSound.cardPlace) DCSound.cardPlace();
      } else {
        this._snake.pop();
      }
      this._paint();
      this._updateHud();
    },

    _render: function () {
      if (!this._root) return;
      var self = this;
      if (!this._shell) {
        this._root.innerHTML =
          '<div class="dc-pz-shell dc-pz-snake">' +
          DCPuzzle.topBarHtml({ score: 0, best: this._best, scoreId: "dc-snake-score", bestId: "dc-snake-best" }) +
          '<p class="dc-pz-hint" id="dc-snake-hint">Press an arrow key or WASD to start · swipe · D-pad</p>' +
          '<div class="dc-snake-wrap">' +
          '<div class="dc-snake-board" id="dc-snake-board" tabindex="0" role="application" aria-label="Snake game"></div>' +
          "</div>" +
          '<div class="dc-snake-dpad" role="group" aria-label="Direction pad">' +
          '<button type="button" class="dc-snake-btn" data-d="up" aria-label="Up">▲</button>' +
          '<div class="dc-snake-dpad-mid">' +
          '<button type="button" class="dc-snake-btn" data-d="left" aria-label="Left">◀</button>' +
          '<button type="button" class="dc-snake-btn" data-d="right" aria-label="Right">▶</button>' +
          "</div>" +
          '<button type="button" class="dc-snake-btn" data-d="down" aria-label="Down">▼</button>' +
          "</div>" +
          '<div class="dc-pz-over hidden" id="dc-snake-over" role="dialog" aria-modal="true">' +
          '<div class="dc-pz-over-card"><p class="dc-pz-over-title">Game over!</p>' +
          '<p class="dc-pz-over-score">Score <strong id="dc-snake-over-score">0</strong></p>' +
          '<button type="button" class="doccards-btn" id="dc-snake-retry">Play again</button></div></div>' +
          "</div>";
        this._shell = this._root.querySelector(".dc-pz-shell");
        DCPuzzle.bindChrome(this._shell, function () { self.newGame(); }, "Start a fresh Snake run?");
        var retry = document.getElementById("dc-snake-retry");
        if (retry) {
          retry.addEventListener("click", function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            self.newGame();
          });
        }
        var board = document.getElementById("dc-snake-board");
        if (board) {
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
            if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
            if (Math.abs(dx) > Math.abs(dy)) self._setDir(dx > 0 ? 1 : -1, 0);
            else self._setDir(0, dy > 0 ? 1 : -1);
          });
        }
        var btns = this._shell.querySelectorAll(".dc-snake-btn");
        var bi;
        for (bi = 0; bi < btns.length; bi++) {
          (function (btn) {
            function steer(ev) {
              ev.preventDefault();
              ev.stopPropagation();
              if (self._over) self.newGame();
              var d = btn.getAttribute("data-d");
              if (d === "up") self._setDir(0, -1);
              if (d === "down") self._setDir(0, 1);
              if (d === "left") self._setDir(-1, 0);
              if (d === "right") self._setDir(1, 0);
            }
            // pointerdown for low latency; ignore the following click to avoid double-steer.
            btn.addEventListener("pointerdown", function (ev) {
              btn._dcSteered = true;
              steer(ev);
            });
            btn.addEventListener("click", function (ev) {
              if (btn._dcSteered) {
                btn._dcSteered = false;
                ev.preventDefault();
                return;
              }
              steer(ev);
            });
          })(btns[bi]);
        }
      }
      this._paint();
      this._updateHud();
      this._updateHint();
      if (this._over) this._showOver();
      else this._hideOver();
    },

    _paint: function () {
      var board = document.getElementById("dc-snake-board");
      if (!board) return;
      var html = "";
      var r;
      var c;
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          var cls = "dc-snake-cell";
          var isHead = this._snake.length && this._snake[0].x === c && this._snake[0].y === r;
          var isBody = false;
          var i;
          for (i = 1; i < this._snake.length; i++) {
            if (this._snake[i].x === c && this._snake[i].y === r) {
              isBody = true;
              break;
            }
          }
          if (isHead) cls += " head";
          else if (isBody) cls += " body";
          else if (this._food && this._food.x === c && this._food.y === r) cls += " food";
          html += '<div class="' + cls + '"></div>';
        }
      }
      board.innerHTML = html;
    },

    _updateHud: function () {
      var s = document.getElementById("dc-snake-score");
      var b = document.getElementById("dc-snake-best");
      if (s) {
        s.textContent = String(this._score);
        DCPuzzle.bumpScore(s);
      }
      if (b) b.textContent = String(this._best);
    },

    _gameOver: function () {
      this._over = true;
      this._started = false;
      this._stopLoop();
      // Keep keys bound so Enter/Space can restart from the overlay.
      if (!this._paused) this._bindKeys();
      this._showOver();
      if (typeof DCSound !== "undefined" && DCSound.milestone) DCSound.milestone();
    },

    _win: function () {
      this._over = true;
      this._started = false;
      this._stopLoop();
      if (typeof DCFX !== "undefined" && DCFX.burstConfetti) DCFX.burstConfetti(40, true);
      if (typeof DCUI !== "undefined" && DCUI._showToast) DCUI._showToast("Snake master — board filled!", "win");
      this._gameOver();
    }
  };

  root.DCSnake = G;
})(this);
