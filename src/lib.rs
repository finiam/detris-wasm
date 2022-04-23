mod utils;
use js_sys::Math;

use qrcode_generator::QrCodeEcc;
use utils::set_panic_hook;
use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

type Grid = [[u8; 10]; 24];

#[wasm_bindgen]
#[derive(Debug, Clone)]
struct Point {
    x: i32,
    y: i32,
}

#[wasm_bindgen]
pub struct Game {
    screen: [u8; 10 * 24],
    grid: Grid,
    block: Block,
    tick_delay: u64,
    inputs: String,
    score: u8,
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
struct Block {
    position: Point,
    cells: [Point; 4],
    color_code: u8,
}

#[derive(Debug)]
enum BlockType {
    I,
    O,
    T,
    S,
    Z,
    J,
    L,
}

impl Block {
    fn rotate_left(&self) -> Block {
        let cx: f32 =
            ((self.cells[0].x + self.cells[1].x + self.cells[2].x + self.cells[3].x) as f32) / 4.0;
        let cy: f32 =
            ((self.cells[0].y + self.cells[1].y + self.cells[2].y + self.cells[3].y) as f32) / 4.0;

        let cx = (cx + 0.5).round();
        let cy = (cy + 0.5).round();

        let mut rv = self.clone();

        for p in rv.cells.iter_mut() {
            let y = p.y as f32 - cy + 0.5;
            let x = p.x as f32 - cx + 0.5;
            p.x = (-y + cx - 0.5).round() as i32;
            p.y = (x + cy - 0.5).round() as i32;
        }

        rv
    }

    fn rotate_right(&self) -> Block {
        let cx: f32 =
            ((self.cells[0].x + self.cells[1].x + self.cells[2].x + self.cells[3].x) as f32) / 4.0;
        let cy: f32 =
            ((self.cells[0].y + self.cells[1].y + self.cells[2].y + self.cells[3].y) as f32) / 4.0;

        let mut rv = self.clone();

        for p in rv.cells.iter_mut() {
            let y = p.y as f32 - cy;
            let x = p.x as f32 - cx;
            p.x = (y + cx).round() as i32;
            p.y = (-x + cy).round() as i32;
        }

        rv
    }

    fn shift(&mut self, offset: Point) {
        self.position.x += offset.x;
        self.position.y += offset.y;
    }

    fn new(typ: &BlockType) -> Block {
        let position = Point { x: 4, y: 0 };

        match typ {
            BlockType::I => Block {
                position,
                cells: [
                    Point { x: 0, y: 0 },
                    Point { x: 0, y: 1 },
                    Point { x: 0, y: 2 },
                    Point { x: 0, y: 3 },
                ],
                color_code: 1u8,
            },
            BlockType::O => Block {
                position,
                cells: [
                    Point { x: 0, y: 0 },
                    Point { x: 0, y: 1 },
                    Point { x: 1, y: 1 },
                    Point { x: 1, y: 0 },
                ],
                color_code: 2u8,
            },
            BlockType::T => Block {
                position,
                cells: [
                    Point { x: 0, y: 0 },
                    Point { x: 1, y: 0 },
                    Point { x: 2, y: 0 },
                    Point { x: 1, y: 1 },
                ],
                color_code: 3u8,
            },
            BlockType::S => Block {
                position,
                cells: [
                    Point { x: 2, y: 0 },
                    Point { x: 1, y: 0 },
                    Point { x: 1, y: 1 },
                    Point { x: 0, y: 1 },
                ],
                color_code: 4u8,
            },
            BlockType::Z => Block {
                position,
                cells: [
                    Point { x: 2, y: 1 },
                    Point { x: 1, y: 1 },
                    Point { x: 1, y: 0 },
                    Point { x: 0, y: 0 },
                ],
                color_code: 5u8,
            },
            BlockType::J => Block {
                position,
                cells: [
                    Point { x: 1, y: 0 },
                    Point { x: 1, y: 1 },
                    Point { x: 1, y: 2 },
                    Point { x: 0, y: 2 },
                ],
                color_code: 6u8,
            },
            BlockType::L => Block {
                position,
                cells: [
                    Point { x: 0, y: 0 },
                    Point { x: 0, y: 1 },
                    Point { x: 0, y: 2 },
                    Point { x: 1, y: 2 },
                ],
                color_code: 7u8,
            },
        }
    }

