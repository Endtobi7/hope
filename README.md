# hope

## Full Download & Installation Guide

This project is a complete React application that visualizes and controls a gantry robot platform using the PNG images included in this repository.

---

## 1) Prerequisites

Install these tools first:

- **Node.js** (v18+ recommended) — https://nodejs.org/
- **npm** (comes with Node.js)
- **Git** — https://git-scm.com/

Verify installations:

```bash
node --version
npm --version
git --version
```

---

## 2) Download the Repository

### Option A — Clone with Git (recommended)

```bash
git clone https://github.com/Endtobi7/hope.git
cd hope
```

### Option B — Download ZIP

1. Go to https://github.com/Endtobi7/hope
2. Click **Code → Download ZIP**
3. Extract the ZIP
4. Open a terminal inside the extracted folder

---

## 3) Install Dependencies

```bash
npm install
```

This installs:
- React
- React DOM
- React Scripts (Create React App)

---

## 4) Run the App (Development)

```bash
npm start
```

Open in your browser:
```
http://localhost:3000
```

You should see:
- The gantry platform rendered from the repository PNG images
- Real-time interactive controls (sliders, jog buttons, presets)
- Save/load positions using localStorage

---

## 5) Production Build

```bash
npm run build
```

This creates a production-ready build in the `build/` folder.

To preview the production build locally:

```bash
npm install -g serve
serve -s build
```

Open:
```
http://localhost:3000
```

---

## 6) (Optional) Run Tests

```bash
npm test
```

---

## 7) Troubleshooting

**Port 3000 already in use**
```bash
npm start -- --port 3001
```

**Dependencies fail to install**
```bash
npm cache clean --force
npm install
```

**App doesn't update**
- Make sure `npm start` is running
- Refresh the browser (Ctrl+R / Cmd+R)

---

## 8) Project Structure

```
public/
  images/                         # PNG assets (already in repo)
src/
  App.jsx                         # Main app
  components/
    GantryVisualizer.jsx          # Canvas renderer
    ControlPanel.jsx              # UI controls
```
