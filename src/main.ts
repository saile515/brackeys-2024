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
        exit_view.classList.add("hidden");
    } else {
        exit_view.classList.remove("hidden");
    }

    if (view == Candelabra) {
        scene.ecs.query<[Candle, Twodo.Sprite]>([Candle, Twodo.Sprite]).forEach(([candle, sprite]) => {
            sprite.hidden = !candles[candle.index];
        });
    }
}

const exit_view = document.getElementById("exit_view")!;

exit_view.onclick = () => {
    show_view(Frontroom);
};

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
    blueprint: boolean;
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
        blueprint: false,
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

            item_element.innerText = item;
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
                    if (item == "receipt" || item == "blueprint") {
                        const item_preview = document.createElement("div");
                        const item_image = document.createElement("img");

                        item_image.src = `./${item}.png`;

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
    new Twodo.Sprite("./frontroom.jpg"),
]);

front_room[1].scale = new Twodo.Vector2(26, 14);

// Door
const door = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./door.png"),
]);

door[2].position = new Twodo.Vector2(0, -0.7);
door[2].scale = new Twodo.Vector2(6, 8);

door[1].register_callback(() => {
    show_view(Backroom);
});

// Card
const card = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./card.png"),
]);

card[2].position = new Twodo.Vector2(-2, -5.5);
card[2].scale = new Twodo.Vector2(0.4, 0.6);

card[1].register_callback(() => {
    inventory.items.card = true;
    scene.ecs.delete_entity(card[0].parent!);
});

// Card terminal
const card_terminal = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./card-terminal.png"),
]);

card_terminal[2].position = new Twodo.Vector2(9, -5);

card_terminal[1].register_callback(() => {
    show_view(CardTerminal);
});

// Candelabra
const candelabra = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./candelabra.png"),
]);

candelabra[2].position = new Twodo.Vector2(5, -5);
candelabra[2].scale = new Twodo.Vector2(3, 3);

candelabra[1].register_callback(() => {
    show_view(Candelabra);
});

// Cable
const cable = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./cable.png"),
]);

cable[2].position = new Twodo.Vector2(-8.1, -5);
cable[2].scale = new Twodo.Vector2(2, 1);

cable[1].register_callback(() => {
    if (inventory.selected_item == "tape") {
        cable[3].src = "cable-fixed.png";
    }
});

// Saw
const saw = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./saw.png"),
]);

saw[2].position = new Twodo.Vector2(-6, -4);
saw[2].scale = new Twodo.Vector2(4, 4);

saw[1].register_callback(() => {
    show_view(Saw);
});

// Painting
const painting = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./painting.png"),
]);

painting[2].position = new Twodo.Vector2(5, 2);
painting[2].scale = new Twodo.Vector2(3, 2);

painting[1].register_callback(() => {
    show_view(Painting);
});

// ---------------- Card terminal ----------------- //
const card_terminal_large = scene.ecs.create_entity<[CardTerminal, Twodo.Transform, Twodo.Sprite]>([
    new CardTerminal(),
    new Twodo.Transform(),
    new Twodo.Sprite("./card-terminal-large.webp"),
]);

card_terminal_large[1].scale = new Twodo.Vector2(16, 9);

class CardTerminalButton extends Twodo.Component {
    digit: string;

    constructor(digit: number) {
        super();
        this.digit = digit.toString();
    }
}

for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
        const card_terminal_button = scene.ecs.create_entity<
            [CardTerminal, CardTerminalButton, Interactable, Twodo.Transform]
        >([new CardTerminal(), new CardTerminalButton((2 - y) * 3 + x + 1), new Interactable(), new Twodo.Transform()]);

        card_terminal_button[3].position = new Twodo.Vector2(x - 1, y - 1.9);
    }
}

{
    const card_terminal_button = scene.ecs.create_entity<
        [CardTerminal, CardTerminalButton, Interactable, Twodo.Transform]
    >([new CardTerminal(), new CardTerminalButton(0), new Interactable(), new Twodo.Transform()]);

    card_terminal_button[3].position = new Twodo.Vector2(0, -3);
}

const card_terminal_enter = scene.ecs.create_entity<[CardTerminal, Interactable, Twodo.Transform]>([
    new CardTerminal(),
    new Interactable(),
    new Twodo.Transform(),
]);

card_terminal_enter[2].position = new Twodo.Vector2(1, -3);

const correct_code = "123456";
let code = "";

function submit_code() {
    console.log(code);
    if (code == correct_code && inventory.selected_item == "card") {
        inventory.items.receipt = true;
    }
    code = "";
}

scene.ecs
    .query<[CardTerminalButton, Interactable]>([CardTerminalButton, Interactable])
    .forEach(([button, interactable]) => {
        interactable.register_callback(() => {
            if (code.length >= 6) {
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
    new Twodo.Sprite("./candelabra.png"),
]);

candelabra_large[2].scale = new Twodo.Vector2(10, 10);

const candle_positions = [
    new Twodo.Vector2(-3, 0),
    new Twodo.Vector2(-2, 0),
    new Twodo.Vector2(-1, 0),
    new Twodo.Vector2(0, 0),
    new Twodo.Vector2(1, 0),
    new Twodo.Vector2(2, 0),
    new Twodo.Vector2(3, 0),
];

const correct_candles = [true, false, true, false, true, false, true];
const candles = [false, false, false, false, false, false, false];

for (let i = 0; i < candle_positions.length; i++) {
    const candle = scene.ecs.create_entity<[Candelabra, Candle, Interactable, Twodo.Transform, Twodo.Sprite]>([
        new Candelabra(),
        new Candle(i),
        new Interactable(),
        new Twodo.Transform(),
        new Twodo.Sprite("./candle.png"),
    ]);

    candle[3].position = candle_positions[i];

    candle[2].register_callback(() => {
        candles[i] = !candles[i];
        candle[4].hidden = !candles[i];

        if (candles.toString() == correct_candles.toString()) {
            inventory.items.tape = true;
        }
    });
}

// --------------------- Saw ---------------------- //
const saw_large = scene.ecs.create_entity<[Saw, Twodo.Transform, Twodo.Sprite]>([
    new Saw(),
    new Twodo.Transform(),
    new Twodo.Sprite("./saw.png"),
]);

saw_large[1].scale = new Twodo.Vector2(10, 10);

// ------------------- Painting ------------------- //
const painting_large = scene.ecs.create_entity<[Painting, Twodo.Transform, Twodo.Sprite]>([
    new Painting(),
    new Twodo.Transform(),
    new Twodo.Sprite("./painting.png"),
]);

painting_large[1].scale = new Twodo.Vector2(15, 10);

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
    }

    requestAnimationFrame(update);
}

update();
