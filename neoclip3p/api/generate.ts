import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { provider, prompt, aspectRatio } = req.body;

    if (!provider || !prompt) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    if (provider === 'fal') {
      const key = process.env.FAL_API_KEY;
      const r = await fetch('https://api.fal.ai/fal-ai/video', {
        method: 'POST',
        headers: {
          Authorization: `Key ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, aspectRatio })
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (provider === 'google') {
      const key = process.env.GOOGLE_API_KEY;
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/veo:generate?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspectRatio })
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (provider === 'piapi') {
      const key = process.env.PIAPI_API_KEY;
      const r = await fetch('https://api.piapi.ai/video', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, aspectRatio })
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Unknown provider' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
  }
