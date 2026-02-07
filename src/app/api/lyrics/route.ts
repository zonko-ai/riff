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
    } = await req.json();

    const targetDuration = Math.min(Math.max(Number(duration) || 30, 10), 120);

    const LANG_NAMES: Record<string, string> = {
      en: "English", es: "Spanish", fr: "French", ja: "Japanese",
      ko: "Korean", zh: "Chinese (Mandarin)", hi: "Hindi", pt: "Portuguese",
      de: "German", ar: "Arabic", it: "Italian", ru: "Russian",
      th: "Thai", vi: "Vietnamese", tr: "Turkish",
    };
    const langName = language ? LANG_NAMES[language] || language : null;
    const languageInstruction = langName && langName !== "English"
      ? `\n\nLANGUAGE: Write ALL lyrics in ${langName}. The lyrics MUST be in ${langName} script/language, not English. The caption should still be in English (it describes the music style), but include "${langName} vocals" or "${langName} singing" in the vocal style section of the caption.`
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
      subtle: `Create a variation with:
- Same genre family but different sub-genre (e.g., if pop → indie pop, if rock → soft rock)
- Shift tempo by 10-20 BPM slower or faster
- Swap one main instrument (e.g., piano → acoustic guitar, synth → strings)
- Keep the same emotional core but soften or intensify it slightly`,
      balanced: `Create a distinctly different version with:
- Different genre approach (e.g., if electronic → acoustic, if rock → R&B-influenced)
- Different tempo feel (if upbeat → mid-tempo groove, if slow → more driving rhythm)
- Different instrumentation palette (swap at least 2-3 main instruments)
- Shift the production era (e.g., if modern → vintage 80s vibe, if lo-fi → polished)
- Different vocal style (if powerful → intimate, if breathy → confident)`,
      bold: `Reimagine this completely:
- Entirely different genre (e.g., ballad → uptempo dance, rock → jazz, electronic → folk)
- Opposite energy level (if chill → energetic, if intense → laid-back)
- Completely different instrumentation (if guitars → synths, if acoustic → electronic)
- Different era/production aesthetic (if modern → retro, if polished → raw)
- Different vocal character (if female-sounding → male-sounding style description, if smooth → gritty)`,
    };

    const isAlternate = variant === "alternate";

    const systemPrompt = isAlternate
      ? `You are a professional music producer creating an ALTERNATE VERSION of a song.

CRITICAL: The alternate version must sound DISTINCTLY DIFFERENT from the original. Not just different words — different SOUND.

${contrast ? contrastMap[contrast] : contrastMap.balanced}

ORIGINAL SONG REFERENCE (create something that contrasts with this):
Caption: ${baseCaption || "not provided"}
${baseLyrics ? `Lyrics structure: ${baseLyrics.substring(0, 500)}...` : ""}

Based on the user's original concept, generate a contrasting alternate version.

## CAPTION FORMULA (max 450 chars)
Write a multi-dimensional caption covering ALL of these:
1. GENRE + SUB-GENRE: Be specific (not just "pop" but "synth-pop" or "indie pop")
2. MOOD/EMOTION: 2-3 emotional descriptors (melancholic, bittersweet, wistful OR euphoric, triumphant, uplifting)
3. INSTRUMENTS: List 3-4 specific instruments (not "guitar" but "warm acoustic guitar fingerpicking")
4. TIMBRE/TEXTURE: Sound quality words (warm, crisp, airy, punchy, lush, gritty, polished)
5. TEMPO FEEL: (slow ballad, mid-tempo groove, driving uptempo, laid-back)
6. VOCAL STYLE: (breathy female vocal, raspy male voice, intimate whisper, powerful belting)
7. ERA/PRODUCTION: (80s synthwave, 90s grunge, modern minimal, vintage soul, lo-fi bedroom)

EXAMPLE ALTERNATE CAPTIONS:
- Original: "upbeat pop song about summer love"
  Subtle alternate: "breezy indie pop, wistful nostalgia, jangling electric guitar, soft synth pads, warm analog sound, mid-tempo groove, airy female vocal, early 2010s blog-era production"
  Balanced alternate: "dreamy R&B, romantic longing, smooth electric piano, subtle 808s, lush pad textures, slow sensual groove, silky falsetto male vocal, modern bedroom production"
  Bold alternate: "melancholic folk ballad, heartache and memory, fingerpicked acoustic guitar, soft violin, intimate lo-fi warmth, slow contemplative tempo, vulnerable whispered vocal, 70s singer-songwriter aesthetic"

## LYRICS FORMAT
Use section markers with vocal/energy tags:
- [Verse - intimate] or [Verse - storytelling]
- [Pre-Chorus - building]
- [Chorus - anthemic] or [Chorus - explosive] or [Chorus - soaring]
- [Bridge - whispered] or [Bridge - powerful]
- [Outro - fading] or [Outro - triumphant]

Keep 6-10 syllables per line for natural rhythm.
Use CAPS for emphasized words: "We ARE the champions"
Use (parentheses) for backing vocals: "Rise up (rise up)"

${densityInstruction}${languageInstruction}

Respond in this exact JSON format:
{
  "caption": "your detailed multi-dimensional music caption here",
  "lyrics": "[Verse - tag]\\nLyrics...\\n\\n[Chorus - tag]\\nChorus..."
}

Only respond with valid JSON, no markdown.`
      : `You are a professional music producer and songwriter. Given a description, generate a song.

## CAPTION FORMULA (max 450 chars)
Write a rich, multi-dimensional caption covering ALL of these elements:

1. GENRE + SUB-GENRE: Be specific (not just "rock" but "alternative rock" or "indie rock")
2. MOOD/EMOTION: 2-3 emotional descriptors that paint the feeling
   - Sad: melancholic, wistful, heartbroken, bittersweet, somber, lonely, aching
   - Happy: euphoric, jubilant, carefree, uplifting, warm, sunny, playful
   - Chill: dreamy, hazy, relaxed, mellow, peaceful, floating, serene
   - Epic: triumphant, soaring, cinematic, powerful, anthemic, majestic
   - Dark: brooding, intense, mysterious, haunting, atmospheric, tense
   - Romantic: intimate, tender, sensual, passionate, yearning, devoted
3. INSTRUMENTS: List 3-4 specific instruments with descriptors
   - Not "piano" but "soft grand piano" or "bright honky-tonk piano"
   - Not "guitar" but "warm acoustic guitar fingerpicking" or "overdriven electric guitar"
   - Not "drums" but "punchy live drums" or "crisp electronic beats" or "808 bass hits"
4. TIMBRE/TEXTURE: Sound quality (warm, bright, crisp, muddy, airy, punchy, lush, raw, polished, gritty)
5. TEMPO FEEL: (slow ballad, mid-tempo groove, driving uptempo, energetic, laid-back, bouncy)
6. VOCAL STYLE: (breathy female vocal, powerful male belting, intimate whisper, raspy delivery, smooth R&B runs, punk snarl)
7. ERA/PRODUCTION: (80s synthwave, 90s grunge, 2000s pop-punk, modern minimal, vintage soul, lo-fi bedroom, stadium rock)

EXAMPLE CAPTIONS BY MOOD:
- SAD: "melancholic indie folk, aching heartbreak, fingerpicked acoustic guitar, soft cello swells, intimate lo-fi warmth, slow contemplative tempo, vulnerable breathy female vocal, rainy day bedroom recording aesthetic"
- HAPPY: "euphoric synth-pop, carefree summer joy, bright analog synths, punchy drum machine, shimmering arpeggios, driving uptempo groove, soaring confident female vocal, polished 80s-inspired production"
- CHILL: "dreamy lo-fi R&B, hazy late-night mood, warm electric piano, subtle vinyl crackle, soft 808 bass, laid-back head-nod groove, smooth intimate male vocal, bedroom producer aesthetic"
- EPIC: "cinematic orchestral rock, triumphant anthem, soaring string section, powerful electric guitars, thundering drums, building crescendo, anthemic choir-backed male vocal, stadium-ready production"
- DARK: "brooding industrial electronic, tense atmospheric dread, distorted synth bass, glitchy percussion, dark ambient textures, slow menacing pulse, processed robotic vocal, dystopian soundscape"
- ROMANTIC: "intimate acoustic soul, tender devotion, warm nylon guitar, soft brushed drums, gentle piano touches, slow sensual groove, silky falsetto male vocal, candlelit recording warmth"

${vibe ? `The mood/vibe MUST be: ${vibe}. Make sure the caption strongly reflects this mood with appropriate genre, instruments, tempo, and vocal style.` : ""}

## LYRICS FORMAT
Structure with section markers AND vocal/energy tags:
- [Intro - atmospheric] (optional instrumental opening)
- [Verse - intimate] or [Verse - storytelling] or [Verse - building]
- [Pre-Chorus - rising] (optional, builds to chorus)
- [Chorus - anthemic] or [Chorus - explosive] or [Chorus - soaring] or [Chorus - catchy]
- [Bridge - whispered] or [Bridge - powerful] or [Bridge - breakdown]
- [Outro - fading] or [Outro - triumphant] or [Outro - reflective]

LINE FORMATTING:
- Keep 6-10 syllables per line for natural rhythm
- Use CAPS for emphasized/shouted words: "We ARE the ones"
- Use (parentheses) for backing vocals/echoes: "Never let go (let go)"
- Blank line between sections

${densityInstruction}

The lyrics should be personal, emotional, and match the user's description.
If names are mentioned, weave them naturally into the lyrics.

Respond in this exact JSON format:
{
  "caption": "your detailed multi-dimensional music caption here (max 450 chars)",
  "lyrics": "[Verse - tag]\\nLyrics here...\\n\\n[Chorus - tag]\\nChorus here..."
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
