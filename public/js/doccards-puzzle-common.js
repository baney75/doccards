(function (root) {
  "use strict";

  var ROOT_ID = "dc-puzzle-root";

  root.DCPuzzle = {
    ROOT_ID: ROOT_ID,

    ensureRoot: function () {
      var el = document.getElementById(ROOT_ID);
      if (!el) {
        el = document.createElement("div");
        el.id = ROOT_ID;
        el.className = "dc-puzzle-root hidden";
        el.setAttribute("aria-hidden", "true");
        document.body.appendChild(el);
      }
      return el;
    },

    show: function () {
      var el = this.ensureRoot();
      el.classList.remove("hidden");
      el.setAttribute("aria-hidden", "false");
      return el;
    },

    hide: function () {
      var el = document.getElementById(ROOT_ID);
      if (el) {
        el.classList.add("hidden");
        el.setAttribute("aria-hidden", "true");
      }
    },

    pauseAll: function () {
      var apis = [
        "DCWoodblock", "DC2048", "DCMines", "DCSlide",
        "DCSnake", "DCMemory", "DCSimon", "DCLights"
      ];
      var i;
      for (i = 0; i < apis.length; i++) {
        var api = root[apis[i]];
        if (api && typeof api.pause === "function") api.pause();
      }
    },

    topBarHtml: function (opts) {
      opts = opts || {};
      var score = opts.score != null ? opts.score : 0;
      var best = opts.best != null ? opts.best : 0;
      var extra = opts.extraHtml || "";
      return (
        '<div class="dc-pz-top">' +
        '<div class="dc-pz-stat"><span class="dc-pz-stat-label">Score</span><span class="dc-pz-stat-val" id="' + (opts.scoreId || "dc-pz-score") + '">' + score + "</span></div>" +
        '<div class="dc-pz-stat"><span class="dc-pz-stat-label">Best</span><span class="dc-pz-stat-val" id="' + (opts.bestId || "dc-pz-best") + '">' + best + "</span></div>" +
        extra +
        '<button type="button" class="doccards-btn doccards-btn-secondary dc-pz-games" data-dc-pz-games>Games</button>' +
        '<button type="button" class="doccards-btn doccards-btn-secondary dc-pz-new" data-dc-pz-new>New</button>' +
        "</div>"
      );
    },

    bindChrome: function (shell, onNew, newConfirm) {
      if (!shell) return;
      var gamesBtn = shell.querySelector("[data-dc-pz-games]");
      var newBtn = shell.querySelector("[data-dc-pz-new]");
      if (gamesBtn && !gamesBtn._dcBound) {
        gamesBtn._dcBound = true;
        gamesBtn.addEventListener("click", function () {
          if (typeof DCHub !== "undefined" && DCHub.openChooser) DCHub.openChooser();
        });
      }
      if (newBtn && !newBtn._dcBound) {
        newBtn._dcBound = true;
        newBtn.addEventListener("click", function () {
          if (newConfirm && typeof DCUI !== "undefined" && DCUI.confirmAction) {
            DCUI.confirmAction(newConfirm, onNew);
          } else {
            onNew();
          }
        });
      }
    },

    bumpScore: function (el) {
      if (!el) return;
      el.classList.remove("dc-hud-bump");
      void el.offsetWidth;
      el.classList.add("dc-hud-bump");
    },

    loadInt: function (key, fallback) {
      try {
        var v = parseInt(localStorage.getItem(key) || "", 10);
        return isNaN(v) ? fallback : v;
      } catch (e) {
        return fallback;
      }
    },

    saveInt: function (key, val) {
      try { localStorage.setItem(key, String(val)); } catch (e) {}
    }
  };
})(this);
