import("../pkg/index.js")
  .then((wasm) => {
    import("../pkg/index_bg.wasm").then((w) => {
      let game = wasm.Game.new();
      let status = "begin"; // begin | play | end
      let score = 0;
      let inputs = "";
      let qrcode = undefined;

      let CELL_SIZE = Math.min(
        (window.innerHeight - 75) / 20,
        (window.innerWidth - 20) / 10
      );
      const canvas = document.getElementById("tetris-canvas");
      canvas.width = 10 * (CELL_SIZE + 2) + 2;
      canvas.height = 24 * (CELL_SIZE + 2) + 2;
      canvas.minWidth = "350px";
      canvas.style.marginTop = `${CELL_SIZE * -4}px`;

      const ctx = canvas.getContext("2d");

      const colors = {
        0: "#000000",
        1: "#780737", // #662211, #332211,
        2: "#d29708", // #ccaa22, #ddaacc,
        3: "#125f03", // #557733, #cc4433,
        4: "#e9e2c7", // #3333dd, #88ddee,
        5: "#9b6928", // #3333dd, #88ddee,
        6: "#1c7180", // #7755cc, #dd9977,
        7: "#569f1b", // #7755cc, #dd9977,
      };

      window.addEventListener("resize", (e) => {
        CELL_SIZE = Math.min(
          (window.innerHeight - 75) / 20,
          (window.innerWidth - 20) / 10
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#5ff2ef";
        ctx.font = "40px 'Press Start 2P'";
        ctx.fillText("Detris", canvas.width * 0.2, canvas.height * 0.3);

        ctx.fillStyle = "#ff5050";
        ctx.font = "40px 'Press Start 2P'";
        ctx.fillText("Detris", canvas.width * 0.2 - 8, canvas.height * 0.3 - 4);

        ctx.fillStyle = "#ffffff";
        ctx.font = "22px 'Press Start 2P'";
        ctx.fillText("Hit space", canvas.width * 0.25, canvas.height * 0.5);
        ctx.fillText("to start", canvas.width * 0.27, canvas.height * 0.5 + 30);

        ctx.font = "15px 'Press Start 2P'";
        ctx.fillText("by finiam", canvas.width * 0.35, canvas.height * 0.9);

        ctx.strokeStyle = "blue";
        ctx.strokeRect(
          0,
          CELL_SIZE * 4,
          canvas.width,
          canvas.height - CELL_SIZE * 4
        );

        Object.values(colors).map((color, index) => {
          // ctx.shadowColor = index !== 0 ? 'red' : "white";
          // ctx.shadowOffsetX = index !== 0 ? 1 : 1;
          // ctx.shadowOffsetY = index !== 0 ? 1 : 1;
          // ctx.shadowColor = 'white';
          // ctx.shadowBlur = index !== 0 ? 30 : 20;
          ctx.fillStyle = color;
          ctx.fillRect(
            25 + (CELL_SIZE + 4) * index,
            canvas.height * 0.7,
            CELL_SIZE,
            CELL_SIZE
          );
        });
        ctx.shadowBlur = 0;
      }

      function endScreen() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#5ff2ef";
        ctx.font = "40px 'Press Start 2P'";
        ctx.fillText("Detris", canvas.width * 0.2, canvas.height * 0.3);

        ctx.fillStyle = "#ff5050";
        ctx.font = "40px 'Press Start 2P'";
        ctx.fillText("Detris", canvas.width * 0.2 - 8, canvas.height * 0.3 - 4);

        ctx.fillStyle = "#ffffff";
        ctx.font = "22px 'Press Start 2P'";
        ctx.fillText(
          `Score:${score}`,
          canvas.width * 0.25,
          canvas.height * 0.5
        );

        ctx.fillStyle = "#ffffff";
        ctx.font = "10px 'Press Start 2P'";

        ctx.font = "15px 'Press Start 2P'";
        ctx.fillText("by finiam", canvas.width * 0.35, canvas.height * 0.9);

        ctx.drawImage(
          qrcode,
          canvas.width * 0.5 - 50,
          canvas.height * 0.5 + 50,
          120,
          120
        );

        ctx.strokeStyle = "blue";
        ctx.strokeRect(
          0,
          CELL_SIZE * 4,
          canvas.width,
          canvas.height - CELL_SIZE * 4
        );

        Object.values(colors).map((color, index) => {
          // ctx.shadowColor = index !== 0 ? 'red' : "white";
          // ctx.shadowOffsetX = index !== 0 ? 1 : 1;
          // ctx.shadowOffsetY = index !== 0 ? 1 : 1;
          // ctx.shadowColor = 'white';
          // ctx.shadowBlur = index !== 0 ? 30 : 20;
          ctx.fillStyle = color;
          ctx.fillRect(
            25 + (CELL_SIZE + 4) * index,
            canvas.height * 0.7,
            CELL_SIZE,
            CELL_SIZE
          );
        });
      }

      function draw() {
        if (status == "play" && document.querySelector("textarea")) {
          document.querySelector("textarea").remove();
        }

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
            // ctx.shadowColor = screen[idx] !== 0 ? 'red' : "white";
            // ctx.shadowOffsetX = screen[idx] !== 0 ? 1 : 1;
            // ctx.shadowOffsetY = screen[idx] !== 0 ? 1 : 1;
            // ctx.shadowColor = 'white';
            // ctx.shadowBlur = screen[idx] !== 0 ? 30 : 20;
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
        if (!last_tick) {
          last_tick = timestamp;
        }

        let progress = timestamp - last_tick;
        if (progress > game.tick_delay()) {
          last_tick = timestamp;
          if (status === "play" && game.tick()) {
            status = "end";
            score = game.score();
            inputs = game.inputs();
            svg = game.generate_qrcode();

            const moves = document.createElement("textarea");
            moves.setAttribute("spellcheck", "false");
            moves.addEventListener("click", (e) => {
              e.target.select();
            });
            moves.value = inputs.slice(12);
            document.body.append(moves);

            blob = new Blob([svg.slice(38)], { type: "image/svg+xml" });

            qrcode = new Image();
            qrcode.src = URL.createObjectURL(blob);

            game.tick_delay = 400;
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
