# Personal Site In Astro

A personal website built with Astro. The project is set up as a fast, content-driven static site with a lightweight editing workflow and support for interactive components.

## Overview

This repository contains a personal site that works as a central place for publishing selected content, linking to external work, and presenting interactive or media-based pages.

The site is built around structured content instead of hardcoded page data. Content can be edited through a local CMS-style interface, while Astro handles routing, page generation, styling, and production builds.

## Tech Stack

- **Astro** — main framework for routing, layouts, and static site generation
- **React** — used for interactive UI components where needed
- **Tailwind CSS** — utility-first styling support
- **Keystatic** — local content management workflow
- **TypeScript** — project configuration and typed development
- **JSON-based content** — structured data used to generate pages and lists

## How It Works

Astro is used as the main application layer. It handles the site structure, routing, layouts, and static output.

Content is stored as structured data and used to generate pages and lists. This keeps the content separate from the presentation layer and makes the project easier to maintain.

Keystatic provides a local editing interface for managing content. The saved content is then used by Astro during development and production builds.

React is included for parts of the site that need client-side interactivity. Most of the site can remain static, which keeps the final build lightweight and fast.

Styling is handled through global CSS and Tailwind CSS.

## Features

- Static site generation with Astro
- Content-driven pages
- Local CMS workflow with Keystatic
- Support for interactive React components
- Responsive layouts
- Image-based content support
- Simple development and production build scripts
