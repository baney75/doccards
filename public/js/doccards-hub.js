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
      if (!chooser || document.getElementById("dc-hub-tabs")) return;
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

      document.getElementById("dc-tab-solitaire").addEventListener("click", function () {
        self.setChooserTab(MODES.solitaire);
      });
      document.getElementById("dc-tab-woodblock").addEventListener("click", function () {
        self.setChooserTab(MODES.woodblock);
      });
    },

    setChooserTab: function (mode) {
      this._chooserTab = mode;
      this._setTab(mode);
      this._setChooserPanel(mode);
    },

    setMode: function (mode, persist) {
      if (mode !== MODES.solitaire && mode !== MODES.woodblock) return;
      this.mode = mode;
      if (persist !== false) {
        try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
      }
      if (mode === MODES.woodblock) this.enterWoodblock(true);
      else this.enterSolitaire(true);
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
        DCUI._showToast("Wood Block — fill the grid!", "deal");
      }
    },

    launchWoodblock: function () {
      this.setMode(MODES.woodblock, true);
      var chooser = document.getElementById("game-chooser");
      if (chooser) chooser.classList.remove("show");
      if (root.Y && root.Y.Solitaire && root.Y.Solitaire.Application && root.Y.Solitaire.Application.GameChooser) {
        root.Y.Solitaire.Application.GameChooser.hide();
      }
      document.documentElement.classList.remove("dc-chooser-open");
      document.body.classList.remove("dc-chooser-open", "scrollable");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.overflow = "";
    },

    launchSolitaire: function (gameId) {
      this.setMode(MODES.solitaire, true);
      if (gameId && root.Y && root.Y.on) {
        try {
          root.Y.fire("newGameRun");
        } catch (e) {}
      }
    },

    _setSolitaireChrome: function (visible) {
      var ids = ["menu", "dc-fab-bar", "site-footer"];
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
        if (visible) DCUI.showHUD();
        else DCUI.hideHUD();
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
          '<p class="dc-wb-chooser-tag">Place blocks · clear lines · beat your best</p>' +
          '<button type="button" class="doccards-btn dc-wb-play-btn" id="dc-wb-launch">Play</button>' +
          "</div>";
        contents.appendChild(wbPanel);
        var self = this;
        document.getElementById("dc-wb-launch").addEventListener("click", function () {
          self.launchWoodblock();
        });
      }

      if (solPanel) solPanel.classList.toggle("hidden", mode !== MODES.solitaire);
      if (wbPanel) wbPanel.classList.toggle("hidden", mode !== MODES.woodblock);
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
