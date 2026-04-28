# Edit Plan Schema — Design Rationale & Reference

## Overview

This document defines the JSON edit plan schema for the VLM video editing pipeline. The schema is the contract between Qwen (the planner) and Remotion (the executor). Every editorial decision lives in the plan — the renderer has zero creative judgment.

The schema has **8 top-level fields**. Two are required for any valid plan (`segments`, `captions`), and the rest are optional — the model uses them when appropriate. This is intentional: a minimal valid plan is just cuts + captions, while a rich plan uses the full vocabulary. Whether the fine-tuned model uses the vocabulary more richly than the zero-shot model is itself a measurable signal.

---

## Field-by-Field Design Rationale

### `source_video` — Context the model needs

Pre-populated by the pipeline before the VLM sees the prompt. Gives the model duration, resolution, and FPS so it can make informed decisions (e.g., don't zoom past 1.5x on 1080p footage, don't place an overlay at timestamp 120s on a 90s video).

### `segments` — The backbone

Every second of the source video maps to exactly one segment. Each segment is either `keep` or `cut`. This is the most fundamental editing decision: what stays and what goes.

**What this tests in the VLM:**
- Can it identify silence, filler words ("um", "uh", "you know"), and repetition?
- Does it cut at natural boundaries (between sentences, at topic transitions) or mid-word?
- Does it preserve the logical flow of the speaker's argument after cuts?
- Does pacing change with style? ("fast TikTok" → more cuts, shorter keeps; "calm explainer" → fewer cuts, longer keeps)

**`cut_reason`** is required on every cut segment. This serves two purposes: (1) it forces the model to justify its cuts, which should improve planning quality, and (2) it gives the LLM judge a signal to evaluate — a cut marked `"filler"` on a segment that contains substantive speech is a clear error.

**`speed`** lives on segments rather than being a separate operation. This keeps the schema flat — speed is a property of a kept segment, not a standalone event. Bounded to 0.5–2.0x because anything outside that range sounds terrible on speech.

**`transition_in`** also lives on segments. A transition only makes sense at the boundary between a cut and a keep, so it belongs on the keep segment that follows a cut. The model picks the transition type and duration — a "crossfade" after cutting a tangent is different from a hard cut after removing silence.

### `captions` — Word-level editorial control

Whisper produces the word-level timestamps. The pipeline pre-fills the `words` array. The model's job is:

1. **`grouping`** — deciding whether words appear one-at-a-time (word_by_word), in short phrases, or as full sentences. This is an editorial choice that affects readability and energy. TikTok = word_by_word. Professional = phrase or sentence.

2. **`emphasis`** — marking specific words for visual emphasis. This tests whether the model understands which words are *important*. Emphasizing "attention mechanisms" in a sentence about attention mechanisms = good. Emphasizing "the" or "and" = bad. The judge can score this directly.

3. **`position`** — where on screen captions appear. Bottom-center is default, but a model that moves captions out of the way when an overlay is in the bottom half of the frame is showing spatial awareness.

**Note on separation of concerns:** The model picks `emphasis: "highlight"` but does NOT pick the highlight color. The renderer has a small visual theme (color palette, font) that interprets "highlight" into a specific look. This is the line between editorial decision (what to emphasize) and cosmetic execution (what color the emphasis is).

### `zooms` — Emphasis through camera movement

Each zoom event has a start, end, scale, anchor point, and easing curve. Zooms are the single strongest signal of editing "taste" in talking-head footage.

**What this tests:**
- **Timing**: Does the model zoom on moments of emphasis (key terms, punchlines, rhetorical pauses) or randomly?
- **Intensity**: Does scale match the moment? A gentle 1.2x for a key term vs. a dramatic 1.5x for a punchline?
- **Frequency**: Too many zooms feels chaotic. Too few feels static. The right density depends on style.
- **Easing**: `spring` feels energetic (TikTok). `ease_in_out` feels smooth (professional). Does the model match easing to style?

**`anchor`** is important for talking-head footage. `face` is almost always correct — you zoom toward the face. A model that zooms toward `center` when the speaker is off-center is making a spatial error. Custom anchors exist for the rare case where the speaker is pointing at something.

### `overlays` — Visual B-roll

The model specifies WHAT image to show (via `image_query`), WHEN, and WHERE. The pipeline resolves the query to an actual image URL using a search API.

**What this tests:**
- **Relevance**: Does the image match what the speaker is discussing? "transformer attention diagram" when discussing attention = good. Random stock photo = bad.
- **Timing**: Does the overlay appear at the exact moment the speaker references the concept, or at an unrelated moment?
- **Position**: `fullscreen` replaces the speaker entirely (true B-roll). `picture_in_picture` keeps the speaker visible. The right choice depends on whether the visual or the speaker is more important at that moment.
- **Style sensitivity**: A "meme-style" prompt should produce meme overlays. A "professional" prompt should produce diagrams and charts. This directly supports H1.

The `image_query` field is particularly interesting for benchmarking — it requires the model to go beyond structural editing into *content comprehension*. The model must understand what the speaker is saying to generate a relevant search query.

### `text_overlays` — Supplementary on-screen text

Distinct from captions. These are title cards, section headers, key stats, labels — text the model writes that doesn't come from the transcript.

