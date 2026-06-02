// DocCards Game Bundle - auto-generated on 2026-05-31T15:17:14Z

// --- agnes.js ---
YUI.add(
    "agnes",
    function (Y) {
        function inSeries(first, second) {
            return (first + 1) % 13 === second % 13;
        }

        function seedRank() {
            return Agnes.foundation.stacks[0].first().rank;
        }

        const Solitaire = Y.Solitaire,
            Klondike = Solitaire.Klondike,
            Agnes = (Solitaire.Agnes = Solitaire.instance(Klondike, {
                fields: ["Foundation", "Deck", "Waste", "Tableau", "Reserve"],

                height: function () {
                    return this.Card.base.height * 5.6;
                },
                maxStackHeight: function () {
                    return this.Card.height * 4.3;
                },

                deal: function () {
                    const deck = this.deck.stacks[0],
                        foundation = this.foundation.stacks[0];

                    Klondike.deal.call(this);

                    deck.my_Last().faceUp().moveTo(foundation);

                    this.turnOver();
                },

                redeal: Solitaire.noop,

                turnOver: function () {
                    const deck = this.deck.stacks[0],
                        reserves = this.reserve.stacks,
                        waste = this.waste.stacks;
                    let count, target, i;

                    if (deck.cards.length < 7) {
                        count = 2;
                        target = waste;
                    } else {
                        count = 7;
                        target = reserves;
                    }

                    for (i = 0; i < count; i++) {
                        deck.my_Last().faceUp().moveTo(target[i]);
                    }
                },

                Waste: Solitaire.instance(Klondike.Waste, {
                    stackConfig: {
                        total: 2,
                        layout: {
                            hspacing: 1.5,
                            top: 0,
                            left: 0,
                        },
                    },

                    Stack: Solitaire.instance(Solitaire.Stack, {
                        setCardPosition: function (card) {
                            const last = this.my_Last(),
                                top = this.top,
                                left = last
                                    ? last.left + Solitaire.Card.width * 1.5
                                    : this.left;

                            card.top = top;
                            card.left = left;
                        },
                    }),
                }),

                Reserve: {
                    field: "reserve",
                    stackConfig: {
                        total: 7,
                        layout: {
                            hspacing: 1.25,
                            left: 0,
                            top: function () {
                                return Solitaire.Card.height * 4.4;
                            },
                        },
                    },

                    Stack: Solitaire.instance(Klondike.Stack, {
                        images: {},

                        setCardPosition: function (card) {
                            return this.lastCardSetCardPosition(card);
                        },
                    }),
                },

                Card: Solitaire.instance(Klondike.Card, {
                    playable: function () {
                        if (this.stack.field === "reserve") {
                            return this.isFree();
                        } else {
                            return Klondike.Card.playable.call(this);
                        }
                    },

                    validTarget: function (stack) {
                        const target = stack.my_Last();

                        switch (stack.field) {
                            case "tableau":
                                if (!target) {
                                    return inSeries(this.rank, seedRank());
                                } else {
                                    return (
                                        !target.isFaceDown &&
                                        target.color !== this.color &&
                                        inSeries(this.rank, target.rank)
                                    );
                                }
                            case "foundation":
                                return this.validFoundationTarget(target);
                            default:
                                return false;
                        }
                    },

                    validFoundationTarget: function (target) {
                        if (!target) {
                            return this.rank === seedRank();
                        } else {
                            return (
                                this.suit === target.suit &&
                                this.rank % 13 === (target.rank + 1) % 13
                            );
                        }
                    },
                }),
            }));
    },
    "0.0.1",
    { requires: ["klondike"] },
);

// --- golf.js ---
YUI.add(
    "golf",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Golf = (Y.Solitaire.Golf = Solitaire.instance(
                Solitaire,
                {
                    fields: ["Deck", "Foundation", "Tableau"],

                    deal: function () {
                        let card, stack, row;
                        const stacks = this.tableau.stacks,
                            deck = this.deck,
                            foundation = this.foundation.stacks[0];

                        for (row = 0; row < 5; row++) {
                            for (stack = 0; stack < 7; stack++) {
                                card = deck.pop().faceUp();
                                stacks[stack].push(card);
                            }
                        }

                        card = deck.pop().faceUp();
                        foundation.push(card);

                        deck.createStack();
                    },

                    turnOver: function () {
                        const deck = this.deck.stacks[0],
                            foundation = this.foundation.stacks[0],
                            last = deck.my_Last();

                        last && last.faceUp().moveTo(foundation);
                    },

                    isWon: function () {
                        let won = true;

                        this.eachStack(function (stack) {
                            stack.eachCard(function (card) {
                                if (card) {
                                    won = false;
                                }

                                return won;
                            });
                        }, "tableau");

                        return won;
                    },

                    height: function () {
                        return this.Card.base.height * 4;
                    },

                    Deck: Solitaire.instance(Solitaire.Deck, {
                        field: "deck",
                        stackConfig: {
                            total: 1,
                            layout: {
                                hspacing: 0,
                                top: function () {
                                    return Solitaire.Card.height * 3;
                                },
                                left: 0,
                            },
                        },

                        createStack: function () {
                            let i, len;

                            for (i = 0, len = this.cards.length; i < len; i++) {
                                this.stacks[0].push(this.cards[i]);
                            }
                        },
                    }),

                    Tableau: {
                        field: "tableau",
                        stackConfig: {
                            total: 7,
                            layout: {
                                hspacing: 1.25,
                                top: 0,
                                left: 0,
                            },
                        },
                    },

                    Foundation: {
                        field: "foundation",
                        stackConfig: {
                            total: 1,
                            layout: {
                                hspacing: 0,
                                top: function () {
                                    return Solitaire.Card.height * 3;
                                },
                                left: function () {
                                    return Solitaire.Card.width * 3.75;
                                },
                            },
                        },
                    },

                    Events: Solitaire.instance(Solitaire.Events, {
                        dragCheck: function (e) {
                            this.getCard().autoPlay();

                            /* workaround because YUI retains stale drag information if we halt the event :\ */
                            this._afterDragEnd();
                            e.halt();
                        },
                    }),

                    Card: Solitaire.instance(Solitaire.Card, {
                        /*
                         * return true if the target is 1 rank away from the this card
                         */
                        validTarget: function (stack) {
                            if (stack.field !== "foundation") {
                                return false;
                            }

                            const target = stack.my_Last(),
                                diff = Math.abs(this.rank - target.rank);

                            return diff === 1;
                        },

                        isFree: function () {
                            return (
                                !this.isFaceDown &&
                                this === this.stack.my_Last()
                            );
                        },
                    }),

                    Stack: Solitaire.instance(Solitaire.Stack, {
                        images: {},
                    }),
                },
                true,
            ));

        Golf.fields.forEach(function (field) {
            Golf[field].Stack = Solitaire.instance(Golf.Stack);
        });

        Y.mix(
            Golf.Tableau.Stack,
            {
                setCardPosition: function (card) {
                    return this.lastCardSetCardPosition(card);
                },
            },
            true,
        );

        Y.mix(
            Golf.Deck.Stack,
            {
                setCardPosition: function (card) {
                    let left, zIndex;

                    const last = this.my_Last();
                    const top = this.top;
                    if (last) {
                        left = last.left + card.width * 0.1;
                        zIndex = last.zIndex + 1;
                    } else {
                        left = this.left;
                        zIndex = 0;
                    }

                    card.top = top;
                    card.left = left;
                    card.zIndex = zIndex;
                },
            },
            true,
        );
    },
    "0.0.1",
    { requires: ["solitaire"] },
);

