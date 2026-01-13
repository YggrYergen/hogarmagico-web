# Implementation Plan - Hogar Mágico (Organic Web Design)

> [!IMPORTANT]
> **Design Philosophy**: No sharp corners. Fluid transitions. Organic shapes. The site must feel like a living organism, not a grid.

## 1. Global Design System & Physics

### 1.1 Color Palette (Strict Adherence)
These variables will be defined in `:root`.

| Name | Hex | Usage |
| :--- | :--- | :--- |
| `color-sand` | `#FDFCF8` | **Base/Canvas**. Warm, organic background. |
| `color-ink` | `#264653` | **Primary Text**. Soft dark slate. |
| `color-sea` | `#2A9D8F` | **Brand Turquoise**. Punta de Choros accents. |
| `color-spirit`| `#9B5DE5` | **Brand Violet**. Cochiguaz accents. |
| `color-night` | `#2E294E` | **Brand Indigo**. Footers, Night mode. |
| `color-earth` | `#CCAEA3` | **Secondary**. UI elements, borders. |

### 1.2 Morphology (The "Anti-Grid")
*   **`.blob-shape`**: `border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;` (Used for containers/images).
*   **`.arch-mask`**: `border-radius: 50% 50% 0 0;` (Used for Hero images).
*   **Dividers**: SVGs only. "Gentle Waves" (Sea) and "Rugged Hills" (Valley). No straight `<hr>`.

### 1.3 Typography
*   **Headings**: `Cormorant Garamond` (400, 600, 700).
*   **Body**: `Mulish` (300, 400, 600).
*   *Implementation*: `<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Mulish:wght@300;400;600&display=swap" rel="stylesheet">`

### 1.4 Animation Physics (Micro-interactions)
*   **Entry**: Elements start `translate-y-10 opacity-0`. Observer triggers `.appear` class -> `translate-y-0 opacity-100` (0.8s ease-out).
*   **Hover**: `scale(1.05)`, `box-shadow` becomes diffuse and colored (Sea or Spirit based on page).
*   **Parallax**: Background elements move at 0.5x scroll speed.

---

## 2. Technical Architecture

### 2.1 File Structure
```
/
├── index.html       (The Portal)
├── chascona.html    (Punta de Choros 1)
├── lamar.html       (Punta de Choros 2)
├── calma.html       (Cochiguaz)
├── css/
│   └── styles.css   (Tailwind directives + Custom Utilities)
└── js/
    └── script.js    (Global Nav, Mobile Menu, Scroll Observer, Parallax)
```

### 2.2 Tech Stack
*   **HTML5**: Semantic tags (`<main>`, `<article>`, `<section>`).
*   **Tailwind CSS**: via CDN for rapid dev (`<script src="https://cdn.tailwindcss.com"></script>`). Configured via `tailwind.config` inside the script tag for colors and fonts.
*   **Vanilla JS**: No frameworks.

---

## 3. Page-by-Page Blueprints

### PAGE 1: `index.html` (The Portal)
*   **Nav**: Fixed Glassmorphism Dock (`bottom-4` mobile, `top-4 right-4` desktop).
*   **Hero (Split View)**:
    *   **Left**: `bg-color-sea` (90%). Text: "Punta de Choros" | "El Canto del Mar". Hover: Expands to 70% width.
    *   **Right**: `bg-color-spirit` (90%). Text: "Cochiguaz" | "El Silencio del Valle". Hover: Expands to 70% width.
    *   **Center Overlay**: "Hogar Mágico" (H1). Sub: "Si la vida nos reúne aquí, es porque la magia existe."
*   **Manifesto**:
    *   Bg: `color-sand`.
    *   Icon Row: Sun (Solar), Water Drop (Recycle), Wind (Fresh).
    *   Copy: "Conectamos naturaleza, comodidad y el placer de estar vivos."

### PAGE 2: `chascona.html` (Adobe & Fire)
*   **Identity**: Heat, Wood, Rustic.
*   **Hero**:
    *   Image: `https://placehold.co/1200x800/CCAEA3/264653?text=WOOD+ADOBE+INTERIOR`
    *   Mask: `.arch-mask`
    *   Copy: "Casa La Chascona" | "Tu refugio de barro y madera."
*   **Features Grid**:
    *   Kitchen (Utensils icon), Fire (Fire icon), Domótica (Wifi icon), Capacity (Group icon).
*   **Gallery**: Masonry layout using CSS columns or Flex-wrap with varying aspect ratios.
    *   Img 1: Stairs view.
    *   Img 2: Ladder/Wood detail (Tall).
    *   Img 3: Kitchen island (Square).

### PAGE 3: `lamar.html` (Infinite Horizon)
*   **Identity**: Turquoise, Minimal, Sea.
*   **Hero**:
    *   Image: `https://placehold.co/1200x800/2A9D8F/FFFFFF?text=OCEAN+VIEW+TERRACE`
    *   Mask: Bottom edge is a "Gentle Wave" SVG.
    *   Copy: "Casa La Mar" | "El horizonte es tu patio trasero."
*   **Spotlight Card (The Quincho)**:
    *   Image right, Text left.
    *   Copy: "Quincho con vista al mar. Parrilla lista para atardeceres inolvidables."
*   **Experience Map**: Floating cards for "Isla Damas", "Playas Blancas", "Caleta San Agustín".
*   **Gallery**: **Horizontal Scroll** container (snap-x).

### PAGE 4: `calma.html` (Zen & Stars)
*   **Identity**: Violet, Indigo, Night.
*   **Hero**:
    *   Bg: Gradient `to bottom right` (`#D38E6E` -> `#9B5DE5`).
    *   Image: House with mountains `https://placehold.co/1200x800/9B5DE5/FFFFFF?text=HOUSE+MOUNTAINS`
    *   Copy: "Casa La Calma" | "Alma Zen en el Valle de Elqui."
*   **Wellness Zig-Zag**:
    *   Row 1: Pool (Img) - Text.
    *   Row 2: Text - Hot Tub (Img) [$50.000].
    *   Row 3: Hammock (Img) - Text.
*   **Night Mode Section**:
    *   **INTERACTION**: A toggle button "Lights Off".
    *   Effect: Changes section bg to `#2E294E`. Activates CSS particle stars.
    *   Copy: "Cielos más limpios del mundo."

## 4. Reusable Components

### 4.1 Global Navigation
*   Links: Home (`index.html`), Punta de Choros (`chascona.html`, `lamar.html`), Cochiguaz (`calma.html`), Contacto (Scroll to footer).
*   Mobile: Bottom fixed bar, glass effect.
*   Desktop: Top right pill, glass effect.

### 4.2 Footer
*   Bg: `color-night`. Text: `color-sand`.
*   Content:
    *   IG: `@hogarmagico.cl`
    *   WhatsApp: `+56 9 99495420`
    *   Copyright 2024.

## 5. Implementation Sequence
1.  **Setup**: Create `index.html` skeleton with Tailwind config.
2.  **Assets**: Generate utility CSS classes in `styles.css`.
3.  **Pages**: Code `index` -> `chascona` -> `lamar` -> `calma`.
4.  **Polish**: Add the JS Intersections Observer for animations.
