(function (root) {
  "use strict";

  var GRID = 8;
  var BEST_KEY = "doccards_woodblock_best";
  var SCORE_KEY = "doccards_woodblock_last";

  var SHAPES = [
    { id: "1", cells: [[0, 0]], color: "#C9A961" },
    { id: "2h", cells: [[0, 0], [0, 1]], color: "#E8D5A3" },
    { id: "2v", cells: [[0, 0], [1, 0]], color: "#E8D5A3" },
    { id: "3h", cells: [[0, 0], [0, 1], [0, 2]], color: "#0F5C2F" },
    { id: "3v", cells: [[0, 0], [1, 0], [2, 0]], color: "#0F5C2F" },
    { id: "4h", cells: [[0, 0], [0, 1], [0, 2], [0, 3]], color: "#0D2240" },
    { id: "4v", cells: [[0, 0], [1, 0], [2, 0], [3, 0]], color: "#0D2240" },
    { id: "5h", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], color: "#0D2240" },
    { id: "sq", cells: [[0, 0], [0, 1], [1, 0], [1, 1]], color: "#9C1E1E" },
    { id: "sq3", cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], color: "#7a1616" },
    { id: "L", cells: [[0, 0], [1, 0], [2, 0], [2, 1]], color: "#C9A961" },
    { id: "L2", cells: [[0, 1], [1, 1], [2, 0], [2, 1]], color: "#C9A961" },
    { id: "L3", cells: [[0, 0], [0, 1], [1, 0], [2, 0]], color: "#C9A961" },
    { id: "L4", cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: "#C9A961" },
    { id: "T", cells: [[0, 0], [0, 1], [0, 2], [1, 1]], color: "#0F5C2F" },
    { id: "T2", cells: [[0, 1], [1, 0], [1, 1], [1, 2]], color: "#0F5C2F" },
    { id: "Z", cells: [[0, 0], [0, 1], [1, 1], [1, 2]], color: "#0D2240" },
    { id: "S", cells: [[0, 1], [0, 2], [1, 0], [1, 1]], color: "#0D2240" }
  ];

  function cloneGrid(g) {
    return g.map(function (row) { return row.slice(); });
  }

  function emptyGrid() {
    var g = [];
    var r;
    for (r = 0; r < GRID; r++) {
      g.push(new Array(GRID).fill(0));
    }
    return g;
  }

  function randomShape() {
    return SHAPES[Math.floor(Math.random() * SHAPES.length)];
  }

  function canPlace(grid, shape, row, col) {
    var i;
    for (i = 0; i < shape.cells.length; i++) {
      var r = row + shape.cells[i][0];
      var c = col + shape.cells[i][1];
      if (r < 0 || c < 0 || r >= GRID || c >= GRID) return false;
      if (grid[r][c]) return false;
    }
    return true;
  }

  function placeShape(grid, shape, row, col) {
    var g = cloneGrid(grid);
    var i;
    for (i = 0; i < shape.cells.length; i++) {
      var r = row + shape.cells[i][0];
      var c = col + shape.cells[i][1];
      g[r][c] = shape.color;
    }
    return g;
  }

  function findClears(grid) {
    var rows = [];
    var cols = [];
    var r;
    var c;
    for (r = 0; r < GRID; r++) {
      var full = true;
      for (c = 0; c < GRID; c++) {
        if (!grid[r][c]) { full = false; break; }
      }
      if (full) rows.push(r);
    }
    for (c = 0; c < GRID; c++) {
      var colFull = true;
      for (r = 0; r < GRID; r++) {
        if (!grid[r][c]) { colFull = false; break; }
      }
      if (colFull) cols.push(c);
    }
    return { rows: rows, cols: cols };
  }

  function applyClears(grid, clears) {
    var g = cloneGrid(grid);
    var i;
    for (i = 0; i < clears.rows.length; i++) {
      var rr = clears.rows[i];
      for (var c = 0; c < GRID; c++) g[rr][c] = 0;
    }
    for (i = 0; i < clears.cols.length; i++) {
      var cc = clears.cols[i];
      for (var r = 0; r < GRID; r++) g[r][cc] = 0;
    }
    return g;
  }

  function anyPlacement(grid, shape) {
    var r;
    var c;
    for (r = 0; r < GRID; r++) {
      for (c = 0; c < GRID; c++) {
        if (canPlace(grid, shape, r, c)) return true;
      }
    }
    return false;
  }

  function gameOver(grid, tray) {
    var i;
    for (i = 0; i < tray.length; i++) {
      if (tray[i] && anyPlacement(grid, tray[i])) return false;
    }
    return true;
  }

  var WB = {
    _mounted: false,
    _paused: false,
    _root: null,
    _grid: null,
    _tray: [],
    _score: 0,
    _best: 0,
    _combo: 0,
    _drag: null,
    _ghost: null,
    _selectedIndex: null,

    mount: function (rootEl) {
      if (!rootEl) return;
      this._root = rootEl;
      if (this._mounted) {
        this._render();
        return;
      }
      this._mounted = true;
      this._best = this._loadBest();
      this.newGame();
    },

    pause: function () {
      this._paused = true;
    },

    resume: function () {
      this._paused = false;
      if (this._mounted) this._render();
    },

    newGame: function () {
      this._grid = emptyGrid();
      this._score = 0;
      this._combo = 0;
      this._tray = [randomShape(), randomShape(), randomShape()];
      this._render();
      if (typeof DCSound !== "undefined" && DCSound.deal) DCSound.deal();
    },

    _loadBest: function () {
      try { return parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0; } catch (e) { return 0; }
    },

    _saveBest: function () {
      if (this._score <= this._best) return;
      this._best = this._score;
      try {
        localStorage.setItem(BEST_KEY, String(this._best));
        localStorage.setItem(SCORE_KEY, String(this._score));
      } catch (e) {}
    },

    _render: function () {
      if (!this._root || this._paused) return;
      var self = this;
      this._root.innerHTML =
        '<div class="dc-wb-shell">' +
        '<div class="dc-wb-top">' +
        '<div class="dc-wb-stat"><span class="dc-wb-stat-label">Score</span><span class="dc-wb-stat-val" id="dc-wb-score">' + this._score + "</span></div>" +
        '<div class="dc-wb-stat"><span class="dc-wb-stat-label">Best</span><span class="dc-wb-stat-val" id="dc-wb-best">' + this._best + "</span></div>" +
        '<button type="button" class="doccards-btn doccards-btn-secondary dc-wb-games" id="dc-wb-games">Games</button>' +
        '<button type="button" class="doccards-btn doccards-btn-secondary dc-wb-new" id="dc-wb-new">New</button>' +
        "</div>" +
        '<div class="dc-wb-board-wrap"><div class="dc-wb-board" id="dc-wb-board" role="grid" aria-label="Wood block grid"></div></div>' +
        '<div class="dc-wb-tray" id="dc-wb-tray" role="group" aria-label="Block pieces"></div>' +
        '<div class="dc-wb-over hidden" id="dc-wb-over" role="dialog" aria-modal="true">' +
        '<div class="dc-wb-over-card">' +
        '<p class="dc-wb-over-title">Beautiful run!</p>' +
        '<p class="dc-wb-over-score">Score <strong id="dc-wb-over-score">0</strong></p>' +
        '<button type="button" class="doccards-btn" id="dc-wb-retry">Play again</button>' +
        "</div></div>" +
        "</div>";

      document.getElementById("dc-wb-new").addEventListener("click", function () {
        if (self._score > 0 && typeof DCUI !== "undefined" && DCUI.confirmAction) {
          DCUI.confirmAction("Start a fresh Wood Block board? Your score resets.", function () {
            self.newGame();
          });
        } else {
          self.newGame();
        }
      });
      document.getElementById("dc-wb-games").addEventListener("click", function () {
        if (typeof DCHub !== "undefined" && DCHub.openChooser) DCHub.openChooser();
      });
      document.getElementById("dc-wb-retry").addEventListener("click", function () {
        document.getElementById("dc-wb-over").classList.add("hidden");
        self.newGame();
      });
      this._paintBoard();
      this._paintTray();
      this._bindBoardTap();
    },

    _bindBoardTap: function () {
      var board = document.getElementById("dc-wb-board");
      if (!board || board._dcTapBound) return;
      board._dcTapBound = true;
      var self = this;
      board.addEventListener("click", function (e) {
        self._handleBoardTap(e.target);
      });
      board.addEventListener("touchend", function (e) {
        if (!e.changedTouches || !e.changedTouches[0]) return;
        var t = e.changedTouches[0];
        var el = document.elementFromPoint(t.clientX, t.clientY);
        self._handleBoardTap(el);
      });
    },

    _handleBoardTap: function (target) {
      var cell = target && target.closest ? target.closest(".dc-wb-cell") : null;
      if (!cell || this._selectedIndex === null) return;
      var r = parseInt(cell.getAttribute("data-r"), 10);
      var c = parseInt(cell.getAttribute("data-c"), 10);
      if (isNaN(r) || isNaN(c)) return;
      var rect = cell.getBoundingClientRect();
      var ok = this._placeAt(this._selectedIndex, r, c, rect.left + rect.width / 2, rect.top + rect.height / 2);
      if (!ok && typeof DCUI !== "undefined" && DCUI.invalidMove) DCUI.invalidMove();
    },

    _selectTray: function (index) {
      this._selectedIndex = index;
      var slots = document.querySelectorAll(".dc-wb-tray-slot");
      var i;
      for (i = 0; i < slots.length; i++) {
        slots[i].classList.toggle("selected", parseInt(slots[i].dataset.index, 10) === index);
      }
      if (typeof DCUI !== "undefined" && DCUI._showToast) {
        DCUI._showToast("Tap the board to place", "deal");
      }
    },

    _paintBoard: function () {
      var board = document.getElementById("dc-wb-board");
      if (!board) return;
      var html = "";
      var r;
      var c;
      for (r = 0; r < GRID; r++) {
        for (c = 0; c < GRID; c++) {
          var filled = this._grid[r][c];
          html += '<div class="dc-wb-cell' + (filled ? " filled" : "") + '" data-r="' + r + '" data-c="' + c + '" style="' +
            (filled ? "background:" + filled + ";" : "") + '"></div>';
        }
      }
      board.innerHTML = html;
    },

    _shapeDims: function (shape) {
      var maxR = 0;
      var maxC = 0;
      var i;
      for (i = 0; i < shape.cells.length; i++) {
        if (shape.cells[i][0] > maxR) maxR = shape.cells[i][0];
        if (shape.cells[i][1] > maxC) maxC = shape.cells[i][1];
      }
      return { rows: maxR + 1, cols: maxC + 1 };
    },

    _paintTray: function () {
      var tray = document.getElementById("dc-wb-tray");
      if (!tray) return;
      var self = this;
      tray.innerHTML = "";
      var i;
      for (i = 0; i < 3; i++) {
        var shape = this._tray[i];
        var slot = document.createElement("div");
        slot.className = "dc-wb-tray-slot" + (shape ? "" : " empty");
        slot.dataset.index = String(i);
        if (!shape) {
          slot.innerHTML = '<span class="dc-wb-tray-empty" aria-hidden="true"></span>';
          tray.appendChild(slot);
          continue;
        }
        var dims = this._shapeDims(shape);
        var mini = document.createElement("div");
        mini.className = "dc-wb-mini";
        mini.style.gridTemplateColumns = "repeat(" + dims.cols + ", 1fr)";
        mini.style.gridTemplateRows = "repeat(" + dims.rows + ", 1fr)";
        var r;
        var c;
        for (r = 0; r < dims.rows; r++) {
          for (c = 0; c < dims.cols; c++) {
            var cell = document.createElement("span");
            cell.className = "dc-wb-mini-cell";
            var hit = false;
            var k;
            for (k = 0; k < shape.cells.length; k++) {
              if (shape.cells[k][0] === r && shape.cells[k][1] === c) {
                hit = true;
                break;
              }
            }
            if (hit) {
              cell.classList.add("on");
              cell.style.background = shape.color;
            }
            mini.appendChild(cell);
          }
        }
        slot.appendChild(mini);
        this._bindDrag(slot, shape, i);
        tray.appendChild(slot);
      }
    },

    _bindDrag: function (slot, shape, index) {
      var self = this;
      var startDrag = function (clientX, clientY) {
        if (self._drag) return;
        self._drag = { shape: shape, index: index, offsetX: 0, offsetY: 0 };
        var ghost = document.createElement("div");
        ghost.className = "dc-wb-ghost";
        ghost.id = "dc-wb-ghost";
        var dims = self._shapeDims(shape);
        ghost.style.gridTemplateColumns = "repeat(" + dims.cols + ", var(--wb-cell))";
        ghost.style.gridTemplateRows = "repeat(" + dims.rows + ", var(--wb-cell))";
        var r;
        var c;
        for (r = 0; r < dims.rows; r++) {
          for (c = 0; c < dims.cols; c++) {
            var cell = document.createElement("span");
            cell.className = "dc-wb-ghost-cell";
            var hit = false;
            var k;
            for (k = 0; k < shape.cells.length; k++) {
              if (shape.cells[k][0] === r && shape.cells[k][1] === c) {
                hit = true;
                break;
              }
            }
            if (hit) {
              cell.classList.add("on");
              cell.style.background = shape.color;
            }
            ghost.appendChild(cell);
          }
        }
        document.body.appendChild(ghost);
        var shell = document.querySelector(".dc-wb-shell");
        if (shell) {
          var cellPx = getComputedStyle(shell).getPropertyValue("--wb-cell").trim() || "44px";
          ghost.style.setProperty("--wb-cell", cellPx);
        }
        self._ghost = ghost;
        slot.classList.add("dragging");
        self._moveGhost(clientX, clientY);
        if (typeof DCSound !== "undefined" && DCSound.cardPlace) DCSound.cardPlace();
      };

      var moveDrag = function (clientX, clientY) {
        if (!self._drag) return;
        self._moveGhost(clientX, clientY);
        self._highlightDrop(clientX, clientY);
      };

      var endDrag = function (clientX, clientY, wasDrag) {
        if (!self._drag) return;
        var placed = false;
        if (wasDrag) {
          placed = self._tryDrop(clientX, clientY);
        }
        if (self._ghost && self._ghost.parentNode) self._ghost.parentNode.removeChild(self._ghost);
        self._ghost = null;
        self._clearHighlight();
        slot.classList.remove("dragging");
        self._drag = null;
        if (wasDrag && !placed && typeof DCUI !== "undefined" && DCUI.invalidMove) DCUI.invalidMove();
      };

      slot.addEventListener("mousedown", function (e) {
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
        var onMove = function (ev) { moveDrag(ev.clientX, ev.clientY); };
        var onUp = function (ev) {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          endDrag(ev.clientX, ev.clientY, true);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });

      var touchStartX = 0;
      var touchStartY = 0;
      var touchDragging = false;
      var dragThreshold = 12;

      slot.addEventListener("touchstart", function (e) {
        if (!e.touches || !e.touches[0]) return;
        var t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchDragging = false;
      }, { passive: true });

      slot.addEventListener("touchmove", function (e) {
        if (!e.touches || !e.touches[0]) return;
        var t = e.touches[0];
        if (!touchDragging) {
          var dx = t.clientX - touchStartX;
          var dy = t.clientY - touchStartY;
          if (dx * dx + dy * dy < dragThreshold * dragThreshold) return;
          touchDragging = true;
          e.preventDefault();
          startDrag(t.clientX, t.clientY);
        } else if (self._drag) {
          e.preventDefault();
          moveDrag(t.clientX, t.clientY);
        }
      }, { passive: false });

      slot.addEventListener("touchend", function (e) {
        if (touchDragging && self._drag) {
          var t = (e.changedTouches && e.changedTouches[0]) || { clientX: touchStartX, clientY: touchStartY };
          endDrag(t.clientX, t.clientY, true);
        } else if (!touchDragging) {
          self._selectTray(index);
        }
        touchDragging = false;
      });

      slot.addEventListener("click", function (e) {
        if (self._drag) return;
        e.stopPropagation();
        self._selectTray(index);
      });
    },

    _moveGhost: function (x, y) {
      if (!this._ghost) return;
      this._ghost.style.left = x + "px";
      this._ghost.style.top = y + "px";
    },

    _boardCellAt: function (clientX, clientY) {
      var board = document.getElementById("dc-wb-board");
      if (!board) return null;
      var rect = board.getBoundingClientRect();
      if (clientX < rect.left || clientY < rect.top || clientX > rect.right || clientY > rect.bottom) {
        return null;
      }
      var cellW = rect.width / GRID;
      var cellH = rect.height / GRID;
      var c = Math.floor((clientX - rect.left) / cellW);
      var r = Math.floor((clientY - rect.top) / cellH);
      if (r < 0 || c < 0 || r >= GRID || c >= GRID) return null;
      return { r: r, c: c };
    },

    _highlightDrop: function (clientX, clientY) {
      this._clearHighlight();
      if (!this._drag) return;
      var cell = this._boardCellAt(clientX, clientY);
      if (!cell) return;
      var ok = canPlace(this._grid, this._drag.shape, cell.r, cell.c);
      var board = document.getElementById("dc-wb-board");
      if (!board) return;
      var i;
      for (i = 0; i < this._drag.shape.cells.length; i++) {
        var r = cell.r + this._drag.shape.cells[i][0];
        var c = cell.c + this._drag.shape.cells[i][1];
        if (r < 0 || c < 0 || r >= GRID || c >= GRID) continue;
        var el = board.querySelector('.dc-wb-cell[data-r="' + r + '"][data-c="' + c + '"]');
        if (el) el.classList.add(ok ? "preview-ok" : "preview-bad");
      }
    },

    _clearHighlight: function () {
      var cells = document.querySelectorAll(".dc-wb-cell.preview-ok, .dc-wb-cell.preview-bad");
      var i;
      for (i = 0; i < cells.length; i++) {
        cells[i].classList.remove("preview-ok", "preview-bad");
      }
    },

    _tryDrop: function (clientX, clientY) {
      if (!this._drag) return false;
      var cell = this._boardCellAt(clientX, clientY);
      if (!cell) return false;
      return this._placeAt(this._drag.index, cell.r, cell.c, clientX, clientY);
    },

    _placeAt: function (idx, row, col, clientX, clientY) {
      var shape = this._tray[idx];
      if (!shape) return false;
      if (!canPlace(this._grid, shape, row, col)) return false;
      this._grid = placeShape(this._grid, shape, row, col);
      this._score += shape.cells.length;
      this._tray[idx] = null;
      this._selectedIndex = null;

      var clears = findClears(this._grid);
      var lines = clears.rows.length + clears.cols.length;
      if (lines > 0) {
        this._combo++;
        var bonus = lines * 10 + (lines > 1 ? lines * 5 : 0) + this._combo * 2;
        this._score += bonus;
        this._grid = applyClears(this._grid, clears);
        if (typeof DCSound !== "undefined" && DCSound.suitClear) DCSound.suitClear();
        if (typeof DCFX !== "undefined" && DCFX.burstConfetti) DCFX.burstConfetti(12 + lines * 8, true);
        if (typeof DCUI !== "undefined" && DCUI._showToast) {
          var msg = lines === 1 ? "Line clear!" : lines + " lines — gorgeous!";
          DCUI._showToast(msg, "combo");
        }
      } else {
        this._combo = 0;
      }

      if (this._tray.every(function (s) { return !s; })) {
        this._tray = [randomShape(), randomShape(), randomShape()];
      }

      this._paintBoard();
      this._paintTray();
      if (lines > 0) {
        this._flashClears(clears);
      }
      this._updateScore();

      if (gameOver(this._grid, this._tray)) {
        this._endGame();
      } else if (typeof DCSound !== "undefined" && DCSound.cardPlace) {
        DCSound.cardPlace();
      }
      return true;
    },

    _flashClears: function (clears) {
      var board = document.getElementById("dc-wb-board");
      if (!board) return;
      var i;
      for (i = 0; i < clears.rows.length; i++) {
        var rowCells = board.querySelectorAll('.dc-wb-cell[data-r="' + clears.rows[i] + '"]');
        var j;
        for (j = 0; j < rowCells.length; j++) rowCells[j].classList.add("clear-flash");
      }
      for (i = 0; i < clears.cols.length; i++) {
        var colCells = board.querySelectorAll('.dc-wb-cell[data-c="' + clears.cols[i] + '"]');
        for (j = 0; j < colCells.length; j++) colCells[j].classList.add("clear-flash");
      }
      setTimeout(function () {
        var flash = document.querySelectorAll(".dc-wb-cell.clear-flash");
        for (var k = 0; k < flash.length; k++) flash[k].classList.remove("clear-flash");
      }, 420);
    },

    _updateScore: function () {
      var el = document.getElementById("dc-wb-score");
      if (el) {
        el.textContent = String(this._score);
        el.classList.remove("dc-hud-bump");
        void el.offsetWidth;
        el.classList.add("dc-hud-bump");
      }
      if (this._score > this._best) {
        this._best = this._score;
        var bestEl = document.getElementById("dc-wb-best");
        if (bestEl) bestEl.textContent = String(this._best);
        this._saveBest();
      }
    },

    _endGame: function () {
      this._saveBest();
      var over = document.getElementById("dc-wb-over");
      var scoreEl = document.getElementById("dc-wb-over-score");
      if (scoreEl) scoreEl.textContent = String(this._score);
      if (over) over.classList.remove("hidden");
      if (typeof DCSound !== "undefined" && DCSound.milestone) DCSound.milestone();
      else if (typeof DCSound !== "undefined" && DCSound.cardPlace) DCSound.cardPlace();
      if (typeof DCFX !== "undefined" && DCFX.burstConfetti) DCFX.burstConfetti(24, true);
      if (typeof DCUI !== "undefined" && DCUI._showToast) {
        DCUI._showToast("Great run — " + this._score + " points!", "win");
      }
    }
  };

  root.DCWoodblock = WB;
})(this);
