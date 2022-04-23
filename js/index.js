import("../pkg/index.js")
  .then((wasm) => {
    import("../pkg/index_bg.wasm").then((w) => {
      let game = wasm.Game.new();
      let status = "begin"; // begin | play | end
      let CELL_SIZE = Math.min(
        (window.innerHeight - 100) / 20,
        (window.innerWidth - 100) / 10
      );
      const canvas = document.getElementById("tetris-canvas");
      canvas.width = 10 * (CELL_SIZE + 2) + 2;
      canvas.height = 24 * (CELL_SIZE + 2) + 2;
      canvas.style.marginTop = `${CELL_SIZE * -4}px`;

      const ctx = canvas.getContext("2d");

      const colors = {
        0: "#000000",
        1: "#780737",
        2: "#d29708",
        3: "#125f03",
        4: "#e9e2c7",
        5: "#9b6928",
        6: "#1c7180",
        7: "#569f1b",
      };

      window.addEventListener("resize", (e) => {
        CELL_SIZE = Math.min(
          (window.innerHeight - 100) / 20,
          (window.innerWidth - 100) / 10
        );
        canvas.width = 10 * (CELL_SIZE + 2) + 2;
        canvas.height = 24 * (CELL_SIZE + 2) + 2;
        canvas.marginTop = `${CELL_SIZE * -4}px`;
      });

      document.addEventListener("keypress", (e) => {
        switch (e.code) {
          case "Space":
            status = "play";
            draw();
            break;
          case "KeyA":
            game.input(8);
            draw();
            break;
          case "KeyD":
            game.input(16);
            draw();
            break;
          case "KeyW":
            game.input(2);
            draw();
            break;
          case "KeyS":
            game.input(4);
            draw();
            break;
          default:
            break;
        }
      });

      function startScreen() {
        for (let i = 0; i < 6; i++) {
          for (let j = 0; j < 6; j++) {
            ctx.fillStyle = `rgb(
              ${Math.floor(255 - 42.5 * i)},
              ${Math.floor(255 - 42.5 * j)},
              0)`;
            ctx.fillRect(
              j * 25 + CELL_SIZE * 4,
              i * 25 + CELL_SIZE * 4,
              25,
              25
            );
          }
        }

        ctx.fillStyle = "#ff0000";
        ctx.font = "50px serif";
        ctx.fillText("Hello", 100, 200);

        ctx.font = "20px serif";
        ctx.fillText("Hit space to start", 100, 400);
      }

      function endScreen() {
        for (let i = 0; i < 6; i++) {
          for (let j = 0; j < 6; j++) {
            ctx.fillStyle = `rgb(
              ${Math.floor(255 - 42.5 * i)},
              ${Math.floor(255 - 42.5 * j)},
              0)`;
            ctx.fillRect(
              j * 25 + CELL_SIZE * 4,
              i * 25 + CELL_SIZE * 4,
              25,
              25
            );
          }
        }

        ctx.fillStyle = "#ff0000";
        ctx.font = "50px serif";
        ctx.fillText("Hello", 100, 200);

        ctx.font = "20px serif";
        ctx.fillText("Hit space to start", 100, 400);
      }

      function draw() {
        if (status === "begin") {
          startScreen();

          return;
        } else if (status === "end") {
          endScreen();

          return;
        }

        const screenPtr = game.draw();
        const screen = new Uint8Array(w.memory.buffer, screenPtr, 10 * 24);
        ctx.beginPath();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let col = 0; col < 10; col++) {
          for (let row = 4; row < 24; row++) {
            const idx = col * 24 + row;

            ctx.fillStyle = colors[screen[idx]] || "#0000000";
            ctx.fillRect(
              col * (CELL_SIZE + 2) + 2,
              row * (CELL_SIZE + 2) + 2,
              CELL_SIZE,
              CELL_SIZE
            );
          }
        }

        ctx.stroke();
      }

      let last_tick = null;

      function tick(timestamp) {
        // console.log(tick_delay)
        if (!last_tick) {
          last_tick = timestamp;
        }

        let progress = timestamp - last_tick;
        if (progress > game.tick_delay()) {
          last_tick = timestamp;
          if (status === "play" && game.tick()) {
            game.tick_delay = 500;
            game = wasm.Game.new();
          }
        }

        draw();
        requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    });
  })
  .catch(console.error);
