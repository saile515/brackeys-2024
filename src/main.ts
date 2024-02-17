import * as Twodo from "twodo";

// Views
class Backroom extends Twodo.Component {}
class Frontroom extends Twodo.Component {}
class CardTerminal extends Twodo.Component {}
class Candelabra extends Twodo.Component {}
class Saw extends Twodo.Component {}
class Painting extends Twodo.Component {}

// Utility
class Interactable extends Twodo.Component {
    private _callbacks: ((...args: any[]) => any)[] = [];
    disabled = false;

    register_callback(callback: Twodo.Callback) {
        this._callbacks.push(callback);
    }

    trigger() {
        if (this.disabled) {
            return;
        }

        this._callbacks.forEach((callback) => callback());
    }
}

function show_view(view: new () => Twodo.Component) {
    // Reset state
    scene.ecs.query<[Twodo.Sprite]>([Twodo.Sprite]).forEach(([sprite]) => {
        sprite.hidden = true;
    });

    scene.ecs.query<[Interactable]>([Interactable]).forEach(([interactable]) => {
        interactable.disabled = true;
    });

    // Turn on elements in view
    scene.ecs.query<[Twodo.Component, Twodo.Sprite]>([view, Twodo.Sprite]).forEach(([, sprite]) => {
        sprite.hidden = false;
    });

    scene.ecs.query<[Twodo.Component, Interactable]>([view, Interactable]).forEach(([, interactable]) => {
        interactable.disabled = false;
    });

    if (view == Frontroom) {
        if (screws_left == 0) {
            painting[3].hidden = true;
        }
        exit_view.classList.add("hidden");
    } else {
        exit_view.classList.remove("hidden");
    }

    if (view == Candelabra) {
        scene.ecs.query<[Candle, Twodo.Sprite]>([Candle, Twodo.Sprite]).forEach(([candle, sprite]) => {
            sprite.hidden = !candles[candle.index];
        });
    }

    if (view == Backroom && inventory.items.screwdriver) {
        screwdriver[2].hidden = true;
    }

    code = "";
    safe_code = "";
    sequence = "";
}

const exit_view = document.getElementById("exit_view")!;

exit_view.onclick = () => {
    show_view(Frontroom);
};

const click = new Audio("./click.wav");
const grab = new Audio("./grab.wav");
const error = new Audio("./error.wav");

// Scene setup
const canvas = document.getElementById("game_canvas") as HTMLCanvasElement;
const scene = new Twodo.Scene(canvas!);
const camera = scene.ecs.create_entity<Twodo.CameraBundle>([
    new Twodo.Camera(canvas!.width, canvas!.height),
    new Twodo.Transform(),
]);

scene.active_camera = camera;

// Inventory

type Items = {
    card: boolean;
    receipt: boolean;
    tape: boolean;
    stick: boolean;
    screwdriver: boolean;
    key: boolean;
};

const inventory_target: {
    items: Items;
    selected_item: keyof Items | null;
} = {
    items: {
        card: false,
        receipt: false,
        tape: false,
        stick: false,
        screwdriver: false,
        key: false,
    },
    selected_item: null,
};

const inventory_callbacks: Twodo.Callback[] = [];

// Detects changes to inventory and runs callbacks
const inventory = new Proxy(inventory_target, {
    // Typescript spaget
    get(object, item) {
        if (typeof object[item as keyof typeof object] == "object" && object[item as keyof typeof object] != null) {
            return new Proxy(object[item as keyof typeof object] as Items, this as ProxyHandler<Items>);
        } else {
            return object[item as keyof typeof object];
        }
    },
    set(object, item, value) {
        object[item as keyof typeof object] = value;

        inventory_callbacks.forEach((callback) => callback());
        return true;
    },
});

const inventory_element = document.getElementById("inventory")!;

