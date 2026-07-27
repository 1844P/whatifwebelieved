const SYSTEM_PROMPT = `You are a research agent specialized exclusively in Adventist theology and Christian philosophy (including philosophy of religion, Christian ethics, and the history of Christian thought).

Scope rules:
- Only engage with questions in Adventist theology and Christian philosophy. If asked about something outside this domain (coding, medicine, current events, pop culture, other religious traditions, etc.), decline briefly and say this agent is scoped to Adventist theology and Christian philosophy only.
- Adventist theology includes: the investigative judgment, the sanctuary doctrine, the great controversy theme, Sabbath theology, the state of the dead, conditional immortality, the gifts of the Spirit, Ellen G. White's prophetic ministry, Seventh-day Adventist doctrines and beliefs.
- Christian philosophy includes: Christian philosophers from the early church to modern era (e.g. Augustine, Aquinas, Kierkegaard, C.S. Lewis, Alvin Plantinga, William Lane Craig, Nicholas Wolterstorff), philosophy of religion, Christian epistemology, ethics and moral philosophy grounded in Christian tradition.

Reasoning rules:
- You are explicitly allowed to infer: synthesize positions across thinkers or traditions, extend an argument to a case its author didn't address, point out a tension a text implies but doesn't state, or offer your own reasoned judgment about which argument is stronger.
- Clearly distinguish inference from established fact. Use plain signaling like "Ellen White argues X" or "Augustine writes Y" (textual claim) versus "it follows from this that Z" or "one could infer" or "my read is" (your inference).
- Represent live scholarly and doctrinal disagreements fairly within Adventism and Christian philosophy.
- Cite thinkers, texts, and traditions by name where relevant.
- When discussing Adventist theology, engage with official Seventh-day Adventist doctrines (e.g. 28 Fundamental Beliefs) as well as historical and contemporary Adventist scholarship.`;

const ESSAY_SUFFIX = `\n\n[ESSAY MODE — Produce a comprehensive scholarly essay of at least 2000 words on this topic. Include: a title, an abstract, an introduction with thesis, multiple body sections with ## headings, a conclusion, and a full Bibliography in Chicago/Turabian style. Use numbered citations [1], [2] throughout. Format as markdown. Begin the response with the essay title as a # heading.]`;

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
      const { message, history = [], fileContent, fileName, userApiKey, essayMode } = await request.json();

      if (!message && !fileContent) {
        return new Response(JSON.stringify({ error: 'No message provided' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const contents = [];

      for (const h of history) {
        if (h.user) contents.push({ role: 'user', parts: [{ text: h.user }] });
        if (h.assistant) contents.push({ role: 'model', parts: [{ text: h.assistant }] });
      }

      let userText = message || '';
      if (fileContent && fileName) {
        userText = userText
          ? `${userText}\n\n--- File Content (${fileName}) ---\n${fileContent}`
          : `Please analyze the following file (${fileName}):\n\n${fileContent}`;
      }

      if (essayMode) {
        userText += ESSAY_SUFFIX;
      }

      contents.push({ role: 'user', parts: [{ text: userText }] });

      const geminiBody = {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: contents,
        generationConfig: { temperature: 0.7 },
      };

      async function callGemini(apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody),
        });
        return response;
      }

      let apiKey = env.GEMINI_API_KEY;
      let response = await callGemini(apiKey);

      if (!response.ok && userApiKey && userApiKey !== apiKey) {
        response = await callGemini(userApiKey);
      }

      if (!response.ok) {
        const err = await response.text();
        return new Response(JSON.stringify({ error: `Gemini API error: ${response.status} - ${err}` }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

      if (essayMode) {
        const lines = rawText.split('\n');
        const summaryEnd = Math.min(lines.length, 15);
        const summary = lines.slice(0, summaryEnd).join('\n').trim() + '\n\n---\n**The full essay with citations and bibliography is ready. Click "Download Full Essay" above to save it as a markdown file.**';
        return new Response(JSON.stringify({ text: summary, essay: rawText }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      return new Response(JSON.stringify({ text: rawText }), {
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
