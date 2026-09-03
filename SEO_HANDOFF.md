# SEO Handoff Note — WhatIfWeBelieved

**Date:** August 2, 2026
**Scope:** First SEO pass per the `seo_implementation_system_prompt.md.docx` plan. No redesign, no paid tools, no new accounts created.

---

## What changed (and where)

### 1. The sermon review now has its own page (was hidden inside an accordion)
- **New page:** `articles/gods-mixed-feelings-about-jewelry/index.html`
- Live URL (once deployed): `https://whatifwebelieved.vercel.app/articles/gods-mixed-feelings-about-jewelry/`
- It has its own **title tag**, **meta description**, **canonical link**, **Open Graph / Twitter card**, a clean `<h1>`–`<h2>` heading structure, and **BlogPosting JSON-LD** schema with author, publisher, and dates.
- The full review text now lives on this page. The homepage still shows the teaser card with the two summary paragraphs, the **Download .pdf** button, and a **Read Full Review** button that links to the new page.
- The old expand/collapse accordion was removed from the homepage.

### 2. Homepage (`index.html`) metadata
- Added meta description, canonical link, Open Graph tags, and Twitter Card tags.
- Added **WebSite + Organization JSON-LD** (organization links to the YouTube channel).
- Added **WebApplication schema** for the AI Theology Agent (`/agent/`).
- Added a "Sermon Review" link in the footer so the new page is linked from every page.
- Fixed nothing else visually — the design is untouched.

### 3. AI Agent page (`agent/index.html`) metadata
- Added meta description, canonical link, Open Graph / Twitter tags, and **WebApplication JSON-LD** for the agent app itself.

### 4. Technical indexing files (new, at the site root)
- **`sitemap.xml`** — lists the homepage, the new sermon review, the AI agent page, and the sermon-review PDF.
- **`robots.txt`** — allows all crawlers and points to the sitemap.

### 5. Reusable article template (new)
- **`articles/TEMPLATE.html`** — a copy-and-paste template for future long-form articles. It has plain-language instructions at the top: create a folder, copy the template, fill in the markers, add the page to `sitemap.xml`. Future articles need zero engineering.

---

## How to get this live
1. Review the changes (`git diff`).
2. Commit and push to `master`. GitHub Actions will deploy to GitHub Pages automatically; Vercel will pick up the same push for `whatifwebelieved.vercel.app`.

---

## Decisions that need you (not done, by design)
These were flagged per the working rules — nothing was done without sign-off:

1. **Custom domain.** The site currently lives on `whatifwebelieved.vercel.app` (and GitHub Pages). Every canonical URL and social-share URL in this pass points there. Moving to a custom domain later means updating those URLs — decide this *before* the site builds search traffic, since changing domains later resets link equity.
2. **Google Search Console.** Free, but requires creating/logging into a Google account. High value: submit `sitemap.xml`, see which pages Google has indexed, and request indexing of the new sermon review. Also **Bing Webmaster Tools** for the same. Not done — needs your account.
3. **Phase Two (out of scope this pass):** converting the standalone PDFs (`Affirming_Faith_Through_Thought_*.pdf`) into HTML pages so their content is indexable.
4. **`/bible-game/` and `/radio/` routes** are referenced in the SEO plan but **do not exist in this repository** (searched the whole repo). If they live in a different repo or are still to be built, once they exist we should add `SoftwareApplication` schema for the Bible game, plus entries in `sitemap.xml` — and confirm their asset paths still work.
5. **Share image.** Open Graph uses `bg-1.jpg` as a placeholder. A proper branded share image (1200×630) will make links shared on social media look better. Optional.

---

## Reminders for future articles
- Always use the template (`articles/TEMPLATE.html`).
- Add every new page to `sitemap.xml`.
- Keep meta descriptions factual — summarize what is actually on the page.
- When you replace content, delete the old version rather than leaving duplicate text in two places (Google penalizes duplicate content).
