(function (root) {
  "use strict";

  var SIZE = 5;
  var BEST_KEY = "doccards_lights_best";

  function emptyGrid(on) {
    var g = [];
    var r;
    for (r = 0; r < SIZE; r++) {
      g.push(new Array(SIZE).fill(on ? 1 : 0));
    }
    return g;
  }

  function toggleGrid(grid, r, c) {
    if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) grid[r][c] = grid[r][c] ? 0 : 1;
  }

  function press(grid, r, c) {
    toggleGrid(grid, r, c);
    toggleGrid(grid, r - 1, c);
    toggleGrid(grid, r + 1, c);
    toggleGrid(grid, r, c - 1);
    toggleGrid(grid, r, c + 1);
  }

  function allOff(grid) {
    var r;
    var c;
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) {
        if (grid[r][c]) return false;
      }
    }
    return true;
  }

  function randomPuzzle() {
    var g = emptyGrid(false);
    var moves = 8 + Math.floor(Math.random() * 6);
    var i;
    for (i = 0; i < moves; i++) {
      press(g, Math.floor(Math.random() * SIZE), Math.floor(Math.random() * SIZE));
    }
    if (allOff(g)) press(g, 2, 2);
    return g;
  }

  var G = {
    _root: null,
    _mounted: false,
    _paused: false,
    _shell: null,
    _grid: null,
    _moves: 0,
    _best: 0,
    _wins: 0,

    mount: function (rootEl) {
      if (!rootEl) return;
      this._root = rootEl;
      if (!this._mounted) {
        this._mounted = true;
        this._best = DCPuzzle.loadInt(BEST_KEY, 0);
        this._wins = DCPuzzle.loadInt(BEST_KEY + "_w", 0);
      }
      this._render();
    },

    pause: function () { this._paused = true; },
    resume: function () { this._paused = false; if (this._mounted) this._render(); },

    newGame: function (playSound) {
      this._grid = randomPuzzle();
      this._moves = 0;
      this._paint();
      this._updateHud();
      if (playSound !== false && typeof DCSound !== "undefined" && DCSound.deal) DCSound.deal();
    },

    _render: function () {
      if (!this._root || this._paused && !this._shell) return;
      var self = this;
      if (!this._shell) {
        this._root.innerHTML =
          '<div class="dc-pz-shell dc-pz-lights">' +
          DCPuzzle.topBarHtml({
            score: 0,
            best: this._wins,
            scoreId: "dc-lights-moves",
            bestId: "dc-lights-wins"
          }) +
          '<p class="dc-pz-hint">Tap lights · toggle neighbors · turn all off</p>' +
          '<div class="dc-lights-board" id="dc-lights-board" role="grid"></div>' +
          "</div>";
        this._shell = this._root.querySelector(".dc-pz-shell");
        DCPuzzle.bindChrome(this._shell, function () { self.newGame(); }, "New Lights Out puzzle?");
        var movesLabel = this._shell.querySelector("#dc-lights-moves");
        var winsLabel = this._shell.querySelector("#dc-lights-wins");
        if (movesLabel && movesLabel.previousElementSibling) {
          movesLabel.previousElementSibling.textContent = "Moves";
        }
        if (winsLabel && winsLabel.previousElementSibling) {
          winsLabel.previousElementSibling.textContent = "Wins";
        }
        // Remount: keep current puzzle if still in memory.
        if (!this._grid) this.newGame(false);
        else {
          this._paint();
          this._updateHud();
        }
      }
      this._paint();
    },

    _tap: function (r, c) {
      press(this._grid, r, c);
      this._moves++;
      if (typeof DCSound !== "undefined" && DCSound.cardPlace) DCSound.cardPlace();
      this._paint();
      this._updateHud();
      if (allOff(this._grid)) {
        this._wins++;
        DCPuzzle.saveInt(BEST_KEY + "_w", this._wins);
        if (this._best === 0 || this._moves < this._best) {
          this._best = this._moves;
          DCPuzzle.saveInt(BEST_KEY, this._best);
        }
        if (typeof DCFX !== "undefined" && DCFX.burstConfetti) DCFX.burstConfetti(24, true);
        if (typeof DCUI !== "undefined" && DCUI._showToast) {
          DCUI._showToast("Lights out in " + this._moves + " moves!", "win");
        }
        var self = this;
        setTimeout(function () { self.newGame(false); }, 1200);
      }
    },

    _paint: function () {
      var board = document.getElementById("dc-lights-board");
      if (!board) return;
      var self = this;
      board.innerHTML = "";
      var r;
      var c;
      for (r = 0; r < SIZE; r++) {
        for (c = 0; c < SIZE; c++) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "dc-lights-cell" + (this._grid[r][c] ? " on" : "");
          btn.dataset.r = String(r);
          btn.dataset.c = String(c);
          btn.setAttribute("aria-label", this._grid[r][c] ? "Light on" : "Light off");
          btn.addEventListener("click", function (e) {
            self._tap(
              parseInt(e.currentTarget.dataset.r, 10),
              parseInt(e.currentTarget.dataset.c, 10)
            );
          });
          board.appendChild(btn);
        }
      }
    },

    _updateHud: function () {
      var m = document.getElementById("dc-lights-moves");
      var w = document.getElementById("dc-lights-wins");
      if (m) {
        m.textContent = String(this._moves);
        DCPuzzle.bumpScore(m);
      }
      if (w) w.textContent = String(this._wins);
    }
  };

  root.DCLights = G;
})(this);
