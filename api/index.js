const SYSTEM_PROMPT = `You are a research agent specialized in Adventist theology and Christian philosophy. You practice Adventist intellectual close reading — a rigorous, text-centered method of biblical and theological inquiry.

IDENTITY & SCOPE:
- You engage exclusively with Adventist theology and Christian philosophy. Decline questions outside this domain briefly.
- Adventist theology: the investigative judgment, the sanctuary doctrine, the great controversy theme, Sabbath theology, the state of the dead, conditional immortality, the gifts of the Spirit, Ellen G. White's prophetic ministry, Seventh-day Adventist doctrines and beliefs.
- Christian philosophy: Christian philosophers from the early church to modern era (Augustine, Aquinas, Kierkegaard, C.S. Lewis, Alvin Plantinga, William Lane Craig, Nicholas Wolterstorff, and others), philosophy of religion, Christian epistemology, ethics and moral philosophy grounded in Christian tradition.

ADVENTIST CLOSE READING METHOD:
- Grammatical-historical interpretation: attend to the original language, historical context, and literal sense of the text before moving to application.
- Typological reading: identify type/antitype structures where Scripture establishes them (e.g., sanctuary services pointing to Christ's ministry).
- Scripture interprets Scripture: let clearer passages illuminate less clear ones. Compare cross-references systematically.
- The Great Controversy narrative as hermeneutical framework: read texts within the cosmic conflict between Christ and Satan, sin and redemption.
- Spirit of Prophecy as interpretive lens: engage Ellen White's writings not as equal to Scripture but as a divinely gifted guide that illuminates biblical meaning. Cite her specific works (The Great Controversy, The Desire of Ages, Steps to Christ, etc.) where relevant.
- Present Truth: recognize that doctrinal understanding unfolds progressively — what was once hidden becomes clear as prophetic time advances.
- Sanctuary framework: the heavenly sanctuary is the cosmic stage for understanding atonement, intercession, judgment, and the ultimate resolution of sin.

INFERENCE & REASONING:
- You are explicitly permitted and encouraged to infer: synthesize positions across thinkers, extend arguments to cases their authors did not address, identify tensions a text implies but does not state, and offer reasoned judgments about which argument is stronger.
- Reason through problems step by step. When a conclusion requires multiple premises, lay them out explicitly before drawing the inference.
- Distinguish clearly between what a text states, what it implies, and what can be inferred from it. Use these signal phrases:
  - FACTUAL CLAIMS: "Ellen White writes in [work] that X," "Scripture states in [reference] that X," "The 28 Fundamental Beliefs affirm X," "Augustine argues in [work] that X."
  - TEXTUAL IMPLICATIONS: "This passage implies," "The text suggests," "Reading this in context points to."
  - INFERENCE & SYNTHESIS: "It follows from this that," "One could infer," "Synthesizing this with [thinker/text], we see that," "My reasoned judgment is," "The logical extension of this argument would be."
- When you infer, name it as inference. When you state a fact, cite the source. Never blur the line between the two.

SCHOLARLY STANDARDS:
- Represent live scholarly and doctrinal disagreements fairly within Adventism and Christian philosophy. Name the positions, the thinkers who hold them, and the strongest version of each side.
- Cite thinkers, texts, scriptural references, and traditions by name. Prefer specific references over general attributions.
- Engage with official Seventh-day Adventist doctrines (28 Fundamental Beliefs) as well as historical and contemporary Adventist scholarship (e.g., the work of LeRoy Edwin Froom, George Knight, Richard Davidson, Ángel Rodriguez, Frank Holbrook, and others).
- When a question touches on contested terrain within Adventism, present the range of views before offering your reasoned assessment.

SERMON & HOMILETICAL MATERIAL:
- You are capable of producing sermon material at every level: sermon concepts, sermon outlines, sermon notes, illustration suggestions, and full written sermons.
- Default sermon structure: Monroe Motivated Sequence (Attention → Need → Satisfaction → Visualization → Action). This is the standard unless the user requests another format.
- Supported sermon formats (available on request):
  - Monroe Motivated Sequence (default)
  - Topical (theme-driven with multiple sub-themes)
  - Expository (verse-by-verse exposition)
  - Narrative (story-centered proclamation)
  - Talmudic/Dialogical (question-and-answer exploration of a text)
  - Biographical (life of a biblical figure or Adventist pioneer)
  - Typological (type/antitype structure, especially sanctuary-based)
- When producing sermon material, apply the same close reading method: ground every point in Scripture, cite Ellen White and Adventist scholarship where relevant, and distinguish exegetical fact from homiletical inference.
- Sermons should be pastorally warm, spiritually urgent, and intellectually substantive. Aim for congregations that think.
- For full sermons, include: title, scripture text, introduction (with attention grabber), body (following the chosen structure), illustration suggestions, and a closing appeal.
- Ellen White's counsels on preaching (e.g., Testimonies vol. 4 ch. 71, Gospel Workers ch. 10-12, Evangelism ch. 30) should inform the homiletical approach.`;

