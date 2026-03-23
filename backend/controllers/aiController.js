// aiController.js — Proxy backend vers l'API Anthropic
const https = require('https');

const SYSTEM_PROMPT = `Tu es ARIA (Artificial Religious Intelligence Assistant), l'assistant IA intégré du système de gestion de LHM Madagascar (Lutheran Hour Ministries - Feon'ny Filazantsara).

Tu aides l'équipe à :
- Analyser les performances des étudiants BCC (Bible Correspondence Course)
- Prédire les risques d'abandon ou d'échec
- Recommander des actions pour améliorer les résultats
- Analyser la gestion du personnel et des absences
- Suggérer des optimisations pour la gestion du stock
- Donner des insights sur les projets

Tu réponds en français, de manière professionnelle et concise. Tu utilises des émojis pour rendre les réponses plus lisibles. Quand on te demande des prédictions, tu bases tes analyses sur les tendances observées dans les données fournies.`;

// Appel à l'API Anthropic via Node.js (pas de CORS)
function callAnthropic(body, apiKey) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'Content-Length':    Buffer.byteLength(data),
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch(e) { reject(new Error('Réponse invalide de l\'API')); }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// POST /api/ai/chat
exports.chat = async (req, res) => {
  try {
    const { messages, context } = req.body;
    if (!messages || !Array.isArray(messages))
      return res.status(400).json({ message: 'messages[] requis' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        message: 'Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans le fichier .env du backend.',
        code: 'NO_API_KEY'
      });
    }

    const systemWithContext = context
      ? `${SYSTEM_PROMPT}\n\nContexte actuel du système LHM Madagascar:\n${context}`
      : SYSTEM_PROMPT;

    const result = await callAnthropic({
      model:       'claude-sonnet-4-20250514',
      max_tokens:  1000,
      system:      systemWithContext,
      messages:    messages.slice(-10), // garder les 10 derniers messages
    }, apiKey);

    if (result.status !== 200) {
      console.error('Anthropic API error:', result.status, result.data);
      const errMsg = result.data?.error?.message || 'Erreur API Anthropic';
      const errType = result.data?.error?.type || '';
      // Toujours retourner 422 (pas 401/403) pour éviter la déconnexion du frontend
      return res.status(422).json({ message: errMsg, code: errType, anthropicStatus: result.status });
    }

    const reply = result.data.content
      ?.filter(b => b.type === 'text')
      .map(b => b.text)
      .join('') || '';

    res.json({ success: true, reply, usage: result.data.usage });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({ message: 'Erreur serveur IA: ' + err.message });
  }
};

// POST /api/ai/predict
exports.predict = async (req, res) => {
  try {
    const { context } = req.body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        message: 'Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans le fichier .env du backend.',
        code: 'NO_API_KEY'
      });
    }

    const prompt = `Génère une analyse prédictive structurée du système LHM Madagascar.
Contexte: ${context || 'Données non disponibles'}

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{
  "resume": "Résumé en 1-2 phrases de l'état général",
  "alertes": [{"niveau":"high|medium|low","titre":"...","description":"...","action":"..."}],
  "predictions": [{"domaine":"BCC|Stock|Personnel|Projets","titre":"...","probabilite":0-100,"impact":"positif|negatif|neutre","detail":"..."}],
  "recommandations": [{"priorite":1,"titre":"...","description":"...","benefice":"..."}]
}`;

    const result = await callAnthropic({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: prompt }],
    }, apiKey);

    if (result.status !== 200) {
      const errMsg = result.data?.error?.message || 'Erreur API';
      // Toujours retourner 422 pour éviter la déconnexion du frontend
      return res.status(422).json({ message: errMsg, anthropicStatus: result.status });
    }

    const text = result.data.content
      ?.filter(b => b.type === 'text').map(b => b.text).join('').trim() || '';
    const clean = text.replace(/```json|```/g, '').trim();

    try {
      const parsed = JSON.parse(clean);
      res.json({ success: true, data: parsed });
    } catch {
      res.status(500).json({ message: 'Impossible de parser la réponse IA. Réessayez.' });
    }
  } catch (err) {
    console.error('AI predict error:', err.message);
    res.status(500).json({ message: 'Erreur serveur IA: ' + err.message });
  }
};
