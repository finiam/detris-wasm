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
        (window.innerWidth - 30) / 10
      );
      const wrapperEl = document.querySelector("#wrapper");

      wrapperEl.style.width = `${10 * (CELL_SIZE + 2) + 8}px`;
      wrapperEl.style.height = `${20 * (CELL_SIZE + 2) + 6}px`;
      wrapperEl.style.top = `${4 * (CELL_SIZE + 2) + 2}px`;

      const canvas = document.getElementById("tetris-canvas");
      canvas.width = 10 * (CELL_SIZE + 2) + 12;
      canvas.height = 24 * (CELL_SIZE + 2) + 2;
      canvas.style.marginTop = `${-4 * (CELL_SIZE + 2)}px`;
      let negativeMargin = CELL_SIZE * -4;
      document.body.style.transform = `translateY(${negativeMargin}px)`;
      document.body.style.marginBottom = `${negativeMargin}px`;
      document.body.style.setProperty("--top", `${4 * (CELL_SIZE + 2) - 4}px`);

      wrapperEl.style.display = "block";

      const ctx = canvas.getContext("2d");

      const colors = {
        0: "#000000", //  FINIAM    //  RESENDE
        1: "#ff5050", // "#00524e", // "#780737",
        2: "#158CFA", // "#dedb7b", // "#d29708",
        3: "#F9F25D", // "#c4b2f6", // "#125f03",
        4: "#D05DF9", // "#4D00E5", // "#e9e2c7",
        5: "#5DF9DD", // "#f8f1ec", // "#9b6928",
        6: "#ffffff", // "#fcd5db", // "#1c7180",
        7: "#64CA81", // "#ed7a5f", // "#569f1b",
      };

      window.addEventListener("resize", (_e) => {
        CELL_SIZE = Math.min(
          (window.innerHeight - 75) / 20,
          (window.innerWidth - 20) / 10
        );
        canvas.width = 10 * (CELL_SIZE + 2) + 12;
        canvas.height = 24 * (CELL_SIZE + 2) + 2;
        canvas.style.marginTop = `${-4 * (CELL_SIZE + 2)}px`;

        let negativeMargin = CELL_SIZE * -4;
        document.body.style.transform = `translateY(${negativeMargin}px)`;
        document.body.style.marginBottom = `${negativeMargin}px`;
        document.body.style.setProperty("--top", `${4 * (CELL_SIZE + 2) - 4}px`);

        const wrapperEl = document.querySelector("#wrapper");

        wrapperEl.style.width = `${10 * (CELL_SIZE + 2) + 8}px`;
        wrapperEl.style.height = `${20 * (CELL_SIZE + 2) + 6}px`;
        wrapperEl.style.top = `${4 * (CELL_SIZE + 2) + 2}px`;
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

      function paintPieces(color, xx, yy) {
        if (color && color !== "#000000") {
        //   // No Borders
          ctx.fillStyle = color;
          ctx.fillRect(
            xx,
            yy,
            CELL_SIZE,
            CELL_SIZE
          );

          // Only Borders
          // ctx.strokeStyle = color;
          // ctx.lineWidth = 4;
          // ctx.lineJoin = 'round';
          // ctx.fillStyle = "#000000";
          // ctx.fillRect(
          //   xx,
          //   yy,
          //   CELL_SIZE,
          //   CELL_SIZE
          // );
          // ctx.strokeRect(
          //   xx,
          //   yy,
          //   CELL_SIZE,
          //   CELL_SIZE
          // );

          // Neon
          // ctx.shadowColor = 'white';
          // ctx.shadowBlur = 10;
          // ctx.fillStyle = color;
          // ctx.fillRect(
          //   xx,
          //   yy,
          //   CELL_SIZE,
          //   CELL_SIZE
          // );
        }

        // With borders / White / Inverted
        // ctx.fillStyle = color !== "#000000" ? "white" : "#000000";
        // ctx.fillStyle = color;
        // ctx.fillRect(
        //   xx,
        //   yy,
        //   CELL_SIZE,
        //   CELL_SIZE
        // );
      }

      function startScreen() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = "center";

        ctx.fillStyle = "#5ff2ef";
        ctx.font = `${canvas.width < 350 ? "30px" : "50px"} 'Press Start 2P'`;
        ctx.fillText(
          "DETRIS",
          canvas.width / 2,
          canvas.height * 0.3,
          canvas.width
        );

        ctx.fillStyle = "#ff5050";
        ctx.fillText(
          "DETRIS",
          canvas.width / 2 - 4,
          canvas.height * 0.3 - 4,
          canvas.width
        );

        ctx.shadowColor = 'black';
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;

        ctx.fillStyle = "#ffffff";
        ctx.font = `${canvas.width < 350 ? "16px" : "22px"} 'Press Start 2P'`;
        ctx.fillText("Hit space", canvas.width / 2, canvas.height * 0.45);
        ctx.fillText("to start", canvas.width / 2, canvas.height * 0.45 + 30);

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.font = `${canvas.width < 350 ? "13px" : "15px"} 'Press Start 2P'`;
        ctx.fillText("by finiam", canvas.width / 2, canvas.height * 0.66);

        ctx.shadowOffsetY = 0;
        ctx.shadowOffsetX = 0;

        const initialMap = [
          [0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
          [0, 0, 0, 0, 0, 0, 0, 0, 5, 1],
          [7, 7, 0, 0, 0, 0, 1, 5, 5, 1],
          [0, 7, 0, 0, 7, 0, 1, 5, 0, 1],
          [0, 7, 4, 0, 7, 0, 1, 6, 6, 6],
          [5, 5, 4, 4, 7, 7, 1, 5, 5, 6],
          [3, 5, 5, 4, 0, 6, 6, 0, 5, 5],
          [3, 3, 2, 2, 0, 6, 6, 6, 6, 0],
          [3, 0, 2, 2, 6, 6, 3, 3, 3, 0],
        ]

        for(let i = 0; i < initialMap.length; i++ ) {
          for(let j = 0; j < initialMap[0].length; j++) {
            const color = colors[initialMap[i][j]];
            const xx = (CELL_SIZE + 2) * j + 5;
            const yy = ((CELL_SIZE + 2) * 15) + (CELL_SIZE + 2) * i + 3;
            paintPieces(color, xx, yy);
          }
        }
      }

      function endScreen() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = "center";

        ctx.fillStyle = "#5ff2ef";
        ctx.font = `${canvas.width < 350 ? "30px" : "50px"} 'Press Start 2P'`;
        ctx.fillText("DETRIS", canvas.width / 2, canvas.height * 0.3);

        ctx.fillStyle = "#ff5050";
        ctx.fillText("DETRIS", canvas.width / 2 - 4, canvas.height * 0.3 - 4);

        ctx.shadowColor = 'black';
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = "#ffffff";
        ctx.font = "22px 'Press Start 2P'";
        ctx.fillText(`Score:${score}`, canvas.width / 2, canvas.height * 0.45);

        ctx.fillStyle = "#ffffff";
        ctx.font = "10px 'Press Start 2P'";

        ctx.font = "15px 'Press Start 2P'";
        ctx.fillText("by finiam", canvas.width / 2, canvas.height * 0.9);
        ctx.shadowOffsetY = 0;
        ctx.shadowOffsetX = 0;

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
            const color = colors[screen[idx]];
            const xx = col * (CELL_SIZE + 2) + 5;
            const yy = row * (CELL_SIZE + 2) + 5;
            paintPieces(color, xx, yy);
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