inventory_callbacks.push(() => {
    // Clear inventory element
    inventory_element.innerHTML = "";

    for (let item in inventory.items) {
        // Add item to hotbar if in inventory
        if (inventory.items[item as keyof Items] == true) {
            const item_element = document.createElement("button");

            item_element.style.backgroundImage = `url('./${item}.webp')`;
            item_element.style.backgroundSize = "contain";
            item_element.style.backgroundRepeat = "no-repeat";
            item_element.style.backgroundPosition = "center";
            item_element.classList.add("inventory-item");

            if (item == inventory.selected_item) {
                item_element.classList.add("selected-item");
            }

            item_element.onclick = () => {
                if (item == inventory.selected_item) {
                    // Deselect if selected
                    inventory.selected_item = null;

                    Array.from(document.getElementsByClassName("item_preview")).forEach((element) => {
                        element.remove();
                    });
                } else {
                    // Select if not selected
                    inventory.selected_item = item as keyof Items;

                    // Show item preview if item is previewable
                    if (item == "receipt") {
                        const item_preview = document.createElement("div");
                        const item_image = document.createElement("img");

                        item_image.src = `./${item}.webp`;

                        item_preview.appendChild(item_image);

                        item_preview.classList.add("item-preview");

                        inventory_element.appendChild(item_preview);
                    }
                }
            };
            inventory_element.appendChild(item_element);
        }
    }
});

// ------------------- Entities ------------------- //

// ------------------- Backroom ------------------- //
const backroom = scene.ecs.create_entity<[Backroom, Twodo.Transform, Twodo.Sprite]>([
    new Backroom(),
    new Twodo.Transform(),
    new Twodo.Sprite("./backroom.jpg"),
]);

backroom[1].depth = 1;
backroom[1].scale = new Twodo.Vector2(32, 18);

const screwdriver = scene.ecs.create_entity<[Backroom, Twodo.Transform, Twodo.Sprite]>([
    new Backroom(),
    new Twodo.Transform(),
    new Twodo.Sprite("./screwdriver.webp"),
]);

screwdriver[1].scale = new Twodo.Vector2(1.41 * 1.3, 0.44 * 1.3);

// Key hole
const key_hole = scene.ecs.create_entity<[Backroom, Twodo.Transform, Twodo.Sprite]>([
    new Backroom(),
    new Twodo.Transform(),
    new Twodo.Sprite("./keyhole.png"),
]);

key_hole[1].depth = 0;
key_hole[1].scale = new Twodo.Vector2(32, 18);

// ------------------ Frontroom ------------------- //
const front_room = scene.ecs.create_entity<[Frontroom, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Twodo.Transform(),
    new Twodo.Sprite("./front-room.webp"),
]);

front_room[1].scale = new Twodo.Vector2(19.2 * 1.3, 10.8 * 1.3);

// Door
const door = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./door.webp"),
]);

door[2].position = new Twodo.Vector2(0.88, 0.1);
door[2].scale = new Twodo.Vector2(2.95 * 1.3, 5.21 * 1.3);

door[1].register_callback(() => {
    if (inventory.selected_item == "key") {
        scene.ecs.delete_entity(door[0].parent!);
    } else {
        show_view(Backroom);
    }
});

// Card
const card = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./card.webp"),
]);

card[2].position = new Twodo.Vector2(-1, -4.2);
card[2].scale = new Twodo.Vector2(0.73 * 1.3, 0.36 * 1.3);

card[1].register_callback(() => {
    inventory.items.card = true;
    grab.play();
    scene.ecs.delete_entity(card[0].parent!);
});

// Card terminal
const card_terminal = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./card-terminal.webp"),
]);

card_terminal[2].position = new Twodo.Vector2(-6.3, -3.5);
card_terminal[2].scale = new Twodo.Vector2(0.8 * 1.3, 0.4 * 1.3);

card_terminal[1].register_callback(() => {
    show_view(CardTerminal);
});

// Candelabra
const candelabra = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./candelabra.webp"),
]);

candelabra[2].position = new Twodo.Vector2(-4, -1.2);
candelabra[2].scale = new Twodo.Vector2(1.22 * 1.3, 1.12 * 1.3);