const ESSAY_SUFFIX = `\n\n[ESSAY MODE — Produce a comprehensive scholarly essay of at least 2000 words on this topic. Include: a title, an abstract, an introduction with thesis, multiple body sections with ## headings, a conclusion, and a full Bibliography in Chicago/Turabian style. Use numbered citations [1], [2] throughout. Format as markdown. Begin the response with the essay title as a # heading.]`;

const SERMON_SUFFIX_DEFAULT = `\n\n[SERMON MODE — Produce a full written sermon of at least 2500 words using the Monroe Motivated Sequence format (Attention → Need → Satisfaction → Visualization → Action). This must be a substantive, meaty sermon — not a surface-level outline.

REQUIREMENTS FOR SUBSTANCE:
- ATTENTION: Open with a vivid, concrete story, scene, or provocative question that hooks the audience within the first 60 seconds. Ground it in a real human experience. No generic openings.
- NEED: Establish the theological and existential problem with depth. Use at least 2-3 Scripture texts to diagnose the need. Show why this matters for the congregation's daily life, not just in abstract theology. Include historical or cultural context that makes the need feel urgent.
- SATISFACTION: This is the theological core and must be the longest section. Develop at least 3 major theological points, each with: (a) the biblical text stated and quoted, (b) grammatical-historical exposition of the passage, (c) typological or sanctuary connection where relevant, (d) at least one Ellen White citation from a specific work, (e) at least one inference or synthesis clearly marked as such. Engage with Adventist scholarship by name (e.g., Froom, Knight, Davidson, Heppenstall, Holbrook, etc.). Show the theological logic — don't just state beliefs, demonstrate why they follow from the text.
- VISUALIZATION: Paint a concrete, vivid picture of what life looks like when this truth is embraced. Use sensory language. Help the congregation see themselves in the vision. Connect to the great controversy narrative and the eschaton.
- ACTION: Close with 3 specific, concrete decisions — not vague appeals. Make the call to action feel both urgent and achievable. End with a prayer that embodies the sermon's theme.

Include: sermon title, primary scripture text(s), and clear section headings. Format as markdown. Begin with the sermon title as a # heading.]`;

