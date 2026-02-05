# Language Validation Plan (Riff)

Goal: verify lyric intelligibility and adherence for supported languages, and label experimental quality appropriately.

## Scoring rubric (0–5 per category)
- Pronunciation clarity
- Lyric adherence to prompt
- Section structure (Verse/Chorus/Bridge)
- Naturalness/fluency
- Style match (genre/vibe)

## Test set
- 5 prompts per language, covering:
  - Slow ballad
  - Upbeat pop
  - Rap/fast cadence
  - Emotional/romantic
  - Regional/folk-influenced

## Evaluation steps
1. Generate two tracks per prompt (Smart + Pro).
2. Score each track with rubric.
3. Average per language; flag <3.5 as experimental.
4. Record failure cases (hallucinated language, broken sections).

## Initial targets
- English, Spanish, French, Japanese, Korean, Chinese, Portuguese, German, Italian, Russian should target 3.5+.
- Hindi, Arabic, Thai, Vietnamese, Turkish start as experimental until validated.

## Output
- Store results in `docs/qa/language-results.csv`.
- Update UI labels and help text based on scores.
