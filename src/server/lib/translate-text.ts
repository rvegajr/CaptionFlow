/** Machine-translate caption text lines (preserves newlines). */
export async function translateLines(
  text: string,
  targetLang: string,
  opts: { deeplKey?: string; googleKey?: string },
): Promise<string> {
  const lines = text.split('\n');
  if (opts.deeplKey) {
    const out: string[] = [];
    for (const line of lines) {
      if (!line.trim()) {
        out.push(line);
        continue;
      }
      const res = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${opts.deeplKey}` },
        body: new URLSearchParams({
          text: line,
          target_lang: targetLang.toUpperCase(),
        }),
      });
      if (!res.ok) throw new Error(`deepl ${res.status}`);
      const j = (await res.json()) as { translations: { text: string }[] };
      out.push(j.translations[0]?.text ?? line);
    }
    return out.join('\n');
  }
  if (opts.googleKey) {
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(opts.googleKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: lines, target: targetLang, format: 'text' }),
      },
    );
    if (!res.ok) throw new Error(`google translate ${res.status}`);
    const j = (await res.json()) as { data: { translations: { translatedText: string }[] } };
    return j.data.translations.map((t) => t.translatedText).join('\n');
  }
  return `[MOCK_TRANSLATE_TO_${targetLang}] ${text}`;
}
