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
      this.createRulesButton();
      this.createRulesOverlay();
      this.createConfirmOverlay();
      this.createAccessibilityToggle();
      this.createDealDisplay();
      this.createSoundToggle();
      this.createHUD();
      this.loadFavorites();
      this.tagDifficulties();
      this.hookEvents();
      Logger.info("dcui_initialized");
    },

    afterGameReady: function () {
      this.hookEvents();
      this.renderFavorites();
      this.updateDealNumber();
      this.showCoachIfNeeded();
    },

    hookEvents: function () {
      var self = this;
      if (this._eventsBound) return;

      var bind = function () {
        var Y = root.Y;
        if (!Y || !Y.Solitaire) return false;
        try {
          Y.on("newGame", function () {
            self.resetHUD();
            self.showHUD();
            self.updateDealNumber();
            setTimeout(function () { self.renderFavorites(); }, 300);
          });
          Y.on("endTurn", function () {
            if (!self._undoing) {
              self.updateMoveCount();
              if (typeof DCSound !== "undefined") DCSound.cardPlace();
            }
            self._undoing = false;
          });
          Y.on("win", function () {
            self.hideHUD();
            if (typeof DCSound !== "undefined") DCSound.win();
          });
          Y.on("beforeSetup", function () { self.showHUD(); });
          Y.on("load", function () {
            setTimeout(function () { self.updateDealNumber(); }, 300);
          });
          Y.on("afterSetup", function () {
            self.updateDealNumber();
          });

          self.resetHUD();
          self.showHUD();
          self.updateDealNumber();
          setTimeout(function () { self.renderFavorites(); }, 300);
          self._eventsBound = true;
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
        if (bind()) return;
        retries++;
        if (retries < maxRetries) setTimeout(poll, 250);
        else Logger.warn("dcui_hook_timeout");
      };
      setTimeout(poll, 200);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.addEventListener("controllerchange", function () {
          self._showToast("Updated! Refresh to get the latest version.");
        });
        navigator.serviceWorker.ready.then(function (reg) {
          reg.addEventListener("updatefound", function () {
            var newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", function () {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                self._showToast("Update available — refresh to update.");
              }
            });
          });
        });
      }
    },

    createRulesButton: function () {
      var btn = document.createElement("button");
      btn.id = "rules-btn";
      btn.type = "button";
      btn.innerHTML = '<span class="fab-glyph">?</span><span class="fab-label">Rules</span>';
      btn.title = "Game Rules";
      btn.setAttribute("aria-label", "Show game rules");
      btn.addEventListener("click", this.showRules.bind(this));
      document.body.appendChild(btn);
    },

    createRulesOverlay: function () {
      var overlay = document.createElement("div");
      overlay.id = "rules-overlay";
      overlay.className = "rules-overlay hidden";
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
      var self = this;
      document.getElementById("dc-confirm-cancel").addEventListener("click", function () {
        self._hideConfirm();
      });
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) self._hideConfirm();
      });
    },

    confirmAction: function (message, onConfirm) {
      var overlay = this._confirmOverlay;
      if (!overlay) {
        if (window.confirm(message)) onConfirm();
        return;
      }
      document.getElementById("dc-confirm-body").textContent = message;
      overlay.className = "rules-overlay";
      var ok = document.getElementById("dc-confirm-ok");
      var self = this;
      var handler = function () {
        ok.removeEventListener("click", handler);
        self._hideConfirm();
        onConfirm();
      };
      ok.addEventListener("click", handler);
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
      document.getElementById("rules-body").innerHTML = "<p>" + data.desc + "</p>";
      this._rulesOverlay.className = "rules-overlay";
      Logger.info("show_rules", { game: data.name });
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
      var btn = document.createElement("button");
      btn.id = "a11y-toggle";
      btn.type = "button";
      btn.innerHTML = '<span class="fab-glyph">Aa</span><span class="fab-label">Big</span>';
      btn.title = "Toggle large cards and text";
      btn.setAttribute("aria-label", "Toggle large cards and text for easier reading");
      btn.addEventListener("click", this.toggleBigCards.bind(this));
      document.body.appendChild(btn);
      if (localStorage.getItem(this.BIG_CARDS_KEY) === "true") {
        document.body.classList.add("big-cards");
        btn.classList.add("active");
      }
    },

    toggleBigCards: function () {
      var isBig = document.body.classList.toggle("big-cards");
      try { localStorage.setItem(this.BIG_CARDS_KEY, String(isBig)); } catch (e) {}
      var btn = document.getElementById("a11y-toggle");
      if (btn) btn.classList.toggle("active", isBig);
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
      var btn = document.createElement("button");
      btn.id = "sound-toggle";
      btn.type = "button";
      btn.title = "Toggle sound";
      btn.setAttribute("aria-label", "Sound on");
      btn.innerHTML = '<span class="fab-glyph" aria-hidden="true">\uD83D\uDD0A</span><span class="fab-label">Sound</span>';
      btn.addEventListener("click", function () {
        if (typeof DCSound !== "undefined") {
          DCSound.enabled(!DCSound.enabled());
          var on = DCSound.enabled();
          btn.querySelector(".fab-glyph").textContent = on ? "\uD83D\uDD0A" : "\uD83D\uDD07";
          btn.setAttribute("aria-label", on ? "Sound on" : "Sound off");
        }
      });
      document.body.appendChild(btn);
    },

    createDealDisplay: function () {
      var el = document.createElement("div");
      el.id = "deal-number";
      el.className = "deal-display hidden";
      el.innerHTML = '<span class="deal-label">Deal</span> <span id="deal-value">#---</span> <button id="copy-deal" type="button" aria-label="Copy deal number" title="Copy deal number">\uD83D\uDCCB</button>';
      document.body.appendChild(el);
      this._dealEl = el;
      document.getElementById("copy-deal").addEventListener("click", function () {
        var val = document.getElementById("deal-value").textContent.replace("#", "");
        if (navigator.clipboard) {
          navigator.clipboard.writeText(val).then(function () {
            DCUI._showToast("Deal number copied!");
          });
        } else {
          var ta = document.createElement("textarea");
          ta.value = val;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          DCUI._showToast("Deal number copied!");
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
      if (el) el.textContent = this._moveCount;
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
    },

    hideHUD: function () {
      if (this._hudEl) this._hudEl.className = "dc-hud hidden";
    },

    invalidMove: function () {
      document.body.classList.add("dc-invalid-nudge");
      var self = this;
      setTimeout(function () { document.body.classList.remove("dc-invalid-nudge"); }, 280);
      this._showToast("That card can’t go there");
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
        filterBar.appendChild(chip("All", "all"));
        filterBar.appendChild(chip("Easy", "easy"));
        filterBar.appendChild(chip("Classic", "classic"));
        filterBar.appendChild(chip("Hard", "hard"));
        filterBar.appendChild(chip("My Games", "mine"));
        var title = chooser.querySelector(".chooser-title");
        if (title && title.nextSibling) {
          chooser.insertBefore(filterBar, title.nextSibling);
        } else {
          chooser.insertBefore(filterBar, chooser.firstChild);
        }
        this._setActiveFilterKey("all");
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
      }
    },

    showCoachIfNeeded: function () {
      try {
        if (localStorage.getItem(this.COACH_KEY) === "1") return;
      } catch (e) { return; }
      var tips = [
        "Deal New Cards starts a fresh hand. Undo takes a move back.",
        "Tap ? for rules. Tap Aa for bigger cards that are easier to read.",
        "Choose Game → Easy filters for gentler solitaires. Pin favorites with the star."
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

    _showToast: function (msg) {
      var existing = document.getElementById("dc-toast");
      if (existing) existing.remove();
      var toast = document.createElement("div");
      toast.id = "dc-toast";
      toast.className = "dc-toast";
      toast.textContent = msg;
      document.body.appendChild(toast);
      clearTimeout(this._toastTimeout);
      this._toastTimeout = setTimeout(function () { toast.remove(); }, 2000);
    }
  };

  root.DCUI = DCUI;
})(this);