// --- klondike.js ---
YUI.add(
    "klondike",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Klondike = (Y.Solitaire.Klondike = Solitaire.instance(Solitaire, {
                fields: ["Foundation", "Deck", "Waste", "Tableau"],

                deal: function () {
                    let card,
                        piles = 6,
                        stack = 0;
                    const deck = this.deck,
                        stacks = this.tableau.stacks;

                    while (piles >= 0) {
                        card = deck.pop().faceUp();
                        stacks[6 - piles].push(card);

                        for (stack = 7 - piles; stack < 7; stack++) {
                            card = deck.pop();
                            stacks[stack].push(card);
                        }
                        piles--;
                    }

                    deck.createStack();
                },

                turnOver: function () {
                    const deck = this.deck.stacks[0],
                        waste = this.waste.stacks[0],
                        updatePosition = Klondike.Card.updatePosition;

                    Klondike.Card.updatePosition = Solitaire.noop;

                    for (
                        let i = deck.cards.length, stop = i - 3;
                        i > stop && i;
                        --i
                    ) {
                        deck.my_Last().faceUp().moveTo(waste);
                    }

                    Klondike.Card.updatePosition = updatePosition;

                    waste.eachCard(function (c) {
                        c.updatePosition();
                    });
                },

                redeal: function () {
                    const deck = this.deck.stacks[0],
                        waste = this.waste.stacks[0];

                    while (waste.cards.length) {
                        waste.my_Last().faceDown().moveTo(deck);
                    }
                },

                Stack: Solitaire.instance(Solitaire.Stack),

                Foundation: {
                    stackConfig: {
                        total: 4,
                        layout: {
                            hspacing: 1.25,
                            top: 0,
                            left: function () {
                                return Solitaire.Card.width * 3.75;
                            },
                        },
                    },
                    field: "foundation",
                },

                Deck: Solitaire.instance(Solitaire.Deck, {
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

                Waste: {
                    stackConfig: {
                        total: 1,
                        layout: {
                            hspacing: 0,
                            top: 0,
                            left: function () {
                                return Solitaire.Card.width * 1.5;
                            },
                        },
                    },
                    field: "waste",
                },

                Tableau: {
                    stackConfig: {
                        total: 7,
                        layout: {
                            hspacing: 1.25,
                            top: function () {
                                return Solitaire.Card.height * 1.5;
                            },
                            left: 0,
                        },
                    },
                    field: "tableau",
                },

                Card: Solitaire.instance(Solitaire.Card, {
                    playable: function () {
                        switch (this.stack.field) {
                            case "tableau":
                                return !this.isFaceDown;
                            case "foundation":
                                return false;
                            case "waste":
                                return this.isFree();
                            case "deck":
                                return true;
                        }
                    },

                    validFoundationTarget: function (target) {
                        if (!target) {
                            return this.rank === 1;
                        } else {
                            return (
                                target.suit === this.suit &&
                                target.rank === this.rank - 1
                            );
                        }
                    },

                    validTarget: function (stack) {
                        const target = stack.my_Last();

                        switch (stack.field) {
                            case "tableau":
                                if (!target) {
                                    return this.rank === 13;
                                } else {
                                    return (
                                        !target.isFaceDown &&
                                        target.color !== this.color &&
                                        target.rank === this.rank + 1
                                    );
                                }
                            case "foundation":
                                return this.validFoundationTarget(target);
                            default:
                                return false;
                        }
                    },
                }),
            }));

        Klondike.fields.forEach(function (field) {
            Klondike[field].Stack = Solitaire.instance(Klondike.Stack);
        });

        Y.mix(
            Klondike.Stack,
            {
                validTarget: function (stack) {
                    return (
                        stack.field === "tableau" &&
                        this.first().validTarget(stack)
                    );
                },
            },
            true,
        );

        Y.mix(
            Klondike.Tableau.Stack,
            {
                setCardPosition: function (card) {
                    return this.lastCardSetCardPosition(card);
                },
            },
            true,
        );

        Y.mix(
            Klondike.Waste.Stack,
            {
                // always display only the last three cards
                setCardPosition: function (card) {
                    const cards = this.cards,
                        last = _.last(cards),
                        stack = this;

                    cards.slice(-2).forEach(function (card, i) {
                        card.left = stack.left;
                        card.top = stack.top;
                    });

                    if (!cards.length) {
                        card.left = stack.left;
                    }

                    if (cards.length === 1) {
                        card.left = stack.left + 0.2 * card.width;
                    } else if (cards.length > 1) {
                        last.left = stack.left + 0.2 * card.width;
                        last.top = stack.top;
                        card.left = stack.left + 0.4 * card.width;
                    }

                    card.top = stack.top;
                },
            },
            true,
        );

        Y.mix(
            Klondike.Deck.Stack,
            {
                createNode: function () {
                    Solitaire.Stack.createNode.call(this);
                    this.node.on("click", Solitaire.Events.clickEmptyDeck);
                    this.node.addClass("playable");
                },
            },
            true,
        );
    },
    "0.0.1",
    { requires: ["solitaire"] },
);

// --- klondike1t.js ---
YUI.add(
    "klondike1t",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Klondike = Solitaire.Klondike,
            Klondike1T = (Solitaire.Klondike1T = Solitaire.instance(Klondike, {
                redeal: Solitaire.noop,

                turnOver: function () {
                    const deck = this.deck.stacks[0],
                        waste = this.waste.stacks[0],
                        card = deck.my_Last();

                    card && card.faceUp().moveTo(waste);
                },

                Waste: Solitaire.instance(Klondike.Waste, {
                    Stack: Solitaire.instance(Solitaire.Stack),
                }),

                Deck: Solitaire.instance(Klondike.Deck, {
                    Stack: Solitaire.instance(Klondike.Deck.Stack, {
                        createNode: function () {
                            Klondike.Deck.Stack.createNode.call(this);
                            this.node.removeClass("playable");
                        },
                    }),
                }),
            }));
    },
    "0.0.1",
    { requires: ["klondike"] },
);

