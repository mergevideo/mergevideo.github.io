# MergeVideo.io — Free Online Video Merger

> **100% Client-Side, Secure, and Private Video Merger built with Astro, React, Tailwind CSS, and FFmpeg.wasm.**  
> Join and trim MP4, WebM, MOV, MKV, and AVI clips directly inside your browser. Your files never leave your device.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-mergevideo.github.io-3368A0?style=for-the-badge&logo=googlechrome&logoColor=white)](https://mergevideo.github.io/)
[![Built with Astro](https://img.shields.io/badge/Framework-Astro%20v5-FF5D01?style=for-the-badge&logo=astro&logoColor=white)](https://astro.build)
[![Video Engine](https://img.shields.io/badge/Video%20Engine-FFmpeg.wasm-007808?style=for-the-badge&logo=webassembly&logoColor=white)](https://ffmpegwasm.netlify.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 🌟 Key Features

- **🔒 100% Client-Side Privacy**: Uses WebAssembly (`@ffmpeg/ffmpeg` and single-threaded `@ffmpeg/core`) to process footage entirely in memory. Zero file uploads, zero server processing, zero storage logs.
- **⚡ Two-Stage Concat Architecture**:
  1. **Fast-Path Stream Copy**: Joins videos with matching codecs in seconds without re-encoding.
  2. **Transcode Fallback Pipeline**: Automatically normalizes mismatched resolutions and framerates (`scale`, `pad`, `setsar`, `fps=30`, `libx264` + `aac`) for seamless output.
- **✂️ Interactive Video Trimmer**: Precision dual-slider timeline scrubber, "Set Start/End Here" frame-capture shortcuts, and looped selection preview.
- **🖼️ Real-Time Canvas Thumbnails**: Extracts video duration, dimensions, and draws high-fidelity frame previews using HTML5 Canvas with zero backend latency.
- **🔄 Drag-and-Drop Sequencing**: Reorder your clips intuitively with native HTML5 drag-and-drop or touch-friendly Up/Down controls.
- **🌐 6-Language Native i18n Routing**: Full search engine indexable routes with hreflang tags for English (`/`), Spanish (`/es/`), Portuguese (`/pt/`), German (`/de/`), French (`/fr/`), and Japanese (`/ja/`).
- **🎨 Custom Harmonized Color Palette & Theme Engine**:
  - Palette: Deep Ocean Blue (`#3368A0`), Cerulean Blue (`#66A3BF`), Soft Sage Ice (`#C8DFDB`), and Warm Cream (`#F2EFE7`).
  - Dark/Light mode with inline anti-FOUC script preventing flash of unstyled content.
- **📱 Fully Responsive**: Flawless experience across mobile phones (320px+), tablets, and desktop displays.
- **🎯 100% World-Class Technical SEO**: Complete OpenGraph, Twitter Cards, Schema Markup (`WebApplication`, `HowTo`, `FAQPage`, `BreadcrumbList`), preconnects, XML sitemap, and robots.txt.

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **[Astro](https://astro.build/)** (v5) | High-performance Static Site Generator (SSG) & Routing |
| **[React](https://react.dev/)** (v19) | Interactive UI Islands (`client:load`) |
| **[Tailwind CSS](https://tailwindcss.com/)** | Responsive styling & theme engine (`darkMode: 'class'`) |
| **[@ffmpeg/ffmpeg](https://github.com/ffmpegwasm/ffmpeg.wasm)** | In-browser WebAssembly video processing pipeline |
| **[Lucide React](https://lucide.dev/)** | Lightweight, accessible SVG icon set |
| **[Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)** | Post-merge completion celebration animation |

---

## 📂 Project Structure

```
mergevideo.github.io/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions automated deployment to GitHub Pages
├── public/
│   ├── favicon.svg             # Palette-branded vector favicon
│   ├── robots.txt              # Search engine crawler instructions
│   └── sitemap.xml             # XML sitemap with multi-language hreflang links
├── src/
│   ├── components/
│   │   ├── ClipTrimmerModal.jsx       # Interactive video clip trimming modal
│   │   ├── FaqSection.astro           # Native accessible FAQ accordion
│   │   ├── FeaturesSection.astro      # Feature highlight grid
│   │   ├── Footer.astro               # Footer navigation & language selector
│   │   ├── Header.astro               # Sticky navigation with BuyMeACoffee & theme toggle
│   │   ├── HowItWorksSection.astro    # Step-by-step visual walkthrough
│   │   ├── LanguagePicker.astro       # SEO-crawlable language switch dropdown
│   │   ├── ThemeToggle.jsx            # Dark / Light mode toggle island
│   │   └── VideoMergerWorkspace.jsx   # Core React workspace island
│   ├── i18n/
│   │   ├── ui.ts               # Complete translation dictionaries (en, es, pt, de, fr, ja)
│   │   └── utils.ts            # Localized path resolvers & hreflang generators
│   ├── layouts/
│   │   └── Layout.astro        # Master HTML layout, GA4, Anti-FOUC, and JSON-LD schemas
│   ├── pages/
│   │   ├── [lang]/
│   │   │   └── index.astro     # Localized dynamic SSG routes (/es/, /pt/, /de/, /fr/, /ja/)
│   │   └── index.astro         # Default English landing page (/)
│   ├── styles/
│   │   └── global.css          # Custom theme tokens, scrollbars, and animations
│   └── utils/
│       ├── ffmpeg-runner.ts    # WebAssembly singleton loader & two-stage merge engine
│       └── video-helpers.ts    # Canvas thumbnail generator, metadata parser, time formatters
├── .gitignore                  # Git exclusion rules
├── astro.config.mjs            # Astro configuration
├── package.json                # Project dependencies and build scripts
├── tailwind.config.mjs         # Palette colors & design configuration
└── tsconfig.json               # Strict TypeScript configuration
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.17.0 or higher
- **npm** or **pnpm**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mergevideo/mergevideo.github.io.git
   cd mergevideo.github.io
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:4321](http://localhost:4321) in your browser.

4. **Build for production**:
   ```bash
   npm run build
   ```
   The static production output will be generated inside the `dist/` directory.

5. **Preview production build**:
   ```bash
   npm run preview
   ```

---

## 🚢 Deployment to GitHub Pages

The repository includes a standalone automated CI/CD workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) that builds and deploys the Astro static site directly to **GitHub Pages** on every push to the `main` branch.

### Enabling GitHub Pages:
1. Go to your repository **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, select **GitHub Actions**.
3. Push your code to `main` and the site will be automatically deployed!

---

## ☕ Support the Developer

If you find this tool helpful, consider supporting the developer:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/kisharadilz)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
