(function (root) {
  "use strict";

  var SIZE = 4;
  var BEST_KEY = "doccards_slide_best";

  function solvedState() {
    var arr = [];
    var i;
    for (i = 1; i < SIZE * SIZE; i++) arr.push(i);
    arr.push(0);
    return arr;
  }

  function countInversions(arr) {
    var inv = 0;
    var i;
    var j;
    for (i = 0; i < arr.length; i++) {
      if (arr[i] === 0) continue;
      for (j = i + 1; j < arr.length; j++) {
        if (arr[j] === 0) continue;
        if (arr[i] > arr[j]) inv++;
      }
    }
    return inv;
  }

  function isSolvable(arr) {
    var inv = countInversions(arr);
    if (SIZE % 2 === 1) return inv % 2 === 0;
    var blankRow = Math.floor(arr.indexOf(0) / SIZE);
    var fromBottom = SIZE - blankRow;
    return (fromBottom % 2 === 0) !== (inv % 2 === 0);
  }

  function shuffle() {
    var arr = solvedState();
    var i;
    do {
      for (i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
      }
    } while (!isSolvable(arr) || arr.join(",") === solvedState().join(","));
    return arr;
  }

  var G = {
    _root: null,
    _mounted: false,
    _paused: false,
    _tiles: null,
    _moves: 0,
    _best: 0,

    mount: function (rootEl) {
      if (!rootEl) return;
      this._root = rootEl;
      if (!this._mounted) {
        this._mounted = true;
        this._best = DCPuzzle.loadInt(BEST_KEY, 9999);
        if (this._best === 9999) this._best = 0;
        this.newGame(false);
      }
      this._render();
    },

    pause: function () { this._paused = true; },
    resume: function () { this._paused = false; if (this._mounted) this._render(); },

    newGame: function (playSound) {
      this._tiles = shuffle();
      this._moves = 0;
      this._render();
      if (playSound !== false && typeof DCSound !== "undefined" && DCSound.deal) DCSound.deal();
    },

    _render: function () {
      if (!this._root || this._paused) return;
      var self = this;
      if (!this._shell) {
        this._root.innerHTML =
          '<div class="dc-pz-shell dc-pz-slide">' +
          DCPuzzle.topBarHtml({
            score: 0,
            best: this._best || "—",
            scoreId: "dc-slide-moves",
            bestId: "dc-slide-best"
          }) +
          '<p class="dc-pz-hint">Tap a tile beside the empty space · order 1–15</p>' +
          '<div class="dc-slide-board" id="dc-slide-board" role="grid"></div>' +
          '<div class="dc-pz-over hidden" id="dc-slide-over" role="dialog" aria-modal="true">' +
          '<div class="dc-pz-over-card"><p class="dc-pz-over-title">Solved!</p>' +
          '<p class="dc-pz-over-score">Moves <strong id="dc-slide-over-moves">0</strong></p>' +
          '<button type="button" class="doccards-btn" id="dc-slide-retry">Play again</button></div></div>' +
          "</div>";
        this._shell = this._root.querySelector(".dc-pz-shell");
        DCPuzzle.bindChrome(this._shell, function () { self.newGame(); }, "Shuffle a new Slide 15 board?");
        document.getElementById("dc-slide-retry").addEventListener("click", function () {
          document.getElementById("dc-slide-over").classList.add("hidden");
          self.newGame();
        });
        var movesLabel = this._shell.querySelector("#dc-slide-moves");
        if (movesLabel && movesLabel.previousElementSibling) {
          movesLabel.previousElementSibling.textContent = "Moves";
        }
        var bestLabel = this._shell.querySelector("#dc-slide-best");
        if (bestLabel && bestLabel.previousElementSibling) {
          bestLabel.previousElementSibling.textContent = "Best";
        }
      }
      this._paint();
    },

    _blankIndex: function () {
      return this._tiles.indexOf(0);
    },

    _canMove: function (idx) {
      var blank = this._blankIndex();
      var br = Math.floor(blank / SIZE);
      var bc = blank % SIZE;
      var r = Math.floor(idx / SIZE);
      var c = idx % SIZE;
      return (r === br && Math.abs(c - bc) === 1) || (c === bc && Math.abs(r - br) === 1);
    },

    _move: function (idx) {
      if (!this._canMove(idx)) {
        if (typeof DCPuzzle !== "undefined" && DCPuzzle.feedbackInvalid) DCPuzzle.feedbackInvalid();
        else if (typeof DCUI !== "undefined" && DCUI.invalidMove) DCUI.invalidMove();
        return;
      }
      var blank = this._blankIndex();
      var t = this._tiles[blank];
      this._tiles[blank] = this._tiles[idx];
      this._tiles[idx] = t;
      this._moves++;
      if (typeof DCSound !== "undefined" && DCSound.cardPlace) DCSound.cardPlace();
      this._paint();
      this._updateHud();
      if (this._tiles.join(",") === solvedState().join(",")) {
        this._win();
      }
    },

    _paint: function () {
      var board = document.getElementById("dc-slide-board");
      if (!board) return;
      var self = this;
      board.innerHTML = "";
      var i;
      for (i = 0; i < this._tiles.length; i++) {
        var v = this._tiles[i];
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "dc-slide-cell" + (v === 0 ? " empty" : "");
        if (v) btn.textContent = String(v);
        btn.dataset.i = String(i);
        if (v !== 0) {
          btn.addEventListener("click", function (e) {
            self._move(parseInt(e.currentTarget.dataset.i, 10));
          });
        }
        board.appendChild(btn);
      }
      this._updateHud();
    },

    _updateHud: function () {
      var movesEl = document.getElementById("dc-slide-moves");
      if (movesEl) {
        movesEl.textContent = String(this._moves);
        DCPuzzle.bumpScore(movesEl);
      }
    },

    _win: function () {
      if (this._best === 0 || this._moves < this._best) {
        this._best = this._moves;
        DCPuzzle.saveInt(BEST_KEY, this._best);
        var bestEl = document.getElementById("dc-slide-best");
        if (bestEl) bestEl.textContent = String(this._best);
      }
      var over = document.getElementById("dc-slide-over");
      var mEl = document.getElementById("dc-slide-over-moves");
      if (mEl) mEl.textContent = String(this._moves);
      if (over) over.classList.remove("hidden");
      if (typeof DCFX !== "undefined" && DCFX.burstConfetti) DCFX.burstConfetti(32, true);
      if (typeof DCSound !== "undefined" && DCSound.milestone) DCSound.milestone();
    }
  };

  root.DCSlide = G;
})(this);
