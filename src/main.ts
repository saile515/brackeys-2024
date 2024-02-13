import * as Twodo from "twodo";

// Views
class Backroom extends Twodo.Component {}
class Frontroom extends Twodo.Component {}

// Utility
class Interactable extends Twodo.Component {
    private _callbacks: ((...args: any[]) => any)[] = [];

    register_callback(callback: Twodo.Callback) {
        this._callbacks.push(callback);
    }

    trigger() {
        this._callbacks.forEach((callback) => callback());
    }
}

function show_view(view: new () => Twodo.Component) {
    scene.ecs.query<[Twodo.Component, Twodo.Sprite]>([view, Twodo.Sprite]).forEach(([, sprite]) => {
        sprite.hidden = false;
    });
}

function hide_view(view: new () => Twodo.Component) {
    scene.ecs.query<[Twodo.Component, Twodo.Sprite]>([view, Twodo.Sprite]).forEach(([, sprite]) => {
        sprite.hidden = true;
    });
}

// Scene setup
const canvas = document.getElementById("game_canvas") as HTMLCanvasElement;
const scene = new Twodo.Scene(canvas!);
const camera = scene.ecs.create_entity<Twodo.CameraBundle>([
    new Twodo.Camera(canvas!.width, canvas!.height),
    new Twodo.Transform(),
]);

scene.active_camera = camera;

// Inventory

type Items = { card: boolean; receipt: boolean; tape: boolean; stick: boolean; screwdriver: boolean; key: boolean };

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

// Typescript spaget
const inventory = new Proxy(inventory_target, {
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
    for (let item in inventory.items) {
        if (inventory.items[item as keyof Items] == true) {
            inventory_element.innerHTML = "";
            const item_element = document.createElement("button");

            item_element.innerText = item;
            item_element.classList.add("inventory-item");

            if (item == inventory.selected_item) {
                item_element.classList.add("selected-item");
            }

            item_element.onclick = () => {
                if (item == inventory.selected_item) {
                    inventory.selected_item = null;
                } else {
                    inventory.selected_item = item as keyof Items;
                }
            };
            inventory_element.appendChild(item_element);
        }
    }
});

// ------------------- Entities ------------------- //

// Backroom
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

hide_view(Backroom);

// Frontroom
const front_room = scene.ecs.create_entity<[Frontroom, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Twodo.Transform(),
    new Twodo.Sprite("./frontroom.jpg"),
]);

front_room[1].scale = new Twodo.Vector2(26, 14);

// Door
const exit_backroom = document.getElementById("exit_backroom")!;
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

    hide_view(Frontroom);
    exit_backroom.classList.remove("hidden");
});

exit_backroom.onclick = () => {
    hide_view(Backroom);

    show_view(Frontroom);
    exit_backroom.classList.add("hidden");
};

// Card
const card = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./card.png"),
]);

card[2].position = new Twodo.Vector2(-4, -5.5);
card[2].scale = new Twodo.Vector2(0.4, 0.6);
card[2].rotation = -80;

card[1].register_callback(() => {
    inventory.items.card = true;
    card[3].hidden = true;
});

// Card terminal
const card_terminal = scene.ecs.create_entity<[Frontroom, Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Frontroom(),
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./card-terminal.jpg"),
]);

card_terminal[2].position = new Twodo.Vector2(5, 5);
card_terminal[2].rotation = -60;

card_terminal[1].register_callback(() => {
    if (inventory.selected_item == "card") {
        inventory.items.receipt = true;
    }
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

function update() {
    scene.draw();

    if (!key_hole[2].hidden) {
        key_hole[1].position = new Twodo.Vector2(-scene.input.mouse.position.x / 2, scene.input.mouse.position.y / 2);

        backroom[1].position = new Twodo.Vector2(scene.input.mouse.position.x * 8, -scene.input.mouse.position.y * 4);
    }

    requestAnimationFrame(update);
}

update();
