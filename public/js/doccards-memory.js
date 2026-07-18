(function (root) {
  "use strict";

  var PAIRS = 8;
  var BEST_KEY = "doccards_memory_best";

  var GLYPHS = ["♠", "♥", "♦", "♣", "★", "◆", "●", "▲"];

  function buildDeck() {
    var deck = [];
    var i;
    for (i = 0; i < PAIRS; i++) {
      deck.push(i);
      deck.push(i);
    }
    for (i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = deck[i];
      deck[i] = deck[j];
      deck[j] = t;
    }
    return deck;
  }

  var G = {
    _root: null,
    _mounted: false,
    _paused: false,
    _shell: null,
    _deck: [],
    _flipped: [],
    _matched: [],
    _lock: false,
    _moves: 0,
    _best: 0,

    mount: function (rootEl) {
      if (!rootEl) return;
      this._root = rootEl;
      if (!this._mounted) {
        this._mounted = true;
        this._best = DCPuzzle.loadInt(BEST_KEY, 9999);
        if (this._best === 9999) this._best = 0;
      }
      this._render();
    },

    pause: function () { this._paused = true; },
    resume: function () { this._paused = false; if (this._mounted) this._render(); },

    newGame: function (playSound) {
      this._deck = buildDeck();
      this._flipped = [];
      this._matched = [];
      this._lock = false;
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
          '<div class="dc-pz-shell dc-pz-memory">' +
          DCPuzzle.topBarHtml({ score: 0, best: this._best || "—", scoreId: "dc-memory-moves", bestId: "dc-memory-best" }) +
          '<p class="dc-pz-hint">Tap cards · match all pairs</p>' +
          '<div class="dc-memory-board" id="dc-memory-board" role="grid"></div>' +
          '<div class="dc-pz-over hidden" id="dc-memory-over" role="dialog" aria-modal="true">' +
          '<div class="dc-pz-over-card"><p class="dc-pz-over-title">All matched!</p>' +
          '<p class="dc-pz-over-score">Moves <strong id="dc-memory-over-moves">0</strong></p>' +
          '<button type="button" class="doccards-btn" id="dc-memory-retry">Play again</button></div></div>' +
          "</div>";
        this._shell = this._root.querySelector(".dc-pz-shell");
        DCPuzzle.bindChrome(this._shell, function () { self.newGame(); }, "Deal a fresh Memory board?");
        document.getElementById("dc-memory-retry").addEventListener("click", function () {
          document.getElementById("dc-memory-over").classList.add("hidden");
          self.newGame();
        });
        var movesLabel = this._shell.querySelector("#dc-memory-moves");
        if (movesLabel && movesLabel.previousElementSibling) {
          movesLabel.previousElementSibling.textContent = "Moves";
        }
        this.newGame(false);
      }
      this._paint();
    },

    _isMatched: function (idx) {
      return this._matched.indexOf(idx) >= 0;
    },

    _flip: function (idx) {
      if (this._lock || this._isMatched(idx)) return;
      if (this._flipped.indexOf(idx) >= 0) return;
      this._flipped.push(idx);
      if (this._flipped.length === 2) {
        this._moves++;
        this._lock = true;
        var a = this._flipped[0];
        var b = this._flipped[1];
        var self = this;
        if (this._deck[a] === this._deck[b]) {
          this._matched.push(a, b);
          this._flipped = [];
          this._lock = false;
          if (typeof DCSound !== "undefined" && DCSound.suitClear) DCSound.suitClear();
          if (this._matched.length === PAIRS * 2) {
            setTimeout(function () { self._win(); }, 300);
          }
        } else {
          setTimeout(function () {
            self._flipped = [];
            self._lock = false;
            self._paint();
          }, 650);
        }
      }
      this._paint();
      this._updateHud();
    },

    _paint: function () {
      var board = document.getElementById("dc-memory-board");
      if (!board) return;
      var self = this;
      board.innerHTML = "";
      var i;
      for (i = 0; i < this._deck.length; i++) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "dc-memory-card";
        btn.dataset.i = String(i);
        var show = this._flipped.indexOf(i) >= 0 || this._isMatched(i);
        if (show) {
          btn.classList.add("face-up");
          btn.textContent = GLYPHS[this._deck[i]];
          btn.style.setProperty("--mem-color", this._deck[i] % 2 === 0 ? "#0D2240" : "#9C1E1E");
        } else {
          btn.setAttribute("aria-label", "Hidden card");
        }
        if (this._isMatched(i)) btn.classList.add("matched");
        btn.addEventListener("click", function (e) {
          self._flip(parseInt(e.currentTarget.dataset.i, 10));
        });
        board.appendChild(btn);
      }
    },

    _updateHud: function () {
      var m = document.getElementById("dc-memory-moves");
      if (m) {
        m.textContent = String(this._moves);
        DCPuzzle.bumpScore(m);
      }
    },

    _win: function () {
      if (this._best === 0 || this._moves < this._best) {
        this._best = this._moves;
        DCPuzzle.saveInt(BEST_KEY, this._best);
        var b = document.getElementById("dc-memory-best");
        if (b) b.textContent = String(this._best);
      }
      var over = document.getElementById("dc-memory-over");
      var el = document.getElementById("dc-memory-over-moves");
      if (el) el.textContent = String(this._moves);
      if (over) over.classList.remove("hidden");
      if (typeof DCFX !== "undefined" && DCFX.burstConfetti) DCFX.burstConfetti(28, true);
      if (typeof DCSound !== "undefined" && DCSound.milestone) DCSound.milestone();
    }
  };

  root.DCMemory = G;
})(this);