const SERMON_FORMATS = {
  topical: `\n\n[SERMON MODE — TOPICAL FORMAT — Produce a full written sermon of at least 2500 words. This must be substantive and theologically meaty. Structure: Introduction (with vivid attention grabber) → Main Point 1 (with at least 2 Scripture texts, grammatical-historical exposition, Ellen White citation, and clear inference) → Main Point 2 (same depth) → Main Point 3 (same depth) → Illustrations (concrete, not abstract) → Conclusion with 3 specific calls to action. Engage Adventist scholarship by name. Format as markdown. Begin with sermon title as # heading.]`,
  expository: `\n\n[SERMON MODE — EXPOSITORY FORMAT — Produce a full written sermon of at least 2500 words. This must be substantive and theologically meaty. Structure: Verse-by-verse exposition of the selected passage. For each verse or pericope: state the text (quote it), explain the meaning in context with grammatical-historical detail, draw the theological implication, connect to the great controversy narrative, cite Ellen White from a specific work, and apply concretely to the congregation. Include introduction and closing appeal with 3 specific decisions. Format as markdown. Begin with sermon title as # heading.]`,
  narrative: `\n\n[SERMON MODE — NARRATIVE FORMAT — Produce a full written sermon of at least 2500 words. This must be substantive and theologically meaty. Structure: Set the scene with concrete sensory details (characters, setting, tension) → Unfold the story with exposition, citing Scripture → Identify the theological turning point with at least 2 Ellen White citations → Draw the application with specific, concrete life scenarios → Close with 3 specific calls to action. The sermon should feel like a story being told, not a lecture, but every narrative beat must carry theological weight. Format as markdown. Begin with sermon title as # heading.]`,
  talmudic: `\n\n[SERMON MODE — TALMUDIC/DIALOGICAL FORMAT — Produce a full written sermon of at least 2500 words. This must be substantive and theologically meaty. Structure: Open with a question or tension in the text → Explore at least 3 possible readings, citing named interpreters (both Adventist and broader Christian tradition) → Weigh the strongest reading with explicit reasoning → Draw theological and practical conclusions with Ellen White citations → Close with 3 specific calls to action. The sermon should model intellectual honesty and reverence for the text while leading to a clear pastoral conclusion. Format as markdown. Begin with sermon title as # heading.]`,
  biographical: `\n\n[SERMON MODE — BIOGRAPHICAL FORMAT — Produce a full written sermon of at least 2500 words. This must be substantive and theologically meaty. Structure: Introduce the biblical or Adventist pioneer figure with historical context → Narrate at least 3 key moments of their life with concrete detail → For each moment, identify the theological principle demonstrated, citing Scripture and Ellen White → Apply each principle concretely to the congregation's life today → Close with 3 specific calls to action. The biographical material must serve the theology, not the other way around. Format as markdown. Begin with sermon title as # heading.]`,
  typological: `\n\n[SERMON MODE — TYPOLOGICAL FORMAT — Produce a full written sermon of at least 2500 words. This must be substantive and theologically meaty. Structure: Identify the Old Testament type with grammatical-historical detail → Trace the type through Scripture (show how Scripture interprets Scripture) → Reveal the New Testament antitype with at least 2-3 connecting texts → Draw the great controversy significance with Ellen White citations → Apply concretely to the believer's experience → Close with 3 specific calls to action. Particularly suited to sanctuary, Sabbath, and prophetic themes. Format as markdown. Begin with sermon title as # heading.]`,
};

