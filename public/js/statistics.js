define(["./solitaire"], function (solitaire) {
    const getGame = solitaire.getGame;
    /*
     * record win/lose records, streaks, etc
     */
    YUI.add(
        "statistics",
        function (Y) {
            let loaded,
                won,
                enabled = true;
            const localStorage = window.localStorage,
                Solitaire = Y.Solitaire,
                Statistics = Y.namespace("Solitaire.Statistics");

            if (!localStorage) {
                return;
            }

            Y.on("newGame", function () {
                if (loaded) {
                    recordLose();
                }

                won = false;
                loaded = null;
            });

            Y.on("loadGame", function () {
                loaded = Solitaire.game.name();
                saveProgress();
                won = false;
            });

            Y.on("endTurn", function () {
                if (!loaded) {
                    loaded = Solitaire.game.name();
                    saveProgress();
                }
            });

            Y.on("win", function () {
                if (won || !enabled) {
                    return;
                }

                loaded = null;
                won = true;

                recordWin();

                explodeFoundations();
            });

            Y.on("beforeSetup", function () {
                const winDisplay = Y.one("#win_display");

                winDisplay && winDisplay.remove();
                Statistics.enable();
            });

            function explodeFoundations() {
                const prefersReduced =
                    typeof window !== "undefined" &&
                    window.matchMedia &&
                    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                let delay = prefersReduced ? 0 : 500;
                const duration = prefersReduced ? 0 : 900;
                const interval = prefersReduced ? 0 : 900;

                if (prefersReduced) {
                    Statistics.winDisplay();
                    return;
                }

                getGame().eachStack(function (stack) {
                    stack.eachCard(function (card) {
                        if (!card) {
                            return;
                        }

                        const node = card.node;
                        if (card !== stack.my_Last()) {
                            node.addClass("hidden");
                            return;
                        }

                        node.plug(Y.Breakout, { columns: 5 });
                        (function (node, startDelay) {
                            setTimeout(function () {
                                node.breakout.explode({
                                    random: 0.65,
                                    duration: duration,
                                });
                            }, startDelay);
                        })(node, delay);

                        delay += interval;
                    });
                }, "foundation");

                setTimeout(function () {
                    Statistics.winDisplay();
                }, delay + 200);
            }

            /*
             * TODO: a templating system might make this less grody
             */
            function winDisplay() {
                const nameMap = {
                        Agnes: "Agnes",
                        Klondike: "Klondike",
                        Klondike1T: "Klondike (Vegas style)",
                        FlowerGarden: "Flower Garden",
                        FortyThieves: "Forty Thieves",
                        Freecell: "Freecell",
                        Golf: "Golf",
                        GClock: "Grandfather's Clock",
                        MonteCarlo: "Monte Carlo",
                        Pyramid: "Pyramid",
                        RussianSolitaire: "Russian Solitaire",
                        Scorpion: "Scorpion",
                        Spider: "Spider",
                        Spider1S: "Spider (1 Suit)",
                        Spider2S: "Spider (2 Suit)",
                        Spiderette: "Spiderette",
                        WillOTheWisp: "Will O' The Wisp",
                        TriTowers: "Tri Towers",
                        Yukon: "Yukon",
                    },
                    stats = Record(
                        localStorage[Solitaire.game.name() + "record"],
                    );
                let output = "<div id='win_display'>";
                const streakCount = _.last(stats.streaks()).length;
                const winCount = stats.wins().length;

                var moves = (typeof DCUI !== "undefined" && DCUI._moveCount) || 0;
                var elapsed = 0;
                if (typeof DCUI !== "undefined" && DCUI._startTime) {
                    elapsed = Math.floor((Date.now() - DCUI._startTime) / 1000);
                }
                var mm = Math.floor(elapsed / 60);
                var ss = elapsed % 60;
                var timeLabel = mm + ":" + (ss < 10 ? "0" : "") + ss;
                var praise =
                    streakCount >= 5
                        ? "On fire — " + streakCount + " in a row!"
                        : streakCount >= 2
                          ? "Streak building — keep it going"
                          : moves > 0 && moves < 60
                            ? "Sharp play"
                            : "Beautifully done";

                output += "<div class='win-icon' aria-hidden='true'></div>";
                output += "<p class='win-title'>You Win!</p>";
                output += "<p class='win-subtitle'>" + (nameMap[Solitaire.game.name()] || "Solitaire") + "</p>";
                output += "<p class='win-praise'>" + praise + "</p>";
                output += "<div class='win-stats'>";
                output += "<div class='stat'><span class='stat-value'>" + streakCount + "</span><span class='stat-label'>Streak</span></div>";
                output += "<div class='stat'><span class='stat-value'>" + winCount + "</span><span class='stat-label'>Wins</span></div>";
                if (moves > 0) {
                    output += "<div class='stat'><span class='stat-value'>" + moves + "</span><span class='stat-label'>Moves</span></div>";
                }
                if (elapsed > 0) {
                    output += "<div class='stat'><span class='stat-value'>" + timeLabel + "</span><span class='stat-label'>Time</span></div>";
                }
                output += "</div>";
                output += '<div class="replay_options"><button class="new_deal doccards-btn">New Deal</button><button class="choose_game doccards-btn doccards-btn-secondary">Choose Game</button></div>';

                output += "</div>";

                return output;
            }

            function record(value) {
                const key = localStorage["currentGame"] + "record";
                let record = localStorage[key] || "";

                record += new Date().getTime() + "_" + value + "|";

                localStorage[key] = record;
            }

            function recordLose() {
                record(0);

                clearProgress();
            }

            function recordWin() {
                record(1);

                clearProgress();
            }

            function clearProgress() {
                localStorage.removeItem("currentGame");
            }

            function saveProgress() {
                localStorage["currentGame"] = Solitaire.game.name();
            }

            function Record(raw) {
                function parse() {
                    const entries = raw.split("|");

                    entries.splice(entries.length - 1);

                    return Y.Array.map(entries, function (entry) {
                        entry = entry.split("_");

                        return {
                            date: new Date(entry[0]),
                            won: !!parseInt(entry[1], 10),
                        };
                    });
                }

                function won(entry) {
                    return entry.won;
                }

                const record = parse();

                return {
                    streaks: function () {
                        const streaks = [];
                        let streak = null;

                        record.forEach(function (entry) {
                            if (!entry.won) {
                                streak && streaks.push(streak);
                                streak = null;
                            } else {
                                if (!streak) {
                                    streak = [];
                                }
                                streak.push(entry);
                            }
                        });

                        streak && streaks.push(streak);

                        return streaks;
                    },

                    wins: function () {
                        return Y.Array.filter(record, won);
                    },

                    loses: function () {
                        return Y.Array.reject(record, won);
                    },
                };
            }

            Y.mix(Statistics, {
                winDisplay: function () {
                    const Application = Solitaire.Application;

                    Y.one(".solitairey_body").append(winDisplay());

                    Y.on(
                        "click",
                        function () {
                            Application.newGame();
                        },
                        Y.one("#win_display .new_deal"),
                    );

                    if (true) {
                        Y.on(
                            "click",
                            function () {
                                Application.GameChooser.show(true);
                            },
                            Y.one("#win_display .choose_game"),
                        );
                    }
                },

                enable: function () {
                    enabled = true;
                },

                disable: function () {
                    enabled = false;
                },
            });
        },
        "0.0.1",
        { requires: ["solitaire", "array-extras", "breakout"] },
    );
    return {};
});
