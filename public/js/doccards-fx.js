(function (root) {
  "use strict";

  var FX = {
    _bound: false,
    _binding: false,
    _foundationHits: 0,
    _comboHits: 0,
    _comboTimer: null,
    _lastProgressBucket: 0,
    _confettiEl: null,
    _sparklePool: [],
    STATS_KEY: "doccards_lifetime_wins",

    init: function () {
      this._ensureLayers();
      this.hook();
    },

    _ensureLayers: function () {
      if (!document.getElementById("dc-fx-root")) {
        var rootEl = document.createElement("div");
        rootEl.id = "dc-fx-root";
        rootEl.setAttribute("aria-hidden", "true");
        document.body.appendChild(rootEl);
      }
    },

    hook: function () {
      var self = this;
      if (this._bound || this._binding) return;
      this._binding = true;

      var bind = function () {
        var Y = root.Y;
        if (!Y || !Y.Solitaire) return false;
        try {
          Y.on("newGame", function () {
            self.resetRound();
            self.toastPraise("Fresh deal — good luck!", "deal");
            self.haptic(8);
          });
          Y.on("afterSetup", function () {
            self._lastProgressBucket = 0;
            self._foundationHits = 0;
          });
          Y.on("win", function () {
            self.onWin();
          });
          Y.on("undo", function () {
            if (typeof DCSound !== "undefined" && DCSound.undo) DCSound.undo();
            if (typeof DCUI !== "undefined" && DCUI._showToast) {
              DCUI._showToast("Move undone");
            }
            self.haptic(4);
          });
          Y.on("foundation:afterPush", function (stack) {
            self.onFoundation(stack);
          });
          Y.on("tableau:afterPush", function () {
            self.pulseValidDrop();
          });
          self._bound = true;
          self._binding = false;
          return true;
        } catch (e) {
          return false;
        }
      };

      if (bind()) return;
      var n = 0;
      var poll = function () {
        if (self._bound) return;
        if (bind()) return;
        n++;
        if (n < 40) setTimeout(poll, 250);
        else self._binding = false;
      };
      setTimeout(poll, 200);
    },

    resetRound: function () {
      this._foundationHits = 0;
      this._comboHits = 0;
      this._lastProgressBucket = 0;
      clearTimeout(this._comboTimer);
      this.clearConfetti();
      document.body.classList.remove("dc-winning", "dc-combo-hot");
    },

    haptic: function (ms) {
      try {
        if (navigator.vibrate) navigator.vibrate(ms || 10);
      } catch (e) {}
    },

    toastPraise: function (msg, kind) {
      if (typeof DCUI !== "undefined" && DCUI._showToast) {
        DCUI._showToast(msg, kind || "praise");
      }
    },

    onFoundation: function (stack) {
      this._foundationHits++;
      this._comboHits++;
      this._skipPlaceSound = true;
      clearTimeout(this._comboTimer);
      var self = this;
      this._comboTimer = setTimeout(function () {
        self._comboHits = 0;
        document.body.classList.remove("dc-combo-hot");
      }, 1800);

      if (typeof DCSound !== "undefined") {
        if (DCSound.foundation) DCSound.foundation();
        else if (DCSound.cardPlace) DCSound.cardPlace();
      }
      this.haptic(12);
      this.sparkleNear(stack);
      this.flashStack(stack);
      this.bumpHud();
      this.checkProgress();
      this.checkSuitComplete(stack);

      if (this._comboHits >= 3) {
        document.body.classList.add("dc-combo-hot");
        if (this._comboHits === 3) this.toastPraise("Nice run!", "combo");
        else if (this._comboHits === 5) this.toastPraise("On a tear!", "combo");
        else if (this._comboHits === 8) this.toastPraise("Unstoppable!", "combo");
        if (typeof DCSound !== "undefined" && DCSound.combo) DCSound.combo();
      } else if (this._foundationHits === 1) {
        this.toastPraise("First foundation — keep going", "praise");
      }
    },

    checkSuitComplete: function (stack) {
      try {
        if (!stack || !stack.cards || stack.cards.length !== 13) return;
        if (typeof DCSound !== "undefined" && DCSound.suitClear) DCSound.suitClear();
        this.toastPraise("Suit complete!", "suit");
        this.haptic([10, 40, 10]);
        this.burstConfetti(28, true);
      } catch (e) {}
    },

    checkProgress: function () {
      try {
        var Y = root.Y;
        var Game = Y && Y.Solitaire && Y.Solitaire.game;
        if (!Game || !Game.isWon || !Game.foundation) return;
        var foundations = Game.foundation.stacks || [];
        var placed = 0;
        var i;
        for (i = 0; i < foundations.length; i++) {
          placed += foundations[i].cards.length;
        }
        var deck = Game.deck;
        var total = deck.suits.length * 13 * deck.count;
        if (!total) return;
        var pct = Math.floor((placed / total) * 100);
        var bucket = pct >= 75 ? 75 : pct >= 50 ? 50 : pct >= 25 ? 25 : 0;
        if (bucket > this._lastProgressBucket && bucket > 0) {
          this._lastProgressBucket = bucket;
          var lines = {
            25: "Quarter of the way!",
            50: "Halfway there!",
            75: "Almost home!"
          };
          this.toastPraise(lines[bucket], "milestone");
          if (typeof DCSound !== "undefined" && DCSound.milestone) DCSound.milestone();
          this.haptic(16);
        }
      } catch (e) {}
    },

    bumpHud: function () {
      var moves = document.getElementById("dc-moves");
      if (!moves) return;
      moves.classList.remove("dc-hud-bump");
      void moves.offsetWidth;
      moves.classList.add("dc-hud-bump");
    },

    flashStack: function (stack) {
      try {
        var last = stack && stack.my_Last && stack.my_Last();
        var node = last && last.node;
        var el = node && (node.getDOMNode ? node.getDOMNode() : node._node);
        if (!el) return;
        el.classList.remove("dc-foundation-flash");
        void el.offsetWidth;
        el.classList.add("dc-foundation-flash");
        setTimeout(function () {
          el.classList.remove("dc-foundation-flash");
        }, 480);
      } catch (e) {}
    },

    sparkleNear: function (stack) {
      if (this._prefersReduced()) return;
      try {
        var last = stack && stack.my_Last && stack.my_Last();
        var node = last && last.node;
        var el = node && (node.getDOMNode ? node.getDOMNode() : node._node);
        if (!el) return;
        var rect = el.getBoundingClientRect();
        var rootEl = document.getElementById("dc-fx-root");
        if (!rootEl) return;
        var i;
        for (i = 0; i < 6; i++) {
          var s = document.createElement("span");
          s.className = "dc-spark";
          var ox = (Math.random() - 0.5) * rect.width;
          var oy = (Math.random() - 0.5) * rect.height * 0.6;
          s.style.left = rect.left + rect.width / 2 + ox + "px";
          s.style.top = rect.top + rect.height * 0.35 + oy + "px";
          rootEl.appendChild(s);
          (function (n) {
            setTimeout(function () {
              if (n.parentNode) n.parentNode.removeChild(n);
            }, 700);
          })(s);
        }
      } catch (e) {}
    },

    pulseValidDrop: function () {
      // Visual only — keep subtle so rapid tableau play stays calm.
      document.body.classList.add("dc-drop-ok");
      var self = this;
      clearTimeout(this._dropOkTimer);
      this._dropOkTimer = setTimeout(function () {
        document.body.classList.remove("dc-drop-ok");
      }, 180);
    },

    onWin: function () {
      document.body.classList.add("dc-winning");
      this.recordLifetimeWin();
      this.burstConfetti(64, false);
      this.haptic([20, 40, 20, 40, 40]);
      var praise = this.winPraise();
      var self = this;
      setTimeout(function () {
        self.toastPraise(praise, "win");
      }, 400);
      setTimeout(function () {
        document.body.classList.remove("dc-winning");
      }, 5000);
    },

    winPraise: function () {
      var moves = (typeof DCUI !== "undefined" && DCUI._moveCount) || 0;
      var elapsed = 0;
      if (typeof DCUI !== "undefined" && DCUI._startTime) {
        elapsed = Math.floor((Date.now() - DCUI._startTime) / 1000);
      }
      if (moves > 0 && moves < 50) return "Lightning win — " + moves + " moves!";
      if (elapsed > 0 && elapsed < 90) return "Blazing fast — under 90 seconds!";
      if (moves > 0 && moves < 100) return "Clean finish — " + moves + " moves";
      return "Beautifully done!";
    },

    recordLifetimeWin: function () {
      try {
        var n = parseInt(localStorage.getItem(this.STATS_KEY) || "0", 10) + 1;
        localStorage.setItem(this.STATS_KEY, String(n));
      } catch (e) {}
    },

    burstConfetti: function (count, soft) {
      if (this._prefersReduced()) return;
      var rootEl = document.getElementById("dc-fx-root");
      if (!rootEl) return;
      var colors = ["#C9A961", "#9C1E1E", "#F8F1E3", "#E8D5A3", "#0D2240", "#0F5C2F"];
      var i;
      for (i = 0; i < count; i++) {
        var p = document.createElement("span");
        p.className = soft ? "dc-confetti soft" : "dc-confetti";
        p.style.left = Math.random() * 100 + "vw";
        p.style.background = colors[i % colors.length];
        p.style.animationDelay = Math.random() * 0.4 + "s";
        p.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
        p.style.setProperty("--drift", (Math.random() * 80 - 40) + "px");
        p.style.setProperty("--spin", (Math.random() * 720 - 360) + "deg");
        rootEl.appendChild(p);
        (function (n) {
          setTimeout(function () {
            if (n.parentNode) n.parentNode.removeChild(n);
          }, 3200);
        })(p);
      }
    },

    clearConfetti: function () {
      var rootEl = document.getElementById("dc-fx-root");
      if (!rootEl) return;
      rootEl.innerHTML = "";
    },

    _prefersReduced: function () {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  };

  root.DCFX = FX;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      FX.init();
    });
  } else {
    FX.init();
  }
})(this);