candelabra[1].register_callback(() => {
    show_view(Candelabra);
});

// Chair
const chair = scene.ecs.create_entity<[Frontroom, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Twodo.Transform(),
    new Twodo.Sprite("./chair.webp"),
]);

chair[1].position = new Twodo.Vector2(8.3, -2.5);
chair[1].scale = new Twodo.Vector2(2.79 * 1.3, 4.29 * 1.3);

// Cable
const cable = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./broken-cable.webp"),
]);

let cable_fixed = false;

cable[2].position = new Twodo.Vector2(11.3, -4.45);
cable[2].scale = new Twodo.Vector2(1.52 * 1.3, 2.23 * 1.3);

cable[1].register_callback(() => {
    if (inventory.selected_item == "tape") {
        cable[3].src = "fixed-cable.webp";
        cable_fixed = true;
    }
});

// Saw
const saw = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./saw.webp"),
]);

saw[2].position = new Twodo.Vector2(9.7, -4.7);
saw[2].scale = new Twodo.Vector2(1.06 * 1.3, 0.8 * 1.3);

saw[1].register_callback(() => {
    show_view(Saw);
});

// Painting
const painting = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./painting.webp"),
]);

painting[2].position = new Twodo.Vector2(-3.4, 1.4);
painting[2].scale = new Twodo.Vector2(2.57 * 1.3, 2.32 * 1.3);

painting[1].register_callback(() => {
    show_view(Painting);
});

// Under door
const under_door = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
]);

under_door[2].position = new Twodo.Vector2(0.88, -4);
under_door[2].scale = new Twodo.Vector2(2.95 * 1.3, 2);

under_door[1].register_callback(() => {
    if (inventory.selected_item == "stick") {
        inventory.items.screwdriver = true;
        grab.play();
    }
});

// ---------------- Card terminal ----------------- //
const card_terminal_large = scene.ecs.create_entity<[CardTerminal, Twodo.Transform, Twodo.Sprite]>([
    new CardTerminal(),
    new Twodo.Transform(),
    new Twodo.Sprite("./card-terminal-large.webp"),
]);

card_terminal_large[1].scale = new Twodo.Vector2(16, 9);

class Button extends Twodo.Component {
    digit: string;

    constructor(digit: number) {
        super();
        this.digit = digit.toString();
    }
}

for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
        const card_terminal_button = scene.ecs.create_entity<[CardTerminal, Button, Interactable, Twodo.Transform]>([
            new CardTerminal(),
            new Button((2 - y) * 3 + x + 1),
            new Interactable(),
            new Twodo.Transform(),
        ]);

        card_terminal_button[3].position = new Twodo.Vector2(x - 1, y - 1.9);
    }
}

{
    const card_terminal_button = scene.ecs.create_entity<[CardTerminal, Button, Interactable, Twodo.Transform]>([
        new CardTerminal(),
        new Button(0),
        new Interactable(),
        new Twodo.Transform(),
    ]);

    card_terminal_button[3].position = new Twodo.Vector2(0, -3);
}

const card_terminal_enter = scene.ecs.create_entity<[CardTerminal, Interactable, Twodo.Transform]>([
    new CardTerminal(),
    new Interactable(),
    new Twodo.Transform(),
]);

card_terminal_enter[2].position = new Twodo.Vector2(1, -3);

const correct_code = "2429";
let code = "";

function submit_code() {
    if (code == correct_code && inventory.selected_item == "card") {
        inventory.items.receipt = true;
        grab.play();
    } else {
        error.play();
    }
    code = "";
}

scene.ecs
    .query<[CardTerminal, Button, Interactable]>([CardTerminal, Button, Interactable])
    .forEach(([, button, interactable]) => {
        interactable.register_callback(() => {
            click.play();
            if (code.length >= 4) {
                return;
            }
            code += button.digit;
        });
    });

card_terminal_enter[1].register_callback(() => {
    submit_code();
});

