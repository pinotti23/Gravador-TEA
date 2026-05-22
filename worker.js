export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    // ── Rota: transcrição de áudio via Groq Whisper ──
    if (url.pathname === '/transcribe') {
      try {
        const formData = await request.formData();
        const audioFile = formData.get('audio');

        const groqForm = new FormData();
        groqForm.append('file', audioFile);
        groqForm.append('model', 'whisper-large-v3-turbo');
        groqForm.append('language', 'pt');
        groqForm.append('response_format', 'json');

        const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + env.GROQ_API_KEY },
          body: groqForm
        });

        const data = await resp.json();

        if (!resp.ok) throw new Error(data.error?.message || 'Erro Groq ' + resp.status);

        return new Response(JSON.stringify({ text: data.text }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

      } catch(err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // ── Rota padrão: proxy Claude ──
    try {
      const body = await request.json();
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body)
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });

    } catch(err) {
      return new Response(JSON.stringify({ error: { message: err.message } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