// --- flowergarden.js ---
YUI.add(
    "flower-garden",
    function (Y) {
        const Solitaire = Y.Solitaire,
            FlowerGarden = (Y.Solitaire.FlowerGarden = Solitaire.instance(
                Solitaire,
                {
                    fields: ["Foundation", "Reserve", "Tableau"],

                    deal: function () {
                        let card,
                            stack = 0,
                            i;
                        const stacks = this.tableau.stacks;
                        const deck = this.deck;
                        const reserve = this.reserve.stacks[0];

                        for (i = 0; i < 36; i++) {
                            card = deck.pop();
                            stacks[stack].push(card.faceUp());
                            stack++;
                            if (stack === 6) {
                                stack = 0;
                            }
                        }

                        while ((card = deck.pop())) {
                            card.faceUp();
                            reserve.push(card);
                        }
                    },

                    height: function () {
                        return this.Card.base.height * 5.5;
                    },
                    maxStackHeight: function () {
                        return this.Card.height * 4.4;
                    },

                    Stack: Solitaire.instance(Solitaire.Stack),

                    Foundation: {
                        stackConfig: {
                            total: 4,
                            layout: {
                                hspacing: 1.25,
                                top: 0,
                                left: function () {
                                    return Solitaire.Card.width * 4.25;
                                },
                            },
                        },
                        field: "foundation",
                        draggable: false,
                    },

                    Reserve: {
                        stackConfig: {
                            total: 1,
                            layout: {
                                hspacing: 1.25,
                                top: function () {
                                    return Solitaire.Card.height * 4.5;
                                },
                                left: function () {
                                    return Solitaire.Card.width * 3;
                                },
                            },
                        },
                        field: "reserve",
                        draggable: true,
                    },

                    Tableau: {
                        stackConfig: {
                            total: 6,
                            layout: {
                                hspacing: 1.25,
                                top: function () {
                                    return Solitaire.Card.height * 1.25;
                                },
                                left: function () {
                                    return Solitaire.Card.width * 3;
                                },
                            },
                        },
                        field: "tableau",
                        draggable: true,
                    },

                    Card: Solitaire.instance(Solitaire.Card, {
                        rankHeight: 24,

                        createProxyStack: function () {
                            let stack;

                            switch (this.stack.field) {
                                case "foundation":
                                    this.proxyStack = null;
                                    break;
                                case "tableau":
                                    return Solitaire.Card.createProxyStack.call(
                                        this,
                                    );
                                case "reserve":
                                    stack = Solitaire.instance(this.stack);
                                    stack.cards = [this];
                                    this.proxyStack = stack;
                                    break;
                            }

                            return this.proxyStack;
                        },

                        moveTo: function (stack) {
                            const cards = this.stack.cards,
                                index = cards.indexOf(this);
                            let i, len;

                            /*
                             * TODO: fix this hack
                             * if moveTo.call is called after the other card's positions have been saved, the card move is animated twice on undo
                             * the insertion of null is to preserve indexes and prevent this card from getting deleted on undo
                             */

                            Solitaire.Card.moveTo.call(this, stack);

                            cards.splice(index, 0, null);
                            for (
                                i = index + 1, len = cards.length;
                                i < len;
                                i++
                            ) {
                                cards[i].pushPosition();
                            }
                            cards.splice(index, 1);
                        },

                        validTarget: function (stack) {
                            const target = stack.my_Last();

                            switch (stack.field) {
                                case "tableau":
                                    if (!target) {
                                        return true;
                                    } else {
                                        return target.rank === this.rank + 1;
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
                                default:
                                    return false;
                                    break;
                            }
                        },

                        isFree: function () {
                            if (this.stack.field === "reserve") {
                                return true;
                            } else {
                                return Solitaire.Card.isFree.call(this);
                            }
                        },
                    }),
                },
                true,
            ));

        FlowerGarden.fields.forEach(function (field) {
            FlowerGarden[field].Stack = Solitaire.instance(FlowerGarden.Stack);
        });

        Y.mix(
            FlowerGarden.Stack,
            {
                images: { foundation: "freeslot.png", tableau: "freeslot.png" },

                validTarget: function (stack) {
                    return (
                        stack.field === "tableau" &&
                        this.first().validTarget(stack)
                    );
                },

                validCard: function () {
                    return false;
                },
            },
            true,
        );

        Y.mix(
            FlowerGarden.Tableau.Stack,
            {
                setCardPosition: function (card) {
                    return this.lastCardSetCardPosition(card);
                },
            },
            true,
        );

        Y.mix(
            FlowerGarden.Reserve.Stack,
            {
                setCardPosition: function (card) {
                    const last = _.last(this.cards),
                        left = last
                            ? last.left + Solitaire.Card.width * 0.4
                            : this.left,
                        top = this.top;

                    card.left = left;
                    card.top = top;
                },

                update: function (undo) {
                    if (undo) {
                        return;
                    }

                    const stack = this;

                    stack.cards.forEach(function (card, i) {
                        const left = stack.left + i * card.width * 0.4;

                        if (left !== card.left) {
                            card.left = left;
                            card.updatePosition();
                        }
                    });
                },
            },
            true,
        );
    },
    "0.0.1",
    { requires: ["solitaire"] },
);

// --- fortythieves.js ---
YUI.add(
    "forty-thieves",
    function (Y) {
        const Solitaire = Y.Solitaire,
            FortyThieves = (Y.Solitaire.FortyThieves = Solitaire.instance(
                Solitaire,
                {
                    fields: ["Foundation", "Deck", "Waste", "Tableau"],

                    deal: function () {
                        let card, stack, row;
                        const deck = this.deck,
                            stacks = this.tableau.stacks;

                        for (row = 0; row < 4; row++) {
                            for (stack = 0; stack < 10; stack++) {
                                card = deck.pop().faceUp();
                                stacks[stack].push(card);
                            }
                        }

                        deck.createStack();
                    },

                    redeal: function () {
                        // ggpo
                    },

                    turnOver: function () {
                        const deck = this.deck.stacks[0],
                            waste = this.waste.stacks[0];

                        for (
                            let i = deck.cards.length, stop = i - 1;
                            i > stop && i;
                            i--
                        ) {
                            deck.my_Last().faceUp().moveTo(waste);
                        }
                    },

                    Stack: Solitaire.instance(Solitaire.Stack),

                    Foundation: {
                        stackConfig: {
                            total: 8,
                            layout: {
                                hspacing: 1.25,
                                top: 0,
                                left: function () {
                                    return Solitaire.Card.width * 3;
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

                        init: function (seed) {
                            Solitaire.Deck.init.call(this, seed);
                            this.cards.forEach(function (c) {
                                c.faceDown();
                            });
                        },

                        createStack: function () {
                            for (let i = this.cards.length - 1; i >= 0; i--) {
                                this.stacks[0].push(this.cards[i]);
                            }
                        },
                    }),

                    Waste: {
                        stackConfig: {
                            total: 1,
                            layout: {
                                hspacing: 0,
                                top: 0,
                                left: function () {
                                    return Solitaire.Card.width * 1.25;
                                },
                            },
                        },
                        field: "waste",
                        draggable: true,
                    },

                    Tableau: {
                        stackConfig: {
                            total: 10,
                            layout: {
                                hspacing: 1.31,
                                top: function () {
                                    return Solitaire.Card.height * 1.5;
                                },
                                left: 0,
                            },
                        },
                        field: "tableau",
                        draggable: true,
                    },

                    Card: Solitaire.instance(Solitaire.Card, {
                        validTarget: function (stack) {
                            const target = stack.my_Last();

                            switch (stack.field) {
                                case "tableau":
                                    if (!target) {
                                        return this.rank === 13;
                                    } else {
                                        return (
                                            !target.isFaceDown &&
                                            target.suit === this.suit &&
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
                                default:
                                    return false;
                            }
                        },
                    }),
                },
            ));

        FortyThieves.fields.forEach(function (field) {
            FortyThieves[field].Stack = Solitaire.instance(FortyThieves.Stack);
        });

        Y.mix(
            FortyThieves.Stack,
            {
                cssClass: "freestack",

                validTarget: function (stack) {
                    return (
                        stack.field === "tableau" &&
                        this.first().validTarget(stack)
                    );
                },

                validCard: function () {
                    return false;
                },
            },
            true,
        );

        Y.mix(
            FortyThieves.Tableau.Stack,
            {
                setCardPosition: function (card) {
                    return this.lastCardSetCardPosition(card);
                },
            },
            true,
        );

        Y.mix(
            FortyThieves.Deck.Stack,
            {
                createDOMElement: function () {
                    Solitaire.Stack.createDOMElement.call(this);
                    this.node.on("click", Solitaire.Events.clickEmptyDeck);
                },
            },
            true,
        );

        FortyThieves.Foundation.Stack.cssClass = "freefoundation";
    },
    "0.0.1",
    { requires: ["solitaire"] },
);

// --- grandclock.js ---
YUI.add(
    "grandfathers-clock",
    function (Y) {
        function wrap(array, index) {
            const len = array.length;

            index %= len;
            if (index < 0) {
                index += len;
            }

            return array[index];
        }

        function inRange(low, high, value) {
            if (low <= high) {
                return low <= value && value <= high;
            } else {
                return low <= value || value <= high;
            }
        }

        Y.namespace("Solitaire.GClock");

        const Solitaire = Y.Solitaire,
            GClock = (Y.Solitaire.GClock = Solitaire.instance(Solitaire, {
                fields: ["Foundation", "Tableau"],

                deal: function () {
                    let card,
                        found,
                        stack = 0,
                        i = 51,
                        rank;
                    const deck = this.deck,
                        cards = deck.cards,
                        clock = [],
                        suits = ["d", "c", "h", "s"],
                        foundations = this.foundation.stacks,
                        stacks = this.tableau.stacks;

                    while (i >= 0) {
                        card = cards[i];
                        found = false;

                        for (rank = 2; rank <= 13; rank++) {
                            if (
                                card.rank === rank &&
                                card.suit === wrap(suits, rank)
                            ) {
                                found = true;
                                cards.splice(i, 1);
                                clock[rank - 2] = card.faceUp();
                                break;
                            }
                        }

                        if (!found) {
                            stacks[stack].push(card.faceUp());
                            stack = (stack + 1) % 8;
                        }
                        i--;
                    }

                    for (i = 0; i < 12; i++) {
                        foundations[(i + 2) % 12].push(clock[i]);
                    }
                },

                height: function () {
                    return this.Card.base.height * 6.7;
                },

                Stack: Solitaire.instance(Solitaire.Stack),

                Foundation: {
                    stackConfig: {
                        total: 12,
                        layout: {
                            hspacing: 1.25,
                            top: function () {
                                return Solitaire.Card.height * 3;
                            },
                            left: function () {
                                return Solitaire.Card.width * 3.25;
                            },
                        },
                    },
                    field: "foundation",
                    draggable: false,
                },

                Tableau: {
                    stackConfig: {
                        total: 8,
                        layout: {
                            hspacing: 1.25,
                            top: 0,
                            left: function () {
                                return Solitaire.Card.width * 7.25;
                            },
                        },
                    },
                    field: "tableau",
                    draggable: true,
                },

                Card: Solitaire.instance(Solitaire.Card, {
                    createProxyStack: function () {
                        switch (this.stack.field) {
                            case "foundation":
                                this.proxyStack = null;
                                break;
                            case "tableau":
                                return Solitaire.Card.createProxyStack.call(
                                    this,
                                );
                        }

                        return this.proxyStack;
                    },

                    validTarget: function (stack) {
                        const target = stack.my_Last();
                        let rank, hour;

                        switch (stack.field) {
                            case "tableau":
                                if (!target) {
                                    return true;
                                } else {
                                    return target.rank === this.rank + 1;
                                }
                                break;
                            case "foundation":
                                hour = (stack.index() + 3) % 12;
                                rank = target.rank;

                                return (
                                    target.suit === this.suit &&
                                    (target.rank + 1) % 13 === this.rank % 13 &&
                                    inRange(stack.first().rank, hour, this.rank)
                                );
                                break;
                            default:
                                return false;
                                break;
                        }
                    },
                }),
            }));

        GClock.fields.forEach(function (field) {
            GClock[field].Stack = Solitaire.instance(GClock.Stack);
        });

        Y.mix(
            GClock.Stack,
            {
                validTarget: function (stack) {
                    return (
                        stack.field === "tableau" &&
                        this.first().validTarget(stack)
                    );
                },

                validCard: function () {
                    return false;
                },
            },
            true,
        );

        Y.mix(
            GClock.Tableau.Stack,
            {
                setCardPosition: function (card) {
                    return this.lastCardSetCardPosition(card);
                },
            },
            true,
        );

        function normalize(valOrFunction) {
            const val =
                typeof valOrFunction === "function"
                    ? valOrFunction()
                    : valOrFunction;

            return isNaN(val) ? undefined : val;
        }

        Y.mix(
            GClock.Foundation.Stack,
            {
                index: function () {
                    return GClock.foundation.stacks.indexOf(this);
                },

                layout: function (layout, i) {
                    const top =
                            Math.sin((Math.PI * i) / 6) *
                            Solitaire.Card.height *
                            2.25,
                        left =
                            Math.cos((Math.PI * i) / 6) *
                            Solitaire.Card.width *
                            3;

                    this.top = top + normalize(layout.top);
                    this.left = left + normalize(layout.left);
                },
            },
            true,
        );
    },
    "0.0.1",
    { requires: ["solitaire"] },
);

// --- montecarlo.js ---
YUI.add(
    "monte-carlo",
    function (Y) {
        const Solitaire = Y.Solitaire,
            MonteCarlo = (Y.Solitaire.MonteCarlo = Solitaire.instance(
                Solitaire,
                {
                    fields: ["Foundation", "Deck", "Tableau"],

                    createEvents: function () {
                        Solitaire.createEvents.call(this);

                        Y.delegate(
                            "click",
                            Solitaire.Events.clickEmptyDeck,
                            Solitaire.selector,
                            ".stack",
                        );

                        Y.on("solitaire|endTurn", this.deckPlayable);
                        Y.on("solitaire|afterSetup", this.deckPlayable);
                    },

                    deckPlayable: function () {
                        let gap = false;
                        const node = Solitaire.getGame().deck.stacks[0].node;

                        Solitaire.getGame().eachStack(function (s) {
                            if (!gap && Y.Array.indexOf(s.cards, null) !== -1) {
                                gap = true;
                            }
                        }, "tableau");

                        if (gap) {
                            node.addClass("playable");
                        } else {
                            node.removeClass("playable");
                        }
                    },

                    deal: function () {
                        const deck = this.deck,
                            stacks = this.tableau.stacks;

                        for (let stack = 0; stack < 5; stack++) {
                            for (let i = 0; i < 5; i++) {
                                const card = deck.pop().faceUp();
                                stacks[stack].push(card);
                            }
                        }

                        deck.createStack();
                    },

                    /*
                     * 1) gather all tableau cards into an array
                     * 2) clear every tableau row/stack, then redeal the cards from the previous step onto the tableau
                     * 3) deal cards from the deck to fill the remaining free rows
                     */
                    redeal: function () {
                        const stacks = this.tableau.stacks,
                            deck = this.deck.stacks[0],
                            cards = Y.Array.reduce(stacks, [], function (
                                compact,
                                stack,
                            ) {
                                return compact.concat(stack.compact());
                            }),
                            len = cards.length;
                        let card, s, i;

                        stacks.forEach(function (stack) {
                            stack.node.remove();
                            stack.cards = [];
                            stack.createNode();
                        });

                        for (i = s = 0; i < len; i++) {
                            if (i && !(i % 5)) {
                                s++;
                            }
                            stacks[s].push(cards[i]);
                        }

                        while (i < 25 && deck.cards.length) {
                            if (!(i % 5)) {
                                s++;
                            }
                            card = deck.my_Last().faceUp();
                            card.moveTo(stacks[s]);
                            card.node.setStyle("zIndex", 100 - i);
                            i++;
                        }
                    },

                    height: function () {
                        return this.Card.base.height * 6;
                    },

                    Stack: Solitaire.instance(Solitaire.Stack, {
                        images: { deck: "freeslot.png" },

                        updateDragGroups: function () {
                            const active = Solitaire.activeCard;

                            this.cards.forEach(function (c) {
                                if (!c) {
                                    return;
                                }

                                if (active.validTarget(c)) {
                                    c.node.drop.addToGroup("open");
                                } else c.node.drop.removeFromGroup("open");
                            });
                        },

                        index: function () {
                            return 0;
                        },
                    }),

                    Events: Solitaire.instance(Solitaire.Events, {
                        drop: function (e) {
                            const active = Solitaire.activeCard,
                                foundation =
                                    Solitaire.game.foundation.stacks[0],
                                target = e.drop.get("node").getData("target");

                            if (!active) {
                                return;
                            }

                            Solitaire.stationary(function () {
                                target.moveTo(foundation);
                                active.moveTo(foundation);
                            });

                            Solitaire.endTurn();
                        },
                    }),

                    Foundation: {
                        stackConfig: {
                            total: 1,
                            layout: {
                                spacing: 0,
                                top: 0,
                                left: function () {
                                    return Solitaire.Card.width * 10.5;
                                },
                            },
                        },
                        field: "foundation",
                    },

                    Deck: Solitaire.instance(Solitaire.Deck, {
                        stackConfig: {
                            total: 1,
                            layout: {
                                spacing: 0,
                                top: 0,
                                left: function () {
                                    return Solitaire.Card.width * 2;
                                },
                            },
                        },
                        field: "deck",

                        createStack: function () {
                            for (
                                let i = 0, len = this.cards.length;
                                i < len;
                                i++
                            ) {
                                this.stacks[0].push(this.cards[i]);
                            }
                        },
                    }),

                    Tableau: {
                        stackConfig: {
                            total: 5,
                            layout: {
                                cardGap: 1.25,
                                vspacing: 1.25,
                                hspacing: 0,
                                top: 0,
                                left: function () {
                                    return Solitaire.Card.width * 3.5;
                                },
                            },
                        },
                        field: "tableau",
                    },

                    Card: Solitaire.instance(Solitaire.Card, {
                        row: function () {
                            return this.stack.index();
                        },

                        column: function () {
                            return this.stack.cards.indexOf(this);
                        },

                        /*
                         * return true if:
                         * 1) the target card is free
                         * 2) both cards are the same rank
                         * 3) both cards are adjacent vertically, horizontally, or diagonally
                         */

                        validTarget: function (card) {
                            if (!(this.rank === card.rank && card.isFree())) {
                                return false;
                            }

                            return (
                                Math.abs(card.row() - this.row()) <= 1 &&
                                Math.abs(card.column() - this.column()) <= 1
                            );
                        },

                        createProxyStack: function () {
                            let stack = null;

                            if (this.isFree()) {
                                stack = Solitaire.instance(this.stack);
                                stack.cards = this.proxyCards();
                            }

                            this.proxyStack = stack;

                            return this.proxyStack;
                        },

                        proxyCards: function () {
                            return [this];
                        },

                        isFree: function () {
                            return this.stack.field === "tableau";
                        },

                        turnOver: function () {
                            this.stack.field === "deck" &&
                                Solitaire.game.redeal();
                        },
                    }),
                },
            ));

        MonteCarlo.fields.forEach(function (field) {
            MonteCarlo[field].Stack = Solitaire.instance(MonteCarlo.Stack);
        });

        // Each tableau row is treated as a "stack"
        Y.mix(
            MonteCarlo.Tableau.Stack,
            {
                deleteItem: function (card) {
                    const cards = this.cards,
                        i = cards.indexOf(card);

                    if (i !== -1) {
                        cards[i] = null;
                    }
                },

                setCardPosition: function (card) {
                    const last = _.last(this.cards),
                        layout = MonteCarlo.Tableau.stackConfig.layout,
                        top = this.top,
                        left = last
                            ? last.left + card.width * layout.cardGap
                            : this.left;

                    card.left = left;
                    card.top = top;
                },

                compact: function () {
                    const cards = this.cards,
                        compact = [];

                    for (let i = 0, len = cards.length; i < len; i++) {
                        const card = cards[i];
                        if (card) {
                            compact.push(card);
                            card.pushPosition();
                        }
                    }

                    return compact;
                },

                index: function () {
                    return Solitaire.game.tableau.stacks.indexOf(this);
                },
            },
            true,
        );

        Y.mix(
            MonteCarlo.Deck.Stack,
            {
                updateDragGroups: function () {
                    const active = Solitaire.activeCard,
                        card = this.my_Last();

                    if (!card) {
                        return;
                    }

                    if (active.validTarget(card)) {
                        card.node.drop.addToGroup("open");
                    } else {
                        card.node.drop.removeFromGroup("open");
                    }
                },
            },
            true,
        );
    },
    "0.0.1",
    { requires: ["solitaire", "array-extras"] },
);

// --- pyramid.js ---
YUI.add(
    "pyramid",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Pyramid = (Y.Solitaire.Pyramid = Solitaire.instance(Solitaire, {
                fields: ["Foundation", "Deck", "Waste", "Tableau"],

                deal: function () {
                    const deck = this.deck,
                        stacks = this.tableau.stacks;

                    for (let stack = 0; stack < 7; stack++) {
                        for (let i = 0; i <= stack; i++) {
                            const card = deck.pop().faceUp();
                            stacks[stack].push(card);
                        }
                    }

                    deck.createStack();
                    deck.my_Last().faceUp();
                },

                turnOver: function () {
                    const deck = this.deck.stacks[0],
                        waste = this.waste.stacks[0];

                    if (deck.cards.length === 1) {
                        return;
                    }
                    deck.my_Last().moveTo(waste);
                },

                height: function () {
                    return this.Card.base.height * 4.85;
                },

                Stack: Solitaire.instance(Solitaire.Stack, {
                    images: {},

                    updateDragGroups: function () {
                        const active = Solitaire.activeCard;

                        this.cards.forEach(function (c) {
                            if (!c) {
                                return;
                            }

                            if (active.validTarget(c)) {
                                c.node.drop.addToGroup("open");
                            } else {
                                c.node.drop.removeFromGroup("open");
                            }
                        });
                    },
                }),

                Events: Solitaire.instance(Solitaire.Events, {
                    dragCheck: function (e) {
                        if (!Solitaire.game.autoPlay.call(this)) {
                            Solitaire.Events.dragCheck.call(this);
                        }
                    },

                    drop: function (e) {
                        const active = Solitaire.activeCard,
                            foundation = Solitaire.game.foundation.stacks[0],
                            target = e.drop.get("node").getData("target");

                        if (!active) {
                            return;
                        }

                        Solitaire.stationary(function () {
                            target.moveTo(foundation);
                            active.moveTo(foundation);
                        });

                        Solitaire.endTurn();
                    },
                }),

                Foundation: {
                    stackConfig: {
                        total: 1,
                        layout: {
                            hspacing: 0,
                            top: 0,
                            left: function () {
                                return Solitaire.Card.width * 8;
                            },
                        },
                    },
                    field: "foundation",
                },

                Deck: Solitaire.instance(Solitaire.Deck, {
                    stackConfig: {
                        total: 1,
                        layout: {
                            hspacing: 0,
                            top: 0,
                            left: 0,
                        },
                    },
                    field: "deck",

                    createStack: function () {
                        for (let i = 0, len = this.cards.length; i < len; i++) {
                            this.stacks[0].push(this.cards[i]);
                        }
                    },
                }),

                Waste: {
                    stackConfig: {
                        total: 1,
                        layout: {
                            hspacing: 0,
                            top: 0,
                            left: function () {
                                return Solitaire.Card.width * 1.5;
                            },
                        },
                    },
                    field: "waste",
                },

                Tableau: {
                    stackConfig: {
                        total: 7,
                        layout: {
                            vspacing: 0.6,
                            hspacing: -0.625,
                            cardGap: 1.25,
                            top: 0,
                            left: function () {
                                return Solitaire.Card.width * 5;
                            },
                        },
                    },
                    field: "tableau",
                },

                Card: Solitaire.instance(Solitaire.Card, {
                    validTarget: function (card) {
                        if (card.field === "foundation") {
                            // "card" is actually a stack :/
                            return this.isFree() && this.rank === 13;
                        }

                        if (card.isFree()) {
                            return this.rank + card.rank === 13;
                        }

                        return false;
                    },

                    createProxyNode: function () {
                        return this.rank === 13
                            ? ""
                            : Solitaire.Card.createProxyNode.call(this);
                    },

                    createProxyStack: function () {
                        let stack = null;

                        if (this.isFree()) {
                            stack = Solitaire.instance(this.stack);
                            stack.cards = this.proxyCards();
                        }

                        this.proxyStack = stack;

                        return this.proxyStack;
                    },

                    proxyCards: function () {
                        return [this];
                    },

                    isFree: function () {
                        const stack = this.stack,
                            stackIndex = stack.index(),
                            index = stack.cards.indexOf(this),
                            game = Solitaire.game,
                            next = stack.next();

                        if (stack.field === "deck" || stack.field === "waste") {
                            return !this.isFaceDown;
                        } else {
                            return !(
                                this.stack.field === "foundation" ||
                                (next &&
                                    (next.cards[index] ||
                                        next.cards[index + 1]))
                            );
                        }
                    },

                    turnOver: function () {
                        this.stack.field === "deck" &&
                            !this.isFaceDown &&
                            Solitaire.game.turnOver();
                    },
                }),
            }));

        Pyramid.fields.forEach(function (field) {
            Pyramid[field].Stack = Solitaire.instance(Pyramid.Stack);
        });

        Y.mix(
            Pyramid.Tableau.Stack,
            {
                deleteItem: function (card) {
                    const cards = this.cards,
                        i = cards.indexOf(card);

                    if (i !== -1) {
                        cards[i] = null;
                    }
                },

                setCardPosition: function (card) {
                    const layout = Pyramid.Tableau.stackConfig.layout,
                        last = _.last(this.cards),
                        top = this.top,
                        left = last
                            ? last.left + card.width * layout.cardGap
                            : this.left;

                    card.left = left;
                    card.top = top;
                    card.zIndex = this.index() * 10;
                },
            },
            true,
        );

        Y.mix(
            Pyramid.Deck.Stack,
            {
                deleteItem: function (card) {
                    Pyramid.Stack.deleteItem.call(this, card);
                    this.update();
                },

                update: function (undo) {
                    const last = this.my_Last();

                    last && last.faceUp(undo);
                },

                updateDragGroups: function () {
                    const active = Solitaire.activeCard,
                        card = this.my_Last();

                    if (!card) {
                        return;
                    }

                    if (active.validTarget(card)) {
                        card.node.drop.addToGroup("open");
                    } else {
                        card.node.drop.removeFromGroup("open");
                    }
                },
            },
            true,
        );

        Pyramid.Waste.Stack.updateDragGroups =
            Pyramid.Deck.Stack.updateDragGroups;
    },
    "0.0.1",
    { requires: ["solitaire"] },
);

// --- russian-solitaire.js ---
YUI.add(
    "russian-solitaire",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Yukon = Solitaire.Yukon,
            RussianSolitaire = (Solitaire.RussianSolitaire = Solitaire.instance(
                Yukon,
                {
                    Card: Solitaire.instance(Yukon.Card),
                },
            ));

        RussianSolitaire.Card.validTarget = function (stack) {
            const target = stack.my_Last();

            switch (stack.field) {
                case "tableau":
                    if (!target) {
                        return this.rank === 13;
                    } else {
                        return (
                            !target.isFaceDown &&
                            target.suit === this.suit &&
                            target.rank === this.rank + 1
                        );
                    }
                case "foundation":
                    if (!target) {
                        return this.rank === 1;
                    } else {
                        return (
                            target.suit === this.suit &&
                            target.rank === this.rank - 1
                        );
                    }
                default:
                    return false;
            }
        };
    },
    "0.0.1",
    { requires: ["yukon"] },
);

// --- scorpion.js ---
YUI.add(
    "scorpion",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Scorpion = (Solitaire.Scorpion = Solitaire.instance(Solitaire, {
                fields: ["Foundation", "Deck", "Tableau"],

                createEvents: function () {
                    Solitaire.AutoStackClear.register();
                    Solitaire.createEvents.call(this);
                },

                deal: function () {
                    const deck = this.deck,
                        stacks = this.tableau.stacks;

                    for (let row = 0; row < 7; row++) {
                        for (let stack = 0; stack < 7; stack++) {
                            const card = deck.pop();

                            if (!(row < 3 && stack < 4)) {
                                card.faceUp();
                            }

                            stacks[stack].push(card);
                        }
                    }

                    deck.createStack();
                },

                turnOver: function () {
                    const deck = this.deck.stacks[0],
                        stacks = this.tableau.stacks;

                    for (let i = 0; i < 3; i++) {
                        deck.my_Last().faceUp().moveTo(stacks[i]);
                    }
                },

                height: function () {
                    return this.Card.base.height * 5.6;
                },

                Stack: Solitaire.instance(Solitaire.Stack),

                Deck: Solitaire.instance(Solitaire.Deck, {
                    stackConfig: {
                        total: 1,
                        layout: {
                            top: 0,
                            left: function () {
                                return Solitaire.Card.width * 9;
                            },
                        },
                    },
                    field: "deck",

                    createStack: function () {
                        for (let i = this.cards.length - 1; i >= 0; i--) {
                            this.stacks[0].push(this.cards[i]);
                        }
                    },
                }),

                Foundation: {
                    stackConfig: {
                        total: 4,
                        layout: {
                            top: function () {
                                return Solitaire.Card.height * 1.1;
                            },
                            left: function () {
                                return Solitaire.Card.width * 9;
                            },
                            vspacing: 1.1,
                        },
                    },
                    field: "foundation",
                },

                Tableau: {
                    stackConfig: {
                        total: 7,
                        layout: {
                            hspacing: 1.25,
                            top: 0,
                            left: 0,
                        },
                    },
                    field: "tableau",
                },

                Card: Solitaire.instance(Solitaire.Card, {
                    playable: function () {
                        const field = this.stack.field;

                        return (
                            field === "deck" ||
                            (field === "tableau" && !this.isFaceDown)
                        );
                    },

                    validTarget: function (stack) {
                        const target = stack.my_Last();

                        if (stack.field !== "tableau") {
                            return false;
                        }

                        if (!target) {
                            return this.rank === 13;
                        } else {
                            return (
                                !target.isFaceDown &&
                                target.suit === this.suit &&
                                target.rank === this.rank + 1
                            );
                        }
                    },
                }),
            }));

        Scorpion.fields.forEach(function (field) {
            Scorpion[field].Stack = Solitaire.instance(Scorpion.Stack);
        });

        Y.mix(
            Scorpion.Stack,
            {
                validProxy: function (card) {
                    return true;
                },

                validTarget: function (stack) {
                    const cards = this.cards;

                    switch (stack.field) {
                        case "tableau":
                            return this.first().validTarget(stack);
                            break;
                        case "foundation":
                            const rank = _.last(this.cards).rank;
                            if (cards.length !== 13) {
                                return false;
                            }

                            for (let i = 0; i < 13; i++) {
                                if (cards[i].rank !== rank) {
                                    return false;
                                }
                            }

                            return true;
                            break;
                    }
                },
            },
            true,
        );

        Y.mix(
            Scorpion.Tableau.Stack,
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

// --- spider.js ---
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
                    const that = this;

                    if (hasFreeTableaus()) {
                        return;
                    }

                    this.eachStack(function (stack) {
                        const card = deck.my_Last();

                        if (card) {
                            card.faceUp()
                                .moveTo(stack)
                                .after(function () {
                                    that.stack.updateCardsPosition();
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
                                return Solitaire.Card.width * 2.5;
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
                                return Solitaire.Card.height * 1.5;
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

// --- spider1s.js ---
YUI.add(
    "spider1s",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Spider = (Y.Solitaire.Spider1S = Solitaire.instance(
                Y.Solitaire.Spider,
            ));

        Spider.Deck = Solitaire.instance(Y.Solitaire.Spider.Deck, {
            suits: ["s"],
            count: 8,
        });
    },
    "0.0.1",
    { requires: ["spider"] },
);

// --- spider2s.js ---
YUI.add(
    "spider2s",
    function (Y) {
        const Spider = (Y.Solitaire.Spider2S = Y.Solitaire.instance(
            Y.Solitaire.Spider,
        ));

        Spider.Deck = Y.Solitaire.instance(Y.Solitaire.Spider.Deck, {
            suits: ["s", "h"],
            count: 4,
        });
    },
    "0.0.1",
    { requires: ["spider"] },
);

// --- spiderette.js ---
YUI.add(
    "spiderette",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Klondike = Solitaire.Klondike,
            Spider = Solitaire.Spider,
            Spiderette = (Y.Solitaire.Spiderette = Solitaire.instance(Spider, {
                height: Klondike.height,
                deal: Klondike.deal,

                Tableau: Solitaire.instance(Spider.Tableau, {
                    stackConfig: Klondike.Tableau.stackConfig,
                }),
                Foundation: Solitaire.instance(Spider.Foundation, {
                    stackConfig: Klondike.Foundation.stackConfig,
                }),

                Deck: Solitaire.instance(Spider.Deck, {
                    count: 1,
                }),
            }));
    },
    "0.0.1",
    { requires: ["klondike", "spider"] },
);

// --- tritowers.js ---
YUI.add(
    "tri-towers",
    function (Y) {
        const Solitaire = Y.Solitaire,
            TriTowers = (Y.Solitaire.TriTowers = Solitaire.instance(
                Solitaire,
                {
                    fields: ["Deck", "Foundation", "Tableau"],

                    width: function () {
                        return this.Card.base.width * 15;
                    },
                    height: function () {
                        return this.Card.base.height * 5;
                    },
                    createEvents: function () {
                        Y.on("solitaire|endTurn", function () {
                            const tableaus = Solitaire.game.tableau.stacks;

                            for (let i = 0; i < 3; i++) {
                                Y.fire("tableau:afterPop", tableaus[i]);
                            }
                        });

                        Solitaire.createEvents.call(this);
                    },

                    deal: function () {
                        let card, stack, i, stackLength;

                        const stacks = this.tableau.stacks,
                            deck = this.deck,
                            foundation = this.foundation.stacks[0];
                        for (stack = 0; stack < 4; stack++) {
                            stackLength = (stack + 1) * 3;

                            for (i = 0; i < stackLength; i++) {
                                card = deck.pop();
                                stacks[stack].push(card);
                                stack === 3 && card.faceUp();
                            }
                        }

                        card = deck.pop().faceUp();
                        foundation.push(card);

                        deck.createStack();
                    },

                    turnOver: function () {
                        const deck = this.deck.stacks[0],
                            foundation = this.foundation.stacks[0],
                            last = deck.my_Last();

                        last && last.faceUp().moveTo(foundation);
                    },

                    isWon: function () {
                        let won = true;

                        this.eachStack(function (stack) {
                            stack.eachCard(function (card) {
                                if (card) {
                                    won = false;
                                }

                                return won;
                            });
                        }, "tableau");

                        return won;
                    },

                    Deck: Solitaire.instance(Solitaire.Deck, {
                        field: "deck",
                        stackConfig: {
                            total: 1,
                            layout: {
                                hspacing: 0,
                                top: function () {
                                    return Solitaire.Card.height * 4;
                                },
                                left: 0,
                            },
                        },

                        createStack: function () {
                            for (
                                let i = 0, len = this.cards.length;
                                i < len;
                                i++
                            ) {
                                this.stacks[0].push(this.cards[i]);
                            }
                        },
                    }),

                    Tableau: {
                        field: "tableau",
                        stackConfig: {
                            total: 4,
                            layout: {
                                rowGaps: [3.75, 2.5, 1.25, 0],
                                cardGap: 1.25,
                                vspacing: 0.6,
                                hspacing: -0.625,
                                top: 0,
                                left: function () {
                                    return Solitaire.Card.width * 1.875;
                                },
                            },
                        },
                    },

                    Foundation: {
                        field: "foundation",
                        stackConfig: {
                            total: 1,
                            layout: {
                                hspacing: 0,
                                top: function () {
                                    return Solitaire.Card.height * 4;
                                },
                                left: function () {
                                    return Solitaire.Card.width * 4;
                                },
                            },
                        },
                    },

                    Events: Solitaire.instance(Solitaire.Events, {
                        dragCheck: function (e) {
                            this.getCard().autoPlay();

                            /* workaround because YUI retains stale drag information if we halt the event :\ */
                            this._afterDragEnd();
                            e.halt();
                        },
                    }),

                    Card: Solitaire.instance(Solitaire.Card, {
                        /*
                         * return true if the target is 1 rank away from the this card
                         * Aces and Kings are valid targets for each other
                         */
                        validTarget: function (stack) {
                            if (stack.field !== "foundation") {
                                return false;
                            }

                            const card = stack.my_Last(),
                                diff = Math.abs(this.rank - card.rank);

                            return diff === 1 || diff === 12;
                        },

                        playable: function () {
                            const stack = this.stack;

                            return (
                                (stack.field === "deck" &&
                                    this === stack.my_Last()) ||
                                (this.isFree() &&
                                    this.validTarget(
                                        Solitaire.getGame().foundation
                                            .stacks[0],
                                    ))
                            );
                        },

                        isFree: function () {
                            const stack = this.stack,
                                next = stack.next(),
                                tower = this.tower(),
                                index = stack.cards.indexOf(this);

                            if (stack.field !== "tableau") {
                                return false;
                            }

                            if (!next) {
                                return true;
                            }

                            for (let i = 0; i < 2; i++) {
                                if (next.cards[index + tower + i]) {
                                    return false;
                                }
                            }

                            return true;
                        },

                        tower: function () {
                            const stack = this.stack,
                                index = stack.cards.indexOf(this),
                                stackIndex = stack.index() + 1;

                            return Math.floor(index / stackIndex);
                        },
                    }),

                    Stack: Solitaire.instance(Solitaire.Stack, {
                        images: {},
                    }),
                },
                true,
            ));

        TriTowers.fields.forEach(function (field) {
            TriTowers[field].Stack = Solitaire.instance(TriTowers.Stack);
        });

        Y.mix(
            TriTowers.Tableau.Stack,
            {
                deleteItem: function (card) {
                    const cards = this.cards,
                        i = cards.indexOf(card);

                    if (i !== -1) {
                        cards[i] = null;
                    }
                },

                setCardPosition: function (card) {
                    let left, index, stackIndex;
                    const last = this.my_Last(),
                        top = this.top,
                        layout = TriTowers.Tableau.stackConfig.layout,
                        rowGaps = layout.rowGaps,
                        cardGap = layout.cardGap;

                    if (last) {
                        left = last.left + card.width * cardGap;
                        index = this.cards.length;
                        stackIndex = this.index() + 1;

                        if (!(index % stackIndex)) {
                            left += rowGaps[stackIndex - 1] * card.width;
                        }
                    } else {
                        left = this.left;
                    }

                    card.top = top;
                    card.left = left;
                    card.zIndex = this.index() * 10;
                },
            },
            true,
        );

        Y.mix(
            TriTowers.Deck.Stack,
            {
                setCardPosition: function (card) {
                    const last = this.my_Last();
                    let left, zIndex;

                    const top = this.top;
                    if (last) {
                        left = last.left + card.width * 0.1;
                        zIndex = last.zIndex + 1;
                    } else {
                        left = this.left;
                        zIndex = 0;
                    }

                    card.top = top;
                    card.left = left;
                    card.zIndex = zIndex;
                },
            },
            true,
        );
    },
    "0.0.1",
    { requires: ["solitaire"] },
);

// --- will-o-the-wisp.js ---
YUI.add(
    "will-o-the-wisp",
    function (Y) {
        const Solitaire = Y.Solitaire,
            WillOTheWisp = (Y.Solitaire.WillOTheWisp = Solitaire.instance(
                Solitaire.Spiderette,
                {
                    deal: function () {
                        const deck = this.deck;

                        for (let row = 0; row < 3; row++) {
                            this.eachStack(function (stack) {
                                const card = deck.pop();
                                if (row === 2) {
                                    card.faceUp();
                                }

                                stack.push(card);
                            }, "tableau");
                        }

                        deck.createStack();
                    },
                },
            ));
    },
    "0.0.1",
    { requires: ["spiderette"] },
);

// --- yukon.js ---
YUI.add(
    "yukon",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Yukon = (Solitaire.Yukon = Solitaire.instance(Solitaire, {
                fields: ["Foundation", "Tableau"],

                deal: function () {
                    let card,
                        piles = 6,
                        stack = 0;
                    const deck = this.deck,
                        stacks = this.tableau.stacks;

                    while (piles >= 0) {
                        card = deck.pop().faceUp();
                        stacks[6 - piles].push(card);

                        for (stack = 7 - piles; stack < 7; stack++) {
                            card = deck.pop();
                            stacks[stack].push(card);
                        }
                        piles--;
                    }

                    stack = 1;
                    while (deck.cards.length) {
                        card = deck.pop().faceUp();
                        stacks[stack].push(card);
                        stack = (stack % 6) + 1;
                    }
                },

                height: function () {
                    return this.Card.base.height * 4.8;
                },

                Stack: Solitaire.instance(Solitaire.Stack),

                Foundation: {
                    stackConfig: {
                        total: 4,
                        layout: {
                            vspacing: 1.25,
                            top: 0,
                            left: function () {
                                return Solitaire.Card.width * 9;
                            },
                        },
                    },
                    field: "foundation",
                    draggable: false,
                },

                Tableau: {
                    stackConfig: {
                        total: 7,
                        layout: {
                            hspacing: 1.25,
                            top: 0,
                            left: 0,
                        },
                    },
                    field: "tableau",
                    draggable: true,
                },

                Card: Solitaire.instance(Solitaire.Card, {
                    playable: function () {
                        return (
                            this.stack.field === "tableau" && !this.isFaceDown
                        );
                    },

                    validTarget: function (stack) {
                        const target = stack.my_Last();

                        switch (stack.field) {
                            case "tableau":
                                if (!target) {
                                    return this.rank === 13;
                                } else {
                                    return (
                                        !target.isFaceDown &&
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
                            default:
                                return false;
                        }
                    },
                }),
            }));

        Yukon.fields.forEach(function (field) {
            Yukon[field].Stack = Solitaire.instance(Yukon.Stack);
        });

        Y.mix(
            Yukon.Stack,
            {
                validTarget: function (stack) {
                    return (
                        stack.field === "tableau" &&
                        this.first().validTarget(stack)
                    );
                },

                validProxy: function (card) {
                    return true;
                },
            },
            true,
        );

        Y.mix(
            Yukon.Tableau.Stack,
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
