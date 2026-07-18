define(["./solitaire"], function (solitaire) {
    let newGameRun;
    let schedule;
    let schedule_cb;
    let enable_solitairey_ui = true;
    (function () {
        const active = {
            name: "spider1s",
            game: null,
        };
        const yui = YUI({
            base: "js/yui-unpack/yui/build/",
            root: "js/yui-unpack/yui/build/",
            combine: false,
            filter: "min",
        });
        let Y;
        const games = {
            agnes: "Agnes",
            klondike: "Klondike",
            klondike1t: "Klondike1T",
            "flower-garden": "FlowerGarden",
            "forty-thieves": "FortyThieves",
            freecell: "Freecell",
            golf: "Golf",
            "grandfathers-clock": "GClock",
            "monte-carlo": "MonteCarlo",
            pyramid: "Pyramid",
            "russian-solitaire": "RussianSolitaire",
            scorpion: "Scorpion",
            spider: "Spider",
            spider1s: "Spider1S",
            spider2s: "Spider2S",
            spiderette: "Spiderette",
            "tri-towers": "TriTowers",
            "will-o-the-wisp": "WillOTheWisp",
            yukon: "Yukon",
        };
        const extensions = [
            "auto-turnover",
            "statistics",
            // "solver-freecell",
            "solitaire-autoplay",
            // "solitaire-ios"
            // "solitaire-background-fix"
            "solitaire",
        ];
        const Fade = (function () {
            let el = null,
                body;
            const css = {
                    position: "absolute",
                    display: "none",
                    backgroundColor: "#0D2240",
                    opacity: 0.55,
                    top: 0,
                    left: 0,
                    width: 0,
                    height: 0,
                    zIndex: 1000,
                },
                element = function () {
                    if (el === null) {
                        el = Y.Node.create("<div></div>");
                        el.setStyles(css);
                        body = Y.one(".solitairey_body").append(el);
                    }
                    return el;
                };

            return {
                show: function () {
                    const el = element();

                    css.display = "block";
                    css.width = el.get("winWidth");
                    css.height = el.get("winHeight");

                    el.setStyles(css);
                },

                hide: function () {
                    css.display = "none";
                    element().setStyles(css);
                },
            };
        })();
        const GAME_SLUGS = {
            agnes: "agnes",
            klondike: "klondike",
            klondike1t: "klondike-1t",
            "flower-garden": "flower-garden",
            "forty-thieves": "forty-thieves",
            freecell: "freecell",
            golf: "golf",
            "grandfathers-clock": "gclock",
            "monte-carlo": "monte-carlo",
            pyramid: "pyramid",
            "russian-solitaire": "russian",
            scorpion: "scorpion",
            spider: "spider",
            spider1s: "spider-1s",
            spider2s: "spider-2s",
            spiderette: "spiderette",
            "tri-towers": "tri-towers",
            "will-o-the-wisp": "will-o-the-wisp",
            yukon: "yukon",
        };
        const GAMES_WITH_DECK = {
            Klondike: 1, Klondike1T: 1, Agnes: 1,
            Spider: 1, Spider1S: 1, Spider2S: 1, Spiderette: 1,
            Yukon: 1, Canfield: 1, WillOTheWisp: 1,
            MonteCarlo: 1, Pyramid: 1, TriTowers: 1, Golf: 1,
            RussianSolitaire: 1, GClock: 1, FortyThieves: 1, Scorpion: 1,
        };
        let _currentGameClass = "";
        function setGameBodyClass(gameKey) {
            if (_currentGameClass) {
                document.body.classList.remove(_currentGameClass);
            }
            const slug = GAME_SLUGS[gameKey] || gameKey;
            const className = games[gameKey] || gameKey;
            const cls = "game-" + slug;
            document.body.classList.add(cls);
            document.body.classList.toggle("game-has-deck", !!GAMES_WITH_DECK[className]);
            document.body.classList.toggle("game-no-deck", !GAMES_WITH_DECK[className]);
            _currentGameClass = cls;
        }
        function playGame(name) {
            if (typeof DCHub !== "undefined") {
                DCHub.setMode("solitaire", true);
            }
            switchToGame(name);

            try { $.jStorage.set("FossSolitairey_options", name); } catch (e) {}
            newGame();
        }
        function switchToGame(name) {
            active.name = name;
            active.game = Y.Solitaire[games[name]];
            setGameBodyClass(name);
        }
        const GameChooser = {
            selected: null,
            fade: false,
            _scrollLocked: false,
            _lockY: 0,
            _onTouchMove: null,
            _onWheel: null,

            init: function () {
                this.refit();
            },

            refit: function () {
                const node = Y.one("#game-chooser");
                if (!node) {
                    return;
                }
                // Never inflate document height — chooser is a fixed overlay.
                // Clear any legacy min-height from older builds.
                node.setStyle("min-height", "");
                node.setStyle("height", "");
            },

            _isChooserTarget: function (target) {
                if (!target) return false;
                var el = target.nodeType === 1 ? target : target.parentElement;
                if (!el || !el.closest) return false;
                return !!el.closest("#game-chooser");
            },

            _lockBoardScroll: function () {
                if (this._scrollLocked) return;
                this._scrollLocked = true;
                this._lockY = window.scrollY || window.pageYOffset || 0;
                var html = document.documentElement;
                var body = document.body;
                html.classList.add("dc-chooser-open");
                body.classList.add("dc-chooser-open");
                body.classList.add("scrollable");
                // Freeze the document so iOS rubber-band cannot drag the felt.
                body.style.position = "fixed";
                body.style.top = "-" + this._lockY + "px";
                body.style.left = "0";
                body.style.right = "0";
                body.style.width = "100%";
                html.style.overflow = "hidden";
                body.style.overflow = "hidden";
                try {
                    window.scrollTo(0, 0);
                } catch (e) {}

                var self = this;
                this._onTouchMove = function (e) {
                    // Allow pan only inside the chooser overlay; block everything else.
                    if (!self._isChooserTarget(e.target)) {
                        e.preventDefault();
                        return;
                    }
                    // At chooser scroll edges, stop chaining to the document.
                    var chooser = document.getElementById("game-chooser");
                    if (!chooser) return;
                    var t = e.target && e.target.closest
                        ? e.target.closest("#game-chooser")
                        : chooser;
                    if (t !== chooser && !chooser.contains(e.target)) {
                        e.preventDefault();
                    }
                };
                this._onWheel = function (e) {
                    if (!self._isChooserTarget(e.target)) {
                        e.preventDefault();
                    }
                };
                document.addEventListener("touchmove", this._onTouchMove, {
                    passive: false,
                    capture: true,
                });
                document.addEventListener("wheel", this._onWheel, {
                    passive: false,
                    capture: true,
                });
            },

            _unlockBoardScroll: function () {
                if (!this._scrollLocked) return;
                this._scrollLocked = false;
                var html = document.documentElement;
                var body = document.body;
                html.classList.remove("dc-chooser-open");
                body.classList.remove("dc-chooser-open");
                body.classList.remove("scrollable");
                body.style.position = "";
                body.style.top = "";
                body.style.left = "";
                body.style.right = "";
                body.style.width = "";
                html.style.overflow = "";
                body.style.overflow = "";
                if (this._onTouchMove) {
                    document.removeEventListener("touchmove", this._onTouchMove, {
                        capture: true,
                    });
                    this._onTouchMove = null;
                }
                if (this._onWheel) {
                    document.removeEventListener("wheel", this._onWheel, {
                        capture: true,
                    });
                    this._onWheel = null;
                }
                try {
                    window.scrollTo(0, this._lockY || 0);
                    document.documentElement.scrollTop = 0;
                    document.body.scrollTop = 0;
                } catch (e) {}
                this._lockY = 0;
            },

            _scrollChooserTo: function (li) {
                var chooser = document.getElementById("game-chooser");
                if (!chooser || !li) return;
                // Scroll ONLY the chooser overlay — never Element.scrollIntoView
                // (that walks ancestors and can yank the solitaire board).
                try {
                    var chooserRect = chooser.getBoundingClientRect();
                    var liRect = li.getBoundingClientRect();
                    var pad = 16;
                    if (liRect.top < chooserRect.top + pad) {
                        chooser.scrollTop += liRect.top - chooserRect.top - pad;
                    } else if (liRect.bottom > chooserRect.bottom - pad) {
                        chooser.scrollTop += liRect.bottom - chooserRect.bottom + pad;
                    }
                } catch (e) {
                    /* ignore */
                }
            },

            show: function (fade) {
                if (!this.selected) {
                    this.select(active.name);
                }

                if (fade) {
                    Fade.show();
                    this.fade = true;
                }

                // Coach tip card sits above the chooser — dismiss so it cannot block Play.
                var coach = document.getElementById("dc-coach");
                if (coach) {
                    try {
                        localStorage.setItem("doccards_coach_seen", "1");
                    } catch (e) {}
                    coach.remove();
                }

                this._lastTouchSelect = null;
                var chooser = Y.one("#game-chooser");
                chooser.addClass("show");
                // Reset overlay scroll; do not touch document scroll for content.
                try {
                    var node = document.getElementById("game-chooser");
                    if (node) node.scrollTop = 0;
                } catch (e) {}
                this._lockBoardScroll();
                this.refit();
                if (typeof DCHub !== "undefined" && DCHub.onChooserOpen) {
                    DCHub.onChooserOpen();
                }
            },

            hide: function () {
                if (this.fade) {
                    Fade.hide();
                }

                Y.one("#game-chooser").removeClass("show");
                Y.fire("gamechooser:hide", this);
                this._unlockBoardScroll();
            },

            choose: function () {
                if (!this.selected) {
                    return;
                }

                this.hide();
                playGame(this.selected);
            },

            select: function (game) {
                const previous = this.selected;
                const li = document.getElementById(game);

                if (!game || !li) {
                    return;
                }

                if (previous !== game) {
                    this.unSelect();
                }

                this.selected = game;
                li.classList.add("selected");
                this._scrollChooserTo(li);

                if (previous && previous !== game) {
                    Y.fire("gamechooser:select", this);
                }
            },

            unSelect: function () {
                if (!this.selected) {
                    return;
                }

                const el = document.getElementById(this.selected);
                if (el) {
                    el.classList.remove("selected");
                }
                this.selected = null;
            },
        };

        function modules() {
            const modules = extensions.slice();

            for (const m in games) {
                if (games.hasOwnProperty(m)) {
                    modules.unshift(m);
                }
            }

            return modules;
        }
        /* theres no mechanism yet to load the appropriate deck depending on the scaled card width
         * so we just load the 122x190 cards and call it a day :/
         */
        const Themes = {
            dondorf: {
                sizes: [61, 79, 95, 122, 244],
                61: {
                    hiddenRankHeight: 7,
                    rankHeight: 25,
                    dimensions: [61, 95],
                },

                79: {
                    hiddenRankHeight: 10,
                    rankHeight: 32,
                    dimensions: [79, 123],
                },

                95: {
                    hiddenRankHeight: 12,
                    rankHeight: 38,
                    dimensions: [95, 148],
                },

                122: {
                    hiddenRankHeight: 15,
                    rankHeight: 48,
                    dimensions: [122, 190],
                },

                // 2× retina masters — sharper on iPhone/iPad after layout scale
                244: {
                    hiddenRankHeight: 30,
                    rankHeight: 96,
                    dimensions: [244, 380],
                },
            },

            load: function (name) {
                const Solitaire = Y.Solitaire,
                    base = Solitaire.Card.base;

                if (!(name in this)) {
                    name = "dondorf";
                }

                if (base.theme !== name) {
                    this.set(name, 122);
                }
            },

            set: function (name, size) {
                const theme = this[name][size];

                Y.mix(
                    Y.Solitaire.Card.base,
                    {
                        theme: name + "/" + size,
                        hiddenRankHeight: theme.hiddenRankHeight,
                        rankHeight: theme.rankHeight,
                        width: theme.dimensions[0],
                        height: theme.dimensions[1],
                    },
                    true,
                );
            },
        };

        function loadOptions() {
             var params = new URLSearchParams(window.location.search || "");
             var fromQuery = params.get("game");
             if (fromQuery && games[fromQuery]) {
                 active.name = fromQuery;
             } else {
                 var saved = null;
                 try { saved = localStorage.getItem("FossSolitairey_options"); } catch (e) {}
                 if (saved) {
                     try { saved = JSON.parse(saved); } catch (e) { saved = null; }
                 }
                 if (saved && games[saved]) {
                     active.name = saved;
                 }
             }

             Themes.load("dondorf");
         }

        function confirmDestructive(message, onConfirm) {
            var moves = 0;
            try {
                if (typeof DCUI !== "undefined" && DCUI._moveCount) {
                    moves = DCUI._moveCount;
                }
            } catch (e) {}
            if (moves <= 0) {
                onConfirm();
                return;
            }
            if (typeof DCUI !== "undefined" && DCUI.confirmAction) {
                DCUI.confirmAction(message, onConfirm);
                return;
            }
            if (window.confirm(message)) {
                onConfirm();
            }
        }
        function attachResize() {
            let timer;
            const delay = 250;
            let attachEvent;

            if (window.addEventListener) {
                attachEvent = "addEventListener";
            } else if (window.attachEvent) {
                attachEvent = "attachEvent";
            }

            window[attachEvent](
                Y.Solitaire.Application.resizeEvent,
                function () {
                    clearTimeout(timer);
                    timer = setTimeout(resize, delay);
                },
                false,
            );
        }
        function attachEvents() {
            Y.on("newAppGame", function () {
                return newGame();
            });
            Y.on("click", function () {
                confirmDestructive("Restart this hand from the beginning?", restart);
            }, Y.one("#restart"));
            Y.on(
                "click",
                function () {
                    GameChooser.show(false);
                },
                Y.one("#choose_game"),
            );
            Y.on("click", function () {
                confirmDestructive("Deal a brand-new hand? Your current progress will be lost.", newGame);
            }, Y.one("#new_deal"));
            Y.on(
                "click",
                function () {
                    GameChooser.hide();
                },
                Y.one("#close-chooser"),
            );
            Y.on(
                "click",
                    function () {
                        if (typeof DCUI !== "undefined") DCUI._undoing = true;
                        active.game.undo();
                    },
                    Y.one("#undo"),
            );

            function hideChromeStoreLink() {
                const chromestore = Y.one(".chromestore");
                if (chromestore) {
                    chromestore.addClass("hidden");
                }
            }
            Y.on("click", hideChromeStoreLink, Y.one(".chromestore"));

            function expandDescription(e) {
                var target = e.target && e.target._node ? e.target._node : e.target;
                if (target && target.classList && target.classList.contains("choose")) {
                    return;
                }
                if (target && target.closest && target.closest("button.choose")) {
                    return;
                }
                if (target && target.closest && target.closest(".fav-star")) {
                    return;
                }
                var id = e.currentTarget._node.id;
                GameChooser.select(id);
                GameChooser.choose();
            }
            function playFromChooser(e) {
                e.halt();
                var li = e.currentTarget.ancestor("li");
                if (li) {
                    GameChooser.select(li.get("id"));
                    GameChooser.choose();
                }
            }
            Y.delegate("click", expandDescription, "#descriptions", "li");
            Y.delegate("click", playFromChooser, "#descriptions", "button.choose");
            Y.one("document").on("keydown", function (e) {
                e.keyCode === 27 && GameChooser.hide();
            });

            Y.on("afterSetup", function () {
                active.game.stationary(function () {
                    resize();
                });
            });

            attachResize();
        }
        const Preloader = {
            loadingCount: 0,

            loaded: function (callback) {
                if (this.loadingCount) {
                    setTimeout(
                        function () {
                            this.loaded(callback);
                        }.bind(this),
                        100,
                    );
                } else {
                    const loading = Y.one(".loading");
                    if (loading) {
                        loading.addClass("hidden");
                    }
                    const boot = document.getElementById("dc-boot");
                    if (boot) {
                        boot.setAttribute("aria-busy", "false");
                        const status = boot.querySelector(".dc-boot-status");
                        if (status) status.textContent = "Ready";
                        boot.classList.add("dc-boot-done");
                        setTimeout(function () {
                            if (boot.parentNode) boot.parentNode.removeChild(boot);
                        }, 320);
                    }
                    callback();
                    Fade.hide();
                    try {
                        window.scrollTo(0, 0);
                    } catch (e) {}
                }
            },

            load: function (path) {
                const image = new Image();
                const done = function () {
                    --this.loadingCount;
                }.bind(this);

                image.onload = done;
                image.onerror = done;
                image.src = path;

                this.loadingCount++;
            },

            preload: function () {
                const that = this;
                let rank;
                const icons = [
                    "agnes",
                    "flower-garden",
                    "forty-thieves",
                    "freecell",
                    "gclock",
                    "golf",
                    "klondike1t",
                    "klondike",
                    "montecarlo",
                    "pyramid",
                    "scorpion",
                    "spider1s",
                    "spider2s",
                    "spiderette",
                    "spider",
                    "tritowers",
                    "will-o-the-wisp",
                    "yukon",
                ];

                ["s", "h", "c", "d"].forEach(function (suit) {
                    for (let rank = 1; rank <= 13; ++rank) {
                        that.load(
                            Y.Solitaire.Card.base.theme +
                                "/" +
                                suit +
                                rank +
                                ".png",
                        );
                    }
                });

                this.load(Y.Solitaire.Card.base.theme + "/facedown.png");
                this.load(Y.Solitaire.Card.base.theme + "/freeslot.png");

                if (enable_solitairey_ui) {
                    icons.forEach(function (image) {
                        that.load("layouts/mini/" + image + ".png");
                    });
                }

                // Boot overlay (#dc-boot) is the branded loading UI.
                Fade.show();
                const loading = Y.one(".loading");
                if (loading) {
                    loading.addClass("hidden");
                }
            },
        };
        function pickThemeSize() {
            var minDim = Math.min(window.innerWidth, window.innerHeight);
            var dpr = window.devicePixelRatio || 1;
            var effective = minDim * Math.min(dpr, 3);
            var bigCards = false;
            try {
                bigCards = localStorage.getItem("doccards_big_cards") === "true";
            } catch (e) {}
            // Prefer larger bitmaps on retina so cards stay sharp when layout-scaled.
            // Never use 61 on modern displays — soft and muddy on iPhone/iPad.
            var size = 122;
            if (dpr >= 2 && minDim >= 700) {
                // iPad / large tablets: 2× masters
                size = 244;
            } else if (dpr >= 2) {
                // iPhone / retina phones
                size = bigCards ? 244 : 122;
            } else if (minDim < 500) {
                size = bigCards ? 95 : 79;
            } else if (minDim < 900) {
                size = bigCards ? 122 : 95;
            } else {
                size = bigCards ? 244 : 122;
            }
            Themes.set("dondorf", size);
            if (typeof Logger !== "undefined") {
                Logger.info("auto_scale", {
                    size: size,
                    bigCards: bigCards,
                    minDim: minDim,
                    dpr: dpr,
                    effective: effective,
                });
            }
            return size;
        }

         function _my_load_func() {
            attachEvents();
            loadOptions();
            pickThemeSize();

            Preloader.preload();
            Preloader.loaded(function () {
                playGame(active.name);
                if (typeof DCUI !== "undefined" && DCUI.afterGameReady) {
                    DCUI.afterGameReady();
                }
            });

            GameChooser.init();
            if (schedule_cb) {
                schedule_cb(Y);
            }
        }

        function main(YUI) {
            Y = YUI;
            window.Y = Y;
            if (Y.Solitaire) {
                Y.Solitaire.offset = Y.Solitaire.offset || { left: 40, top: 70 };
                // Layout origin below header+menu (do NOT also put this in padding.y).
                Y.Solitaire.offset.top = 108;
                Y.Solitaire.padding = Y.Solitaire.padding || { x: 40, y: 50 };
                // Bottom chrome only (FABs / footer) — not another header clearance.
                Y.Solitaire.padding.y = 72;
            }
            exportAPI();
            Y.on("domready", _my_load_func);
        }

        function resize() {
            const game = active.game;
            const el = game.container();
            var padding = { x: Y.Solitaire.padding.x, y: Y.Solitaire.padding.y };
            var offset = {
                left: Y.Solitaire.offset.left,
                top: Y.Solitaire.offset.top,
            };
            var winW = el.get("winWidth");
            var winH = el.get("winHeight");
            var footerEl = document.getElementById("site-footer");
            var footerVisible = footerEl && footerEl.offsetParent !== null;
            // Bottom reserve: FAB bar (~56) + optional footer (~40)
            var bottomChrome = footerVisible ? 96 : 68;
            padding.y = Math.max(padding.y, bottomChrome);
            // Narrow phones: tighten side gutters so all columns fit.
            if (winW < 520) {
                padding.x = 8;
                offset.left = 8;
                Y.Solitaire.offset.left = 8;
                Y.Solitaire.padding.x = 8;
            }
            var width = winW - padding.x;
            var height = winH - padding.y;

            Y.Solitaire.Application.windowHeight = height;
            var ratio = Math.min(
                (width - offset.left) / game.width(),
                (height - offset.top) / game.height(),
            );
            // Small safety margin so the rightmost column isn't clipped
            // by rounded device bezels / subpixel rounding.
            if (winW < 520 && ratio > 0 && Number.isFinite(ratio)) {
                ratio *= 0.96;
            }

            active.game.resize(ratio);
            GameChooser.refit();
            try {
                window.scrollTo(0, 0);
            } catch (e) {}
        }

        function clearDOM() {
            Y.all(".stack, .card").remove();
        }

        function restart() {
            var init = null;
            try { init = $.jStorage.get("initial-game"); } catch (e) {}

            if (init) {
                clearDOM();
                var game = active.game;
                game.cleanup();
                game.loadGame(init);
            }
        }
        function clearGame() {
            const game = active.game;

            clearDOM();
            game.cleanup();
        }

        function newGame() {
            clearGame();
            active.game.newGame();
        }
        newGameRun = function () {
            playGame("freecell");
        };

        function exportAPI() {
            Y.on("newGameRun", newGameRun);
            Y.Solitaire.Application = {
                windowHeight: 0,
                resizeEvent: "resize",
                GameChooser: GameChooser,
                newGame: newGame,
                clearDOM: clearGame,
                switchToGame: switchToGame,
                Themes: Themes,
                pickThemeSize: pickThemeSize,
                activeName: function () { return active.name; },
            };
        }
        schedule = function (cb) {
            schedule_cb = cb;
        };

        yui.use.apply(yui, modules().concat(main));
        // Freecell solver is registered via AMD in index.html (deferred).
        // Do not yui.use it here — that logs "NOT loaded: solver-freecell".
    })();

    return {
        schedule: schedule,
        newGameRun: newGameRun,
        setUI: (v) => {
            enable_solitairey_ui = v;
            return;
        },
    };
});