    fn random() -> Block {
        let idx = rand_int(7);
        let typ = &[
            BlockType::I,
            BlockType::O,
            BlockType::T,
            BlockType::S,
            BlockType::Z,
            BlockType::J,
            BlockType::L,
        ][idx];
        Block::new(&typ)
    }
}

fn rand_int(max: usize) -> usize {
    (Math::random() * (max as f64)) as usize
}

fn step_down(grid: &mut Grid, block: &mut Block) -> bool {
    let off = Point { x: 0, y: 1 };
    if !move_block(grid, block, off) {
        for p in block.cells.iter() {
            let x = (p.x + block.position.x) as usize;
            let y = (p.y + block.position.y) as usize;
            grid[y][x] = block.color_code;
        }

        false
    } else {
        true
    }
}

fn step_left(grid: &Grid, block: &mut Block) -> bool {
    let off = Point { x: -1, y: 0 };
    move_block(grid, block, off)
}

fn step_right(grid: &Grid, block: &mut Block) -> bool {
    let off = Point { x: 1, y: 0 };
    move_block(grid, block, off)
}

fn rotate_left(grid: &Grid, block: &Block) -> Option<Block> {
    let tmp = block.rotate_left();
    let off = Point { x: 0, y: 0 };
    if does_collide(grid, &tmp, &off) {
        None
    } else {
        Some(tmp)
    }
}

fn move_block(grid: &Grid, block: &mut Block, offset: Point) -> bool {
    if does_collide(grid, block, &offset) {
        false
    } else {
        block.shift(offset);
        true
    }
}

fn drop_down(grid: &mut Grid, block: &mut Block) {
    while step_down(grid, block) {}
}

fn does_collide(grid: &Grid, block: &Block, offset: &Point) -> bool {
    let cells = [
        (
            block.position.x + offset.x + block.cells[0].x,
            block.position.y + offset.y + block.cells[0].y,
        ),
        (
            block.position.x + offset.x + block.cells[1].x,
            block.position.y + offset.y + block.cells[1].y,
        ),
        (
            block.position.x + offset.x + block.cells[2].x,
            block.position.y + offset.y + block.cells[2].y,
        ),
        (
            block.position.x + offset.x + block.cells[3].x,
            block.position.y + offset.y + block.cells[3].y,
        ),
    ];

    for c in cells.iter() {
        if c.1 < 0 || c.1 >= 24 || c.0 < 0 || c.0 >= 10 || grid[c.1 as usize][c.0 as usize] != 0u8 {
            return true;
        }
    }
    false
}

fn game_finished(grid: &Grid) -> bool {
    for i in 0..10 {
        if grid[0][i] != 0u8 {
            return true;
        }
    }
    false
}

fn clear_full_lines(score: &mut u8, grid: &mut Grid, tick_delay: &mut u64) {
    for y in 0..24 {
        if !grid[y].iter().any(|cell| *cell == 0u8) {
            *score += 1;
            *tick_delay -= 50;

            for y2 in (1..=y).rev() {
                for x in 0..10 {
                    grid[y2][x] = grid[y2 - 1][x];
                }
            }
        }
    }
}

#[wasm_bindgen]
impl Game {
    pub fn new() -> Game {
        set_panic_hook();
        Game {
            screen: [0; 240],
            grid: [[0; 10]; 24],
            block: Block::random(),
            tick_delay: 500,
            inputs: "Move order: ".to_string(),
            score: 0,
        }
    }

    pub fn tick_delay(&self) -> u64 {
        self.tick_delay
    }

    pub fn inputs(&self) -> String {
        self.inputs.to_string()
    }

    pub fn score(&self) -> u8 {
        self.score
    }

    pub fn draw(&mut self) -> *const u8 {
        for x in 0..10 {
            for y in 0..24 {
                let i = x * 24 + y;
                self.screen[i] = self.grid[y][x];
            }
        }
        for p in self.block.cells.iter() {
            let x = p.x + self.block.position.x;
            let y = p.y + self.block.position.y;
            let i = (x * 24 + y) as usize;
            self.screen[i] = self.block.color_code;
        }

        self.screen.as_ptr()
    }

    pub fn input(&mut self, input_code: u8) {
        // the layout is as follows:
        // bit 0 - void
        // bit 1 - up-key pressed
        // bit 2 - down-key pressed
        // bit 3 - left-key pressed
        // bit 4 - right-key pressed

        if (input_code & 2) != 0 {
            self.inputs.push_str("W");

            if let Some(new_block) = rotate_left(&self.grid, &self.block) {
                self.block = new_block;
            }
        }
        if (input_code & 4) != 0 {
            self.inputs.push_str("S");
            drop_down(&mut self.grid, &mut self.block);
        }
        if (input_code & 8) != 0 {
            self.inputs.push_str("A");
            step_left(&self.grid, &mut self.block);
        }
        if (input_code & 16) != 0 {
            self.inputs.push_str("D");
            step_right(&self.grid, &mut self.block);
        }
    }

    pub fn tick(&mut self) -> bool {
        if !step_down(&mut self.grid, &mut self.block) {
            clear_full_lines(&mut self.score, &mut self.grid, &mut self.tick_delay);

            self.block = Block::random();
        }

        game_finished(&self.grid)
    }

    pub fn generate_qrcode(&mut self) -> String {
        return qrcode_generator::to_svg_to_string_from_str(
            self.inputs.clone(),
            QrCodeEcc::Low,
            96,
            Some("QR Code"),
        )
        .unwrap();
    }
}
