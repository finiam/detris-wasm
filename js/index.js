import("../pkg/index.js")
  .then((wasm) => {
    import("../pkg/index_bg.wasm").then((w) => {
      let game = wasm.Game.new();
      let status = "begin"; // begin | play | end
      let score = 0;
      let inputs = "";
      let qrcode = undefined;
      let last_game_state;

      let CELL_SIZE = Math.min(
        (window.innerHeight - 75) / 20,
        (window.innerWidth - 20) / 10
      );
      const canvas = document.getElementById("tetris-canvas");
      canvas.width = 10 * (CELL_SIZE + 2) + 2;
      canvas.height = 24 * (CELL_SIZE + 2) + 2;
      canvas.minWidth = "350px";
      let negativeMargin = CELL_SIZE * -4;
      document.body.style.transform = `translateY(${negativeMargin}px)`;
      document.body.style.marginBottom = `${negativeMargin}px`;

      const wrapperEl = document.querySelector("#wrapper");

      wrapperEl.style.width = `${10 * (CELL_SIZE + 2) + 2}px`;
      wrapperEl.style.height = `${24 * (CELL_SIZE + 2) + 2}px`;
      wrapperEl.style.marginBottom = `${wrapperEl.style}px`;

      document.querySelector(".glass").style.top = `${
        negativeMargin * -1 + 2
      }px`;

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

        ctx.textAlign = "center";

        ctx.fillStyle = "#5ff2ef";
        ctx.font = `${canvas.width < 350 ? "30px" : "40px"} 'Press Start 2P'`;
        ctx.fillText(
          "Detris",
          canvas.width / 2,
          canvas.height * 0.3,
          canvas.width
        );

        ctx.fillStyle = "#ff5050";
        ctx.fillText(
          "Detris",
          canvas.width / 2,
          canvas.height * 0.3 - 4,
          canvas.width
        );

        ctx.fillStyle = "#ffffff";
        ctx.font = `${canvas.width < 350 ? "16px" : "22px"} 'Press Start 2P'`;
        ctx.fillText("Hit space", canvas.width / 2, canvas.height * 0.5);
        ctx.fillText("to start", canvas.width / 2, canvas.height * 0.5 + 30);

        ctx.font = `${canvas.width < 350 ? "13px" : "15px"} 'Press Start 2P'`;
        ctx.fillText("by finiam", canvas.width / 2, canvas.height * 0.9);

        Object.values(colors).map((color, index) => {
          ctx.fillStyle = color;

          ctx.fillRect(
            (canvas.width - (CELL_SIZE + 4) * 8) / 2 + (CELL_SIZE + 4) * index,
            canvas.height * 0.7,
            CELL_SIZE,
            CELL_SIZE
          );
        });
        ctx.shadowBlur = 0;
      }

      function endScreen() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = "center";

        ctx.fillStyle = "#5ff2ef";
        ctx.font = `${canvas.width < 350 ? "30px" : "40px"} 'Press Start 2P'`;
        ctx.fillText("Detris", canvas.width / 2, canvas.height * 0.3);

        ctx.fillStyle = "#ff5050";
        ctx.fillText("Detris", canvas.width / 2 - 8, canvas.height * 0.3 - 4);

        ctx.fillStyle = "#ffffff";
        ctx.font = "22px 'Press Start 2P'";
        ctx.fillText(`Score:${score}`, canvas.width / 2, canvas.height * 0.5);

        ctx.fillStyle = "#ffffff";
        ctx.font = "10px 'Press Start 2P'";

        ctx.font = "15px 'Press Start 2P'";
        ctx.fillText("by finiam", canvas.width / 2, canvas.height * 0.9);

        ctx.drawImage(
          qrcode,
          (canvas.width - 120) / 2,
          canvas.height * 0.5 + 50,
          120,
          120
        );
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

            last_game_state = {
              colors: colors,
              last_position: Array.from(game.grid()),
            };

            const moves = document.createElement("textarea");
            moves.className = "moves-textarea";
            moves.setAttribute("spellcheck", "false");
            moves.addEventListener("click", (e) => {
              e.target.select();
            });
            moves.value = inputs.slice(12);
            document.body.append(moves);

            const nft = document.createElement("textarea");
            nft.className = "nft-textarea";
            nft.setAttribute("spellcheck", "false");
            nft.addEventListener("click", (e) => {
              e.target.select();
            });
            nft.value = (
              Object.values(last_game_state.colors).join('') +
              last_game_state.last_position.join('')
            );
            document.body.append(nft);

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