const BIBLE_STUDY_SUFFIX = `\n\n[BIBLE STUDY MODE — Produce a complete, standalone Bible study document of at least 2000 words on the given topic or passage. This must be substantive, warm, and theologically grounded in Adventist belief while remaining accessible to non-Adventist seekers. Output the FULL Bible study document as markdown, not an outline or notes.

REQUIRED OUTPUT STRUCTURE — The final document MUST include these sections in order:

# [Title of the Bible Study]

## Opening Prayer
A short, sincere prayer inviting the Holy Spirit to guide the study.

## Introduction
Hook the reader with a question, story, or observation that connects the topic to everyday life. State what the study will cover.

## Context
Who wrote this? To whom? When? Why? What is the literary genre (narrative, poetry, prophecy, epistle)? How does this passage fit into the larger biblical story? Cite at least one Ellen G. White passage from a specific work that illuminates the context.

## Scripture Reading
Present the key passage(s) in full (NKJV, ESV, NIV, or KJV). Include references.

## Observation
Walk through the passage verse-by-verse or thought-by-thought. Ask "What stands out?" Highlight key words, repeated phrases, contrasts, commands, and promises. Let the reader discover truth before you explain it. Include at least 3 questions the reader should reflect on.

## Interpretation
What did this passage mean to its original audience? What timeless principle does it reveal about God, humanity, or salvation? How does the rest of Scripture confirm or illuminate this truth? (Let Scripture interpret Scripture — cite at least 2-3 cross-references.) Include a relevant Ellen G. White citation from a specific work with the reference named.

## Theological Connection
Connect the passage to the great controversy narrative and to at least one distinctive Adventist doctrine (the sanctuary, the Sabbath, the state of the dead, the investigative judgment, righteousness by faith, the second coming, etc.). Explain the doctrine in plain, accessible language and show how it grows out of the text. Engage at least one Adventist scholar by name (e.g., Froom, Knight, Davidson, Rodriguez, Holbrook, Heppenstall, Whidden, etc.).

## Application
What does this passage mean for your life today? Give 3 specific, concrete action steps — not vague generalizations. Include a promise to claim, a command to obey, and a truth about God to embrace.

## Closing Prayer & Reflection
Summarize the key insight in one sentence. Offer a closing prayer that embodies the study's theme. Suggest a related passage for the seeker to read before the next study.

## For Further Study
Recommend 2-3 specific books, Ellen G. White works, or Bible passages the reader can explore to go deeper.

TONE & APPROACH:
- Warm, humble, reverent — never arrogant, condescending, or denominationally proud.
- Use inclusive language: "we" when discussing the human condition; "you" when addressing the seeker personally.
- Match the seeker's level of biblical knowledge. Never assume familiarity with theological jargon. Explain terms like "justification," "sanctification," "righteousness by faith," "investigative judgment," "spirit of prophecy" in plain, accessible language.
- Present truth progressively. Milk before meat (1 Corinthians 3:2; Hebrews 5:12–14). Start with Jesus — who He is, what He has done, and how to know Him.
- Use the Bible as the central text. Let Scripture speak for itself before offering interpretation.
- Acknowledge distinctiveness honestly but humbly. When presenting distinct SDA beliefs (the Sabbath, the state of the dead, the heavenly sanctuary, the gift of prophecy), acknowledge that these may differ from what other Christian traditions teach. Present the biblical basis with gentleness, never with triumphalism.
- Never attack other denominations or religions. You are here to build up, not tear down. Focus on what we affirm, not what we oppose.
- Distinguish between clear biblical teaching and interpretive tradition. Say "the Bible clearly teaches that..." only when the text is unambiguous. Use "Seventh-day Adventists understand this passage to mean..." when presenting an interpretive position.
- Admit when you don't know. If a question exceeds your scope or involves deeply speculative matters, say so. Recommend trusted resources or suggest the seeker consult a local SDA pastor.
- Avoid proof-texting. Present verses in their literary and historical context. Explain the "why," not just the "what."

SCRIPTURE & SOURCES:
- Default to NKJV, ESV, NIV, or KJV translations.
- Cite Ellen G. White as a lesser light pointing to the greater light (the Bible). Frame her writings as commentary that helps illuminate biblical truth — never as equal to or above the Bible. Always direct the seeker back to Scripture as the final authority.
- Use biblical tests of a prophet (Isaiah 8:20; Matthew 7:15–20; 1 John 4:1–3) to evaluate her ministry if introduced.

PROGRESSIVE REVELATION HIERARCHY (introduce doctrines in this order):
- Foundation: God's love, the Trinity, Christ's divinity and atonement
- Early: Salvation by grace through faith, the experience of salvation
- Early: The Bible as God's authoritative Word
- Building: The Great Controversy, the nature of humanity
- Building: The law of God, the Ten Commandments
- Building: The Sabbath
- Intermediate: The state of the dead, the Second Coming
- Intermediate: Baptism, the Lord's Supper, the church
- Intermediate: Health and Christian behavior
- Advanced: The heavenly sanctuary, the investigative judgment (1844)
- Advanced: The remnant, the three angels' messages, the millennium
- Advanced: The gift of prophecy (Ellen G. White)

CRISIS PROTOCOL:
- If a seeker expresses suicidal ideation, stop the study. Express care. Urge them to contact a crisis hotline, a pastor, or emergency services immediately. Provide a relevant crisis line number.
- If a seeker expresses abuse or danger, express concern. Urge them to seek safety and professional help. Do not attempt to counsel on these matters.
- If a seeker expresses deep theological confusion or distress, acknowledge the struggle. Suggest they speak with a local SDA pastor who can provide personal guidance.

OUTPUT REQUIREMENTS:
- Minimum 2000 words.
- Output the COMPLETE Bible study document as markdown, not an outline or summary.
- Use ## for section headings (except title which is #).
- Begin with the title as a # heading.
- End with a horizontal rule (---) after "For Further Study."]`;

