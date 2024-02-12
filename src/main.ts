import * as Twodo from "twodo";

class KeyHole extends Twodo.Component {}
class Backroom extends Twodo.Component {}
class Interactable extends Twodo.Component {
    private _callbacks: ((...args: any[]) => any)[] = [];

    register_callback(callback: Twodo.Callback) {
        this._callbacks.push(callback);
    }

    trigger() {
        this._callbacks.forEach((callback) => callback());
    }
}

// Scene setup
const canvas = document.getElementById("game_canvas") as HTMLCanvasElement;
const scene = new Twodo.Scene(canvas!);
const camera = scene.ecs.create_entity<Twodo.CameraBundle>([
    new Twodo.Camera(canvas!.width, canvas!.height),
    new Twodo.Transform(),
]);

scene.active_camera = camera;

// Backroom
const backroom = scene.ecs.create_entity<[Backroom, Twodo.Transform, Twodo.Sprite]>([
    new Backroom(),
    new Twodo.Transform(),
    new Twodo.Sprite("./backroom.jpg"),
]);

backroom[1].depth = 1;
backroom[1].scale = new Twodo.Vector2(32, 18);
backroom[2].hidden = true;

// Key hole
const key_hole = scene.ecs.create_entity<[KeyHole, Twodo.Transform, Twodo.Sprite]>([
    new KeyHole(),
    new Twodo.Transform(),
    new Twodo.Sprite("./keyhole.png"),
]);

key_hole[1].depth = 0;
key_hole[1].scale = new Twodo.Vector2(32, 18);
key_hole[2].hidden = true;

// Door
const exit_backroom = document.getElementById("exit_backroom")!;
const door = scene.ecs.create_entity<[Interactable, Twodo.Transform, Twodo.Sprite]>([
    new Interactable(),
    new Twodo.Transform(),
    new Twodo.Sprite("./door.png"),
]);

door[1].scale = new Twodo.Vector2(4, 6);

door[0].register_callback(() => {
    key_hole[2].hidden = false;
    backroom[2].hidden = false;

    door[2].hidden = true;
    exit_backroom.classList.remove("hidden");
});

exit_backroom.onclick = () => {
    key_hole[2].hidden = true;
    backroom[2].hidden = true;

    door[2].hidden = false;
    exit_backroom.classList.add("hidden");
};

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
        key_hole[1].position = new Twodo.Vector2(-scene.input.mouse.position.x / 2, -scene.input.mouse.position.y / 2);

        backroom[1].position = new Twodo.Vector2(scene.input.mouse.position.x * 8, scene.input.mouse.position.y * 4);
    }

    requestAnimationFrame(update);
}

update();
