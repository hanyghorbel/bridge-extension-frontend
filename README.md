# Briddge Extension Frontend

This is the frontend repository for the application, built as a Chrome Extension using React and TypeScript.

## Prerequisites

* **Node.js** (v18+ recommended)
* **npm**
* **Google Chrome** browser

## Getting Started

### 1. Installation

Install the project dependencies first:

```bash
npm install
```

### 2. Development & Building

To compile the extension and generate the production-ready assets, run the build script:
```bash
npm run build
```

This will generate a dist/ folder in the root of the frontend directory.

### 3. Loading the Extension in Chrome

Since this is a Chrome Extension, you need to load the compiled dist folder manually into your browser:

- Open Google Chrome and navigate to `chrome://extensions/`.

- Enable Developer mode by toggling the switch in the top-right corner.

- Click on the Load unpacked button in the top-left corner.

- Select the dist folder generated in the root of this frontend directory.

The extension is now installed and will react to changes whenever you rebuild the project.


### Tech Stack

Framework: React

Language: TypeScript

Build Tool: Vite

### API Endpoints

| Frontend Call | Backend Route |
| :--- | :--- |
| `getAuthUrl()` | `GET /auth/attio` |
| Attio redirect | `/auth/attio/callback` |
| `syncCompany()` | `POST /api/sync` |
| `lookupCompany()` | `GET /api/companies/lookup` |
