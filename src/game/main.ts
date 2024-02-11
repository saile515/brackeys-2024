import * as Twodo from "twodo";

async function game() {
    let canvas: HTMLCanvasElement;

    // Wait for canvas to load
    await new Promise((resolve) => {
        function wait_for_canvas() {
            canvas = document.getElementById("game_canvas") as HTMLCanvasElement;

            if (!canvas) {
                setTimeout(wait_for_canvas, 100);
            } else {
                resolve(null);
            }
        }

        wait_for_canvas();
    });

    const scene = new Twodo.Scene(canvas!);
    const camera = scene.ecs.create_entity<Twodo.CameraBundle>([
        new Twodo.Camera(canvas!.width, canvas!.height),
        new Twodo.Transform(),
    ]);

    scene.set_active_camera(camera);

    class KeyHole extends Twodo.Component {}
    class Background extends Twodo.Component {}

    const background = scene.ecs.create_entity<[Background, Twodo.Transform, Twodo.Sprite]>([
        new Background(),
        new Twodo.Transform(),
        new Twodo.Sprite("/background.jpg"),
    ]);

    background[1].depth = -1;
    background[1].scale = new Twodo.Vector2(32, 18);

    const key_hole = scene.ecs.create_entity<[KeyHole, Twodo.Transform, Twodo.Sprite]>([
        new KeyHole(),
        new Twodo.Transform(),
        new Twodo.Sprite("/keyhole.png"),
    ]);

    key_hole[1].scale = new Twodo.Vector2(32, 18);

    function update() {
        scene.draw();

        requestAnimationFrame(update);
    }

    update();
}

game();
