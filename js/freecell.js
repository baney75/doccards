define(["./solitaire"], function (solitaire) {
    const instance = solitaire.instance;
    YUI.add(
        "freecell",
        function (Y) {
            const Solitaire = Y.Solitaire;
            const Freecell = (Y.Solitaire.Freecell = instance(Solitaire, {
                fields: ["Foundation", "Reserve", "Tableau"],

                deal: function () {
                    let card,
                        stack = 0;
                    const stacks = this.tableau.stacks;

                    while ((card = this.deck.pop())) {
                        stacks[stack].push(card.faceUp());
                        stack++;
                        if (stack === 8) {
                            stack = 0;
                        }
                    }
                },

                openSlots: function (exclude) {
                    let total = 1,
                        freeTableaus = 0;
                    const rStacks = this.reserve.stacks,
                        tStacks = this.tableau.stacks;

                    for (let i = 0; i < 4; i++) {
                        if (!rStacks[i].my_Last()) ++total;
                    }

                    for (let i = 0; i < 8; i++) {
                        const stack = tStacks[i];
                        exclude !== stack && !stack.my_Last() && ++freeTableaus;
                    }

                    return total * Math.pow(2, freeTableaus);
                },

                Stack: instance(Solitaire.Stack),

                height: function () {
                    return this.Card.base.height * 5;
                },

                Foundation: {
                    stackConfig: {
                        total: 4,
                        layout: {
                            hspacing: 1.25,
                            top: 0,
                            left: function () {
                                var w = window.innerWidth || 800;
                                // 4 reserves at left=0; next free slot is 4*hs.
                                // Read live compacted hspacing so overlap mode stays aligned.
                                if (w >= 1024) return Solitaire.Card.width * 5.1;
                                var hs = 1.25;
                                try {
                                    var res =
                                        Y.Solitaire.Freecell &&
                                        Y.Solitaire.Freecell.reserve;
                                    var stack =
                                        res && res.stacks && res.stacks[0];
                                    if (
                                        stack &&
                                        stack.configLayout &&
                                        typeof stack.configLayout.hspacing ===
                                            "number"
                                    ) {
                                        hs = stack.configLayout.hspacing;
                                    } else if (w < 390) {
                                        hs = 0.9;
                                    } else if (w < 520) {
                                        hs = 0.92;
                                    } else {
                                        hs = 1.12;
                                    }
                                } catch (e) {
                                    hs = w < 520 ? 0.9 : 1.12;
                                }
                                return Solitaire.Card.width * (4 * hs + 0.06);
                            },
                        },
                    },
                    field: "foundation",
                    draggable: false,
                },

                Reserve: {
                    stackConfig: {
                        total: 4,
                        layout: {
                            hspacing: 1.25,
                            top: 0,
                            left: 0,
                        },
                    },
                    field: "reserve",
                    draggable: true,
                },

                Tableau: {
                    stackConfig: {
                        total: 8,
                        layout: {
                            hspacing: 1.25,
                            top: function () {
                                var w = window.innerWidth || 800;
                                // Tighter under the free-cell row on phones so cascades
                                // claim more vertical felt once cards grow.
                                return Solitaire.Card.height * (w < 520 ? 1.12 : w < 1024 ? 1.22 : 1.5);
                            },
                            left: 0,
                        },
                    },
                    field: "tableau",
                    draggable: true,
                },

                Card: instance(Solitaire.Card, {
                    playable: function () {
                        switch (this.stack.field) {
                            case "reserve":
                                return true;
                            case "tableau":
                                return this.createProxyStack();
                            case "foundation":
                                return false;
                        }
                    },

                    createProxyStack: function () {
                        const stack = Solitaire.Card.createProxyStack.call(
                            this,
                        );

                        this.proxyStack =
                            stack &&
                            stack.cards.length <= Freecell.openSlots(stack)
                                ? stack
                                : null;
                        return this.proxyStack;
                    },

                    validTarget: function (stack) {
                        const target = stack.my_Last();

                        switch (stack.field) {
                            case "tableau":
                                if (!target) {
                                    return true;
                                } else {
                                    return (
                                        target.color !== this.color &&
                                        target.rank === this.rank + 1
                                    );
                                }
                                break;
                            case "foundation":
                                if (!target) {
                                    return this.rank === 1;
                                } else {
                                    return (
                                        target.suit === this.suit &&
                                        target.rank === this.rank - 1
                                    );
                                }
                                break;
                            case "reserve":
                                return !target;
                                break;
                        }
                    },
                }),
            }));

            Freecell.fields.forEach(function (field) {
                Freecell[field].Stack = instance(Freecell.Stack);
            });

            Y.mix(
                Freecell.Stack,
                {
                    validTarget: function (stack) {
                        if (
                            stack.field !== "tableau" ||
                            !this.first().validTarget(stack)
                        ) {
                            return false;
                        }

                        return this.cards.length <= Freecell.openSlots(stack);
                    },
                },
                true,
            );

            Y.mix(
                Freecell.Tableau.Stack,
                {
                    setCardPosition: function (card) {
                        return this.lastCardSetCardPosition(card);
                    },
                },
                true,
            );
        },
        "0.0.1",
        { requires: ["solitaire"] },
    );
    return {
        instance: instance,
    };
});
