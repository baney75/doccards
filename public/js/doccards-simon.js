(function (root) {
  "use strict";

  var BEST_KEY = "doccards_simon_best";
  var PADS = [
    { id: 0, label: "Gold", color: "#C9A961", active: "#E8D5A3" },
    { id: 1, label: "Green", color: "#0F5C2F", active: "#2d8f52" },
    { id: 2, label: "Navy", color: "#0D2240", active: "#1a3d6e" },
    { id: 3, label: "Red", color: "#9C1E1E", active: "#c92828" }
  ];

  var G = {
    _root: null,
    _mounted: false,
    _paused: false,
    _shell: null,
    _sequence: [],
    _step: 0,
    _level: 0,
    _best: 0,
    _playing: false,
    _inputLock: false,

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
      this._playing = false;
      this._inputLock = true;
    },

    resume: function () {
      this._paused = false;
      this._inputLock = false;
      if (this._mounted) this._render();
    },

    newGame: function (playSound) {
      this._sequence = [];
      this._step = 0;
      this._level = 0;
      this._playing = false;
      this._inputLock = false;
      this._updateHud();
      this._nextRound();
      if (playSound !== false && typeof DCSound !== "undefined" && DCSound.deal) DCSound.deal();
    },

    _nextRound: function () {
      if (this._paused) return;
      var self = this;
      this._sequence.push(Math.floor(Math.random() * 4));
      this._level = this._sequence.length;
      this._step = 0;
      this._inputLock = true;
      this._updateHud();
      setTimeout(function () { self._playback(0); }, 500);
    },

    _playback: function (i) {
      if (this._paused) return;
      var self = this;
      if (i >= this._sequence.length) {
        this._inputLock = false;
        this._playing = false;
        return;
      }
      this._flashPad(this._sequence[i]);
      setTimeout(function () {
        self._playback(i + 1);
      }, 520);
    },

    _flashPad: function (id) {
      var pad = document.getElementById("dc-simon-pad-" + id);
      if (!pad) return;
      pad.classList.add("lit");
      if (typeof DCSound !== "undefined" && DCSound.cardPlace) DCSound.cardPlace();
      setTimeout(function () { pad.classList.remove("lit"); }, 380);
    },

    _tapPad: function (id) {
      if (this._inputLock || this._paused) return;
      this._flashPad(id);
      if (id !== this._sequence[this._step]) {
        this._gameOver();
        return;
      }
      this._step++;
      if (this._step >= this._sequence.length) {
        if (this._level > this._best) {
          this._best = this._level;
          DCPuzzle.saveInt(BEST_KEY, this._best);
          this._updateHud();
        }
        if (typeof DCUI !== "undefined" && DCUI._showToast) {
          DCUI._showToast("Level " + this._level + " — nice!", "combo");
        }
        var self = this;
        setTimeout(function () { self._nextRound(); }, 700);
      }
    },

    _render: function () {
      if (!this._root || this._paused && !this._shell) return;
      var self = this;
      if (!this._shell) {
        var padsHtml = "";
        var i;
        for (i = 0; i < PADS.length; i++) {
          padsHtml +=
            '<button type="button" class="dc-simon-pad" id="dc-simon-pad-' + PADS[i].id + '" ' +
            'style="--pad:' + PADS[i].color + ";--pad-lit:" + PADS[i].active + '" ' +
            'aria-label="' + PADS[i].label + ' pad"></button>';
        }
        this._root.innerHTML =
          '<div class="dc-pz-shell dc-pz-simon">' +
          DCPuzzle.topBarHtml({ score: 0, best: this._best, scoreId: "dc-simon-level", bestId: "dc-simon-best" }) +
          '<p class="dc-pz-hint">Watch · repeat · how far can you go?</p>' +
          '<div class="dc-simon-grid">' + padsHtml + "</div>" +
          '<div class="dc-pz-over hidden" id="dc-simon-over" role="dialog" aria-modal="true">' +
          '<div class="dc-pz-over-card"><p class="dc-pz-over-title">Sequence broken!</p>' +
          '<p class="dc-pz-over-score">Level <strong id="dc-simon-over-level">0</strong></p>' +
          '<button type="button" class="doccards-btn" id="dc-simon-retry">Play again</button></div></div>' +
          "</div>";
        this._shell = this._root.querySelector(".dc-pz-shell");
        DCPuzzle.bindChrome(this._shell, function () { self.newGame(); }, "Start a fresh Simon run?");
        document.getElementById("dc-simon-retry").addEventListener("click", function () {
          document.getElementById("dc-simon-over").classList.add("hidden");
          self.newGame();
        });
        var lvl = this._shell.querySelector("#dc-simon-level");
        if (lvl && lvl.previousElementSibling) lvl.previousElementSibling.textContent = "Level";
        for (i = 0; i < PADS.length; i++) {
          (function (pid) {
            document.getElementById("dc-simon-pad-" + pid).addEventListener("click", function () {
              self._tapPad(pid);
            });
          })(PADS[i].id);
        }
        this.newGame(false);
      }
      this._updateHud();
    },

    _updateHud: function () {
      var l = document.getElementById("dc-simon-level");
      var b = document.getElementById("dc-simon-best");
      if (l) l.textContent = String(this._level);
      if (b) b.textContent = String(this._best);
    },

    _gameOver: function () {
      this._inputLock = true;
      var over = document.getElementById("dc-simon-over");
      var el = document.getElementById("dc-simon-over-level");
      if (el) el.textContent = String(this._level);
      if (over) over.classList.remove("hidden");
      if (typeof DCSound !== "undefined" && DCSound.milestone) DCSound.milestone();
    }
  };

  root.DCSimon = G;
})(this);
