import("../pkg/index.js")
  .then((wasm) => {
    import("../pkg/index_bg.wasm").then((w) => {
      let game = wasm.Game.new();
      let status = "begin"; // begin | play | end
      let score = 0;
      let nextPiece;
      let inputs = "";
      let last_game_state;
      let CELL_SIZE;
      let canvas;
      let infoCanvas

      function updateSizes() {
        const container = document.querySelector("#container");
        infoCanvas = document.getElementById("info-canvas");
        scoreCanvas = document.getElementById("score-canvas");

        CELL_SIZE = Math.min(
          (container.clientHeight - 75) / 20,
          (container.clientWidth - 50) / 20
        );

        let negativeMargin = CELL_SIZE * -4;
        container.style.transform = `translateY(${negativeMargin}px)`;
        container.style.marginBottom = `${negativeMargin}px`;
        container.style.setProperty("--top", `${4 * (CELL_SIZE + 2) - 4}px`);

        const wrapperEl = document.querySelector("#wrapper");
        wrapperEl.style.width = `${10 * (CELL_SIZE + 3)}px`;
        wrapperEl.style.height = `${20 * (CELL_SIZE + 2) + 7}px`;
        wrapperEl.style.top = `${4 * (CELL_SIZE + 2) + 2}px`;

        const nextPieceWrapperEl = document.querySelector("#next-piece-wrapper");
        nextPieceWrapperEl.style.width = `${5 * (CELL_SIZE + 2) + 6}px`;
        nextPieceWrapperEl.style.height = `${8 * (CELL_SIZE + 2) + 6}px`;

        const scoreWrapperEl = document.querySelector("#score-wrapper");
        scoreWrapperEl.style.width = `${5 * (CELL_SIZE + 2) + 6}px`;
        scoreWrapperEl.style.height = `${8 * (CELL_SIZE + 2) + 6}px`;

        canvas = document.getElementById("tetris-canvas");
        canvas.width = 10 * (CELL_SIZE + 2) + 12;
        canvas.height = 24 * (CELL_SIZE + 2) + 2;
        canvas.style.marginTop = `${-4 * (CELL_SIZE + 2)}px`;

        infoCanvas.width = 5 * (CELL_SIZE + 2);
        infoCanvas.height = 8 * (CELL_SIZE + 2);
        scoreCanvas.width = 5 * (CELL_SIZE + 2);
        scoreCanvas.height = 8 * (CELL_SIZE + 2);

        wrapperEl.style.display = "block";
      }

      updateSizes();

      const ctx = canvas.getContext("2d");
      const ctxInfo = infoCanvas.getContext("2d");
      const ctxScore = scoreCanvas.getContext("2d");

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

      window.addEventListener("resize", updateSizes);

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

      function paintPieces(color, xx, yy, nextPiece = false) {
        const context = nextPiece ? ctxInfo : ctx;
        if (color && color !== "#000000") {
        //   // No Borders
          context.fillStyle = color;
          context.fillRect(
            xx,
            yy,
            CELL_SIZE,
            CELL_SIZE
          );

          // Only Borders
          // context.strokeStyle = color;
          // context.lineWidth = 4;
          // context.lineJoin = 'round';
          // context.fillStyle = "#000000";
          // context.fillRect(
          //   xx,
          //   yy,
          //   CELL_SIZE,
          //   CELL_SIZE
          // );
          // context.strokeRect(
          //   xx,
          //   yy,
          //   CELL_SIZE,
          //   CELL_SIZE
          // );

          // Neon
          // context.shadowColor = 'white';
          // context.shadowBlur = 10;
          // context.fillStyle = color;
          // context.fillRect(
          //   xx,
          //   yy,
          //   CELL_SIZE,
          //   CELL_SIZE
          // );
        }

        // With borders / White / Inverted
        // context.fillStyle = color !== "#000000" ? "white" : "#000000";
        // context.fillStyle = color;
        // context.fillRect(
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
        ctx.font = `${canvas.width < 300 ? "20px" : "50px"} 'Press Start 2P'`;
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
        ctx.font = `${canvas.width < 300 ? "13px" : "22px"} 'Press Start 2P'`;
        ctx.fillText("Hit space", canvas.width / 2, canvas.height * 0.45);
        ctx.fillText("to start", canvas.width / 2, canvas.height * 0.45 + 30);

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.font = `${canvas.width < 300 ? "10px" : "15px"} 'Press Start 2P'`;
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
        ctx.font = `${canvas.width < 300 ? "25px" : "50px"} 'Press Start 2P'`;
        ctx.fillText("DETRIS", canvas.width / 2, canvas.height * 0.3);

        ctx.fillStyle = "#ff5050";
        ctx.fillText("DETRIS", canvas.width / 2 - 4, canvas.height * 0.3 - 4);

        ctx.shadowColor = 'black';
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = "#ffffff";

        ctx.font = `${canvas.width < 300 ? "16px" : "30px"} 'Press Start 2P'`;
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height * 0.55);

        ctx.font = `${canvas.width < 300 ? "20px" : "30px"} 'Press Start 2P'`;
        ctx.fillText("SCORE", canvas.width / 2, canvas.height * 0.55 + 60);
        ctx.font = `${canvas.width < 300 ? "25px" : "40px"} 'Press Start 2P'`;
        ctx.fillText(score, canvas.width / 2, canvas.height * 0.55 + 120);

        ctx.fillStyle = "#ffffff";
        ctx.font = `${canvas.width < 300 ? "10px" : "15px"} 'Press Start 2P'`;
        ctx.fillText("by finiam", canvas.width / 2, canvas.height * 0.95);
        ctx.shadowOffsetY = 0;
        ctx.shadowOffsetX = 0;
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

        ctx.beginPath();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctxInfo.clearRect(0, 0, infoCanvas.width, infoCanvas.height);
        ctxScore.clearRect(0, 0, scoreCanvas.width, scoreCanvas.height);

        const screenPtr = game.draw();
        const screen = new Uint8Array(w.memory.buffer, screenPtr, 10 * 24);

        for (let col = 0; col < 10; col++) {
          for (let row = 4; row < 24; row++) {
            const idx = col * 24 + row;
            const color = colors[screen[idx]];
            const xx = col * (CELL_SIZE + 2) + 5;
            const yy = row * (CELL_SIZE + 2) + 5;
            paintPieces(color, xx, yy);
          }
        }

        score = game.score();
        nextPiecePtr = game.next_piece();
        const nextPiece = Array.from(nextPiecePtr);

        ctxInfo.fillStyle = "white";
        ctxInfo.font = `${CELL_SIZE * 0.5}px 'Press Start 2P'`;
        ctxInfo.fillText("NEXT", CELL_SIZE, CELL_SIZE * 2);

        ctxScore.textAlign = "center";
        ctxScore.fillStyle = "white";
        ctxScore.font = `${CELL_SIZE * 0.5}px 'Press Start 2P'`;
        ctxScore.fillText("SCORE", scoreCanvas.width / 2, CELL_SIZE * 2);
        ctxScore.font = "20px 'Press Start 2P";
        ctxScore.fillText(score, scoreCanvas.width / 2, CELL_SIZE * 2 + 60);

        for (let col = 0; col < 3; col++) {
          for (let row = 0; row < 4; row++) {
            const idx = col + row * 3;
            const color = colors[nextPiece[idx]];
            const xx = CELL_SIZE + col * (CELL_SIZE + 2);
            const yy = CELL_SIZE * 3 + row * (CELL_SIZE + 2);
            paintPieces(color, xx, yy, true);
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

            last_game_state = {
              colors: colors,
              last_position: Array.from(game.grid()),
            };

            // Do something with inputs and last_game_state
            // Sending messages from iframe to parent
            // https://gist.github.com/cirocosta/9f730967347faf9efb0b

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
