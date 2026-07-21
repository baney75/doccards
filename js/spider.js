YUI.add(
    "spider",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Spider = (Solitaire.Spider = Solitaire.instance(Solitaire, {
                fields: ["Foundation", "Deck", "Tableau"],

                createEvents: function () {
                    Solitaire.AutoStackClear.register();
                    Solitaire.createEvents.call(this);
                },

                deal: function () {
                    const deck = this.deck,
                        stacks = this.tableau.stacks;

                    for (let row = 0; row < 5; row++) {
                        for (let stack = 0; stack < 10; stack++) {
                            if (stack < 4 || row < 4) {
                                stacks[stack].push(deck.pop());
                            }
                        }
                    }

                    for (let stack = 0; stack < 10; stack++) {
                        stacks[stack].push(deck.pop().faceUp());
                    }

                    deck.createStack();
                },

                redeal: function () {},

                turnOver: function () {
                    const deck = this.deck.stacks[0];

                    if (hasFreeTableaus()) {
                        if (typeof DCUI !== "undefined" && DCUI._showToast) {
                            DCUI._showToast("Fill empty columns before dealing");
                        }
                        if (typeof DCSound !== "undefined") {
                            DCSound.error();
                        }
                        return;
                    }

                    this.eachStack(function (stack) {
                        const card = deck.my_Last();

                        if (card) {
                            card.faceUp()
                                .moveTo(stack)
                                .after(function () {
                                    stack.updateCardsPosition();
                                });
                        }
                    }, "tableau");
                },

                Stack: Solitaire.instance(Solitaire.Stack),

                Foundation: {
                    stackConfig: {
                        total: 8,
                        layout: {
                            hspacing: 1.25,
                            top: 0,
                            left: function () {
                                // Park after the single deck column.
                                return Solitaire.Card.width * 1.15;
                            },
                        },
                    },
                    field: "foundation",
                    draggable: false,
                },

                Deck: Solitaire.instance(Solitaire.Deck, {
                    count: 2,

                    stackConfig: {
                        total: 1,
                        layout: {
                            hspacing: 0,
                            top: 0,
                            left: 0,
                        },
                    },
                    field: "deck",
                }),

                Tableau: {
                    stackConfig: {
                        total: 10,
                        layout: {
                            hspacing: 1.25,
                            top: function () {
                                var w = window.innerWidth || 800;
                                return Solitaire.Card.height * (w < 520 ? 1.12 : w < 1024 ? 1.22 : 1.5);
                            },
                            left: 0,
                        },
                    },
                    field: "tableau",
                },

                Card: Solitaire.instance(Solitaire.Card, {
                    playable: function () {
                        const previous = this.stack[this.index - 1];

                        switch (this.stack.field) {
                            case "tableau":
                                return this.createProxyStack();
                            case "deck":
                                return !hasFreeTableaus();
                            case "foundation":
                                return false;
                        }
                    },

                    validTarget: function (stack) {
                        if (stack.field !== "tableau") {
                            return false;
                        }

                        const target = stack.my_Last();

                        return (
                            !target ||
                            (!target.isFaceDown &&
                                target.rank === this.rank + 1)
                        );
                    },
                }),
            }));

        function hasFreeTableaus() {
            return Y.Array.some(Solitaire.getGame().tableau.stacks, function (
                stack,
            ) {
                return !stack.cards.length;
            });
        }

        Spider.fields.forEach(function (field) {
            Spider[field].Stack = Solitaire.instance(Spider.Stack);
        });

        Y.mix(
            Spider.Stack,
            {
                validCard: function (card) {
                    return card.suit === _.last(this.cards).suit;
                },

                validTarget: function (stack) {
                    switch (stack.field) {
                        case "tableau":
                            return this.first().validTarget(stack);
                            break;
                        case "foundation":
                            return this.cards.length === 13;
                            break;
                    }
                },
            },
            true,
        );

        Y.mix(
            Spider.Tableau.Stack,
            {
                setCardPosition: function (card) {
                    return this.lastCardSetCardPosition(card);
                },
            },
            true,
        );
    },
    "0.0.1",
    { requires: ["auto-stack-clear"] },
);
