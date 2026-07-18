(function (root) {
  "use strict";

  var MODES = { solitaire: "solitaire", woodblock: "woodblock" };
  var MODE_KEY = "doccards_mode";

  var Hub = {
    mode: MODES.solitaire,

    init: function () {
      var params = new URLSearchParams(root.location.search || "");
      var fromQuery = params.get("mode");
      if (fromQuery === MODES.woodblock || fromQuery === MODES.solitaire) {
        this.mode = fromQuery;
      } else {
        try {
          var saved = localStorage.getItem(MODE_KEY);
          if (saved === MODES.woodblock || saved === MODES.solitaire) {
            this.mode = saved;
          }
        } catch (e) {}
      }
      this._ensureShell();
      this._renderTabs();
      this._setChooserPanel(this.mode);
    },

    onChooserOpen: function () {
      this.setChooserTab(this.mode);
    },

    openChooser: function () {
      if (root.Y && root.Y.one) {
        var node = root.Y.one("#choose_game");
        if (node) {
          node.simulate("click");
          return;
        }
      }
      var chooser = document.getElementById("game-chooser");
      if (chooser) chooser.classList.add("show");
    },

    onReady: function () {
      this._renderTabs();
      this._setChooserPanel(this.mode);
      if (this.mode === MODES.woodblock) {
        this.enterWoodblock(false);
      } else {
        this.enterSolitaire(false);
      }
    },

    _ensureShell: function () {
      if (document.getElementById("dc-woodblock-root")) return;
      var el = document.createElement("div");
      el.id = "dc-woodblock-root";
      el.className = "dc-woodblock-root hidden";
      el.setAttribute("aria-hidden", "true");
      document.body.appendChild(el);
    },

    _renderTabs: function () {
      var chooser = document.getElementById("game-chooser-contents");
      if (!chooser) return;
      if (!document.getElementById("dc-hub-tabs")) {
        var self = this;
        var tabs = document.createElement("div");
        tabs.id = "dc-hub-tabs";
        tabs.className = "dc-hub-tabs";
        tabs.setAttribute("role", "tablist");
        tabs.innerHTML =
          '<button type="button" role="tab" id="dc-tab-solitaire" aria-selected="true" aria-controls="dc-hub-panel-solitaire">Solitaire</button>' +
          '<button type="button" role="tab" id="dc-tab-woodblock" aria-selected="false" aria-controls="dc-hub-panel-woodblock">Wood Block</button>';
        var title = chooser.querySelector(".chooser-title");
        if (title) chooser.insertBefore(tabs, title);
        else chooser.insertBefore(tabs, chooser.firstChild);
      }
      this._bindTabEvents();
    },

    _bindTabEvents: function () {
      var self = this;
      var sol = document.getElementById("dc-tab-solitaire");
      var wb = document.getElementById("dc-tab-woodblock");
      if (sol && !sol._dcBound) {
        sol._dcBound = true;
        sol.addEventListener("click", function () {
          self.setChooserTab(MODES.solitaire);
        });
      }
      if (wb && !wb._dcBound) {
        wb._dcBound = true;
        wb.addEventListener("click", function () {
          self.setChooserTab(MODES.woodblock);
        });
      }
      var launch = document.getElementById("dc-wb-launch");
      if (launch && !launch._dcBound) {
        launch._dcBound = true;
        launch.addEventListener("click", function () {
          self.launchWoodblock();
        });
      }
    },

    setChooserTab: function (mode) {
      this._chooserTab = mode;
      this._setTab(mode);
      this._setChooserPanel(mode);
      var title = document.querySelector(".chooser-title");
      if (title) {
        title.textContent = mode === MODES.woodblock ? "Wood Block" : "Pick a solitaire";
      }
    },

    setMode: function (mode, persist, fromUser) {
      if (mode !== MODES.solitaire && mode !== MODES.woodblock) return;
      var prev = this.mode;
      var changed = prev !== mode;
      this.mode = mode;
      if (persist !== false) {
        try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
      }
      if (mode === MODES.woodblock) {
        if (changed || fromUser) this.enterWoodblock(!!fromUser);
      } else if (changed || fromUser) {
        this.enterSolitaire(!!fromUser);
      }
    },

    enterSolitaire: function (fromUser) {
      document.body.classList.remove("dc-mode-woodblock");
      document.body.classList.add("dc-mode-solitaire");
      var wb = document.getElementById("dc-woodblock-root");
      if (wb) {
        wb.classList.add("hidden");
        wb.setAttribute("aria-hidden", "true");
      }
      if (typeof DCWoodblock !== "undefined") DCWoodblock.pause();
      this._setSolitaireChrome(true);
      this._setTab(MODES.solitaire);
      this._setChooserPanel(MODES.solitaire);
      if (fromUser && typeof DCUI !== "undefined" && DCUI._showToast) {
        DCUI._showToast("Solitaire — pick a game", "deal");
      }
    },

    enterWoodblock: function (fromUser) {
      document.body.classList.remove("dc-mode-solitaire");
      document.body.classList.add("dc-mode-woodblock");
      this._setSolitaireChrome(false);
      var wb = document.getElementById("dc-woodblock-root");
      if (wb) {
        wb.classList.remove("hidden");
        wb.setAttribute("aria-hidden", "false");
      }
      if (typeof DCWoodblock !== "undefined") {
        DCWoodblock.mount(document.getElementById("dc-woodblock-root"));
        DCWoodblock.resume();
      }
      this._setTab(MODES.woodblock);
      this._setChooserPanel(MODES.woodblock);
      if (fromUser && typeof DCUI !== "undefined" && DCUI._showToast) {
        DCUI._showToast("Wood Block — drag blocks onto the 10×10 grid!", "deal");
      }
    },

    launchWoodblock: function () {
      var self = this;
      var run = function () {
        self.setMode(MODES.woodblock, true, true);
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
      if (moves > 0 && typeof DCUI !== "undefined" && DCUI.confirmAction) {
        DCUI.confirmAction("Leave this hand and play Wood Block?", run);
      } else {
        run();
      }
    },

    launchSolitaire: function (gameId) {
      this.setMode(MODES.solitaire, true, true);
      if (gameId && root.Y && root.Y.on) {
        try {
          root.Y.fire("newGameRun");
        } catch (e) {}
      }
    },

    _setSolitaireChrome: function (visible) {
      var ids = ["menu", "site-footer"];
      var i;
      for (i = 0; i < ids.length; i++) {
        var node = document.getElementById(ids[i]);
        if (node) node.classList.toggle("dc-hidden-mode", !visible);
      }
      var fab = document.getElementById("dc-fab-bar");
      if (fab) fab.classList.toggle("dc-hidden-mode", false);
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
      var wb = document.getElementById("dc-tab-woodblock");
      if (sol) {
        sol.classList.toggle("active", mode === MODES.solitaire);
        sol.setAttribute("aria-selected", mode === MODES.solitaire ? "true" : "false");
      }
      if (wb) {
        wb.classList.toggle("active", mode === MODES.woodblock);
        wb.setAttribute("aria-selected", mode === MODES.woodblock ? "true" : "false");
      }
    },

    _setChooserPanel: function (mode) {
      var contents = document.getElementById("game-chooser-contents");
      if (!contents) return;

      var solPanel = document.getElementById("dc-hub-panel-solitaire");
      var wbPanel = document.getElementById("dc-hub-panel-woodblock");
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

      if (!wbPanel) {
        wbPanel = document.createElement("div");
        wbPanel.id = "dc-hub-panel-woodblock";
        wbPanel.className = "dc-hub-panel hidden";
        wbPanel.innerHTML =
          '<div class="dc-wb-chooser">' +
          '<img src="pwa-maskable-512.png" alt="" class="dc-wb-chooser-mark" width="72" height="72" />' +
          '<h3>Wood Block</h3>' +
          '<p class="dc-wb-chooser-tag">10×10 board · drag wooden blocks · clear full lines</p>' +
          '<button type="button" class="doccards-btn dc-wb-play-btn" id="dc-wb-launch">Play</button>' +
          "</div>";
        contents.appendChild(wbPanel);
      }
      this._bindTabEvents();

      if (solPanel) solPanel.classList.toggle("hidden", mode !== MODES.solitaire);
      if (wbPanel) wbPanel.classList.toggle("hidden", mode !== MODES.woodblock);
      if (descriptions) descriptions.classList.toggle("hidden", mode !== MODES.solitaire);
      if (filter) filter.classList.toggle("hidden", mode !== MODES.solitaire);
    }
  };

  root.DCHub = Hub;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      Hub.init();
    });
  } else {
    Hub.init();
  }
})(this);
