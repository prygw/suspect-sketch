# WitnessSketch - AI-Assisted Suspect Sketch Generation App

## Overview

WitnessSketch is a web application that guides crime witnesses through a structured, psychologically-informed interview process to iteratively build a suspect sketch. After each answer, an AI-generated sketch is produced and refined based on accumulated descriptions. The loop continues until the witness confirms the sketch is accurate.

---

## Core Concept

The app implements a **cognitive interview loop**:

1. Ask the witness a psychologically grounded question to elicit recall
2. Accumulate all descriptions gathered so far into a composite profile
3. Generate a suspect sketch from the composite profile
4. Display the sketch and ask the witness to confirm or continue refining
5. Repeat until the witness is satisfied

---

## Landing Page

The landing page serves as the entry point before a session begins. It establishes credibility, communicates the problem, and motivates the tool's existence.

### Hero Section

- App name and tagline: *"AI-powered suspect sketches for every department, everywhere."*
- A single CTA button: **"Start a Witness Interview"**
- Brief one-liner: *"No sketch artist? No problem. WitnessSketch uses AI to guide witnesses through a proven interview process and generate accurate suspect portraits in minutes."*

### The Problem — Statistics Section

A visually compelling stats section highlighting the accessibility gap:

| Statistic | Source Context |
|-----------|---------------|
| Fewer than **30%** of U.S. law enforcement agencies have access to a trained forensic sketch artist | Many departments rely on regional or state-level artists who may be hours away or unavailable |
| The average cost of a single forensic sketch session ranges from **$500–$2,000+** when using a contracted artist | Smaller departments and rural agencies often cannot justify this cost per case |
| There are estimated to be fewer than **50 full-time forensic sketch artists** working in the U.S. | The profession is shrinking as artists retire and are not replaced |
| Rural and underfunded departments are **3x less likely** to produce a suspect sketch compared to urban agencies | This creates a gap in investigative capability based purely on geography and budget |
| Cases with a suspect sketch or composite are **up to 40% more likely** to generate actionable leads | Yet most cases never get one due to resource constraints |

*Note: These statistics should be verified and cited with authoritative sources before launch. The above figures reflect commonly reported estimates in forensic science literature and law enforcement reporting.*

### The Science — Research-Backed Methodology Section

A dedicated section establishing scientific credibility. This should be visually prominent with icons or cards for each methodology.

**Section header:** *"Built on the latest breakthroughs in forensic psychology — not guesswork."*

| Methodology | What It Does | Research Backing |
|-------------|-------------|------------------|
| **Enhanced Cognitive Interview (ECI)** | Structured interview protocol that elicits 35-45% more accurate details than standard questioning | Fisher & Geiselman, 1992; validated across 40+ years of peer-reviewed research |
| **Holistic-Cognitive Interview (H-CI)** | Captures holistic facial impressions before feature breakdown — composites are **4x more recognizable** | Latest forensic composite research; addresses how the brain actually encodes faces |
| **Verbal Overshadowing Mitigation** | Prevents the act of describing a face from impairing visual memory — a counterintuitive effect discovered in cognitive science | Schooler & Engstler-Schooler; 2024-2025 mitigation protocols using face-name generation |
| **Person Description Interview (PDI)** | Down-to-Up body recall instruction that captures details witnesses naturally skip | Validated in laboratory and field settings for significantly higher descriptor accuracy |
| **Category Clustering Recall (CCR)** | Organizes memory by semantic category to surface hidden details — replaces outdated techniques proven to cause fatigue | Grounded in Spreading Activation Theory; validated as superior replacement for change-order recall |
| **FETI Trauma-Informed Protocol** | Adapts questioning for trauma survivors by bypassing chronological demands and using sensory memory cues | Addresses the neurobiology of traumatic memory encoding (amygdala vs. prefrontal cortex) |

**Closing line for this section:** *"Every question WitnessSketch asks is grounded in peer-reviewed forensic psychology research. The same science used to train FBI forensic interviewers — now accessible to every department."*

### How It Works — 3-Step Visual

1. **Answer Questions** — A guided interview built on the Enhanced Cognitive Interview and Holistic-Cognitive Interview techniques helps you accurately recall what you saw
2. **Watch the Sketch Build** — An AI-generated portrait refines with each answer, using holistic facial processing research to build the most recognizable composite possible
3. **Export & Share** — Download the final sketch and full session report with interview transcript

### Who It's For

- Small-town and rural police departments without a sketch artist on staff
- Departments that can't afford to contract forensic artists for every case
- Agencies looking to supplement their existing sketch capability with faster turnaround
- Any law enforcement office that wants a suspect composite within minutes, not days

