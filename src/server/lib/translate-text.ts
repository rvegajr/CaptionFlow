/** Machine-translate caption text lines (preserves newlines). */
export interface TranslateOpts {
  deeplKey?: string;
  googleKey?: string;
  /**
   * Optional Noctusoft Communication Relay deploy key (`nsins_dk_*`).
   * When set, Google Translate calls are routed through
   * `googleapis.noctusoft.com` instead of `translation.googleapis.com`.
   * The relay forwards the request and the upstream `?key=…` query stays
   * the same, so we still pass `googleKey`.
   */
  noctusoftRelayKey?: string;
}

export async function translateLines(
  text: string,
  targetLang: string,
  opts: TranslateOpts,
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
    const host = opts.noctusoftRelayKey
      ? 'https://googleapis.noctusoft.com/translation/language/translate/v2'
      : 'https://translation.googleapis.com/language/translate/v2';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (opts.noctusoftRelayKey) {
      headers.Authorization = `Bearer ${opts.noctusoftRelayKey}`;
    }
    const res = await fetch(`${host}?key=${encodeURIComponent(opts.googleKey)}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ q: lines, target: targetLang, format: 'text' }),
    });
    if (!res.ok) throw new Error(`google translate ${res.status}`);
    const j = (await res.json()) as { data: { translations: { translatedText: string }[] } };
    return j.data.translations.map((t) => t.translatedText).join('\n');
  }
  return `[MOCK_TRANSLATE_TO_${targetLang}] ${text}`;
}
