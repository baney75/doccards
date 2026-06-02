define(["./solitaire"], function (solitaire) {
    let newGameRun;
    let schedule;
    let schedule_cb;
    let enable_solitairey_ui = true;
    (function () {
        const active = {
            name: "freecell", // name: "klondike",
            game: null,
        };
        const yui = YUI({ base: "js/yui-unpack/yui/build/" });
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
                    backgroundColor: "#000",
                    opacity: 0.7,
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
            const cls = "game-" + slug;
            document.body.classList.add(cls);
            document.body.classList.toggle("game-has-deck", !!GAMES_WITH_DECK[gameKey]);
            document.body.classList.toggle("game-no-deck", !GAMES_WITH_DECK[gameKey]);
            _currentGameClass = cls;
        }
        function switchToGame(name) {
            active.name = name;
            active.game = Y.Solitaire[games[name]];
            setGameBodyClass(games[name]);
        }
        function playGame(name) {
            switchToGame(name);

            try { $.jStorage.set("FossSolitairey_options", name); } catch (e) {}
            newGame();
        }
        const GameChooser = {
            selected: null,
            fade: false,

            init: function () {
                this.refit();
            },

            refit: function () {
                const node = Y.one("#game-chooser");
                if (!node) {
                    return;
                }
                const height = node.get("winHeight");

                node.setStyle("min-height", height);
            },

            show: function (fade) {
                if (!this.selected) {
                    this.select(active.name);
                }

                if (fade) {
                    Fade.show();
                    this.fade = true;
                }

                Y.one("#game-chooser").addClass("show");
                Y.one(".solitairey_body").addClass("scrollable");
            },

            hide: function () {
                if (this.fade) {
                    Fade.hide();
                }

                Y.one("#game-chooser").removeClass("show");
                Y.fire("gamechooser:hide", this);
                Y.one(".solitairey_body").removeClass("scrollable");
            },

            choose: function () {
                if (!this.selected) {
                    return;
                }

                this.hide();
                playGame(this.selected);
            },

            select: function (game) {
                const node = Y.one("#" + game + "> div"),
                    previous = this.selected;

                if (previous !== game) {
                    this.unSelect();
                }

                if (node) {
                    this.selected = game;
                    new Y.Node(document.getElementById(game)).addClass(
                        "selected",
                    );
                }

                if (previous && previous !== game) {
                    Y.fire("gamechooser:select", this);
                }
            },

            unSelect: function () {
                if (!this.selected) {
                    return;
                }

                new Y.Node(document.getElementById(this.selected)).removeClass(
                    "selected",
                );
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
                sizes: [61, 79, 95, 122],
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
             var saved = null;
             try { saved = localStorage.getItem("FossSolitairey_options"); } catch (e) {}
             if (saved) {
                 try { saved = JSON.parse(saved); } catch (e) { saved = null; }
             }
             if (saved) {
                 active.name = saved;
             }

             Themes.load("dondorf");
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
            Y.on("click", restart, Y.one("#restart"));
            Y.on(
                "click",
                function () {
                    GameChooser.show(false);
                },
                Y.one("#choose_game"),
            );
            Y.on("click", newGame, Y.one("#new_deal"));
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

            function showDescription(e) {
                GameChooser.select(e.currentTarget._node.id);
                GameChooser.choose();
            }
            Y.delegate("click", showDescription, "#descriptions", "li");
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
                    callback();
                    Fade.hide();
                }
            },

            load: function (path) {
                const image = new Image();

                image.onload = function () {
                    --this.loadingCount;
                }.bind(this);
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

                if (enable_solitairey_ui) {
                    icons.forEach(function (image) {
                        that.load("layouts/mini/" + image + ".png");
                    });
                }

                Fade.show();
                const loading = Y.one(".loading");
                if (loading) {
                    loading.removeClass("hidden");
                }
            },
        };
         function _my_load_func() {
            attachEvents();
            loadOptions();

            Preloader.preload();
            Preloader.loaded(function () {
                // Auto-scale cards based on viewport
                (function () {
                    try {
                        var minDim = Math.min(window.innerWidth, window.innerHeight);
                        if (minDim < 500) {
                            Themes.set("dondorf", 61);
                            if (typeof Logger !== "undefined") Logger.info("auto_scale", { size: 61, reason: "small_screen" });
                        } else if (minDim < 900) {
                            Themes.set("dondorf", 79);
                            if (typeof Logger !== "undefined") Logger.info("auto_scale", { size: 79, reason: "medium_screen" });
                        }
                    } catch (e) {
                        if (typeof Logger !== "undefined") Logger.warn("auto_scale_failed", { error: e.message });
                    }
                })();

                // showChromeStoreLink();
                playGame(active.name);
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
                Y.Solitaire.offset = Y.Solitaire.offset || { left: 50, top: 70 };
                Y.Solitaire.offset.top = 110;
                Y.Solitaire.padding = Y.Solitaire.padding || { x: 50, y: 50 };
                Y.Solitaire.padding.y = 110;
            }
            exportAPI();
            Y.on("domready", _my_load_func);
        }

        function resize() {
            const game = active.game;
            const el = game.container();
            var padding = { x: Y.Solitaire.padding.x, y: Y.Solitaire.padding.y };
            var footerEl = document.getElementById('site-footer');
            if (footerEl) { padding.y = Math.max(padding.y, footerEl.offsetHeight); }
            var offset = Y.Solitaire.offset;
            var width = el.get("winWidth") - padding.x;
            var height = el.get("winHeight") - padding.y;

            Y.Solitaire.Application.windowHeight = height;
            var ratio = Math.min(
                (width - offset.left) / game.width(),
                (height - offset.top) / game.height(),
            );

            active.game.resize(ratio);
            GameChooser.refit();
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
            };
        }
        schedule = function (cb) {
            schedule_cb = cb;
        };

        yui.use.apply(yui, modules().concat(main));
        window.setTimeout(function () {
            yui.use.apply(yui, ["solver-freecell"]);
        }, 400);
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
