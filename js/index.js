import("../pkg/index.js").then(wasm =>{
  import ("../pkg/index_bg.wasm").then(w => { 

    let game = wasm.Game.new();
    const CELL_SIZE = 40;
    const canvas = document.getElementById('tetris-canvas');
    canvas.width = 10 * (CELL_SIZE + 2) + 2;
    canvas.height = 24 * (CELL_SIZE + 2 ) + 2;

    const ctx = canvas.getContext('2d');

    const colors = {
      0 : '#000000',
      1 : '#780737',
      2 : '#d29708',
      3 : '#125f03',
      4 : '#e9e2c7',
      5 : '#9b6928',
      6 : '#1c7180',
      7 : '#569f1b',
    }

    document.addEventListener('keypress', (e) => {
      switch (e.code) {
        case 'KeyA':
          console.log('Left');
          game.input(8);
          draw();
          break;
        case 'KeyD':
          game.input(16);
          console.log('Right');
          draw();
          break;
        case 'KeyW':
          game.input(2);
          console.log('Up');
          draw();
          break;
        case 'KeyS':
          game.input(4);
          console.log('Down');
          draw();
          break;
        default:
          break;
      }
    });

    function draw() {
      const screenPtr = game.draw();
      const screen = new Uint8Array(w.memory.buffer, screenPtr, 10 * 24);
      console.log(screen)

      ctx.beginPath();

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let col = 0; col < 10; col++) {
        for (let row = 0; row < 24; row++) {
          const idx = col * 24 + row;

          ctx.fillStyle = colors[screen[idx]] || '#0000000';
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

    const tick_delay = 500;
    let last_tick = null;

    function tick(timestamp) {
      if (!last_tick) {
        last_tick = timestamp;
      }

      let progress = timestamp - last_tick;
      if (progress > tick_delay) {
        last_tick = timestamp;
        if (game.tick()) {
          game = wasm.Game.new();
        }
      }

      draw();
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

  })
}).catch(console.error);

