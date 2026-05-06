# 🤖 Gantry Robot Visualizer

A real-time 4-axis gantry robot platform visualizer built with React.

## Platform Axes

| Axis | Range | Description |
|------|-------|-------------|
| X | 0–300 mm | Left/right — moves both rails together |
| Y | 0–300 mm | Forward/back — carriage along the traverse |
| Z | 0–100 mm | Vertical — Z-assembly extension |

## Getting Started

```bash
npm install
npm start
```

## Build for Production

```bash
npm run build
```

## Features

- **Canvas-based visualization** — real-time rendering of the full kinematic chain
- **Control Panel** — sliders, numeric inputs, and jog buttons per axis
- **Quick Presets** — Home, Safe, Top, Bottom, Work1, Work2
- **Save Positions** — persist custom positions to `localStorage`
- **Responsive layout** — adapts from desktop to mobile

## Project Structure

```
src/
├── index.js               # React 18 entry point
├── index.css              # Global reset & fonts
├── App.jsx                # Root component
├── App.css                # Layout styles
└── components/
    ├── GantryVisualizer.jsx   # Canvas renderer
    ├── GantryVisualizer.css
    ├── ControlPanel.jsx       # Axis controls & saved positions
    └── ControlPanel.css
```