// ------------------ Candelabra ------------------ //
class Candle extends Twodo.Component {
    index: number;

    constructor(index: number) {
        super();
        this.index = index;
    }
}

const candelabra_large = scene.ecs.create_entity<[Candelabra, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Candelabra(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./candelabra-large.webp"),
]);

candelabra_large[2].scale = new Twodo.Vector2(16, 9);

const candle_positions = [
    new Twodo.Vector2(-3.6, 1.7),
    new Twodo.Vector2(-2.46, 2.21),
    new Twodo.Vector2(-1.22, 2.7),
    new Twodo.Vector2(0, 3.22),
    new Twodo.Vector2(1.15, 2.7),
    new Twodo.Vector2(2.3, 2.24),
    new Twodo.Vector2(3.5, 1.75),
];

const correct_candles = [true, false, true, false, true, true, true];
const candles = [true, false, false, true, true, false, false];

for (let i = 0; i < candle_positions.length; i++) {
    const candle = scene.ecs.create_entity<[Candelabra, Candle, Interactable, Twodo.Transform, Twodo.Sprite]>([
        new Candelabra(),
        new Candle(i),
        new Interactable(),
        new Twodo.Transform(),
        new Twodo.Sprite("./candle.webp"),
    ]);

    candle[3].position = candle_positions[i];
    candle[3].scale = new Twodo.Vector2(1.1, 1.3);

    candle[2].register_callback(() => {
        candles[i] = !candles[i];
        candle[4].hidden = !candles[i];
        click.play();

        if (candles.toString() == correct_candles.toString()) {
            inventory.items.tape = true;
            grab.play();
        }
    });
}

// --------------------- Saw ---------------------- //
const saw_large = scene.ecs.create_entity<[Saw, Twodo.Transform, Twodo.Sprite]>([
    new Saw(),
    new Twodo.Transform(),
    new Twodo.Sprite("./saw-large.webp"),
]);

saw_large[1].scale = new Twodo.Vector2(32, 18);

const saw_button_positions = [
    new Twodo.Vector2(2.3, 4.5),
    new Twodo.Vector2(5.8, 4.3),
    new Twodo.Vector2(4.3, 1.8),
    new Twodo.Vector2(7.9, 2),
    new Twodo.Vector2(3.5, -1.1),
    new Twodo.Vector2(7.4, -0.9),
];

let sequence = "";
const correct_sequence = "2233010154";

saw_button_positions.forEach((position, index) => {
    const button = scene.ecs.create_entity<[Saw, Interactable, Twodo.Transform]>([
        new Saw(),
        new Interactable(),
        new Twodo.Transform(),
    ]);

    button[2].position = position;
    button[2].scale = new Twodo.Vector2(2.5, 2.5);

    button[1].register_callback(() => {
        click.play();

        if (!cable_fixed) {
            return;
        }

        sequence += index;
        if (sequence.length >= 10) {
            if (sequence == correct_sequence) {
                inventory.items.stick = true;
                chair[2].src = "./broken-chair.webp";
                grab.play();
            } else {
                error.play();
            }
            sequence = "";
        }
    });
});

// ------------------- Painting ------------------- //
const safe = scene.ecs.create_entity<[Painting, Twodo.Transform, Twodo.Sprite]>([
    new Painting(),
    new Twodo.Transform(),
    new Twodo.Sprite("./safe.webp"),
]);

safe[1].scale = new Twodo.Vector2(30, 16);

for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
        const safe_button = scene.ecs.create_entity<[Painting, Button, Interactable, Twodo.Transform]>([
            new Painting(),
            new Button((2 - y) * 3 + x + 1),
            new Interactable(),
            new Twodo.Transform(),
        ]);

        safe_button[3].position = new Twodo.Vector2(x / 1.5 - 1.5, y / 1.6 + 0.8);
        safe_button[3].scale = new Twodo.Vector2(0.7, 0.7);
    }
}