**What this tests:**
- Can the model identify section boundaries and generate appropriate headers?
- Can it extract a key stat or takeaway and surface it visually?
- Does it know when a title card is appropriate (intro, topic transitions) vs. when it would clutter the frame?

**`style`** options are limited to 5 preset types. The model picks the *type* (is this a title card or a lower third?), the renderer handles the visual treatment. The `maxLength: 80` constraint forces the model to be concise — long text overlays are bad editing.

### `music` — Audio bed

The model picks mood, timing, and volume level. The pipeline maps mood to a track from a pre-built library.

**What this tests:**
- Should this video have music at all? (Not every video benefits from it.)
- Does the mood match the content? Upbeat for a tutorial tip, dramatic for a serious topic?
- `duck_under_speech` is a taste signal — music that competes with speech is bad editing.

This is intentionally simple. The model doesn't pick a specific track or BPM — it picks a mood keyword. The mapping from mood to track is the renderer's job (and can be randomized across candidates to avoid overfitting).

### `reframe` — Aspect ratio decision

A single global decision: should the output be 16:9 (original), 9:16 (vertical/TikTok), 1:1 (Instagram), or 4:5 (Instagram portrait)?

**What this tests:**
- Does the model infer platform from the style prompt? "TikTok reel" → 9:16. "YouTube explainer" → 16:9.
- `face_track` focus is critical for vertical crops — the face must stay centered as the speaker moves.

This is global rather than per-segment because aspect ratio changes mid-video look terrible. If you ever need per-segment reframing in the future, you can add an `override_aspect_ratio` field to individual segments, but I'd avoid that for now.

---

## Design Decisions & Tradeoffs

### Why timestamps use source video time, not output video time

Every timestamp in the plan references the *source* video timeline. This is important because the output timeline depends on which segments are kept — it's computed by the renderer, not the planner. If the model had to compute output timestamps, it would need to mentally subtract all cut segments, which is error-prone and unnecessary. The renderer handles the time remapping.

### Why `cut_reason` is an enum, not free text

Free text reasons would be richer but harder to evaluate programmatically. Enums let the judge cross-reference: check if the audio in a "silence" cut actually contains silence, check if a "filler" cut contains filler words. You can always expand the enum later if you discover important cut reasons that don't fit.

### Why emphasis options are limited to 4

`none`, `highlight`, `bold`, `color_pop`. More options (underline, italic, shake, glow, etc.) would give the model more expressive range but would also dilute the signal. If the model has 12 emphasis types, it's hard to tell whether it's making meaningful distinctions. With 4, the judge can clearly evaluate: did the model emphasize the right words? Did it use emphasis at all? Did it over-emphasize?

### What's intentionally NOT in the schema

- **Sound effects**: Would be interesting (a whoosh on transitions, a ding on key points) but adds complexity without testing a fundamentally different skill. Add in a future iteration if the model handles the current vocabulary well.
- **Picture-in-picture of self / multi-cam**: Irrelevant for single talking-head footage.
- **Color grading / filters**: These are purely cosmetic and should live in the renderer's theme, not the plan.
- **Font / color choices**: Explicitly excluded. These are renderer-side cosmetics. The model picks semantic labels (`highlight`, `title_card`), and the renderer's theme interprets them.

---

## Validation Rules

Beyond JSON Schema structural validation, the pipeline should enforce:

1. **Full coverage**: Segments must cover every second from 0 to `source_video.duration_s` with no gaps or overlaps.
2. **Temporal ordering**: All segments, zooms, overlays, and text_overlays must be in chronological order by `start_s`.
3. **No overlapping operations of the same type**: Two zooms can't overlap in time. Two text overlays can overlap (one top, one bottom) but two in the same position can't.
4. **Kept segment references only**: Zooms, overlays, and text_overlays should only reference times within `keep` segments. An overlay placed during a cut segment would never be visible.
5. **Word coverage**: Caption words should cover all speech in kept segments. Words in cut segments should be excluded.
6. **Transition coherence**: `transition_in` should only appear on `keep` segments that immediately follow a `cut` segment.
7. **Bounds checking**: All timestamps within `[0, source_video.duration_s]`. Scale within specified min/max. Volume within [0, 1].

Fail hard on validation errors — an invalid plan should never reach the renderer. The VLM's JSON validity rate is itself a metric worth tracking.

---

## How the LLM Judge Uses This Schema

The judge receives the edit plan JSON + the transcript + (optionally) frame descriptions. It evaluates:

| Criterion | What the judge checks |
|---|---|
| **Cut quality** | Are cut_reasons justified? Does kept content flow logically? |
| **Pacing** | Is segment duration distribution appropriate for the style? |
| **Zoom placement** | Do zooms align with emphatic moments in the transcript? |
| **Caption emphasis** | Are emphasized words actually important/key terms? |
| **Overlay relevance** | Do image_query values match what the speaker is discussing? |
| **Text overlay value** | Do text overlays add information, or are they noise? |
| **Music appropriateness** | Does mood match content tone? Is volume reasonable? |
| **Structural validity** | Is the JSON well-formed? Are timestamps consistent? |
| **Style adherence** | Do edit density metrics match the requested style? |

The judge scores each criterion on a 1-5 scale. Total score = sum. This gives you a single number per plan for ranking in Best-of-N selection.
