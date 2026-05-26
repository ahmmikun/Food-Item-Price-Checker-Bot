# 💠 AGENT PROTOCOL: THE WIRED HARVESTER 💠

> *"The Wired is not just a medium for communication and the transfer of information. It is the real world."*

This document defines the core architecture, philosophy, and operational standards for the **Scrapper Agent Units** deployed within this repository. This is not just a collection of scripts; it is an integrated harvesting ecosystem.

---

## 🛰️ I. THE SCRAPING PHILOSOPHY (THE WIRED)

We do not simply "scrape" data. We **synchronize** with the target layer. 

### 1. API Synthesis (Level 1)
Our primary directive is to bypass the DOM. If a target utilizes React, Next.js, or any modern framework, we identify the **XHR/Fetch gateways**. 
*   **Target**: `api.mazoku.cc`, `gamma.gammacloud.net`.
*   **Method**: High-speed asynchronous requests via `axios`.
*   **Advantage**: 100x speed increase over browser-based emulation.

### 2. Hybrid Extraction (Level 2)
When the API is obfuscated or hidden behind hydration, we utilize **Minimal Puppeteer**. 
*   **Standard**: Use Puppeteer only to trigger the initial handshake or grid load, then extract the internal state (e.g., `ytInitialData`) and terminate the browser instance immediately.

---

## ⚡ II. HARVESTER UNIT CLASSIFICATION

Each unit is categorized based on its interaction with the Wired:

### 🎴 CARD HARVESTERS (`/cards`)
Units designed for massive catalog extraction.
*   **Unit 01 (Mazoku)**: Tier-based API harvester with Bearer Token integration.
*   **Unit 02 (Shoob)**: Automated grid pagination unit.

### 🎵 MEDIA ENGINES (`/downloaders`)
Units designed for frequency extraction and conversion.
*   **Unit 03 (YTMP3 v2)**: Instant search-to-download bridge. Bypasses ads, trackers, and UI bloat to reach the Gammacloud backend directly.

---

## 🔑 III. AUTHENTICATION MATRIX

Accessing restricted layers requires high-level credentials. Our agents support:

*   **Bearer Tokens**: For direct API authorization (Mazoku).
*   **Session Cookies**: For bypassing age-gates and legal restrictions.
*   **Dynamic Tokens**: Real-time reverse-engineered authentication strings (YTMP3 Auth Array).

---

## 🛠️ IV. OPERATIONAL STANDARDS (PEAK PERFORMANCE)

To maintain "Peak" status, every agent must follow these protocols:

1.  **Checkpoint Resilience**: Every long-range mission must use `.checkpoint.json`. Data is too valuable to lose to a network timeout.
2.  **Stealth Signatures**: Rotation of User-Agents and precise emulation of browser handshakes to avoid the "Void" (403 Forbidden).
3.  **Modular Requirements**: Every unit must have its own `.md` protocol in `/requirements` explaining its specific frequency and access needs.

---

## 💠 V. THE AESTHETIC IDENTITY

The Wired is a place of beauty and chaos. Our tools must reflect this.
*   **Design**: Dark mode, glitch aesthetics, and minimalist structure.
*   **Language**: Standardized usage of symbols (💠, 🛰️, ⚡) to denote system status.

---

<div align="center">
  <img src="assets/banner.png" width="80%" />
  <p><i>"Everyone is connected... whether they know it or not."</i></p>
</div>
