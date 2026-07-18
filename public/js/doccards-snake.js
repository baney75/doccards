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
    _touchStart: null,

    mount: function (rootEl) {
      if (!rootEl) return;
      this._root = rootEl;
      if (!this._mounted) {
        this._mounted = true;
        this._best = DCPuzzle.loadInt(BEST_KEY, 0);
      }
      this._render();
    },

    pause: function () {
      this._paused = true;
      this._stopLoop();
    },

    resume: function () {
      this._paused = false;
      if (this._mounted && !this._over) {
        this._startLoop();
        this._render();
      }
    },

    newGame: function (playSound) {
      this._stopLoop();
      this._over = false;
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
      this._paint();
      this._updateHud();
      if (!this._paused) this._startLoop();
      if (playSound !== false && typeof DCSound !== "undefined" && DCSound.deal) DCSound.deal();
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
      if (this._over || this._paused) return;
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

    _setDir: function (dx, dy) {
      if (this._over) return;
      if (dx === -this._dir.x && dy === -this._dir.y) return;
      this._nextDir = { x: dx, y: dy };
    },

    _tick: function () {
      if (this._over || this._paused) return;
      this._dir = this._nextDir;
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
      if (!this._root || this._paused && !this._shell) return;
      var self = this;
      if (!this._shell) {
        this._root.innerHTML =
          '<div class="dc-pz-shell dc-pz-snake">' +
          DCPuzzle.topBarHtml({ score: 0, best: this._best, scoreId: "dc-snake-score", bestId: "dc-snake-best" }) +
          '<p class="dc-pz-hint">Swipe or arrow keys · eat gold · don\'t bite yourself</p>' +
          '<div class="dc-snake-wrap">' +
          '<div class="dc-snake-board" id="dc-snake-board" tabindex="0" role="application" aria-label="Snake game"></div>' +
          "</div>" +
          '<div class="dc-snake-dpad" aria-hidden="true">' +
          '<button type="button" class="dc-snake-btn" data-d="up">▲</button>' +
          '<div class="dc-snake-dpad-mid">' +
          '<button type="button" class="dc-snake-btn" data-d="left">◀</button>' +
          '<button type="button" class="dc-snake-btn" data-d="right">▶</button>' +
          "</div>" +
          '<button type="button" class="dc-snake-btn" data-d="down">▼</button>' +
          "</div>" +
          '<div class="dc-pz-over hidden" id="dc-snake-over" role="dialog" aria-modal="true">' +
          '<div class="dc-pz-over-card"><p class="dc-pz-over-title">Game over!</p>' +
          '<p class="dc-pz-over-score">Score <strong id="dc-snake-over-score">0</strong></p>' +
          '<button type="button" class="doccards-btn" id="dc-snake-retry">Play again</button></div></div>' +
          "</div>";
        this._shell = this._root.querySelector(".dc-pz-shell");
        DCPuzzle.bindChrome(this._shell, function () { self.newGame(); }, "Start a fresh Snake run?");
        document.getElementById("dc-snake-retry").addEventListener("click", function () {
          document.getElementById("dc-snake-over").classList.add("hidden");
          self.newGame();
        });
        var board = document.getElementById("dc-snake-board");
        board.addEventListener("keydown", function (e) {
          var map = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
          if (map[e.key]) {
            e.preventDefault();
            self._setDir(map[e.key][0], map[e.key][1]);
          }
        });
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
        var btns = this._shell.querySelectorAll(".dc-snake-btn");
        var bi;
        for (bi = 0; bi < btns.length; bi++) {
          btns[bi].addEventListener("click", function (ev) {
            var d = ev.currentTarget.getAttribute("data-d");
            if (d === "up") self._setDir(0, -1);
            if (d === "down") self._setDir(0, 1);
            if (d === "left") self._setDir(-1, 0);
            if (d === "right") self._setDir(1, 0);
          });
        }
        // Keep the snake if we left mid-run (hub remounts wipe the DOM only).
        if (!this._snake || !this._snake.length) this.newGame(false);
        else {
          this._paint();
          this._updateHud();
          if (!this._paused && !this._over) this._startLoop();
        }
      }
      this._paint();
      this._updateHud();
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
      this._stopLoop();
      var over = document.getElementById("dc-snake-over");
      var el = document.getElementById("dc-snake-over-score");
      if (el) el.textContent = String(this._score);
      if (over) over.classList.remove("hidden");
      if (typeof DCSound !== "undefined" && DCSound.milestone) DCSound.milestone();
    },

    _win: function () {
      this._over = true;
      this._stopLoop();
      if (typeof DCFX !== "undefined" && DCFX.burstConfetti) DCFX.burstConfetti(40, true);
      if (typeof DCUI !== "undefined" && DCUI._showToast) DCUI._showToast("Snake master — board filled!", "win");
      this._gameOver();
    }
  };

  root.DCSnake = G;
})(this);
