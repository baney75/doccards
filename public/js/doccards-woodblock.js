(function (root) {
  "use strict";

  // Classic Wood Block Puzzle (woodblockpuzzle.com / 1010! style): 10×10 grid,
  // three polyomino pieces, drag onto board, clear full rows/columns, no rotation.
  var GRID = 10;
  var BEST_KEY = "doccards_woodblock_best";
  var SCORE_KEY = "doccards_woodblock_last";
  var STATE_KEY = "doccards_woodblock_state";

  var WOOD_TONES = [
    "#C9A66B", "#B8894A", "#A67C52", "#8B6914",
    "#9C7A4A", "#D4A574", "#7A5230", "#BC8F5E",
    "#CD853F", "#DEB887"
  ];

  var SHAPES = [
    { id: "1", cells: [[0, 0]] },
    { id: "2h", cells: [[0, 0], [0, 1]] },
    { id: "2v", cells: [[0, 0], [1, 0]] },
    { id: "3h", cells: [[0, 0], [0, 1], [0, 2]] },
    { id: "3v", cells: [[0, 0], [1, 0], [2, 0]] },
    { id: "4h", cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { id: "4v", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
    { id: "5h", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
    { id: "5v", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
    { id: "sq", cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
    { id: "sq3", cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
    { id: "L", cells: [[0, 0], [1, 0], [2, 0], [2, 1]] },
    { id: "L2", cells: [[0, 1], [1, 1], [2, 0], [2, 1]] },
    { id: "L3", cells: [[0, 0], [0, 1], [1, 0], [2, 0]] },
    { id: "L4", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
    { id: "T", cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
    { id: "T2", cells: [[0, 1], [1, 0], [1, 1], [1, 2]] },
    { id: "Z", cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
    { id: "S", cells: [[0, 1], [0, 2], [1, 0], [1, 1]] }
  ];

  // Weighted pool — large pieces appear less often (classic feel).
  var SHAPE_WEIGHTS = {
    "1": 4, "2h": 5, "2v": 5, "3h": 4, "3v": 4,
    "4h": 3, "4v": 3, "5h": 1, "5v": 1,
    "sq": 4, "sq3": 1,
    "L": 3, "L2": 3, "L3": 3, "L4": 3,
    "T": 3, "T2": 3, "Z": 3, "S": 3
  };

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

  function shapeBounds(shape) {
    var minR = 999;
    var minC = 999;
    var maxR = 0;
    var maxC = 0;
    var i;
    for (i = 0; i < shape.cells.length; i++) {
      var r = shape.cells[i][0];
      var c = shape.cells[i][1];
      if (r < minR) minR = r;
      if (c < minC) minC = c;
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    }
    return {
      minR: minR,
      minC: minC,
      maxR: maxR,
      maxC: maxC,
      rows: maxR - minR + 1,
      cols: maxC - minC + 1,
      anchorR: (minR + maxR) / 2,
      anchorC: (minC + maxC) / 2
    };
  }

  function randomWoodColor() {
    return WOOD_TONES[Math.floor(Math.random() * WOOD_TONES.length)];
  }

  function randomShape() {
    var total = 0;
    var i;
    for (i = 0; i < SHAPES.length; i++) {
      total += SHAPE_WEIGHTS[SHAPES[i].id] || 1;
    }
    var pick = Math.random() * total;
    for (i = 0; i < SHAPES.length; i++) {
      pick -= SHAPE_WEIGHTS[SHAPES[i].id] || 1;
      if (pick <= 0) {
        var base = SHAPES[i];
        return {
          id: base.id,
          cells: base.cells,
          color: randomWoodColor()
        };
      }
    }
    var fallback = SHAPES[0];
    return { id: fallback.id, cells: fallback.cells, color: randomWoodColor() };
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

  function originFromTopLeft(shape, row, col) {
    var b = shapeBounds(shape);
    return { row: row - b.minR, col: col - b.minC };
  }

  /** Snap like woodblockpuzzle.com: anchor to touched cell, try neighbors if blocked. */
  function findBestOrigin(grid, shape, cellR, cellC) {
    var offsets = [
      [0, 0], [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];
    var i;
    for (i = 0; i < offsets.length; i++) {
      var origin = originFromTopLeft(shape, cellR + offsets[i][0], cellC + offsets[i][1]);
      if (canPlace(grid, shape, origin.row, origin.col)) return origin;
    }
    return null;
  }

  var WB = {
    _mounted: false,
    _shellBuilt: false,
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
    _suppressClick: false,

    mount: function (rootEl) {
      if (!rootEl) return;
      this._root = rootEl;
      // Hub clears the root between modes; always rebuild shell if missing.
      this._shellBuilt = false;
      if (!this._mounted) {
        this._mounted = true;
        this._best = this._loadBest();
        if (!this._loadState()) {
          this._grid = emptyGrid();
          this._score = 0;
          this._combo = 0;
          this._tray = [randomShape(), randomShape(), randomShape()];
        }
      }
      // Defer paint to resume() when paused so shell is built once after unpause.
      if (!this._paused) {
        this._buildShell();
        this._paintBoard();
        this._paintTray();
        this._updateScore(true);
      }
    },

    pause: function () {
      this._paused = true;
    },

    resume: function () {
      this._paused = false;
      if (this._mounted && this._root) {
        if (!this._shellBuilt) this._buildShell();
        this._paintBoard();
        this._paintTray();
        this._updateScore(true);
      }
    },

    newGame: function (playSound) {
      this._grid = emptyGrid();
      this._score = 0;
      this._combo = 0;
      this._tray = [randomShape(), randomShape(), randomShape()];
      this._selectedIndex = null;
      if (this._root && !this._paused) {
        if (!this._shellBuilt) this._buildShell();
        this._paintBoard();
        this._paintTray();
        this._updateScore(true);
        this._saveState();
      } else if (this._root) {
        this._saveState();
      }
      if (playSound !== false && typeof DCSound !== "undefined" && DCSound.deal) DCSound.deal();
    },

    _loadState: function () {
      try {
        var raw = localStorage.getItem(STATE_KEY);
        if (!raw) return false;
        var data = JSON.parse(raw);
        if (!data || !data.grid) return false;
        this._grid = data.grid;
        this._score = data.score || 0;
        this._combo = data.combo || 0;
        this._tray = data.tray || [randomShape(), randomShape(), randomShape()];
        return true;
      } catch (e) {
        return false;
      }
    },

    _saveState: function () {
      try {
        localStorage.setItem(STATE_KEY, JSON.stringify({
          grid: this._grid,
          score: this._score,
          combo: this._combo,
          tray: this._tray
        }));
      } catch (e) {}
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

    _buildShell: function () {
      if (!this._root) return;
      var self = this;
      this._root.innerHTML =
        '<div class="dc-wb-shell">' +
        '<div class="dc-wb-top">' +
        '<div class="dc-wb-stat"><span class="dc-wb-stat-label">Score</span><span class="dc-wb-stat-val" id="dc-wb-score">' + this._score + "</span></div>" +
        '<div class="dc-wb-stat"><span class="dc-wb-stat-label">Best</span><span class="dc-wb-stat-val" id="dc-wb-best">' + this._best + "</span></div>" +
        '<button type="button" class="doccards-btn doccards-btn-secondary dc-wb-games" id="dc-wb-games">Games</button>' +
        '<button type="button" class="doccards-btn doccards-btn-secondary dc-wb-new" id="dc-wb-new">New</button>' +
        "</div>" +
        '<p class="dc-wb-hint">Drag blocks onto the 10×10 board · or tap a block, then tap where it should go</p>' +
        '<div class="dc-wb-board-wrap"><div class="dc-wb-board" id="dc-wb-board" role="grid" aria-label="10 by 10 wood block grid"></div></div>' +
        '<div class="dc-wb-tray" id="dc-wb-tray" role="group" aria-label="Three block pieces"></div>' +
        '<div class="dc-wb-over hidden" id="dc-wb-over" role="dialog" aria-modal="true" aria-labelledby="dc-wb-over-title">' +
        '<div class="dc-wb-over-card">' +
        '<p class="dc-wb-over-title" id="dc-wb-over-title">No room left!</p>' +
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
      this._shellBuilt = true;
      this._bindBoardTap();
    },

    _bindBoardTap: function () {
      var board = document.getElementById("dc-wb-board");
      if (!board || board._dcTapBound) return;
      board._dcTapBound = true;
      var self = this;
      board.addEventListener("click", function (e) {
        if (self._suppressClick) {
          self._suppressClick = false;
          return;
        }
        self._handleBoardTap(e.target, false);
      });
      board.addEventListener("touchend", function (e) {
        if (self._drag) return;
        if (!e.changedTouches || !e.changedTouches[0]) return;
        var t = e.changedTouches[0];
        var el = document.elementFromPoint(t.clientX, t.clientY);
        self._suppressClick = true;
        self._handleBoardTap(el, false);
      });
    },

    _handleBoardTap: function (target, fromDrag) {
      var cell = target && target.closest ? target.closest(".dc-wb-cell") : null;
      if (!cell || this._selectedIndex === null) return;
      var r = parseInt(cell.getAttribute("data-r"), 10);
      var c = parseInt(cell.getAttribute("data-c"), 10);
      if (isNaN(r) || isNaN(c)) return;
      var shape = this._tray[this._selectedIndex];
      if (!shape) return;
      var origin = findBestOrigin(this._grid, shape, r, c);
      if (!origin) {
        if (!fromDrag && typeof DCPuzzle !== "undefined" && DCPuzzle.feedbackInvalid) {
          DCPuzzle.feedbackInvalid();
        }
        return;
      }
      this._placeAt(this._selectedIndex, origin.row, origin.col);
    },

    _selectTray: function (index) {
      this._selectedIndex = index;
      var slots = document.querySelectorAll(".dc-wb-tray-slot");
      var i;
      for (i = 0; i < slots.length; i++) {
        slots[i].classList.toggle("selected", parseInt(slots[i].dataset.index, 10) === index);
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
          html += '<div class="dc-wb-cell' + (filled ? " filled wood-block" : "") + '" data-r="' + r + '" data-c="' + c + '"' +
            (filled ? ' style="--wb-block:' + filled + ';"' : "") + "></div>";
        }
      }
      board.innerHTML = html;
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
        var dims = shapeBounds(shape);
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
              if (shape.cells[k][0] - dims.minR === r && shape.cells[k][1] - dims.minC === c) {
                hit = true;
                break;
              }
            }
            if (hit) {
              cell.classList.add("on", "wood-block");
              cell.style.setProperty("--wb-block", shape.color);
            }
            mini.appendChild(cell);
          }
        }
        slot.appendChild(mini);
        this._bindDrag(slot, shape, i);
        tray.appendChild(slot);
      }
    },

    _makeGhost: function (shape) {
      var ghost = document.createElement("div");
      ghost.className = "dc-wb-ghost";
      ghost.id = "dc-wb-ghost";
      var dims = shapeBounds(shape);
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
            if (shape.cells[k][0] - dims.minR === r && shape.cells[k][1] - dims.minC === c) {
              hit = true;
              break;
            }
          }
          if (hit) {
            cell.classList.add("on", "wood-block");
            cell.style.setProperty("--wb-block", shape.color);
          }
          ghost.appendChild(cell);
        }
      }
      return ghost;
    },

    _bindDrag: function (slot, shape, index) {
      var self = this;
      var dragThreshold = 12;

      var startDrag = function (clientX, clientY) {
        if (self._drag) return;
        self._drag = { shape: shape, index: index };
        self._selectedIndex = null;
        var slots = document.querySelectorAll(".dc-wb-tray-slot");
        var si;
        for (si = 0; si < slots.length; si++) slots[si].classList.remove("selected");

        var ghost = self._makeGhost(shape);
        document.body.appendChild(ghost);
        var shell = document.querySelector(".dc-wb-shell");
        if (shell) {
          var cellPx = getComputedStyle(shell).getPropertyValue("--wb-cell").trim() || "32px";
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
        var onBoard = false;
        if (wasDrag) {
          onBoard = !!self._boardPointerCell(clientX, clientY);
          placed = self._tryDrop(clientX, clientY);
        }
        if (self._ghost && self._ghost.parentNode) self._ghost.parentNode.removeChild(self._ghost);
        self._ghost = null;
        self._clearHighlight();
        slot.classList.remove("dragging");
        self._drag = null;
        if (wasDrag && !placed && onBoard && typeof DCPuzzle !== "undefined" && DCPuzzle.feedbackInvalid) {
          DCPuzzle.feedbackInvalid();
        }
      };

      slot.addEventListener("mousedown", function (e) {
        e.preventDefault();
        var mouseStartX = e.clientX;
        var mouseStartY = e.clientY;
        var mouseDragging = false;
        var onMove = function (ev) {
          if (!mouseDragging) {
            var dx = ev.clientX - mouseStartX;
            var dy = ev.clientY - mouseStartY;
            if (dx * dx + dy * dy < dragThreshold * dragThreshold) return;
            mouseDragging = true;
            startDrag(ev.clientX, ev.clientY);
          } else {
            moveDrag(ev.clientX, ev.clientY);
          }
        };
        var onUp = function (ev) {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          if (mouseDragging) endDrag(ev.clientX, ev.clientY, true);
          else self._selectTray(index);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });

      var touchStartX = 0;
      var touchStartY = 0;
      var touchDragging = false;

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
    },

    _moveGhost: function (x, y) {
      if (!this._ghost) return;
      // Keep the piece above the finger so Grandpa can see the drop target.
      this._ghost.style.left = x + "px";
      this._ghost.style.top = (y - 52) + "px";
    },

    _boardPointerCell: function (clientX, clientY) {
      var board = document.getElementById("dc-wb-board");
      if (typeof DCPuzzle !== "undefined" && DCPuzzle.pointerCell) {
        return DCPuzzle.pointerCell(board, clientX, clientY, ".dc-wb-cell", GRID);
      }
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

    _originForPointer: function (shape, ptr) {
      if (!ptr) return null;
      return findBestOrigin(this._grid, shape, ptr.r, ptr.c);
    },

    _highlightDrop: function (clientX, clientY) {
      this._clearHighlight();
      if (!this._drag) return;
      var ptr = this._boardPointerCell(clientX, clientY);
      if (!ptr) return;
      var origin = findBestOrigin(this._grid, this._drag.shape, ptr.r, ptr.c);
      var board = document.getElementById("dc-wb-board");
      if (!board) return;
      if (!origin) {
        var i;
        for (i = 0; i < this._drag.shape.cells.length; i++) {
          var br = ptr.r + this._drag.shape.cells[i][0];
          var bc = ptr.c + this._drag.shape.cells[i][1];
          if (br < 0 || bc < 0 || br >= GRID || bc >= GRID) continue;
          var bad = board.querySelector('.dc-wb-cell[data-r="' + br + '"][data-c="' + bc + '"]');
          if (bad) bad.classList.add("preview-bad");
        }
        return;
      }
      var j;
      for (j = 0; j < this._drag.shape.cells.length; j++) {
        var r = origin.row + this._drag.shape.cells[j][0];
        var c = origin.col + this._drag.shape.cells[j][1];
        if (r < 0 || c < 0 || r >= GRID || c >= GRID) continue;
        var el = board.querySelector('.dc-wb-cell[data-r="' + r + '"][data-c="' + c + '"]');
        if (el) el.classList.add("preview-ok");
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
      var ptr = this._boardPointerCell(clientX, clientY);
      if (!ptr) return false;
      var origin = findBestOrigin(this._grid, this._drag.shape, ptr.r, ptr.c);
      if (!origin) return false;
      return this._placeAt(this._drag.index, origin.row, origin.col);
    },

    _placeAt: function (idx, row, col) {
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
        var lineBonus = lines * GRID;
        if (lines > 1) lineBonus += (lines - 1) * GRID;
        this._score += lineBonus + this._combo * 3;
        this._grid = applyClears(this._grid, clears);
        if (typeof DCSound !== "undefined" && DCSound.suitClear) DCSound.suitClear();
        if (typeof DCFX !== "undefined" && DCFX.burstConfetti) DCFX.burstConfetti(12 + lines * 8, true);
        if (typeof DCUI !== "undefined" && DCUI._showToast) {
          var msg = lines === 1 ? "Line clear!" : lines + " lines — beautiful!";
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
      } else {
        this._saveState();
        if (typeof DCSound !== "undefined" && DCSound.cardPlace) DCSound.cardPlace();
      }
      return true;
    },

    _flashClears: function (clears) {
      var board = document.getElementById("dc-wb-board");
      if (!board) return;
      var i;
      var j;
      for (i = 0; i < clears.rows.length; i++) {
        var rowCells = board.querySelectorAll('.dc-wb-cell[data-r="' + clears.rows[i] + '"]');
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

    _updateScore: function (skipAnim) {
      var el = document.getElementById("dc-wb-score");
      if (el) {
        el.textContent = String(this._score);
        if (!skipAnim) {
          el.classList.remove("dc-hud-bump");
          void el.offsetWidth;
          el.classList.add("dc-hud-bump");
        }
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
      try { localStorage.removeItem(STATE_KEY); } catch (e) {}
      var over = document.getElementById("dc-wb-over");
      var scoreEl = document.getElementById("dc-wb-over-score");
      if (scoreEl) scoreEl.textContent = String(this._score);
      if (over) over.classList.remove("hidden");
      var retry = document.getElementById("dc-wb-retry");
      if (retry && retry.focus) {
        setTimeout(function () { retry.focus(); }, 50);
      }
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
