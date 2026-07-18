(function (root) {
  "use strict";

  var MODE_SOLITAIRE = "solitaire";
  var MODE_KEY = "doccards_mode";

  var PUZZLES = [
    {
      id: "woodblock",
      label: "Wood Block",
      short: "Wood",
      tag: "10×10 · drag wooden blocks · clear lines",
      toast: "Wood Block — drag blocks onto the grid!",
      api: "DCWoodblock"
    },
    {
      id: "game2048",
      label: "2048",
      short: "2048",
      tag: "Swipe to merge · reach 2048 and beyond",
      toast: "2048 — swipe tiles, merge doubles!",
      api: "DC2048"
    },
    {
      id: "mines",
      label: "Mines",
      short: "Mines",
      tag: "Reveal safe tiles · flag every mine",
      toast: "Mines — tap to dig, long-press to flag!",
      api: "DCMines"
    },
    {
      id: "slide",
      label: "Slide 15",
      short: "Slide",
      tag: "Slide tiles into order · classic 4×4",
      toast: "Slide 15 — tap tiles next to the gap!",
      api: "DCSlide"
    },
    {
      id: "snake",
      label: "Snake",
      short: "Snake",
      tag: "Swipe to steer · eat gold · grow long",
      toast: "Snake — swipe or tap arrows to steer!",
      api: "DCSnake"
    },
    {
      id: "memory",
      label: "Memory",
      short: "Memory",
      tag: "Flip cards · match all eight pairs",
      toast: "Memory — find every matching pair!",
      api: "DCMemory"
    },
    {
      id: "simon",
      label: "Simon",
      short: "Simon",
      tag: "Watch the pattern · repeat it back",
      toast: "Simon — watch, then tap the same sequence!",
      api: "DCSimon"
    },
    {
      id: "lights",
      label: "Lights Out",
      short: "Lights",
      tag: "Toggle neighbors · turn every light off",
      toast: "Lights Out — tap until the board is dark!",
      api: "DCLights"
    }
  ];

  var PUZZLE_IDS = PUZZLES.map(function (p) { return p.id; });

  function puzzleById(id) {
    var i;
    for (i = 0; i < PUZZLES.length; i++) {
      if (PUZZLES[i].id === id) return PUZZLES[i];
    }
    return null;
  }

  function isPuzzleMode(mode) {
    return PUZZLE_IDS.indexOf(mode) >= 0;
  }

  function isValidMode(mode) {
    return mode === MODE_SOLITAIRE || isPuzzleMode(mode);
  }

  var Hub = {
    mode: MODE_SOLITAIRE,
    PUZZLES: PUZZLES,
    isPuzzleMode: isPuzzleMode,

    init: function () {
      var params = new URLSearchParams(root.location.search || "");
      var fromQuery = params.get("mode");
      if (isValidMode(fromQuery)) {
        this.mode = fromQuery;
      } else {
        try {
          var saved = localStorage.getItem(MODE_KEY);
          if (isValidMode(saved)) this.mode = saved;
        } catch (e) {}
      }
      if (typeof DCPuzzle !== "undefined") DCPuzzle.ensureRoot();
      this._renderTabs();
      this._setChooserPanel(this.mode);
    },

    onChooserOpen: function () {
      this.setChooserTab(this.mode);
    },

    openChooser: function () {
      if (root.Y && root.Y.one) {
        var node = root.Y.one("#choose_game");
        if (node && typeof node.simulate === "function") {
          node.simulate("click");
          return;
        }
      }
      var chooseBtn = document.getElementById("choose_game");
      if (chooseBtn) {
        chooseBtn.click();
        return;
      }
      var chooser = document.getElementById("game-chooser");
      if (chooser) chooser.classList.add("show");
    },

    onReady: function () {
      this._renderTabs();
      this._setChooserPanel(this.mode);
      if (isPuzzleMode(this.mode)) {
        this.enterPuzzle(this.mode, false);
      } else {
        this.enterSolitaire(false);
      }
    },

    _renderTabs: function () {
      var chooser = document.getElementById("game-chooser-contents");
      if (!chooser) return;
      var tabs = document.getElementById("dc-hub-tabs");
      if (!tabs) {
        tabs = document.createElement("div");
        tabs.id = "dc-hub-tabs";
        tabs.className = "dc-hub-tabs";
        tabs.setAttribute("role", "tablist");
        var title = chooser.querySelector(".chooser-title");
        if (title) chooser.insertBefore(tabs, title);
        else chooser.insertBefore(tabs, chooser.firstChild);
      }
      if (!tabs._dcBuilt) {
        var html = '<button type="button" role="tab" id="dc-tab-solitaire" aria-controls="dc-hub-panel-solitaire">Solitaire</button>';
        var i;
        for (i = 0; i < PUZZLES.length; i++) {
          var p = PUZZLES[i];
          html += '<button type="button" role="tab" id="dc-tab-' + p.id + '" aria-controls="dc-hub-panel-' + p.id + '">' + p.short + "</button>";
        }
        tabs.innerHTML = html;
        tabs._dcBuilt = true;
      }
      this._bindTabEvents();
    },

    _bindTabEvents: function () {
      var self = this;
      var sol = document.getElementById("dc-tab-solitaire");
      if (sol && !sol._dcBound) {
        sol._dcBound = true;
        sol.addEventListener("click", function () { self.setChooserTab(MODE_SOLITAIRE); });
      }
      var i;
      for (i = 0; i < PUZZLES.length; i++) {
        (function (p) {
          var btn = document.getElementById("dc-tab-" + p.id);
          if (btn && !btn._dcBound) {
            btn._dcBound = true;
            btn.addEventListener("click", function () { self.setChooserTab(p.id); });
          }
          var launch = document.getElementById("dc-pz-launch-" + p.id);
          if (launch && !launch._dcBound) {
            launch._dcBound = true;
            launch.addEventListener("click", function () { self.launchPuzzle(p.id); });
          }
        })(PUZZLES[i]);
      }
    },

    setChooserTab: function (mode) {
      this._chooserTab = mode;
      this._setTab(mode);
      this._setChooserPanel(mode);
      var title = document.querySelector(".chooser-title");
      if (!title) return;
      if (mode === MODE_SOLITAIRE) {
        title.textContent = "Pick a solitaire";
      } else {
        var p = puzzleById(mode);
        title.textContent = p ? p.label : "Pick a game";
      }
    },

    setMode: function (mode, persist, fromUser) {
      if (!isValidMode(mode)) return;
      var prev = this.mode;
      var changed = prev !== mode;
      this.mode = mode;
      if (persist !== false) {
        try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
      }
      if (isPuzzleMode(mode)) {
        if (changed || fromUser) this.enterPuzzle(mode, !!fromUser);
      } else if (changed || fromUser) {
        this.enterSolitaire(!!fromUser);
      }
    },

    _clearBodyModes: function () {
      document.body.classList.remove("dc-mode-solitaire", "dc-mode-puzzle", "dc-mode-woodblock");
      var i;
      for (i = 0; i < PUZZLE_IDS.length; i++) {
        document.body.classList.remove("dc-mode-" + PUZZLE_IDS[i]);
      }
    },

    enterSolitaire: function (fromUser) {
      this._clearBodyModes();
      document.body.classList.add("dc-mode-solitaire");
      if (typeof DCPuzzle !== "undefined") {
        DCPuzzle.hide();
        DCPuzzle.pauseAll();
      }
      var legacy = document.getElementById("dc-woodblock-root");
      if (legacy) {
        legacy.classList.add("hidden");
        legacy.setAttribute("aria-hidden", "true");
      }
      this._setSolitaireChrome(true);
      this._setTab(MODE_SOLITAIRE);
      this._setChooserPanel(MODE_SOLITAIRE);
      if (fromUser && typeof DCUI !== "undefined" && DCUI._showToast) {
        DCUI._showToast("Solitaire — pick a game", "deal");
      }
    },

    enterPuzzle: function (mode, fromUser) {
      var p = puzzleById(mode);
      if (!p) return;
      this._clearBodyModes();
      document.body.classList.add("dc-mode-puzzle", "dc-mode-" + mode);
      this._setSolitaireChrome(false);
      if (typeof DCPuzzle !== "undefined") {
        DCPuzzle.pauseAll();
        var el = DCPuzzle.show();
        el.innerHTML = "";
        var api = root[p.api];
        if (api) {
          api._shell = null;
          api._shellBuilt = false;
          if (typeof api.mount === "function") api.mount(el);
          if (typeof api.resume === "function") api.resume();
        }
      }
      this._setTab(mode);
      this._setChooserPanel(mode);
      if (fromUser && typeof DCUI !== "undefined" && DCUI._showToast) {
        DCUI._showToast(p.toast, "deal");
      }
    },

    launchPuzzle: function (mode) {
      var self = this;
      var p = puzzleById(mode);
      if (!p) return;
      var run = function () {
        self.setMode(mode, true, true);
        var chooser = document.getElementById("game-chooser");
        if (chooser) chooser.classList.remove("show");
        if (root.Y && root.Y.Solitaire && root.Y.Solitaire.Application && root.Y.Solitaire.Application.GameChooser) {
          root.Y.Solitaire.Application.GameChooser.hide();
        }
      };
      var moves = 0;
      try {
        if (typeof DCUI !== "undefined" && DCUI._moveCount) moves = DCUI._moveCount;
      } catch (e) {}
      var label = p ? p.label : "this game";
      if (moves > 0 && typeof DCUI !== "undefined" && DCUI.confirmAction) {
        DCUI.confirmAction("Leave this hand and play " + label + "?", run);
      } else {
        run();
      }
    },

    launchWoodblock: function () {
      this.launchPuzzle("woodblock");
    },

    launchSolitaire: function (gameId) {
      this.setMode(MODE_SOLITAIRE, true, true);
      if (!gameId) return;
      try {
        var App = root.Y && root.Y.Solitaire && root.Y.Solitaire.Application;
        if (App && typeof App.switchToGame === "function" && typeof App.newGame === "function") {
          App.switchToGame(gameId);
          App.newGame();
          try {
            if (root.$ && root.$.jStorage) root.$.jStorage.set("FossSolitairey_options", gameId);
          } catch (ePersist) {}
          return;
        }
      } catch (e) {}
      // Fallback: legacy event always deals Freecell.
      if (root.Y && root.Y.fire) {
        try { root.Y.fire("newGameRun"); } catch (e2) {}
      }
    },

    _setSolitaireChrome: function (visible) {
      var ids = ["menu", "site-footer"];
      var i;
      for (i = 0; i < ids.length; i++) {
        var node = document.getElementById(ids[i]);
        if (node) node.classList.toggle("dc-hidden-mode", !visible);
      }
      var cards = document.querySelectorAll(".card, .stack");
      for (i = 0; i < cards.length; i++) {
        if (visible) cards[i].classList.remove("dc-hidden-mode");
        else cards[i].classList.add("dc-hidden-mode");
      }
      if (typeof DCUI !== "undefined") {
        if (visible) {
          DCUI.showHUD();
        } else {
          DCUI.hideHUD();
          if (typeof DCUI.resetHUD === "function") DCUI.resetHUD();
        }
      }
    },

    _setTab: function (mode) {
      var sol = document.getElementById("dc-tab-solitaire");
      if (sol) {
        sol.classList.toggle("active", mode === MODE_SOLITAIRE);
        sol.setAttribute("aria-selected", mode === MODE_SOLITAIRE ? "true" : "false");
      }
      var i;
      for (i = 0; i < PUZZLES.length; i++) {
        var btn = document.getElementById("dc-tab-" + PUZZLES[i].id);
        if (btn) {
          btn.classList.toggle("active", mode === PUZZLES[i].id);
          btn.setAttribute("aria-selected", mode === PUZZLES[i].id ? "true" : "false");
        }
      }
    },

    _ensurePuzzlePanel: function (p) {
      var contents = document.getElementById("game-chooser-contents");
      if (!contents) return null;
      var panel = document.getElementById("dc-hub-panel-" + p.id);
      if (panel) return panel;
      panel = document.createElement("div");
      panel.id = "dc-hub-panel-" + p.id;
      panel.className = "dc-hub-panel hidden";
      panel.innerHTML =
        '<div class="dc-pz-chooser">' +
        '<img src="pwa-maskable-512.png" alt="" class="dc-pz-chooser-mark" width="64" height="64" />' +
        "<h3>" + p.label + "</h3>" +
        '<p class="dc-pz-chooser-tag">' + p.tag + "</p>" +
        '<button type="button" class="doccards-btn dc-pz-play-btn" id="dc-pz-launch-' + p.id + '">Play</button>' +
        "</div>";
      contents.appendChild(panel);
      return panel;
    },

    _setChooserPanel: function (mode) {
      var contents = document.getElementById("game-chooser-contents");
      if (!contents) return;

      var solPanel = document.getElementById("dc-hub-panel-solitaire");
      var descriptions = document.getElementById("descriptions");
      var filter = document.getElementById("fav-filter");

      if (!solPanel && descriptions) {
        solPanel = document.createElement("div");
        solPanel.id = "dc-hub-panel-solitaire";
        solPanel.className = "dc-hub-panel";
        if (filter && filter.parentNode === contents) {
          contents.insertBefore(solPanel, filter);
          solPanel.appendChild(filter);
        } else {
          contents.appendChild(solPanel);
        }
        solPanel.appendChild(descriptions);
      }

      var i;
      for (i = 0; i < PUZZLES.length; i++) {
        this._ensurePuzzlePanel(PUZZLES[i]);
      }
      this._bindTabEvents();

      if (solPanel) solPanel.classList.toggle("hidden", mode !== MODE_SOLITAIRE);
      if (descriptions) descriptions.classList.toggle("hidden", mode !== MODE_SOLITAIRE);
      if (filter) filter.classList.toggle("hidden", mode !== MODE_SOLITAIRE);

      for (i = 0; i < PUZZLES.length; i++) {
        var panel = document.getElementById("dc-hub-panel-" + PUZZLES[i].id);
        if (panel) panel.classList.toggle("hidden", mode !== PUZZLES[i].id);
      }
    }
  };

  root.DCHub = Hub;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { Hub.init(); });
  } else {
    Hub.init();
  }
})(this);
