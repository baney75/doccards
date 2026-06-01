(function (root) {
  "use strict";

  var LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
  var hostname = (root.location && root.location.hostname) || "unknown";
  var isDev = hostname === "localhost" || hostname === "127.0.0.1";
  var MIN_LEVEL = isDev ? LOG_LEVELS.debug : LOG_LEVELS.info;
  var sessionId =
    (root.crypto && root.crypto.randomUUID && root.crypto.randomUUID().slice(0, 8)) ||
    Date.now().toString(36);

  var LEVEL_COLORS = {
    debug: "#888",
    info: "#2d5a27",
    warn: "#c9a961",
    error: "#9c1e1e",
  };

  var Logger = {
    _ctx: "doccards",
    _sid: sessionId,

    debug: function (msg, meta) {
      this._log("debug", msg, meta);
    },
    info: function (msg, meta) {
      this._log("info", msg, meta);
    },
    warn: function (msg, meta) {
      this._log("warn", msg, meta);
    },
    error: function (msg, meta) {
      this._log("error", msg, meta);
    },

    _log: function (level, msg, meta) {
      if (LOG_LEVELS[level] < MIN_LEVEL) return;

      var entry = {
        ts: new Date().toISOString(),
        level: level,
        ctx: this._ctx,
        sid: this._sid,
        msg: msg,
      };
      if (meta && typeof meta === "object") {
        Object.keys(meta).forEach(function (k) {
          entry[k] = meta[k];
        });
      }

      var line = JSON.stringify(entry);
      var color = LEVEL_COLORS[level] || "#888";

      if (level === "error") {
        console.error("%c[DocCards ERROR]%c " + line, "color:" + color + ";font-weight:bold", "color:inherit");
        this._reportError(entry);
      } else if (level === "warn") {
        console.warn("%c[DocCards WARN]%c " + line, "color:" + color + ";font-weight:bold", "color:inherit");
      } else {
        console.log("%c[DocCards " + level.toUpperCase() + "]%c " + line, "color:" + color, "color:inherit");
      }
    },

    _errorQueue: [],
    _flushTimer: null,

    _reportError: function (entry) {
      this._errorQueue.push(entry);
      if (!this._flushTimer) {
        var self = this;
        this._flushTimer = setTimeout(function () {
          self._flushErrors();
        }, 5000);
      }
    },

    _flushErrors: function () {
      if (this._errorQueue.length === 0) return;
      var batch = this._errorQueue;
      this._errorQueue = [];
      this._flushTimer = null;

      try {
        var self = this;
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/client-errors", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.timeout = 10000;
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4 && xhr.status >= 400) {
            self._errorQueue = self._errorQueue.concat(batch);
          }
        };
        xhr.ontimeout = function () {
          self._errorQueue = self._errorQueue.concat(batch);
        };
        xhr.send(JSON.stringify({ errors: batch }));
      } catch (e) {
        this._errorQueue = this._errorQueue.concat(batch);
        console.warn("DocCards: Failed to report errors", e);
      }
    },
  };

  root.Logger = Logger;

  root.addEventListener("error", function (evt) {
    Logger.error("uncaught_error", {
      message: evt.message || String(evt),
      filename: evt.filename || "",
      lineno: evt.lineno || 0,
      colno: evt.colno || 0,
    });
  });

  root.addEventListener("unhandledrejection", function (evt) {
    Logger.error("unhandled_promise", {
      reason: evt.reason ? String(evt.reason) : "unknown",
    });
  });
})(this);