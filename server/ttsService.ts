import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'briefings');

// Ensure directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const generateSpeech = async (
  text: string,
  language: 'fr' | 'ar',
): Promise<string | null> => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('OPENAI_API_KEY not found. Skipping server-side TTS.');
    return null;
  }

  try {
    console.log(`Generating speech for language: ${language}`);

    // Voice selection: 'alloy' is versatile. 'onyx' is deeper.
    const voice = 'alloy';

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI TTS Error:', error);
      return null;
    }

    const buffer = await response.arrayBuffer();

    // Create unique filename based on content hash
    const hash = crypto.createHash('md5').update(text).digest('hex');
    const filename = `briefing-${hash}.mp3`;
    const filePath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filePath, Buffer.from(buffer));

    return `/uploads/briefings/${filename}`;
  } catch (error) {
    console.error('Error in generateSpeech:', error);
    return null;
  }
};
