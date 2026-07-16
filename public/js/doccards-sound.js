(function (root) {
  "use strict";

  var Sound = {
    _ctx: null,
    _enabled: true,
    _volume: 0.32,
    _noiseBuffer: null,

    init: function () {
      try {
        this._ctx = new (root.AudioContext || root.webkitAudioContext)();
        this._noiseBuffer = this._makeNoiseBuffer(0.12);
        Logger.info("sound_initialized", { sampleRate: this._ctx.sampleRate });
      } catch (e) {
        Logger.warn("sound_unavailable", { error: e.message });
        this._ctx = null;
      }
      this._loadPreference();
    },

    _makeNoiseBuffer: function (seconds) {
      if (!this._ctx) return null;
      var length = Math.floor(this._ctx.sampleRate * seconds);
      var buf = this._ctx.createBuffer(1, length, this._ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      return buf;
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

    _ensure: function () {
      if (!this._ctx || !this._enabled) return false;
      if (this._ctx.state === "suspended") {
        this._ctx.resume();
      }
      return true;
    },

    unlock: function () {
      if (!this._ctx) {
        this.init();
      }
      if (!this._ctx) return false;
      var self = this;
      return this._ctx.resume().then(function () {
        self._enabled = true;
        self._savePreference();
        return true;
      }).catch(function () {
        return false;
      });
    },

    _tone: function (type, freqStart, freqEnd, duration, peak) {
      if (!this._ensure()) return;
      var t0 = this._ctx.currentTime;
      var osc = this._ctx.createOscillator();
      var gain = this._ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t0 + duration);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(peak * this._volume, t0 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain);
      gain.connect(this._ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    },

    _noise: function (duration, peak, lowpass) {
      if (!this._ensure() || !this._noiseBuffer) return;
      var t0 = this._ctx.currentTime;
      var src = this._ctx.createBufferSource();
      src.buffer = this._noiseBuffer;
      var filter = this._ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(lowpass, t0);
      var gain = this._ctx.createGain();
      gain.gain.setValueAtTime(peak * this._volume, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this._ctx.destination);
      src.start(t0);
    },

    cardPlace: function () {
      this._tone("triangle", 720, 540, 0.09, 0.55);
      this._noise(0.05, 0.18, 2400);
    },

    cardFlip: function () {
      this._tone("triangle", 1400, 900, 0.06, 0.45);
      this._noise(0.04, 0.12, 3200);
    },

    cardPickup: function () {
      this._tone("sine", 520, 380, 0.05, 0.4);
      this._noise(0.04, 0.10, 1800);
    },

    win: function () {
      var self = this;
      var notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach(function (n, i) {
        setTimeout(function () {
          self._tone("triangle", n, n, 0.22, 0.6);
        }, i * 140);
      });
      setTimeout(function () {
        self._tone("sine", 1318.5, 1318.5, 0.45, 0.5);
      }, 600);
      setTimeout(function () {
        self._tone("triangle", 1568, 1568, 0.35, 0.45);
      }, 780);
    },

    foundation: function () {
      this._tone("sine", 880, 1175, 0.11, 0.5);
      this._tone("triangle", 1175, 1568, 0.14, 0.32);
    },

    suitClear: function () {
      var self = this;
      [784, 988, 1175, 1568].forEach(function (n, i) {
        setTimeout(function () {
          self._tone("triangle", n, n, 0.16, 0.55);
        }, i * 90);
      });
    },

    milestone: function () {
      this._tone("sine", 660, 880, 0.12, 0.4);
      this._tone("triangle", 880, 990, 0.14, 0.35);
    },

    combo: function () {
      this._tone("sine", 990, 1320, 0.1, 0.42);
    },

    undo: function () {
      this._tone("sine", 420, 320, 0.08, 0.28);
      this._noise(0.03, 0.08, 1400);
    },

    deal: function () {
      var self = this;
      [520, 620, 740].forEach(function (n, i) {
        setTimeout(function () {
          self._tone("triangle", n, n * 0.9, 0.07, 0.3);
        }, i * 45);
      });
    },

    error: function () {
      this._tone("square", 220, 160, 0.12, 0.5);
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