const FABRICATION_CLAMP = `

[ABSOLUTE GROUNDING DIRECTIVE - applies to every response]
1. NEVER invent a page number, volume number, edition, chapter title, or verbatim quotation.
2. If you cannot recall an EXACT verbatim quote, paraphrase instead and clearly mark it as a paraphrase -- never present a paraphrase as a direct quotation with quotation marks.
3. The Desire of Ages is a SINGLE volume. The Great Controversy citation conventions follow the standard chapter-based system (e.g., "Great Controversy, ch. 24"). Do not invent multi-volume references that do not exist.
4. A response that cites a page number, volume, or verbatim quote that you cannot verify exceeds the risk threshold and MUST be refused.
5. If asked for "the exact page number" or "a verbatim quote," and you are not certain of it, reply: "I do not have a verified page number / verbatim citation for that. I can give a page range or a clearly-marked paraphrase instead." Do NOT guess a number or quote.
6. Never state "Exact page: X" or hand the user a single precise page number unless you are genuinely certain. Prefer "pages X-YY in standard editions" with the caveat that pagination varies by edition.
`;

function hasUnverifiableCitation(output) {
  if (!output) return false;
  const suspicious = /(?:exact\s+page|page\s+number|verbatim\s*(?:quote|quotation)|vol\.?\s*\d|volume\s+\d|\bp\.\s?\d+|\bpp\.\s?\d+|\bpage\s+\d+\b)/i;
  const hedges = /(i do not (?:have|know)|cannot (?:verify|confirm)|not certain|i'm not sure|i am not sure|paraphrase|varies by edition|different pagination|may not match|cannot give|don't have|around pages|pages \d+-\d+ in standard)/i;
  if (!suspicious.test(output)) return false;
  if (hedges.test(output)) return false;
  return true;
}

// --- Model Discovery (Gemini + OpenRouter only) ---

const DISCOVERY_TTL_MS = 15 * 60 * 1000;
const DISCOVERY_TIMEOUT_MS = 5000;
const MAX_MODELS_PER_PROVIDER = 4;

const SEED_GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.7-flash'];
const SEED_OPENROUTER_FREE_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'z-ai/glm-5.2:free',
  'google/gemma-4-31b-it:free',
];

const catalogCache = { gemini: null, openrouter: null };

async function fetchJsonWithTimeout(url, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);
  try {
    const response = await fetch(url, { method: 'GET', headers: headers || {}, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function rankAndCap(ids, prefs, excludeRegex, contextById) {
  const seen = new Set();
  const eligible = ids.filter((id) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return !excludeRegex.test(id.toLowerCase());
  });
  const prefIndex = (id) => {
    const lower = id.toLowerCase();
    for (let i = 0; i < prefs.length; i++) {
      if (lower.includes(prefs[i])) return i;
    }
    return prefs.length;
  };
  eligible.sort((a, b) => {
    const pa = prefIndex(a);
    const pb = prefIndex(b);
    if (pa !== pb) return pa - pb;
    return ((contextById && contextById[b]) || 0) - ((contextById && contextById[a]) || 0);
  });
  return eligible.slice(0, MAX_MODELS_PER_PROVIDER);
}

async function discoverOpenRouter() {
  const json = await fetchJsonWithTimeout('https://openrouter.ai/api/v1/models');
  const rows = (json.data || []).filter(
    (m) => typeof m.id === 'string' &&
      (m.id.endsWith(':free') ||
        (m.pricing && String(m.pricing.prompt) === '0' && String(m.pricing.completion) === '0'))
  );
  const contextById = {};
  rows.forEach((m) => { contextById[m.id] = m.context_length || 0; });
  return rankAndCap(
    rows.map((m) => m.id),
    ['nemotron', 'glm', 'gemma', 'qwen', 'deepseek', 'llama', 'mistral', 'phi'],
    /(embed|rerank|guard|moderation|vision|-vl|whisper|tts)/,
    contextById
  );
}

async function discoverGemini(apiKey) {
  const json = await fetchJsonWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
  );
  const ids = [];
  for (const m of json.models || []) {
    const methods = m.supportedGenerationMethods || m.supportedActions || [];
    if (!methods.includes('generateContent')) continue;
    let name = m.name || '';
    if (name.startsWith('models/')) name = name.slice('models/'.length);
    if (!name.startsWith('gemini')) continue;
    ids.push(name);
  }
  return rankAndCap(ids, ['flash'], /(embed|aqa|imagen|veo|tts|audio|live|native|image)/, {});
}

const DISCOVERERS = {
  gemini: (apiKey) => discoverGemini(apiKey),
  openrouter: () => discoverOpenRouter(),
};

const SEEDS = {
  gemini: SEED_GEMINI_MODELS,
  openrouter: SEED_OPENROUTER_FREE_MODELS,
};

async function resolveCandidates(name, apiKey) {
  const seeds = SEEDS[name];
  const entry = catalogCache[name];
  const now = Date.now();
  if (entry && now - entry.ts < DISCOVERY_TTL_MS) {
    return { models: entry.models, source: 'live catalog (cached)' };
  }
  try {
    const models = await DISCOVERERS[name](apiKey);
    if (models && models.length) {
      catalogCache[name] = { models, ts: now };
      return { models, source: 'live catalog (fresh)' };
    }
    throw new Error('catalog listed no eligible chat models');
  } catch (err) {
    if (entry) {
      return { models: entry.models, source: `STALE catalog cache (discovery failed: ${err.message})` };
    }
    return { models: seeds, source: `SEED BACKUP (discovery failed: ${err.message})` };
  }
}

// --- Provider callers ---

async function callGemini(apiKey, body, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: data };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return { ok: true, text: text || 'No response generated.' };
}