---

## Architecture

### Tech Stack

| Layer       | Technology                                          |
|-------------|-----------------------------------------------------|
| Frontend    | React (Vite) + Tailwind CSS                         |
| Backend     | Node.js / Express                                   |
| AI Text     | Google Gemini API (interview questions & profile parsing) |
| AI Image    | Google Gemini Imagen API (sketch generation)         |
| Database    | SQLite (session persistence)                         |
| State       | Server-side session store                            |

### System Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────────────┐
│   React UI  │◄─────►│  Express Server  │◄─────►│  Gemini API         │
│             │       │                  │       │  (text generation)  │
│  - Landing  │       │  - Session mgmt  │       │  - Interview Q's    │
│  - Chat     │       │  - Profile agg.  │       │  - Profile parsing  │
│  - Sketch   │       │  - Prompt eng.   │       │                     │
│  - Controls │       │                  │       │  (image generation) │
└─────────────┘       └──────────────────┘       │  - Sketch rendering │
                                                 └─────────────────────┘
```

---

## Interview Engine

### Psychological Approach

The interview engine synthesizes multiple evidence-based frameworks to maximize the accuracy and completeness of witness recall:

- **Enhanced Cognitive Interview (ECI)** (Fisher & Geiselman, 1992) — The foundational protocol, shown to elicit 35-45% more correct information than standard police interviews without increasing confabulation rates.
- **Holistic-Cognitive Interview (H-CI)** — A critical extension that addresses holistic facial processing. Composites built after an H-CI are correctly identified by third parties over **4x more often** than those built after a standard CI.
- **Person Description Interview (PDI)** — A specialized protocol using General-to-Specific and Down-to-Up instruction sequences to systematically maximize physical descriptor recall.
- **Category Clustering Recall (CCR)** — A replacement for the now-deprecated change-order/change-perspective mnemonics, grounded in Spreading Activation Theory. Organizes recall by semantic category rather than chronological sequence.
- **Verbal Overshadowing (VOE) mitigation** — The counterintuitive finding that describing a face in words can impair visual recognition. The interview is sequenced to capture holistic impressions before feature-level detail, and includes a face-labeling intervention validated in 2024-2025 research.
- **PEACE Model funnel approach** — Questions are sequenced from broad free narrative → witness-compatible cued invitations → specific targeted questions. Premature specific questioning is strictly avoided.

**Deprecated techniques:** The original CI's **change-perspective** and **change-order** (reverse recall) mnemonics have been **removed** from this protocol. Recent meta-analyses confirm these techniques impose excessive cognitive load, cause witness fatigue, and yield negligible new correct information. They have been replaced by Category Clustering Recall.

### Interview Phases

---

#### Phase 0: Rapport Building & Ground Rules (1-2 minutes, 2-3 exchanges)

**Purpose:** Establish trust and reduce witness anxiety before any substantive questioning. Research consistently shows that interviewer rapport significantly improves both the quantity and accuracy of information recalled (Collins et al., 2017). The PEACE model and NICHD protocol both mandate this phase.

**Approach:**
- Greet the witness warmly and introduce the process
- Explain what will happen: "I'm going to ask you some questions, and as we go, we'll build a picture together. There are no wrong answers."
- Set expectations about uncertainty: "It's completely okay if you don't remember something. Saying 'I'm not sure' is just as helpful as a detailed answer — it keeps us accurate."
- Explicitly grant correction authority (from NICHD protocol): "If I ever say something that doesn't sound right, please correct me. You're the one who was there — you know better than I do."
- Ask a non-threatening warm-up: "Before we begin, how are you feeling right now?"

**Psychological rationale:** Witnesses under stress produce less accurate descriptions. A brief rapport phase activates a cooperative mindset and signals that the interviewer is non-judgmental, which reduces retrieval anxiety and social desirability bias. Explicitly granting correction authority dismantles the power dynamic that causes witnesses to agree with inaccurate suggestions.

**Trauma detection:** If the witness displays signs of acute distress (very short responses, emotional language, difficulty focusing), Gemini should shift into **FETI-informed mode** for subsequent phases — using sensory and experiential prompts rather than demanding chronological precision, and accepting experiential descriptors ("he towered over me") rather than forcing numerical estimates.

**No sketch generated during this phase.**

---

#### Phase 1: Context Reinstatement (3-5 questions)

**Purpose:** Mentally transport the witness back to the scene. Context reinstatement (Mental Reinstatement of Context / MRC) is validated by the Encoding Specificity Principle (Tulving & Thomson, 1973) — memory retrieval is strongest when the retrieval context matches the encoding context. Modern research confirms MRC significantly improves both the quantity of correct facial descriptors and the recognizability of subsequent composites.

**Question sequence:**

1. **Scene setting** — "I'd like you to close your eyes if you're comfortable, and take a moment to picture yourself back at the place where this happened. Can you describe where you were and what was around you?"
2. **Sensory context** — "What do you remember about the environment — sounds, smells, temperature, anything sensory?"
3. **Lighting and visibility** — "What was the lighting like? Was it daytime, nighttime, indoors, outdoors? Were there shadows or bright light sources?"
4. **Spatial relationship** — "Where were you in relation to this person? How far away? Were they moving or standing still?"
5. **Duration and attention** — "Roughly how long did you see this person? What were you doing at the time — were you focused on them, or did you notice them in passing?"

**Sketch-Reinstatement-of-Context (optional):** If the UI supports it, offer the witness an option to draw a simple layout of the scene (where they were standing, where the suspect was, doors, furniture, etc.). Research shows this **self-generated spatial sketch increases correct information recall by 26%** and lowers errors by up to 34% compared to standard interviewer-directed MRC. This is distinct from the suspect sketch — it's a scene diagram.

**Psychological rationale:** Witnesses who mentally reconstruct the scene before describing a face recall significantly more accurate details. The sensory and spatial questions activate associated memory traces, making the face memory more accessible. The duration/attention question also helps calibrate how much detail the witness can reasonably be expected to provide.

**Adaptive behavior:** If the witness volunteers appearance details during context reinstatement (e.g., "I was standing near the door when this tall guy walked in"), Gemini should note those details in the profile but not drill into them yet — that comes in later phases.

**No sketch generated during this phase.**

---

#### Phase 2: Free Recall & Holistic Impression (3-5 questions)

**Purpose:** Capture the witness's unstructured, holistic memory of the suspect before any feature-level decomposition. This phase implements the **Funnel Approach** from the PEACE model (broad free narrative first) and directly addresses the **Verbal Overshadowing Effect** by anchoring the holistic facial representation before verbalization begins to break it apart.

**Question sequence:**

1. **Face-name generation (VOE mitigation)** — "Before we describe this person in detail, I want you to picture their face. If you had to give them a name — just a made-up name that feels like it fits their face — what would it be?"

   *Psychological rationale:* Validated in 2024-2025 research, asking the witness to generate a hypothetical label for the face strengthens the holistic familiarity representation, making it significantly more robust against the disruptive interference of the subsequent verbal description phase. This is grounded in the Interactive Activation and Competition model.

2. **Uninterrupted free narrative** — "Now, without worrying about being precise, tell me everything you can remember about what this person looked like. Take as much time as you need — I won't interrupt."

   *Critical rule:* The witness **must not be interrupted** during this response. Research proves that interrupting a free narrative fractures the cognitive retrieval process, alters the witness's train of thought, and severely limits total information volume.

3. **First impression** — "What is the very first thing that comes to mind when you picture their face?"

4. **Distinctiveness** — "Was there anything about them that stood out or seemed unusual — anything that made them look different from other people?"

5. **Similarity prompt** — "Did they remind you of anyone — a friend, a celebrity, someone you've seen before? Even a vague resemblance is helpful."

**Psychological rationale:** Free recall produces fewer details than cued recall, but the details it produces are significantly more accurate (Gabbert et al., 2009). The similarity prompt leverages associative memory — witnesses often can't articulate why a face looks a certain way, but they can identify who it resembles. This gives the image generator a powerful anchor.

**First sketch generated after this phase** using whatever details have been gathered so far. This early sketch serves as a visual anchor for subsequent refinement.

---

#### Phase 3: Holistic Trait Attribution — H-CI Extension (7 questions)

**Purpose:** Before decomposing the face into individual features, this phase forces the brain to access the **global holistic representation** of the face by asking the witness to evaluate the suspect on personality-level traits. This is the core innovation of the **Holistic-Cognitive Interview (H-CI)**, which research shows increases composite recognizability by over **400%**.

**The witness is asked to rate or react to the suspect on seven holistic dimensions:**

1. **Masculinity/Femininity** — "Would you describe their face as more masculine, more feminine, or somewhere in between?"
2. **Attractiveness** — "Without overthinking it, how attractive would you say this person was?"
3. **Distinctiveness** — "How distinctive was their face? Would they stand out in a crowd, or could they blend in easily?"
4. **Perceived health** — "Did they look healthy, tired, unwell? What was your impression?"
5. **Perceived age** — "How old did they look to you? Not their actual age — just the impression their face gave."
6. **Perceived threat/approachability** — "Did their face seem friendly, threatening, neutral? What feeling did it give you?"
7. **Perceived weight from face** — "Based on their face alone, would you say they seemed thin, average, or heavier?"

**Psychological rationale:** Human facial recognition operates primarily through holistic processing — the brain encodes the spatial configuration and relationships between features as a unified gestalt, not as isolated parts. When an interviewer jumps straight to "describe the nose," it forces featural processing that contradicts the brain's natural encoding architecture, increasing error rates. The H-CI's trait attribution phase keeps the witness in holistic processing mode, which produces dramatically better composite quality. The traits themselves are not used directly in the sketch prompt — they serve as a cognitive priming exercise that improves the accuracy of all subsequent feature descriptions.

**Sketch updated after this phase** — the holistic traits are translated into image generation parameters (e.g., perceived threat influences expression subtleties, perceived age refines age rendering).

---

#### Phase 4: Feature-Specific Cued Recall (8-12 questions, adaptive)

**Purpose:** Systematically walk through facial features using open-ended **witness-compatible cued invitations** — meaning each question is cued using the witness's own words from Phases 2-3, not a rigid checklist. This follows the Funnel Approach: the interviewer uses the witness's idiosyncratic language to trigger further recall, ensuring the interview structure mirrors the witness's own semantic memory organization.

**Feature categories and sample questions:**

The order follows a **top-down spatial sequence** (hair → forehead → eyes → nose → mouth → chin → jaw) which mirrors natural face scanning patterns.

1. **Hair** — "Let's start with their hair. What do you remember about it — the color, how long it was, the style or texture?"
2. **Forehead & brow** — "What about their forehead area — anything that stood out about its size or shape?"
3. **Eyes** — "Tell me about their eyes. Anything about the color, shape, size, or how they were set in the face?"
4. **Eyebrows** — "What do you recall about their eyebrows?"
5. **Nose** — "How about their nose? What comes to mind about its size, shape, or width?"
6. **Cheeks & cheekbones** — "What do you remember about their cheek area?"
7. **Mouth & lips** — "What about their mouth — anything about the lips or any expression you noticed?"
8. **Chin & jaw** — "Can you describe their chin or jawline?"
9. **Ears** — "Did you notice their ears at all?"
10. **Skin** — "What was their skin tone? Did you notice any marks — scars, moles, freckles, tattoos, acne, wrinkles?"
11. **Facial hair** — "Did they have any facial hair?"
12. **Build, height & age** — "Stepping back from the face — how would you describe their overall build and height?"

**Witness-compatible cuing:** Gemini must use the witness's own words from earlier phases to cue recall. For example, if the witness said "he had kind of a mean look" in Phase 2, Gemini should say: "You mentioned he had a mean look — what about his face gave you that impression? Was it something about the eyes, the mouth, the brow?" This is far more effective than generic feature prompts.

**Adaptive behavior:**
- If the witness already described a feature in Phase 2 or 3, Gemini should **acknowledge it and ask for refinement** rather than re-asking: "You mentioned they had dark eyes — can you tell me anything more about the shape or how they were set?"
- If the witness says "I don't remember" or "I didn't notice," **accept immediately** and move on. Do not rephrase or push.
- If the witness gives a very detailed answer that covers multiple features, Gemini should **skip the already-covered categories**.
- If the witness appears fatigued (short, flat responses), offer a break before continuing.

**Sketch updated after every 2-3 answers** during this phase (not after every single answer, to avoid overwhelming the witness and to batch meaningful visual changes).

---

#### Phase 5: Body & Clothing — Person Description Interview (PDI) (3-5 questions)

**Purpose:** Capture non-facial physical details and clothing using the **Down-to-Up Instruction (DUI)** from the Person Description Interview protocol. Research shows that witnesses naturally fixate on the face and neglect clothing, footwear, and lower-body details. The DUI explicitly reverses this by instructing recall from feet upward, yielding significantly more accurate physical descriptors than standard free recall.

**Question sequence (Down-to-Up order):**

1. **Footwear** — "Starting from the bottom — did you notice what was on their feet? Shoes, boots, sandals?"
2. **Lower body** — "Moving up — what about their pants or lower body clothing?"
3. **Upper body** — "What were they wearing on top — shirt, jacket, hoodie?"
4. **Accessories** — "Did you notice any accessories — glasses, hat, jewelry, piercings, a watch, a bag?"
5. **Items carried** — "Were they carrying anything — a phone, weapon, anything in their hands?"

**Psychological rationale:** Human visual attention gravitates heavily toward the face, causing witnesses to frequently neglect lower-body details during standard recall. The DUI instruction explicitly counteracts this bias. Combined with the General-to-Specific instruction already implemented in Phase 2, this completes the PDI protocol and yields significantly higher quantities of accurate physical descriptors.

**Sketch may be updated** if accessories affect the face (glasses, hat, piercings). All other details are recorded in the composite profile for the export report.

---

#### Phase 6: Category Clustering Recall — CCR (2-3 targeted prompts)

**Purpose:** Use **Category Clustering Recall** to surface details the witness hasn't yet reported by organizing recall into specific semantic categories. CCR is grounded in **Spreading Activation Theory** — memory is organized by semantic similarity, not chronological sequence. Activating one node in a semantic cluster spreads activation to related nodes, surfacing associated details.

**CCR prompts (categories from the validated 7-category framework):**

1. **Person-specific clustering** — "Let's focus just on this person for a moment — setting aside everything else that happened. Is there anything else about them — their voice, the way they moved, their posture, mannerisms — that you haven't mentioned?"
2. **Object clustering** — "Think about any objects you noticed during this event — anything near the person, anything they touched or interacted with. Does anything come to mind?"
3. **Spatial clustering** — "Think about the specific spot where you saw this person. Picture that exact location. Is there any detail about them that's connected to that place that you haven't mentioned yet?"

**Psychological rationale:** CCR elicits significantly more correct person-related details — specifically regarding suspect appearance — than standard free recall or chronological prompting. By isolating the "person" semantic category, witnesses access details that were encoded alongside the suspect but stored in adjacent memory clusters (e.g., a detail about the suspect's hands that's linked to a memory of them opening a door). This replaces the deprecated change-order and change-perspective mnemonics, which research has shown impose excessive cognitive load with negligible benefit.

**Sketch updated if new facial details emerge.**

---

#### Phase 7: Sketch Refinement Loop (iterative, until witness is satisfied)

**Purpose:** Present the current sketch and enter a focused feedback loop. This is where the witness actively corrects the image rather than describing from memory. The shift from recall to **recognition** is intentional — recognition memory is significantly stronger than recall memory (Mandler, 1980), so witnesses can identify inaccuracies in a sketch even when they couldn't have described the correct feature from scratch.

**Loop structure:**

1. **Present sketch** — "Here's the current sketch based on everything you've described. Take a moment to look at it."
2. **Open correction** — "What's the first thing that looks wrong or feels off to you?"
3. **Targeted correction** — After each piece of feedback, regenerate and ask: "How about now? Better, worse, or about the same?"
4. **Missing features** — "Is there anything about this person that we haven't captured yet?"
5. **The "Cannot Forget" prompt (FETI-informed)** — "What is the one thing about this person's face that you can't forget?" *(This targets the deeply encoded, central details burned into the amygdala, often surfacing the most diagnostic identifying feature.)*
6. **Confidence check** — "On a scale of 1 to 10, how close is this sketch to the person you saw?"
7. **Completion gate** — If confidence ≥ 8, ask: "Are you comfortable finalizing this sketch?" If confidence < 8, continue the loop.

**Sketch regenerated after every piece of feedback** in this phase.

**Loop exit conditions:**
- Witness says they're satisfied
- Witness rates confidence ≥ 8 and confirms finalization
- Witness indicates they can't improve it further ("That's as close as I can get")
- Maximum of 10 refinement iterations (to prevent fatigue; offer to save and resume later)

---

### Trauma-Informed Adaptations (FETI Protocol)

If the witness displays signs of acute trauma at any point during the interview, Gemini should activate **Forensic Experiential Trauma Interview (FETI)** adaptations:

1. **Use sensory cues for implicit memory** — "What are you able to remember about what you heard, smelled, or felt physically?" Accessing sensory details frequently acts as a bridge, unlocking explicit memories of the suspect's appearance that were blocked by trauma.
2. **Use the "Cannot Forget" prompt** — "What is the one thing about this person you can't forget?" This targets deeply encoded central details.
3. **Accept experiential descriptors** — Do not force numerical estimates. Accept "he towered over me" instead of demanding "how tall was he in feet." Intense fear distorts spatial and temporal perception; forcing metrics guarantees inaccurate data.
4. **Never demand chronological coherence** — During traumatic events, the prefrontal cortex (responsible for timeline sequencing) often shuts down. Memory encoding is handled by the amygdala and hippocampus, which record fragmented sensory data. Asking "what happened next?" demands executive functioning that was literally offline during the event.
5. **Expect and accept fragmented narratives** — Inconsistencies and gaps are neurobiologically normal for trauma survivors, not indicators of deception.

---

### Demographic Adaptations

**Cross-Race Effect (CRE):** Witnesses are significantly less accurate at describing faces of a different race than their own. The system must:
- Never use forced-choice questions about race or ethnicity
- Allow the witness to organically describe specific observed physical features using the PDI protocol
- Be aware that witnesses may default to broad categorical traits ("dark skin") rather than the micro-variations needed for identification

**Child witnesses (NICHD Protocol adaptations):**
- Explicitly instruct that "I don't know" and "I don't understand" are acceptable answers
- Use episodic memory training before substantive questions (ask the child to describe a neutral recent event first)
- Use only open-ended prompts; cued invitations must be based exclusively on details the child has already introduced

**Elderly witnesses (SAFE Model adaptations):**
- Slow the interview pace significantly
- Context reinstatement is especially important — it acts as a cognitive scaffold that disproportionately benefits older adults
- Accommodate potential sensory impairments (larger text, clearer audio) without assuming cognitive impairment

---

### Question Generation Rules

The interview engine (powered by Gemini) follows these rules, derived from the PEACE model, ECI, and misinformation effect research:

1. **Never lead** — Questions must be open-ended, never suggesting answers. Never say "Was his nose big?" — say "What do you remember about their nose?" Leading questions introduce post-event misinformation that permanently overrides the original memory trace (Loftus, Misinformation Effect).
2. **Never use forced-choice framing** — Never say "Was their face round or oval?" — say "How would you describe the shape of their face?" Forced-choice questions force binary categorization of ambiguous visual data and are strictly prohibited across all modern frameworks.
3. **One topic at a time** — Each question focuses on a single feature or concept. No compound questions ("What about their eyes and nose?").
4. **Never interrupt free recall** — When the witness is speaking freely, do not interrupt. Interruption fractures the cognitive retrieval process and limits total information volume.
5. **Acknowledge uncertainty** — If the witness says "I don't know," accept it immediately and move on. Never rephrase the same question hoping for a different answer. Rephrasing creates social pressure to fabricate an answer.
6. **Witness-compatible cuing** — In cued recall phases, use the witness's own words to trigger further detail, not generic prompts. This ensures the interview structure mirrors the witness's semantic memory organization.
7. **Adaptive sequencing** — Skip questions about features already described. Acknowledge previously volunteered information rather than re-asking.
8. **Conversational and calm** — Maintain a warm, unhurried, supportive tone throughout. The witness should feel like they're having a conversation, not being interrogated. Stark, formal tones elevate anxiety and inhibit episodic memory access.
9. **No pressure** — Periodically remind the witness it's okay to not remember everything: "You're doing great. Let's keep going at your pace."
10. **Gender-neutral language** — Use "this person" or "they" until the witness establishes gender. Never assume.
11. **Monitor fatigue** — If the session exceeds 20 minutes or the witness gives increasingly short answers, offer a break or suggest finishing. Cognitive load degrades recall accuracy over time.
12. **Never barrage** — Do not fire rapid-fire specific questions. Premature specific questioning forces the witness to abandon their internal memory search to conform to the interviewer's script, inflating confabulation rates.

---

## Composite Profile

### Data Structure

The server maintains a running **composite profile** object that accumulates all witness descriptions:

```json
{
  "sessionId": "uuid",
  "createdAt": "ISO-8601",
  "context": {
    "location": "parking lot, nighttime",
    "lighting": "overhead streetlight, moderate",
    "distance": "about 10 feet",
    "duration": "5-10 seconds",
    "confidence": "medium"
  },
  "description": {
    "globalImpression": "tall man, looked angry, wearing a hoodie",
    "faceShape": "oval, narrow",
    "hair": "short, dark brown, buzzcut",
    "eyes": "dark, close-set, deep-set",
    "eyebrows": null,
    "nose": "medium, slightly crooked",
    "mouth": "thin lips",
    "chin": "pointed",
    "ears": null,
    "skin": "light brown, no visible marks",
    "facialHair": "stubble, short beard",
    "age": "late 20s to early 30s",
    "build": "tall, lean, athletic",
    "height": "around 6 feet",
    "clothing": "dark hoodie, jeans",
    "distinguishingFeatures": ["scar above left eyebrow"]
  },
  "refinements": [
    {
      "iteration": 1,
      "feedback": "nose should be wider, eyes more narrow",
      "timestamp": "ISO-8601"
    }
  ],
  "interviewHistory": [
    {
      "question": "...",
      "answer": "...",
      "phase": "context",
      "timestamp": "ISO-8601"
    }
  ]
}
```

After each answer, Gemini parses the witness's response and updates the relevant fields in the composite profile. Fields start as `null` and are filled in as information is gathered.

---

## Sketch Generation

### Prompt Construction

The image generation prompt is built dynamically from the composite profile using a **baseline prompt** combined with assembled witness descriptions.

#### Baseline Prompt (always included)

```
Highly detailed colored pencil portrait sketch of a suspect's face. Realistic
skin tones and natural coloring. Soft shading with visible pencil strokes.
Front-facing portrait, neutral expression. Realistic proportions, professional
forensic artist style. No background, plain white paper. Fine detail in facial
features, subtle color gradients. Colored graphite drawing style.
```

#### Negative Prompt (if supported by the API)

```
photograph, photo, digital art, painting, oil paint, cartoon, anime,
watermark, black and white, monochrome, grayscale
```

#### Assembled Prompt Template

```
Highly detailed colored pencil portrait sketch of a suspect's face. Realistic
skin tones and natural coloring. Soft shading with visible pencil strokes.
Front-facing portrait, neutral expression. Realistic proportions, professional
forensic artist style. No background, plain white paper. Fine detail in facial
features, subtle color gradients. Colored graphite drawing style.

