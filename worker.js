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
- ATTENTION: Open with a vivid, concrete story,场景, or provocative question that hooks the audience within the first 60 seconds. Ground it in a real human experience. No generic openings.
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

async function callGemini(apiKey, body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) return { ok: false, status: response.status, error: data };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return { ok: true, text: text || 'No response generated.' };
}

async function callGroq(apiKey, systemPrompt, messages) {
  const groqMessages = [{ role: 'system', content: systemPrompt }, ...messages];
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  if (!response.ok) return { ok: false, status: response.status, error: data };
  const text = data.choices?.[0]?.message?.content;
  return { ok: true, text: text || 'No response generated.' };
}

async function callOpenRouter(apiKey, systemPrompt, messages) {
  const orMessages = [{ role: 'system', content: systemPrompt }, ...messages];
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://1844p.github.io/whatifwebelieved/',
      'X-Title': 'WhatIfWeBelieved Theology Agent',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: orMessages,
      temperature: 0.7,
    }),
  });
  const data = await response.json();
  if (!response.ok) return { ok: false, status: response.status, error: data };
  const text = data.choices?.[0]?.message?.content;
  return { ok: true, text: text || 'No response generated.' };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { message, history = [], fileContent, fileName, userApiKey, essayMode, sermonMode, sermonFormat } = await request.json();

      if (!message && !fileContent) {
        return new Response(JSON.stringify({ error: 'No message provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      let userText = message || '';
      
      // Detect if fileContent is an image data URL
      let fileParts = [];
      const isImageDataUrl = fileContent && typeof fileContent === 'string' && fileContent.startsWith('data:image/');
      
      if (fileContent && fileName) {
        if (isImageDataUrl) {
          // Parse data URL for inlineData
          const matches = fileContent.match(/^data:(image\/\w+);base64,(.+)$/);
          if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            fileParts.push({
              inlineData: { mimeType, data: base64Data }
            });
            userText = userText || `Please describe this image (${fileName}) and relate it to Adventist theology or Christian philosophy.`;
          }
        } else {
          // Text content — embed in message
          userText = userText
            ? `${userText}\n\n--- File Content (${fileName}) ---\n${fileContent}`
            : `Please analyze the following file (${fileName}):\n\n${fileContent}`;
        }
      }

      if (essayMode) {
        userText += ESSAY_SUFFIX;
      } else if (sermonMode) {
        userText += SERMON_FORMATS[sermonFormat] || SERMON_SUFFIX_DEFAULT;
      }

      // Build Gemini format
      const geminiContents = [];
      for (const h of history) {
        if (h.user) geminiContents.push({ role: 'user', parts: [{ text: h.user }] });
        if (h.assistant) geminiContents.push({ role: 'model', parts: [{ text: h.assistant }] });
      }
      // Combine text parts with any file parts (e.g. image inlineData)
      const userParts = [{ text: userText }].concat(fileParts);
      geminiContents.push({ role: 'user', parts: userParts });

      const geminiBody = {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: geminiContents,
        generationConfig: { temperature: 0.7 },
      };

      // Build OpenAI/Groq/OpenRouter format
      const messages = [];
      for (const h of history) {
        if (h.user) messages.push({ role: 'user', content: h.user });
        if (h.assistant) messages.push({ role: 'assistant', content: h.assistant });
      }
      messages.push({ role: 'user', content: userText });

      let result = null;
      let provider = 'gemini';

      // 1) Try shared Gemini key
      if (env.GEMINI_API_KEY) {
        result = await callGemini(env.GEMINI_API_KEY, geminiBody);
      }

      // 2) Try user's Gemini key if shared failed
      if ((!result || !result.ok) && userApiKey && userApiKey !== env.GEMINI_API_KEY) {
        result = await callGemini(userApiKey, geminiBody);
      }

      // 3) Fallback to Groq
      if ((!result || !result.ok) && env.GROQ_API_KEY) {
        provider = 'groq';
        result = await callGroq(env.GROQ_API_KEY, SYSTEM_PROMPT, messages);
      }

      // 4) Fallback to OpenRouter
      if ((!result || !result.ok) && env.OPENROUTER_API_KEY) {
        provider = 'openrouter';
        result = await callOpenRouter(env.OPENROUTER_API_KEY, SYSTEM_PROMPT, messages);
      }

      // All failed
      if (!result || !result.ok) {
        const errText = result ? JSON.stringify(result.error) : 'No providers available';
        return new Response(JSON.stringify({ error: `All providers failed: ${errText}` }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const rawText = result.text;

      if (essayMode || sermonMode) {
        const label = sermonMode ? 'sermon' : 'essay';
        const lines = rawText.split('\n');
        const summaryEnd = Math.min(lines.length, 15);
        const summary = lines.slice(0, summaryEnd).join('\n').trim() + `\n\n---\n**The full ${label} is ready. Use the download bar above to save it as a Word document.**`;
        return new Response(JSON.stringify({ text: summary, essay: rawText, provider }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      return new Response(JSON.stringify({ text: rawText, provider }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
