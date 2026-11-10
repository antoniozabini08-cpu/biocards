import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.use(express.json({ limit: '2mb' }));
const PORT = Number(process.env.PORT || 3001);
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const schema = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    concepts: {
      type: 'ARRAY', items: { type: 'OBJECT', properties: {
        id: { type: 'STRING' }, name: { type: 'STRING' }, definition: { type: 'STRING' },
        source_excerpt: { type: 'STRING' }, confidence: { type: 'STRING', enum: ['alta', 'media', 'baixa'] }
      }, required: ['id', 'name', 'definition', 'source_excerpt', 'confidence'] }
    },
    relationships: {
      type: 'ARRAY', items: { type: 'OBJECT', properties: {
        from: { type: 'STRING' }, to: { type: 'STRING' }, type: { type: 'STRING' }, explanation: { type: 'STRING' },
        evidence: { type: 'STRING' }, confidence: { type: 'STRING', enum: ['alta', 'media', 'baixa'] }
      }, required: ['from', 'to', 'type', 'explanation', 'evidence', 'confidence'] }
    },
    flashcards: {
      type: 'ARRAY', items: { type: 'OBJECT', properties: {
        front: { type: 'STRING' }, back: { type: 'STRING' }, concept: { type: 'STRING' }
      }, required: ['front', 'back', 'concept'] }
    },
    questions: {
      type: 'ARRAY', items: { type: 'OBJECT', properties: {
        type: { type: 'STRING', enum: ['multipla_escolha', 'discursiva', 'aplicacao'] },
        prompt: { type: 'STRING' }, options: { type: 'ARRAY', items: { type: 'STRING' } },
        answer: { type: 'STRING' }, explanation: { type: 'STRING' }, concept: { type: 'STRING' }
      }, required: ['type', 'prompt', 'options', 'answer', 'explanation', 'concept'] }
    },
    gaps: { type: 'ARRAY', items: { type: 'STRING' } }
  },
  required: ['summary', 'concepts', 'relationships', 'flashcards', 'questions', 'gaps']
};

app.get('/api/health', (_req, res) => {
  res.json({ configured: Boolean(process.env.GEMINI_API_KEY), model: MODEL });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const note = String(req.body?.note || '').trim();
    if (note.length < 30) return res.status(400).json({ error: 'Escreva uma anotação com pelo menos 30 caracteres.' });
    if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'API não configurada. Copie .env.example para .env e adicione sua chave Gemini.' });
    if (note.length > 30000) return res.status(413).json({ error: 'Anotação muito extensa para este protótipo. Divida em partes menores.' });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `Você é um organizador acadêmico rigoroso. Analise a anotação fornecida e retorne dados para um segundo cérebro.\n\nREGRAS IMPORTANTES:\n- Use somente o que está explicitamente sustentado pela anotação para afirmar fatos.\n- Diferencie inferência de informação explícita. Quando uma relação for inferida ou incerta, reduza confidence e explique isso.\n- Não invente fatos, referências ou detalhes ausentes.\n- Extraia de 4 a 12 conceitos importantes, se o texto permitir.\n- Relações devem ser semanticamente específicas (ex.: causa, estimula, inibe, é parte de, depende de, exemplifica).\n- Gere até 8 flashcards concisos e até 5 questões variadas. Questões de aplicação só quando o conteúdo permitir; não invente cenários clínicos ou fatos externos.\n- Para questões de múltipla escolha, crie 4 alternativas e indique em answer a alternativa correta por extenso.\n- source_excerpt e evidence devem apontar trechos ou ideias presentes na anotação.\n- Em gaps, liste dúvidas, termos não definidos ou conexões que exigiriam fonte adicional.\n\nANOTAÇÃO:\n${note}`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
        temperature: 0.2,
        maxOutputTokens: 7000
      }
    });
    const result = JSON.parse(response.text || '{}');
    res.json({ result, model: MODEL });
  } catch (error) {
    console.error('Gemini error:', error?.message || error);
    res.status(500).json({ error: 'Não foi possível processar a anotação. Verifique a chave, o modelo e os limites da API.', detail: error?.message || 'Erro desconhecido' });
  }
});

// Em produção, sirva o frontend por um serviço próprio e configure autenticação.
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => err && res.status(404).send('Frontend ainda não compilado. Execute npm run build.'));
});

app.listen(PORT, () => console.log(`Knowledge OS API em http://localhost:${PORT}`));