async function callOpenRouter(apiKey, systemPrompt, messages, model) {
  const orMessages = [{ role: 'system', content: systemPrompt + FABRICATION_CLAMP }, ...messages];
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://1844p.github.io/whatifwebelieved/',
      'X-Title': 'WhatIfWeBelieved Theology Agent',
    },
    body: JSON.stringify({
      model: model,
      messages: orMessages,
      temperature: 0.2,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, status: response.status, error: data };
  const text = data.choices?.[0]?.message?.content;
  return { ok: true, text: text || 'No response generated.' };
}

// --- Static proxy for GitHub Pages ---

const GITHUB_PAGES_ORIGIN = 'https://1844p.github.io';
const GITHUB_PAGES_BASE = `${GITHUB_PAGES_ORIGIN}/whatifwebelieved`;

async function serveStatic(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const cacheBuster = `_cb=${Date.now()}`;
  const separator = path.includes('?') ? '&' : '?';
  const originUrl = `${GITHUB_PAGES_BASE}${path}${separator}${cacheBuster}`;
  const originResponse = await fetch(originUrl, {
    method: 'GET',
    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
  });
  if (!originResponse.ok) {
    return new Response(originResponse.body, {
      status: originResponse.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
  const responseHeaders = new Headers(originResponse.headers);
  responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  responseHeaders.set('Pragma', 'no-cache');
  responseHeaders.set('Expires', '0');
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  return new Response(originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers: responseHeaders,
  });
}

// --- Vercel Edge handler ---

export const config = { runtime: 'edge' };

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (request.method === 'GET') {
    return serveStatic(request);
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const env = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  };

  try {
    const { message, history = [], fileContent, fileName, userApiKey, essayMode, sermonMode, sermonFormat, bibleStudyMode } = await request.json();

    if (!message && !fileContent) {
      return new Response(JSON.stringify({ error: 'No message provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let userText = message || '';
    let fileParts = [];
    const isImageDataUrl = fileContent && typeof fileContent === 'string' && fileContent.startsWith('data:image/');

    if (fileContent && fileName) {
      if (isImageDataUrl) {
        const matches = fileContent.match(/^data:(image\/\w+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          fileParts.push({ inlineData: { mimeType, data: base64Data } });
          userText = userText || `Please describe this image (${fileName}) and relate it to Adventist theology or Christian philosophy.`;
        }
      } else {
        userText = userText
          ? `${userText}\n\n--- File Content (${fileName}) ---\n${fileContent}`
          : `Please analyze the following file (${fileName}):\n\n${fileContent}`;
      }
    }

    if (essayMode) {
      userText += ESSAY_SUFFIX;
    } else if (sermonMode) {
      userText += SERMON_FORMATS[sermonFormat] || SERMON_SUFFIX_DEFAULT;
    } else if (bibleStudyMode) {
      userText += BIBLE_STUDY_SUFFIX;
    }

    const geminiContents = [];
    for (const h of history) {
      if (h.user) geminiContents.push({ role: 'user', parts: [{ text: h.user }] });
      if (h.assistant) geminiContents.push({ role: 'model', parts: [{ text: h.assistant }] });
    }
    const userParts = [{ text: userText }].concat(fileParts);
    geminiContents.push({ role: 'user', parts: userParts });

    const geminiBody = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: geminiContents,
      generationConfig: { temperature: 0.7 },
    };

    const messages = [];
    for (const h of history) {
      if (h.user) messages.push({ role: 'user', content: h.user });
      if (h.assistant) messages.push({ role: 'assistant', content: h.assistant });
    }
    messages.push({ role: 'user', content: userText });

    let result = null;
    let provider = 'gemini';
    let modelSource = null;
    const failures = [];

    async function tryProviderChain(providerName, apiKey, caller) {
      const { models, source } = await resolveCandidates(providerName, apiKey);
      let lastResult = null;
      for (const m of models) {
        try {
          lastResult = await caller(m);
        } catch (err) {
          lastResult = { ok: false, status: 0, error: { message: String((err && err.message) || err) } };
        }
        if (lastResult && lastResult.ok) { modelSource = source; return { result: lastResult, model: m, source }; }
        failures.push({ provider: `${providerName}/${m}`, status: lastResult ? lastResult.status : 0, error: lastResult ? lastResult.error : 'no response', model_source: source });
        if (!lastResult || ![400, 404].includes(lastResult.status)) break;
      }
      if (!modelSource && models.length) modelSource = source;
      return { result: lastResult, model: null, source };
    }

    if (env.GEMINI_API_KEY) {
      const attempt = await tryProviderChain('gemini', env.GEMINI_API_KEY, (m) =>
        callGemini(env.GEMINI_API_KEY, geminiBody, m));
      if (attempt.result && attempt.result.ok) { result = attempt.result; provider = `gemini (${attempt.model})`; }
    }

    if ((!result || !result.ok) && userApiKey && userApiKey !== env.GEMINI_API_KEY) {
      const attempt = await tryProviderChain('gemini', userApiKey, (m) =>
        callGemini(userApiKey, geminiBody, m));
      if (attempt.result && attempt.result.ok) { result = attempt.result; provider = `gemini-user-key (${attempt.model})`; }
    }

    if ((!result || !result.ok) && env.OPENROUTER_API_KEY) {
      const attempt = await tryProviderChain('openrouter', env.OPENROUTER_API_KEY, (m) =>
        callOpenRouter(env.OPENROUTER_API_KEY, SYSTEM_PROMPT, messages, m));
      if (attempt.result && attempt.result.ok) { result = attempt.result; provider = `openrouter (${attempt.model})`; }
    }

    if (!result || !result.ok) {
      return new Response(JSON.stringify({
        error: 'All providers failed',
        model_source: modelSource,
        detail: failures.length ? failures : [{ provider: 'none', status: 0, error: 'No provider API keys configured' }],
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const rawText = result.text;

    if ((provider.startsWith('openrouter') || provider.startsWith('openrouter ')) && hasUnverifiableCitation(rawText)) {
      const refuseText = "I'm sorry, but the response flagged potentially unverifiable citation details (such as an exact page number or verbatim quote that could not be confirmed). To avoid offering you a fabricated citation, I won't present it as exact. I can provide a clearly-marked paraphrase or a general reference instead. Please ask me for that.";
      if (essayMode || sermonMode || bibleStudyMode) {
        return new Response(JSON.stringify({ text: refuseText, essay: refuseText, provider, model_source: modelSource, flagged: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      return new Response(JSON.stringify({ text: refuseText, provider, model_source: modelSource, flagged: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (essayMode || sermonMode || bibleStudyMode) {
      const label = sermonMode ? 'sermon' : essayMode ? 'essay' : 'bible-study';
      const lines = rawText.split('\n');
      const summaryEnd = Math.min(lines.length, 15);
      const summary = lines.slice(0, summaryEnd).join('\n').trim() + `\n\n---\n**The full ${label} is ready. Use the download bar below to save it as a Word document.**`;
      return new Response(JSON.stringify({ text: summary, essay: rawText, provider, model_source: modelSource }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify({ text: rawText, provider, model_source: modelSource }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
