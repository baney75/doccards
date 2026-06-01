(function (root) {
  "use strict";

  var Sound = {
    _ctx: null,
    _enabled: true,
    _volume: 0.4,

    init: function () {
      try {
        this._ctx = new (root.AudioContext || root.webkitAudioContext)();
        Logger.info("sound_initialized", { sampleRate: this._ctx.sampleRate });
      } catch (e) {
        Logger.warn("sound_unavailable", { error: e.message });
        this._ctx = null;
      }
      this._loadPreference();
    },

    _loadPreference: function () {
      try {
        var pref = localStorage.getItem("doccards_sound_enabled");
        this._enabled = pref === null ? true : pref === "true";
      } catch (e) {}
    },

    _savePreference: function () {
      try {
        localStorage.setItem("doccards_sound_enabled", String(this._enabled));
      } catch (e) {}
    },

    enabled: function (val) {
      if (typeof val === "boolean") {
        this._enabled = val;
        this._savePreference();
      }
      return this._enabled;
    },

    volume: function (val) {
      if (typeof val === "number") {
        this._volume = Math.max(0, Math.min(1, val));
      }
      return this._volume;
    },

    _play: function (type, frequency, duration, decay) {
      if (!this._ctx || !this._enabled) return;
      if (this._ctx.state === "suspended") {
        this._ctx.resume();
      }
      var osc = this._ctx.createOscillator();
      var gain = this._ctx.createGain();
      osc.connect(gain);
      gain.connect(this._ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this._ctx.currentTime);
      gain.gain.setValueAtTime(this._volume, this._ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + duration * decay);
      osc.start(this._ctx.currentTime);
      osc.stop(this._ctx.currentTime + duration);
    },

    cardPlace: function () {
      this._play("sine", 800, 0.08, 2);
    },

    cardFlip: function () {
      this._play("triangle", 1200, 0.06, 3);
    },

    cardPickup: function () {
      this._play("sine", 600, 0.05, 2.5);
    },

    win: function () {
      var self = this;
      this._play("sine", 523, 0.15, 1.5);
      setTimeout(function () { self._play("sine", 659, 0.15, 1.5); }, 150);
      setTimeout(function () { self._play("sine", 784, 0.3, 2); }, 300);
    },

    error: function () {
      this._play("square", 200, 0.15, 1.5);
    }
  };

  root.DCSound = Sound;

  var initOnInteraction = function () {
    Sound.init();
    root.removeEventListener("click", initOnInteraction);
    root.removeEventListener("touchstart", initOnInteraction);
  };
  root.addEventListener("click", initOnInteraction);
  root.addEventListener("touchstart", initOnInteraction);
})(this);