{
    const safe_button = scene.ecs.create_entity<[Painting, Button, Interactable, Twodo.Transform]>([
        new Painting(),
        new Button(0),
        new Interactable(),
        new Twodo.Transform(),
    ]);

    safe_button[3].position = new Twodo.Vector2(-0.9, 0.24);
    safe_button[3].scale = new Twodo.Vector2(0.7, 0.7);
}

const safe_enter = scene.ecs.create_entity<[Painting, Interactable, Twodo.Transform]>([
    new Painting(),
    new Interactable(),
    new Twodo.Transform(),
]);

safe_enter[2].position = new Twodo.Vector2(-0.15, 0.24);
safe_enter[2].scale = new Twodo.Vector2(0.7, 0.7);

const correct_safe_code = "190655";
let safe_code = "";

function submit_safe_code() {
    if (safe_code == correct_safe_code) {
        inventory.items.key = true;
        safe[2].src = "./open-safe.webp";
        grab.play();
    } else {
        error.play();
    }
    safe_code = "";
}

scene.ecs
    .query<[Painting, Button, Interactable]>([Painting, Button, Interactable])
    .forEach(([, button, interactable]) => {
        interactable.register_callback(() => {
            if (screws_left != 0) {
                return;
            }

            click.play();

            if (safe_code.length >= 6) {
                return;
            }

            safe_code += button.digit;
        });
    });

safe_enter[1].register_callback(() => {
    click.play();
    submit_safe_code();
});

const painting_large = scene.ecs.create_entity<[Painting, Twodo.Transform, Twodo.Sprite]>([
    new Painting(),
    new Twodo.Transform(),
    new Twodo.Sprite("./painting-large.webp"),
]);

painting_large[1].scale = new Twodo.Vector2(15, 10);

const screw_positions = [
    new Twodo.Vector2(-6.6, -3.9),
    new Twodo.Vector2(6.1, -4),
    new Twodo.Vector2(6.5, 3.8),
    new Twodo.Vector2(-6.3, 4.1),
];

let screws_left = 4;

screw_positions.forEach((position) => {
    const screw = scene.ecs.create_entity<[Painting, Interactable, Twodo.Transform, Twodo.Sprite]>([
        new Painting(),
        new Interactable(),
        new Twodo.Transform(),
        new Twodo.Sprite("./screw.webp"),
    ]);

    screw[2].position = position;

    screw[1].register_callback(() => {
        if (inventory.selected_item == "screwdriver") {
            scene.ecs.delete_entity(screw[0].parent!);
            screws_left--;
            click.play();
            if (screws_left == 0) {
                scene.ecs.delete_entity(painting_large[0].parent!);
            }
        }
    });
});

// ------------------ !Entities ------------------- //

// Handle clicking
scene.input.mouse.register_callback("left_click", () => {
    const world_space = scene.input.mouse.position.clip_space_to_world_space(scene);
    scene.ecs
        .query<[Interactable, Twodo.Transform]>([Interactable, Twodo.Transform])
        .forEach(([interactable, transform]) => {
            const bottom_left = new Twodo.Vector2(
                transform.position.x - transform.scale.x / 2,
                transform.position.y - transform.scale.y / 2,
            );

            const top_right = new Twodo.Vector2(
                transform.position.x + transform.scale.x / 2,
                transform.position.y + transform.scale.y / 2,
            );

            if (world_space.is_within(bottom_left, top_right)) {
                interactable.trigger();
            }
        });
});

show_view(Frontroom);

function update() {
    scene.draw();

    // Key hole look controls
    if (!key_hole[2].hidden) {
        key_hole[1].position = new Twodo.Vector2(-scene.input.mouse.position.x / 2, scene.input.mouse.position.y / 2);

        backroom[1].position = new Twodo.Vector2(scene.input.mouse.position.x * 8, -scene.input.mouse.position.y * 4);

        screwdriver[1].position = new Twodo.Vector2(
            scene.input.mouse.position.x * 8,
            -scene.input.mouse.position.y * 4 - 6,
        );
    }

    requestAnimationFrame(update);
}

update();