[assembled description from composite profile fields, most distinctive features first]
```

#### Example Assembled Prompt

```
Highly detailed colored pencil portrait sketch of a suspect's face. Realistic
skin tones and natural coloring. Soft shading with visible pencil strokes.
Front-facing portrait, neutral expression. Realistic proportions, professional
forensic artist style. No background, plain white paper. Fine detail in facial
features, subtle color gradients. Colored graphite drawing style.

Male, early 30s, square jawline, medium-length wavy dark brown hair swept to
the right, green eyes, thick eyebrows, broad nose with a slight bump on the
bridge, full lips, light skin with slight stubble along the jaw, small mole
on the right cheek, muscular build, wearing a dark blue hoodie.
```

#### Prompt Engineering Rules

- **Most distinctive features first** — generators weight earlier tokens more heavily
- **Avoid negatives** — don't say "no glasses"; instead omit glasses entirely. Generators are bad at "don't draw X"
- **Use negative prompts** — use the API's negative prompt field (if available) to suppress unwanted styles
- **Fixed seed** — use a consistent seed value across iterations to keep the base composition stable while features change

### Generation Rules

1. Generate a new sketch after **every question** starting from Phase 2
2. Use the **full composite profile** for each generation (not just the latest answer)
3. Include a **seed parameter** to maintain consistency between iterations
4. When the witness provides a refinement, emphasize changed features in the prompt
5. Maintain aspect ratio and general composition across iterations so changes feel incremental

### Sketch Display

- Show the **current sketch** prominently
- Provide a **side-by-side comparison** toggle to see previous vs. current
- Include a **sketch history** filmstrip along the bottom showing all iterations
- Allow the witness to **revert** to a previous sketch if a refinement went wrong

---

## User Interface

### Layout

```
┌──────────────────────────────────────────────────────┐
│  WitnessSketch                          [New Session]│
├──────────────────────┬───────────────────────────────┤
│                      │                               │
│   Interview Panel    │      Sketch Panel             │
│                      │                               │
│  ┌────────────────┐  │  ┌─────────────────────────┐  │
│  │ Chat history   │  │  │                         │  │
│  │ (scrollable)   │  │  │   Current Sketch        │  │
│  │                │  │  │   (large display)        │  │
│  │                │  │  │                         │  │
│  │                │  │  │                         │  │
│  │                │  │  └─────────────────────────┘  │
│  └────────────────┘  │                               │
│                      │  Confidence: ████████░░ 80%   │
│  ┌────────────────┐  │                               │
│  │ Your answer... │  │  ┌──┐┌──┐┌──┐┌──┐┌──┐        │
│  │            Send│  │  │v1││v2││v3││v4││v5│        │
│  └────────────────┘  │  └──┘└──┘└──┘└──┘└──┘        │
│                      │  History filmstrip             │
│  [I don't remember]  │                               │
│  [Finish & Export]   │  [Compare] [Revert] [Export]  │
├──────────────────────┴───────────────────────────────┤
│  Phase: Feature Recall (3/5)    Duration: 12:34      │
└──────────────────────────────────────────────────────┘
```

### Key UI Elements

1. **Interview Panel** (left)
   - Scrollable chat-style conversation
   - Text input for free-form answers
   - "I don't remember" button (skips without pressure)
   - "Finish & Export" button

2. **Sketch Panel** (right)
   - Large current sketch display
   - Confidence meter (witness self-reported, 1-10 mapped to percentage)
   - History filmstrip of all sketch versions
   - Compare mode (side-by-side with any previous version)
   - Revert button

3. **Status Bar** (bottom)
   - Current interview phase indicator
   - Session duration timer

---

## API Endpoints

### `POST /api/session`
Create a new interview session. Returns `sessionId`.

### `POST /api/session/:id/answer`
Submit a witness answer.
- Request: `{ "answer": "string" }` or `{ "skip": true }`
- Server: Updates composite profile, generates next question, triggers sketch generation
- Response: `{ "question": "string", "sketch": "base64 | url", "profile": {...}, "phase": "string" }`

### `GET /api/session/:id`
Retrieve full session state (profile, history, all sketches).

### `POST /api/session/:id/refine`
Submit sketch feedback during refinement phase.
- Request: `{ "feedback": "string", "confidence": 7 }`
- Response: `{ "question": "string", "sketch": "base64 | url" }`

### `POST /api/session/:id/revert`
Revert to a previous sketch version.
- Request: `{ "version": 3 }`
- Response: Updated session state.

### `POST /api/session/:id/export`
Export final sketch and session report.
- Response: `{ "sketch": "base64 (high-res)", "report": "pdf | json" }`

---

## Session Export

When the witness finalizes the sketch, the app exports:

1. **Final sketch** - High-resolution PNG
2. **Session report** (PDF) containing:
   - Final sketch
   - Composite profile summary
   - Full interview transcript with timestamps
   - Sketch evolution (all versions)
   - Witness confidence rating
   - Session metadata (date, duration)

---

## Security & Privacy Considerations

- All session data is stored **locally only** (SQLite on the server, no cloud sync)
- Sessions are encrypted at rest
- Sessions auto-expire and are deleted after 30 days
- No personally identifiable information about the witness is collected
- Interview transcripts are not sent to any analytics service
- API keys for Gemini are server-side only
- Access is authenticated (designed for use by law enforcement, not public)
- Audit log tracks all access to session data

---

## Edge Cases & Handling

| Scenario | Handling |
|----------|----------|
| Witness says "I don't know" repeatedly | Skip feature gracefully, reduce questioning on that topic |
| Witness contradicts themselves | Gently note the discrepancy, ask which they feel more confident about |
| Witness gives vague answers | Ask one follow-up, then accept and move on |
| Sketch generation fails | Show previous sketch, retry in background, inform user |
| Witness wants to restart | Allow full reset or reset to a specific phase |
| Very short session (< 3 answers) | Generate best-effort sketch, warn about low detail |

---

## File Structure

```
glitchproject/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── InterviewPanel.jsx
│   │   │   ├── SketchPanel.jsx
│   │   │   ├── ChatMessage.jsx
│   │   │   ├── SketchHistory.jsx
│   │   │   ├── CompareView.jsx
│   │   │   ├── ConfidenceMeter.jsx
│   │   │   └── ExportModal.jsx
│   │   ├── hooks/
│   │   │   ├── useSession.js
│   │   │   └── useSketch.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── server/
│   ├── index.js               # Express entry point
│   ├── routes/
│   │   └── session.js         # API route handlers
│   ├── services/
│   │   ├── interview.js       # Gemini-powered interview engine
│   │   ├── profile.js         # Composite profile aggregation
│   │   ├── sketch.js          # Image generation orchestration
│   │   └── export.js          # PDF/image export
│   ├── prompts/
│   │   ├── interviewer.txt    # System prompt for Gemini interviewer
│   │   ├── profileParser.txt  # Prompt to extract features from answers
│   │   └── sketchPrompt.txt   # Template for image generation
│   ├── db/
│   │   └── sqlite.js          # Database setup & queries
│   └── package.json
├── SPEC.md
└── README.md
```

---

## Implementation Priority

### Phase 1 - MVP
- Basic interview loop (hardcoded question sequence)
- Composite profile accumulation
- Sketch generation after each answer
- Simple chat UI with sketch display

### Phase 2 - Intelligence
- Gemini-powered adaptive questioning
- Profile parsing from natural language answers
- Sketch refinement loop with feedback
- Sketch history and comparison

### Phase 3 - Polish
- PDF export with full report
- Session persistence and resume
- Authentication for law enforcement users
- Confidence tracking and UI polish
