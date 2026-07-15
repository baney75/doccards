(function (root) {
  "use strict";

  var PREFIX = "FossSolitairey_";

  function _key(k) {
    return k.indexOf(PREFIX) === 0 ? k : PREFIX + k;
  }

  var storage = {
    set: function (key, value) {
      try {
        localStorage.setItem(_key(key), JSON.stringify(value));
      } catch (e) {
        Logger.warn("storage_set_failed", { key: key, error: e.message });
      }
    },

    get: function (key) {
      try {
        var raw = localStorage.getItem(_key(key));
        if (raw === null) return null;
        return JSON.parse(raw);
      } catch (e) {
        Logger.warn("storage_get_failed", { key: key, error: e.message });
        return null;
      }
    },

    deleteKey: function (key) {
      try {
        localStorage.removeItem(_key(key));
      } catch (e) {
        Logger.warn("storage_delete_failed", { key: key, error: e.message });
      }
    },
  };

  if (typeof $ === "undefined" || $ === null) {
    root.$ = {};
  }
  root.$.jStorage = storage;
})(this);