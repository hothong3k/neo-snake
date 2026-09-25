# 🐍 Neo Snake

A browser-based reimagining of the iconic Snake game from the Nokia 3310 era — built with HTML5 Canvas and vanilla JavaScript, designed for distribution on [Itch.io](https://itch.io).

Neo Snake preserves the nostalgic charm of the original while introducing modern gameplay mechanics such as obstacles and power-ups.

## 🎮 Game Modes

Both modes take place on a **spacious bounded grid**, large enough to accommodate all gameplay features.

### Classic Mode

The faithful recreation of the original Snake experience.

- Eat food to grow longer and earn points.
- **Game Over** conditions:
  - The snake collides with **itself**.
  - The snake collides with a **wall** (boundary).

### Modern Mode

Builds upon Classic Mode with creative twists.

- When the snake hits a **wall** (boundary), it **stops moving** instead of dying. The player must change direction to resume movement.
- **Obstacles** are **randomly generated** throughout the play area. Every **15 seconds**, obstacles relocate to new random positions.
- **Power-ups** spawn periodically, offering temporary effects such as:
  - ⚡ **Speed Boost** — temporarily increases snake speed.
  - 🛡️ **Shield** — grants temporary invincibility against obstacles.
  - ✂️ **Shrink** — reduces the snake's length.
- **Game Over** conditions:
  - The snake collides with **itself**.
  - The snake collides with an **obstacle** (unless protected by a Shield).

## 🕹️ How to Play

The snake **cannot reverse direction** — it can only turn left, right, or continue forward relative to its current heading.

| Action | Keyboard Option 1 | Keyboard Option 2 |
|---|---|---|
| Move Up | `W` | `↑` Arrow Key |
| Move Down | `S` | `↓` Arrow Key |
| Move Left | `A` | `←` Arrow Key |
| Move Right | `D` | `→` Arrow Key |

## 🏆 Scoring

- Points are earned **only** by eating food — collecting power-ups does **not** award points.
- The score can only **increase**; it never decreases.
- As the score grows, the snake's **movement speed increases**, making the game progressively more challenging.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Page structure |
| CSS3 | Styling & retro aesthetics |
| JavaScript | Game logic & rendering |
| Canvas API | 2D game rendering |

## 🚀 Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari).

### Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/neo-snake.git
   ```
2. Open `index.html` in your browser — no build step required.

## 📦 Distribution

This game is packaged as an HTML5 game for [Itch.io](https://itch.io). To deploy:

1. Compress all project files into a `.zip` archive.
2. Upload to your Itch.io project page.
3. Set the project type to **HTML** and enable **"This file will be played in the browser"**.

## 🐛 Known Issues / Future Improvements

- [ ] Mobile touch controls are not yet implemented.
- [ ] No online leaderboard — scores are tracked locally only.
- [ ] Sound effects and background music have not been added yet.
- [ ] Power-up balancing may need further tuning.
- [ ] Additional obstacle patterns and level designs are planned for future updates.

## 📄 License

This project is licensed under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.en.html).

You are free to use, modify, and distribute this project under the terms of the GPL v3. Any derivative work must also be distributed under the same license as open source.
