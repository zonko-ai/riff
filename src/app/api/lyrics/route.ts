import { NextRequest, NextResponse } from "next/server";

const XAI_API_KEY = process.env.XAI_API_KEY;

export async function POST(req: NextRequest) {
  if (!XAI_API_KEY) {
    return NextResponse.json(
      { error: "XAI_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const {
      prompt,
      vibe,
      lyricsDensity,
      duration,
      variant,
      baseLyrics,
      baseCaption,
      contrast,
      language,
      voiceGender,
    } = await req.json();

    const targetDuration = Math.min(Math.max(Number(duration) || 30, 10), 120);

    const LANG_NAMES: Record<string, string> = {
      en: "English", es: "Spanish", fr: "French", ja: "Japanese",
      ko: "Korean", zh: "Chinese (Mandarin)", hi: "Hindi", pt: "Portuguese",
      de: "German", ar: "Arabic", it: "Italian", ru: "Russian",
      th: "Thai", vi: "Vietnamese", tr: "Turkish",
    };
    const langName = language ? LANG_NAMES[language] || language : null;
    const SCRIPT_NAMES: Record<string, string> = {
      hi: "Devanagari", zh: "Simplified Chinese characters", ja: "Japanese (Hiragana/Katakana/Kanji)",
      ko: "Hangul", ar: "Arabic script", th: "Thai script", ru: "Cyrillic",
    };
    const scriptName = language ? SCRIPT_NAMES[language] : null;
    const languageInstruction = langName && langName !== "English"
      ? `\n\nLANGUAGE: Write ALL lyrics in ${langName}${scriptName ? ` using ${scriptName} script — NOT romanized transliteration` : ""}. No English words in lyrics. Lyric length must match ${targetDuration}s duration. Caption stays in English but include "${langName} vocals".`
      : "";

    const voiceInstruction = voiceGender && voiceGender !== "auto"
      ? `\n\nVOICE: Caption MUST include "${voiceGender} vocal". The singer is ${voiceGender}.`
      : "";

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const getDensityInstruction = (density: string, dur: number) => {
      if (dur <= 30) {
        const map: Record<string, string> = {
          light: `The song is ${dur} seconds. Write minimal lyrics — just one short verse and a brief hook. About 10-15 seconds of vocals, rest instrumental.`,
          moderate: `The song is ${dur} seconds. Write one verse and a short chorus. About 15-20 seconds of vocal content.`,
          heavy: `The song is ${dur} seconds. Write a verse and full chorus packed with lyrics. About 20-25 seconds of vocal content.`,
        };
        return map[density] || map.moderate;
      }
      if (dur <= 60) {
        const map: Record<string, string> = {
          light: `The song is ${dur} seconds. Write one verse and a short chorus, leaving room for instrumental sections. About 20-30 seconds of vocals.`,
          moderate: `The song is ${dur} seconds. Write 2 verses and a full chorus. Good balance of vocals and instrumentals. About 30-40 seconds of vocal content.`,
          heavy: `The song is ${dur} seconds. Write 2 verses, a repeated chorus, and a bridge. About 40-50 seconds of vocal content.`,
        };
        return map[density] || map.moderate;
      }
      // 60-120s
      const map: Record<string, string> = {
        light: `The song is ${dur} seconds. Write 2 verses and a chorus with instrumental breaks between sections. About 40-50 seconds of vocals.`,
        moderate: `The song is ${dur} seconds. Write 2-3 verses, a repeated chorus, and a bridge. Good balance. About 60-80 seconds of vocal content.`,
        heavy: `The song is ${dur} seconds. Write 3 verses, repeated chorus, a bridge, and an outro. Dense vocal content filling most of the song. About 80-100 seconds of vocals.`,
      };
      return map[density] || map.moderate;
    };
    const densityInstruction = getDensityInstruction(lyricsDensity || "moderate", targetDuration);

    // For alternate versions, we want COMPLETELY different musical direction
    const contrastMap: Record<string, string> = {
      subtle: "Change 1-2 tags: shift sub-genre or swap one instrument. Keep same mood and energy.",
      balanced: "Change 3-4 tags: different genre approach, different instruments, shift vocal style or tempo.",
      bold: "Change everything: opposite genre, different energy, completely different instrumentation and vocal character.",
    };

    const isAlternate = variant === "alternate";

    const systemPrompt = isAlternate
      ? `You are a music metadata generator creating an ALTERNATE VERSION of a song.

The alternate must sound DIFFERENT from the original.
${contrast ? contrastMap[contrast] : contrastMap.balanced}

ORIGINAL (contrast with this):
Caption: ${baseCaption || "not provided"}

## CAPTION FORMAT
Short comma-separated tags. 5-8 descriptors, UNDER 200 CHARACTERS total.
Format: genre, mood, instrument, instrument, vocal type, texture

EXAMPLES:
- "synth-pop, euphoric, bright synths, punchy drums, soaring female vocal, polished 80s production"
- "lo-fi hip hop, mellow, warm electric piano, vinyl crackle, smooth male vocal, bedroom aesthetic"
- "indie folk, melancholic, fingerpicked acoustic guitar, soft cello, breathy female vocal, intimate lo-fi"

## LYRICS FORMAT
ONLY use these tags — no modifiers, no custom tags:
[Verse], [Pre-Chorus], [Chorus], [Bridge], [Outro]

CRITICAL RULES:
- ALWAYS start lyrics with [Verse] — NEVER use [Intro] or any instrumental opening
- 6-10 syllables per line, consistent within each section
- CAPS for emphasis: "We ARE the ones"
- (parentheses) for backing vocals: "Rise up (rise up)"
- Blank line between sections

${densityInstruction}${languageInstruction}${voiceInstruction}

Respond in this exact JSON format:
{
  "caption": "genre, mood, instruments, vocal, texture",
  "lyrics": "[Verse]\\nLyrics...\\n\\n[Chorus]\\nChorus..."
}

Only respond with valid JSON, no markdown.`
      : `You are a music metadata generator. Given a user description, generate a caption and lyrics.

## CAPTION FORMAT
Short comma-separated tags. 5-8 descriptors, UNDER 200 CHARACTERS total.
Format: genre, mood, instrument, instrument, vocal type, texture

EXAMPLES:
- "synth-pop, euphoric, bright synths, punchy drums, soaring female vocal, polished 80s production"
- "lo-fi hip hop, mellow, warm electric piano, vinyl crackle, smooth male vocal, bedroom aesthetic"
- "indie folk, melancholic, fingerpicked acoustic guitar, soft cello, breathy female vocal, intimate lo-fi"
- "cinematic orchestral rock, triumphant, soaring strings, thundering drums, powerful male vocal, stadium production"

${vibe ? `The vibe/mood MUST be "${vibe}". Reflect this in genre choice, instruments, and vocal style.` : ""}

## LYRICS FORMAT
ONLY use these tags — no modifiers, no custom tags:
[Verse], [Pre-Chorus], [Chorus], [Bridge], [Outro]

CRITICAL RULES:
- ALWAYS start lyrics with [Verse] — NEVER use [Intro] or any instrumental opening
- 6-10 syllables per line, consistent within each section
- CAPS for emphasis: "We ARE the ones"
- (parentheses) for backing vocals: "Rise up (rise up)"
- Blank line between sections
- Lyrics should be personal, emotional, and match the user's description
- If names are mentioned, weave them naturally into the lyrics

${densityInstruction}${languageInstruction}${voiceInstruction}

Respond in this exact JSON format:
{
  "caption": "genre, mood, instruments, vocal, texture",
  "lyrics": "[Verse]\\nLyrics here...\\n\\n[Chorus]\\nChorus here..."
}

Only respond with valid JSON, no markdown or extra text.`;

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-4-1-fast-non-reasoning",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.85,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Grok API error:", error);
      return NextResponse.json(
        { error: "Failed to generate lyrics" },
        { status: 500 }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    console.log("[lyrics] LLM response caption:", parsed.caption);
    console.log("[lyrics] LLM response lyrics length:", parsed.lyrics?.length);

    return NextResponse.json({
      caption: parsed.caption,
      lyrics: parsed.lyrics,
      _debug: {
        systemPrompt,
        userPrompt: prompt,
        model: "grok-4-1-fast-non-reasoning",
        temperature: 0.85,
        variant: variant || "primary",
        vibe: vibe || null,
        lyricsDensity: lyricsDensity || "moderate",
        targetDuration: targetDuration,
        densityInstruction,
        contrast: contrast || null,
        language: language || null,
        voiceGender: voiceGender || null,
        rawResponse: content,
      },
    });
  } catch (err) {
    console.error("Lyrics generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate lyrics. Please try again." },
      { status: 500 }
    );
  }
}
