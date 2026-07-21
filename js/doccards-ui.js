(function (root) {
  "use strict";

  var DIFFICULTY = {
    golf: "easy",
    "grandfathers-clock": "easy",
    spider1s: "easy",
    "monte-carlo": "easy",
    "will-o-the-wisp": "easy",
    agnes: "easy",
    klondike: "classic",
    klondike1t: "classic",
    freecell: "classic",
    yukon: "classic",
    "flower-garden": "classic",
    "tri-towers": "classic",
    spider: "hard",
    spider2s: "hard",
    spiderette: "hard",
    "forty-thieves": "hard",
    scorpion: "hard",
    "russian-solitaire": "hard",
    pyramid: "hard"
  };

  var DCUI = {
    _moveCount: 0,
    _startTime: null,
    _hudEl: null,
    _dealEl: null,
    _rulesOverlay: null,
    _confirmOverlay: null,
    _favorites: [],
    _tickInterval: null,
    _toastTimeout: null,
    _eventsBound: false,
    _difficultyFilter: "all",
    BIG_CARDS_KEY: "doccards_big_cards",
    FAVORITES_KEY: "doccards_favorites",
    COACH_KEY: "doccards_coach_seen",

    init: function () {
      this.ensureFabBar();
      // FAB order left→right: Sound, Big, Rules, Hint, Undo (Undo rightmost).
      this.createSoundToggle();
      this.createAccessibilityToggle();
      this.createRulesButton();
      this.createHintFab();
      this.createUndoFab();
      this.createRulesOverlay();
      this.createConfirmOverlay();
      this.createDealDisplay();
      this.createHUD();
      this.loadFavorites();
      this.tagDifficulties();
      this.hookEvents();
      Logger.info("dcui_initialized");
    },

    ensureFabBar: function () {
      var bar = document.getElementById("dc-fab-bar");
      if (bar) return bar;
      bar = document.createElement("div");
      bar.id = "dc-fab-bar";
      bar.setAttribute("role", "toolbar");
      bar.setAttribute("aria-label", "Game actions");
      document.body.appendChild(bar);
      return bar;
    },

    _appendToFabBar: function (btn) {
      var bar = this.ensureFabBar();
      bar.appendChild(btn);
    },

    afterGameReady: function () {
      this.hookEvents();
      this.renderFavorites();
      this.updateDealNumber();
      this.showCoachIfNeeded();
      this.showIosInstallHintIfNeeded();
      this._warmCardsCache();
      if (typeof DCHub !== "undefined" && DCHub.onReady) {
        DCHub.onReady();
      }
    },

    _warmCardsCache: function () {
      var self = this;
      var post = function () {
        try {
          if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;
          var size = 122;
          if (root.Y && root.Y.Solitaire && root.Y.Solitaire.Application && root.Y.Solitaire.Application.pickThemeSize) {
            size = root.Y.Solitaire.Application.pickThemeSize();
          }
          navigator.serviceWorker.controller.postMessage({ type: "WARM_CARDS", size: size });
        } catch (e) {}
      };
      post();
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.addEventListener("controllerchange", post, { once: true });
      }
    },

    showIosInstallHintIfNeeded: function () {
      try {
        if (localStorage.getItem("doccards_ios_install_seen") === "1") return;
      } catch (e) { return; }
      var isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      var standalone = window.navigator.standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches;
      if (!isIos || standalone) return;
      var tip = document.createElement("div");
      tip.id = "dc-ios-install";
      tip.className = "pwa-ios-prompt";
      tip.innerHTML =
        '<div class="pwa-ios-card">' +
        '<p><strong>Install Doc\'s Cards</strong></p>' +
        '<p>Tap Share <span aria-hidden="true">\u2399</span> then <strong>Add to Home Screen</strong> for fullscreen play offline.</p>' +
        '<button type="button" class="doccards-btn" id="dc-ios-install-ok">Got it</button>' +
        "</div>";
      document.body.appendChild(tip);
      document.getElementById("dc-ios-install-ok").addEventListener("click", function () {
        try { localStorage.setItem("doccards_ios_install_seen", "1"); } catch (e) {}
        tip.remove();
      });
    },

    hookEvents: function () {
      var self = this;
      if (this._eventsBound || this._eventsBinding) return;
      this._eventsBinding = true;

      var bind = function () {
        var Y = root.Y;
        if (!Y || !Y.Solitaire) return false;
        try {
          Y.on("newGame", function () {
            self._undoing = false;
            self.resetHUD();
            self.showHUD();
            self.updateDealNumber();
            setTimeout(function () { self.renderFavorites(); }, 300);
            if (typeof DCSound !== "undefined" && DCSound.deal) DCSound.deal();
          });
          Y.on("endTurn", function () {
            if (!self._undoing) {
              self.updateMoveCount();
              var skip = 0;
              if (typeof DCFX !== "undefined") {
                skip = DCFX._skipPlaceSound || 0;
                if (skip > 0) DCFX._skipPlaceSound = skip - 1;
              }
              if (!skip && typeof DCSound !== "undefined") DCSound.cardPlace();
            }
            self._undoing = false;
          });
          Y.on("win", function () {
            self.hideHUD();
            if (typeof DCSound !== "undefined") DCSound.win();
          });
          Y.on("beforeSetup", function () {
            self._undoing = false;
            self.showHUD();
          });
          Y.on("load", function () {
            setTimeout(function () { self.updateDealNumber(); }, 300);
          });
          Y.on("afterSetup", function () {
            self.updateDealNumber();
          });
          Y.on("undo", function () {
            // Only mark undoing; move count adjusts after real undo in endTurn path.
            // Decrement only when a prior move existed (no-op undos stay put).
            self._undoing = true;
            if (self._moveCount > 0) {
              self._moveCount--;
              var el = document.getElementById("dc-moves");
              if (el) el.textContent = self._moveCount;
            }
            setTimeout(function () { self._undoing = false; }, 400);
          });

          self.resetHUD();
          self.showHUD();
          self.updateDealNumber();
          setTimeout(function () { self.renderFavorites(); }, 300);
          self._eventsBound = true;
          self._eventsBinding = false;
          Logger.info("dcui_events_bound");
          return true;
        } catch (e) {
          Logger.warn("dcui_bind_failed", { error: e.message });
          return false;
        }
      };

      if (bind()) return;

      var retries = 0;
      var maxRetries = 40;
      var poll = function () {
        if (self._eventsBound) return;
        if (bind()) return;
        retries++;
        if (retries < maxRetries) setTimeout(poll, 250);
        else {
          self._eventsBinding = false;
          Logger.warn("dcui_hook_timeout");
        }
      };
      setTimeout(poll, 200);

      if ("serviceWorker" in navigator) {
        // Update UX is owned by index.html (offers tap-to-refresh mid-game).
      }
    },

    createRulesButton: function () {
      if (document.getElementById("rules-btn")) return;
      var btn = document.createElement("button");
      btn.id = "rules-btn";
      btn.type = "button";
      btn.innerHTML = '<span class="fab-glyph" aria-hidden="true">i</span><span class="fab-label">Rules</span>';
      btn.title = "Game Rules";
      btn.setAttribute("aria-label", "Show game rules");
      btn.addEventListener("click", this.showRules.bind(this));
      this._appendToFabBar(btn);
    },

    createUndoFab: function () {
      if (document.getElementById("undo-fab")) return;
      var btn = document.createElement("button");
      btn.id = "undo-fab";
      btn.type = "button";
      btn.innerHTML = '<span class="fab-glyph" aria-hidden="true">↶</span><span class="fab-label">Undo</span>';
      btn.title = "Undo last move";
      btn.setAttribute("aria-label", "Undo last move");
      btn.addEventListener("click", function () {
        try {
          DCUI._undoing = true;
          var Y = root.Y;
          if (Y && Y.Solitaire && Y.Solitaire.game && Y.Solitaire.game.undo) {
            Y.Solitaire.game.undo();
          } else {
            var menuUndo = document.getElementById("undo");
            if (menuUndo) menuUndo.click();
          }
        } catch (e) {
          Logger.warn("undo_fab_failed", { error: e.message });
        }
      });
      this._appendToFabBar(btn);
    },

    createHintFab: function () {
      if (document.getElementById("hint-fab")) return;
      var btn = document.createElement("button");
      btn.id = "hint-fab";
      btn.type = "button";
      btn.innerHTML = '<span class="fab-glyph" aria-hidden="true">?</span><span class="fab-label">Hint</span>';
      btn.title = "Hint: try a foundation move";
      btn.setAttribute("aria-label", "Show a hint");
      btn.addEventListener("click", this.showHint.bind(this));
      this._appendToFabBar(btn);
    },

    showHint: function () {
      try {
        var Y = root.Y;
        var Game = Y && Y.Solitaire && Y.Solitaire.game;
        if (!Game) {
          this._showToast("Start a game first");
          return;
        }
        var found = false;
        Game.eachStack(function (stack) {
          if (found) return;
          if (!stack || stack.field === "foundation" || stack.field === "deck") return;
          stack.eachCard(function (card) {
            if (found || !card || card.isFaceDown) return;
            if (typeof card.autoPlay === "function" && card.autoPlay()) {
              found = true;
              return false;
            }
          });
        });
        if (found) {
          this._showToast("Hint played to foundation", "praise");
          if (typeof DCSound !== "undefined" && DCSound.foundation) DCSound.foundation();
        } else {
          this._showToast("No free foundation move — try the tableau");
          if (typeof DCSound !== "undefined" && DCSound.error) DCSound.error();
        }
      } catch (e) {
        this._showToast("Hint unavailable right now");
      }
    },

    createRulesOverlay: function () {
      var overlay = document.createElement("div");
      overlay.id = "rules-overlay";
      overlay.className = "rules-overlay hidden";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", "rules-title");
      var inner = document.createElement("div");
      inner.className = "rules-content";
      var title = document.createElement("h2");
      title.id = "rules-title";
      var body = document.createElement("div");
      body.id = "rules-body";
      var closeBtn = document.createElement("button");
      closeBtn.id = "rules-close";
      closeBtn.type = "button";
      closeBtn.textContent = "Close";
      closeBtn.addEventListener("click", this.hideRules.bind(this));
      inner.appendChild(title);
      inner.appendChild(body);
      inner.appendChild(closeBtn);
      overlay.appendChild(inner);
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) DCUI.hideRules();
      });
      document.body.appendChild(overlay);
      this._rulesOverlay = overlay;
    },

    createConfirmOverlay: function () {
      var overlay = document.createElement("div");
      overlay.id = "dc-confirm";
      overlay.className = "rules-overlay hidden";
      overlay.innerHTML =
        '<div class="rules-content confirm-content" role="dialog" aria-modal="true" aria-labelledby="dc-confirm-title">' +
        '<h2 id="dc-confirm-title">Please confirm</h2>' +
        '<p id="dc-confirm-body"></p>' +
        '<div class="confirm-actions">' +
        '<button type="button" id="dc-confirm-cancel" class="doccards-btn doccards-btn-secondary">Cancel</button>' +
        '<button type="button" id="dc-confirm-ok" class="doccards-btn">Confirm</button>' +
        "</div></div>";
      document.body.appendChild(overlay);
      this._confirmOverlay = overlay;
      // Click handlers are attached per-open in confirmAction (avoids leaked listeners).
    },

    confirmAction: function (message, onConfirm) {
      var overlay = this._confirmOverlay;
      if (!overlay) {
        if (window.confirm(message)) onConfirm();
        return;
      }
      if (typeof DCPuzzle !== "undefined" && DCPuzzle.pauseAll) DCPuzzle.pauseAll();
      document.getElementById("dc-confirm-body").textContent = message;
      overlay.className = "rules-overlay";
      var ok = document.getElementById("dc-confirm-ok");
      var cancel = document.getElementById("dc-confirm-cancel");
      var self = this;
      var resumePuzzle = function () {
        if (typeof DCHub !== "undefined" && DCHub.onChooserHide) {
          // Reuse chooser-hide resume for the active puzzle mode.
          DCHub.onChooserHide();
        }
      };
      var cleanup = function () {
        ok.removeEventListener("click", onOk);
        cancel.removeEventListener("click", onCancel);
        overlay.removeEventListener("click", onBackdrop);
      };
      var onOk = function () {
        cleanup();
        self._hideConfirm();
        onConfirm();
        // onConfirm may start a new game (already running); only resume if still same mode.
        resumePuzzle();
      };
      var onCancel = function () {
        cleanup();
        self._hideConfirm();
        resumePuzzle();
      };
      var onBackdrop = function (e) {
        if (e.target === overlay) onCancel();
      };
      ok.addEventListener("click", onOk);
      cancel.addEventListener("click", onCancel);
      overlay.addEventListener("click", onBackdrop);
    },

    _hideConfirm: function () {
      if (this._confirmOverlay) this._confirmOverlay.className = "rules-overlay hidden";
    },

    _gameDataMap: {
      Agnes: { name: "Agnes", desc: "An easier Klondike variety exposing many cards for play. Foundations built from a seed card; tableau built down from cards one rank less." },
      Klondike: { name: "Klondike", desc: "The classic solitaire. Build foundations Ace to King in suit. Tableau built down by alternating color. Only Kings fill empty spaces." },
      Klondike1T: { name: "Klondike (Vegas)", desc: "Klondike with one-card turnover from the stock. Faster to play through, same challenge." },
      FlowerGarden: { name: "Flower Garden", desc: "Build foundations Ace to King in suit. Garden built down regardless of suit. Free spaces fill with any card." },
      FortyThieves: { name: "Forty Thieves", desc: "Two-pack solitaire. Tableau built down by suit. Very difficult — requires skill and luck." },
      Freecell: { name: "Freecell", desc: "Highly skillful solitaire. Build foundations Ace to King in suit. Use free cells wisely — nearly every game is winnable." },
      Golf: { name: "Golf", desc: "Discard cards one rank from the waste pile top. Simple and fast." },
      GClock: { name: "Grandfather's Clock", desc: "A relaxing pictorial solitaire. Build foundations in suit up to each pile's clock position." },
      MonteCarlo: { name: "Monte Carlo", desc: "Discard pairs of adjacent cards. Collapse empty spaces and deal new cards until stuck." },
      Pyramid: { name: "Pyramid", desc: "Discard uncovered pairs totaling 13. Winnable deals are rare but satisfying." },
      RussianSolitaire: { name: "Russian Solitaire", desc: "Like Yukon but built down by suit. Harder than it looks." },
      Scorpion: { name: "Scorpion", desc: "Build in-suit runs like Spider. Very luck-dependent — winnable deals are rare." },
      Spider: { name: "Spider", desc: "The King of Solitaires. Build in-suit runs from King to Ace. Enormously rewards skill." },
      Spider1S: { name: "Spider (1 Suit)", desc: "Easy Spider for learning. All cards are one suit." },
      Spider2S: { name: "Spider (2 Suit)", desc: "Medium Spider with two suits. Nearly every hand is winnable." },
      Spiderette: { name: "Spiderette", desc: "Klondike layout with Spider gameplay. Much harder than either parent." },
      TriTowers: { name: "Tri Towers", desc: "Discard cards one rank from the waste top. Kings wrap to Aces." },
      WillOTheWisp: { name: "Will O' The Wisp", desc: "An easier Spiderette with fewer buried cards." },
      Yukon: { name: "Yukon", desc: "A skill-based blend of Klondike and Scorpion. Build down by alternating color. Move whole face-up stacks." }
    },

    showRules: function () {
      var data = this._getGameData();
      document.getElementById("rules-title").textContent = data.name;
      var body = document.getElementById("rules-body");
      var full = this._getFullRulesHtml();
      if (full) {
        body.innerHTML = full;
      } else {
        body.innerHTML = "<p>" + data.desc + "</p>";
      }
      this._rulesOverlay.className = "rules-overlay";
      var closeBtn = document.getElementById("rules-close");
      if (closeBtn) closeBtn.focus();
      Logger.info("show_rules", { game: data.name });
    },

    _getFullRulesHtml: function () {
      try {
        var Y = root.Y;
        var name = Y && Y.Solitaire && Y.Solitaire.game && Y.Solitaire.game.name && Y.Solitaire.game.name();
        // Map engine name → chooser li id
        var idMap = {
          Agnes: "agnes",
          Klondike: "klondike",
          Klondike1T: "klondike1t",
          FlowerGarden: "flower-garden",
          FortyThieves: "forty-thieves",
          Freecell: "freecell",
          Golf: "golf",
          GClock: "grandfathers-clock",
          MonteCarlo: "monte-carlo",
          Pyramid: "pyramid",
          RussianSolitaire: "russian-solitaire",
          Scorpion: "scorpion",
          Spider: "spider",
          Spider1S: "spider1s",
          Spider2S: "spider2s",
          Spiderette: "spiderette",
          TriTowers: "tri-towers",
          WillOTheWisp: "will-o-the-wisp",
          Yukon: "yukon"
        };
        var liId = idMap[name];
        if (!liId) return null;
        var li = document.getElementById(liId);
        if (!li) return null;
        var desc = li.querySelector(".description");
        if (!desc) return null;
        var clone = desc.cloneNode(true);
        var layout = clone.querySelector(".layout");
        if (layout) layout.remove();
        var playBtn = clone.querySelector("button.choose");
        if (playBtn) playBtn.remove();
        // Make description visible in overlay (chooser CSS hides unselected)
        clone.style.display = "block";
        return clone.innerHTML;
      } catch (e) {
        return null;
      }
    },

    hideRules: function () {
      this._rulesOverlay.className = "rules-overlay hidden";
    },

    _getGameData: function () {
      try {
        var Y = root.Y;
        var name = Y && Y.Solitaire && Y.Solitaire.game && Y.Solitaire.game.name && Y.Solitaire.game.name();
        return this._gameDataMap[name] || { name: name || "Solitaire", desc: "Choose a game from the menu to see its rules." };
      } catch (e) {
        return { name: "Solitaire", desc: "Choose a game from the menu to see its rules." };
      }
    },

    createAccessibilityToggle: function () {
      if (document.getElementById("a11y-toggle")) return;
      var btn = document.createElement("button");
      btn.id = "a11y-toggle";
      btn.type = "button";
      btn.innerHTML = '<span class="fab-glyph" aria-hidden="true">Aa</span><span class="fab-label">Big</span>';
      btn.title = "Toggle large cards and text";
      btn.setAttribute("aria-label", "Toggle large cards and text for easier reading");
      btn.addEventListener("click", this.toggleBigCards.bind(this));
      this._appendToFabBar(btn);
      var preferBig = false;
      try {
        preferBig = localStorage.getItem(this.BIG_CARDS_KEY) === "true";
        // iPad / large tablets: default to Big Cards for Grandpa-friendly play.
        if (localStorage.getItem(this.BIG_CARDS_KEY) === null) {
          var isIpad = (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
            /iPad/.test(navigator.userAgent) ||
            (Math.min(window.innerWidth, window.innerHeight) >= 700 &&
              window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
          if (isIpad) {
            preferBig = true;
            localStorage.setItem(this.BIG_CARDS_KEY, "true");
          }
        }
      } catch (e) {}
      if (preferBig) {
        document.body.classList.add("big-cards");
        btn.classList.add("active");
      }
    },

    toggleBigCards: function () {
      var isBig = document.body.classList.toggle("big-cards");
      try { localStorage.setItem(this.BIG_CARDS_KEY, String(isBig)); } catch (e) {}
      var btn = document.getElementById("a11y-toggle");
      if (btn) btn.classList.toggle("active", isBig);
      this._showToast(isBig ? "Larger type & denser cards" : "Standard cards");
      try {
        var Y = root.Y;
        if (Y && Y.Solitaire && Y.Solitaire.Application && Y.Solitaire.Application.pickThemeSize) {
          Y.Solitaire.Application.pickThemeSize();
        }
        if (Y && Y.Solitaire && Y.Solitaire.game) {
          Y.Solitaire.game.eachStack(function (stack) {
            stack.eachCard(function (card) {
              if (!card) return;
              if (card.updateRankHeight) card.updateRankHeight();
              if (card.setImageSrc) card.setImageSrc();
              if (card.updateStyle) card.updateStyle();
            });
          });
          Y.fire("beforeResize");
          window.dispatchEvent(new Event((Y.Solitaire.Application && Y.Solitaire.Application.resizeEvent) || "resize"));
        }
      } catch (e) {
        Logger.warn("big_cards_refresh_failed", { error: e.message });
      }
      Logger.info("toggle_big_cards", { enabled: isBig });
    },

    createSoundToggle: function () {
      if (document.getElementById("sound-toggle")) return;
      var btn = document.createElement("button");
      btn.id = "sound-toggle";
      btn.type = "button";
      btn.title = "Toggle sound";
      btn.setAttribute("aria-label", "Sound on");
      btn.innerHTML = '<span class="fab-glyph" aria-hidden="true">♪</span><span class="fab-label">Sound</span>';
      btn.classList.add("active");
      btn.addEventListener("click", function () {
        if (typeof DCSound === "undefined") return;
        var next = !DCSound.enabled();
        DCSound.enabled(next);
        if (next && DCSound.unlock) {
          DCSound.unlock();
        }
        var on = DCSound.enabled();
        btn.querySelector(".fab-glyph").textContent = on ? "♪" : "–";
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-label", on ? "Sound on" : "Sound off");
        if (on) DCUI._showToast("Sound on");
        else DCUI._showToast("Sound off");
      });
      this._appendToFabBar(btn);
      try {
        if (typeof DCSound !== "undefined" && !DCSound.enabled()) {
          btn.querySelector(".fab-glyph").textContent = "–";
          btn.classList.remove("active");
          btn.setAttribute("aria-label", "Sound off");
        }
      } catch (e) {}
    },

    createDealDisplay: function () {
      var el = document.createElement("div");
      el.id = "deal-number";
      el.className = "deal-display hidden";
      el.innerHTML = '<span class="deal-label">Deal</span> <span id="deal-value">#---</span> <button id="copy-deal" type="button" aria-label="Copy deal number" title="Copy deal number">Copy</button>';
      document.body.appendChild(el);
      this._dealEl = el;
      document.getElementById("copy-deal").addEventListener("click", function () {
        var val = document.getElementById("deal-value").textContent.replace("#", "");
        if (navigator.clipboard) {
          navigator.clipboard.writeText(val).then(function () {
            DCUI._showToast("Deal number copied");
          });
        } else {
          var ta = document.createElement("textarea");
          ta.value = val;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          DCUI._showToast("Deal number copied");
        }
      });
    },

    updateDealNumber: function () {
      try {
        var Y = root.Y;
        var seed = Y && Y.Solitaire && Y.Solitaire.game && Y.Solitaire.game.seed;
        if (seed !== undefined && this._dealEl) {
          document.getElementById("deal-value").textContent = "#" + seed;
          this._dealEl.className = "deal-display";
        }
      } catch (e) {}
    },

    createHUD: function () {
      var hud = document.createElement("div");
      hud.id = "dc-hud";
      hud.className = "dc-hud hidden";
      hud.innerHTML = '<span class="hud-item"><span class="hud-label">Moves</span> <span id="dc-moves">0</span></span> <span class="hud-sep">\u00B7</span> <span class="hud-item"><span class="hud-label">Time</span> <span id="dc-time">0:00</span></span>';
      var slot = document.getElementById("header-hud");
      if (slot) { slot.appendChild(hud); } else { document.body.appendChild(hud); }
      this._hudEl = hud;
      var self = this;
      this._tickInterval = setInterval(function () {
        self.updateTimer();
      }, 1000);
    },

    updateMoveCount: function () {
      this._moveCount++;
      var el = document.getElementById("dc-moves");
      if (el) {
        el.textContent = this._moveCount;
        el.classList.remove("dc-hud-bump");
        void el.offsetWidth;
        el.classList.add("dc-hud-bump");
      }
      // Soft milestone nudges for long, satisfying games
      if (this._moveCount === 25 || this._moveCount === 50 || this._moveCount === 100) {
        this._showToast(this._moveCount + " moves", "milestone");
      }
    },

    updateTimer: function () {
      if (!this._startTime) return;
      var elapsed = Math.floor((Date.now() - this._startTime) / 1000);
      var m = Math.floor(elapsed / 60);
      var s = elapsed % 60;
      var el = document.getElementById("dc-time");
      if (el) el.textContent = m + ":" + (s < 10 ? "0" : "") + s;
    },

    resetHUD: function () {
      this._moveCount = 0;
      this._startTime = Date.now();
      var movesEl = document.getElementById("dc-moves");
      if (movesEl) movesEl.textContent = "0";
      this.updateTimer();
    },

    showHUD: function () {
      if (this._hudEl) this._hudEl.className = "dc-hud";
      if (this._dealEl && this._dealEl.querySelector("#deal-value")) {
        var seed = this._dealEl.querySelector("#deal-value").textContent || "";
        if (seed && seed !== "#---") this._dealEl.className = "deal-display";
      }
    },

    hideHUD: function () {
      if (this._hudEl) this._hudEl.className = "dc-hud hidden";
      // Deal chip is solitaire-only chrome (not for puzzles).
      if (this._dealEl) this._dealEl.className = "deal-display hidden";
    },

    invalidMove: function (message) {
      document.body.classList.add("dc-invalid-nudge");
      var self = this;
      setTimeout(function () { document.body.classList.remove("dc-invalid-nudge"); }, 280);
      this._showToast(message || "That card can’t go there");
    },

    puzzleInvalid: function (message) {
      document.body.classList.add("dc-pz-invalid-nudge");
      var self = this;
      setTimeout(function () { document.body.classList.remove("dc-pz-invalid-nudge"); }, 280);
      this._showToast(message || "That won’t work here");
    },

    tagDifficulties: function () {
      var items = document.querySelectorAll("#descriptions > li");
      for (var i = 0; i < items.length; i++) {
        var li = items[i];
        var level = DIFFICULTY[li.id] || "classic";
        li.setAttribute("data-difficulty", level);
        if (!li.querySelector(".difficulty-tag")) {
          var tag = document.createElement("span");
          tag.className = "difficulty-tag difficulty-" + level;
          tag.textContent = level.charAt(0).toUpperCase() + level.slice(1);
          var h2 = li.querySelector("h2");
          if (h2) h2.appendChild(tag);
          else li.insertBefore(tag, li.firstChild);
        }
      }
    },

    loadFavorites: function () {
      try {
        this._favorites = JSON.parse(localStorage.getItem(this.FAVORITES_KEY)) || [];
      } catch (e) {
        this._favorites = [];
      }
    },

    saveFavorites: function () {
      try { localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(this._favorites)); } catch (e) {}
    },

    isFavorite: function (gameId) {
      return this._favorites.indexOf(gameId) !== -1;
    },

    toggleFavorite: function (gameId) {
      if (this.isFavorite(gameId)) {
        this._favorites = this._favorites.filter(function (id) { return id !== gameId; });
      } else {
        this._favorites.push(gameId);
      }
      this.saveFavorites();
      this.renderFavorites();
    },

    renderFavorites: function () {
      var self = this;
      var list = document.getElementById("descriptions");
      var listItems = document.querySelectorAll("#descriptions > li");
      var favs = [];
      var rest = [];
      for (var i = 0; i < listItems.length; i++) {
        var li = listItems[i];
        var gameId = li.id;
        var starBtn = li.querySelector(".fav-star");
        if (!starBtn) {
          starBtn = document.createElement("button");
          starBtn.type = "button";
          starBtn.className = "fav-star";
          starBtn.setAttribute("aria-label", "Pin this game");
          starBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            self.toggleFavorite(this.parentNode.id);
          }, true);
          li.insertBefore(starBtn, li.firstChild);
        }
        if (this.isFavorite(gameId)) {
          starBtn.textContent = "\u2605";
          starBtn.className = "fav-star active";
          li.classList.add("favorited");
          favs.push(li);
        } else {
          starBtn.textContent = "\u2606";
          starBtn.className = "fav-star";
          li.classList.remove("favorited");
          rest.push(li);
        }
      }
      if (list) {
        favs.concat(rest).forEach(function (node) { list.appendChild(node); });
      }
      this._renderFilterBar();
      this.applyFilters();
    },

    _renderFilterBar: function () {
      var filterBar = document.getElementById("fav-filter");
      var chooser = document.getElementById("game-chooser-contents");
      if (!chooser) return;

      if (!filterBar) {
        filterBar = document.createElement("div");
        filterBar.id = "fav-filter";
        var scroller = document.createElement("div");
        scroller.id = "fav-filter-scroller";
        scroller.className = "fav-filter-scroller";
        var self = this;
        function chip(label, key) {
          var b = document.createElement("button");
          b.type = "button";
          b.textContent = label;
          b.className = "filter-btn";
          b.dataset.filter = key;
          b.addEventListener("click", function () {
            self._difficultyFilter = key;
            if (key === "mine") self.showMyGames();
            else if (key === "all") self.showAll();
            else self.showDifficulty(key);
            self._setActiveFilterKey(key);
          });
          return b;
        }
        scroller.appendChild(chip("All", "all"));
        scroller.appendChild(chip("Easy", "easy"));
        scroller.appendChild(chip("Classic", "classic"));
        scroller.appendChild(chip("Hard", "hard"));
        scroller.appendChild(chip("My Games", "mine"));
        filterBar.appendChild(scroller);
        var title = chooser.querySelector(".chooser-title");
        if (title && title.nextSibling) {
          chooser.insertBefore(filterBar, title.nextSibling);
        } else {
          chooser.insertBefore(filterBar, chooser.firstChild);
        }
        this._setActiveFilterKey("all");
      } else if (!filterBar.querySelector(".fav-filter-scroller")) {
        // Migrate older flat chip layout into a nested horizontal scroller.
        var wrap = document.createElement("div");
        wrap.id = "fav-filter-scroller";
        wrap.className = "fav-filter-scroller";
        while (filterBar.firstChild) wrap.appendChild(filterBar.firstChild);
        filterBar.appendChild(wrap);
      }
    },

    applyFilters: function () {
      var key = this._difficultyFilter || "all";
      if (key === "mine") this.showMyGames();
      else if (key === "all") this.showAll();
      else this.showDifficulty(key);
    },

    showDifficulty: function (level) {
      var items = document.querySelectorAll("#descriptions > li");
      for (var i = 0; i < items.length; i++) {
        var d = items[i].getAttribute("data-difficulty");
        items[i].style.display = d === level ? "" : "none";
      }
    },

    showMyGames: function () {
      var items = document.querySelectorAll("#descriptions > li");
      for (var i = 0; i < items.length; i++) {
        items[i].style.display = this.isFavorite(items[i].id) ? "" : "none";
      }
    },

    showAll: function () {
      var items = document.querySelectorAll("#descriptions > li");
      for (var i = 0; i < items.length; i++) {
        items[i].style.display = "";
      }
    },

    _setActiveFilterKey: function (key) {
      var btns = document.querySelectorAll(".filter-btn");
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle("active", btns[i].dataset.filter === key);
        btns[i].setAttribute("aria-pressed", btns[i].dataset.filter === key ? "true" : "false");
      }
    },

    showCoachIfNeeded: function () {
      try {
        if (localStorage.getItem(this.COACH_KEY) === "1") return;
        // Allow ?coach=0 for automated QA / adversarial runs.
        var params = new URLSearchParams(root.location.search || "");
        if (params.get("coach") === "0") return;
      } catch (e) { return; }
      var tips = [
        "Tap a game once to play. Tap the star to pin favorites.",
        "Tap i for rules. Tap Aa for bigger cards. Tap ? for a hint.",
        "Games opens solitaire and puzzles. Swipe the top tabs for more."
      ];
      var step = 0;
      var self = this;
      var coach = document.createElement("div");
      coach.id = "dc-coach";
      coach.className = "dc-coach";
      coach.innerHTML =
        '<div class="dc-coach-card">' +
        '<p id="dc-coach-text"></p>' +
        '<div class="dc-coach-actions">' +
        '<button type="button" id="dc-coach-skip" class="doccards-btn doccards-btn-secondary">Skip tips</button>' +
        '<button type="button" id="dc-coach-next" class="doccards-btn">Next</button>' +
        "</div></div>";
      document.body.appendChild(coach);
      var text = document.getElementById("dc-coach-text");
      var next = document.getElementById("dc-coach-next");
      var skip = document.getElementById("dc-coach-skip");
      function render() {
        text.textContent = tips[step];
        next.textContent = step === tips.length - 1 ? "Got it" : "Next";
      }
      function done() {
        try { localStorage.setItem(self.COACH_KEY, "1"); } catch (e) {}
        coach.remove();
      }
      next.addEventListener("click", function () {
        if (step >= tips.length - 1) done();
        else { step++; render(); }
      });
      skip.addEventListener("click", done);
      render();
    },

    _toastQueue: [],
    _toastShowing: false,

    _showToast: function (msg, kind) {
      this._toastQueue.push({ msg: msg, kind: kind || "" });
      this._drainToastQueue();
    },

    _drainToastQueue: function () {
      if (this._toastShowing) return;
      var next = this._toastQueue.shift();
      if (!next) return;
      this._toastShowing = true;
      var existing = document.getElementById("dc-toast");
      if (existing) existing.remove();
      var toast = document.createElement("div");
      toast.id = "dc-toast";
      toast.className = "dc-toast" + (next.kind ? " dc-toast--" + next.kind : "");
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      toast.textContent = next.msg;
      document.body.appendChild(toast);
      clearTimeout(this._toastTimeout);
      var hold = next.kind === "win" || next.kind === "suit" ? 2400 : 1800;
      var self = this;
      this._toastTimeout = setTimeout(function () {
        toast.remove();
        self._toastShowing = false;
        self._drainToastQueue();
      }, hold);
    }
  };

  root.DCUI = DCUI;
})(this);
