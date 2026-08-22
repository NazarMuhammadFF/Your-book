# BookNote Design Direction

## 1. Design personality

**Calm — Tactile — Playful**

BookNote should feel like a quiet personal library enhanced by subtle physical interactions.

It must not feel:

- Corporate/admin-dashboard heavy.
- Childish.
- Over-animated.
- Skeuomorphic to the point of harming usability.
- Like a Microsoft Word clone.

---

## 2. Visual direction

### Overall

- Spacious layouts.
- Soft depth and shadows.
- High readability.
- Restrained controls.
- Warm/personal feeling without locking the app into one specific color palette yet.
- Desktop-first.

Do not hard-code a final brand palette during early phases. Use centralized semantic tokens so colors can be changed after visual review.

Recommended semantic tokens:

```text
background
surface
surfaceElevated
textPrimary
textSecondary
border
accent
accentHover
shadowSoft
shadowBook
pagePaper
```

### Library

The Library is the emotional home of the application.

Desired qualities:

- Bookshelf is visually recognizable but clean.
- Books have front/spine/page depth cues.
- Slight natural variation in book dimensions/rotation.
- Books stay aligned enough to avoid visual chaos.
- Background should support focus on the books.

Avoid creating a full 3D room in V1.

### Books

Book component should eventually support:

- Front cover.
- Spine.
- Page block/edge.
- Thickness.
- Custom cover image.
- Generated default cover.
- Hover selected state.
- Opening transition state.

The component API must not assume that all books are the same size.

---

## 3. Motion principles

Motion is a product feature, not decoration.

### Core rule

> Motion should explain what changed or what the user is interacting with.

Good examples:

- A selected book moves slightly out from the shelf.
- A book travels toward center before opening.
- A settings panel slides/fades into context.
- A selected image reveals image controls.
- A page reacts before being flipped.

Avoid:

- Bouncing every button.
- Long transitions for common editing actions.
- Linear animation for physical-feeling objects.
- Continuous decorative motion that distracts from writing.

### Timing guidance

These are starting values, not immutable laws:

```text
Fast feedback:       100–180 ms
Normal UI transition: 200–350 ms
Large object motion:  400–650 ms
```

Large objects should feel slightly heavier than controls.

### Easing

Prefer:

- ease-out for simple entrances/exits.
- subtle spring for physical objects.
- snappier spring for controls.

Avoid overshoot that feels cartoonish.

### Centralize motion

Motion values must live in a shared design module, for example:

```text
src/design/motion.ts
```

Possible semantic presets:

- `motionFast`
- `motionNormal`
- `motionSlow`
- `springSoft`
- `springSnappy`
- `springBook`

Do not scatter arbitrary durations across components without reason.

---

## 4. Library interactions

### On app entry

- Library can fade/settle in subtly.
- Do not play a long cinematic intro every launch.

### Book hover

Recommended feel:

- Move outward/up a small amount.
- Slight rotation/depth adjustment if appropriate.
- Shadow changes consistently.
- Title/metadata can reveal only if useful.

### Book click/open

Long-term desired sequence:

```text
click
 -> selected book separates from shelf
 -> moves toward focus/center
 -> surrounding library becomes quieter
 -> book opens
 -> workspace becomes visible
```

Implementation can be simplified initially. Do not block Phase 1 on a perfect hero transition.

### Closing a book

Should visually return the user to the Library context, but correctness/navigation is more important than cinematic animation.

---

## 5. Create Book experience

Prefer an interactive preview over a sterile settings form.

Long-term layout idea:

```text
Book Preview        Settings
----------------    ----------------
live cover          title
live title          cover
book depth          typography
                    page settings
```

Changes should update preview quickly.

Custom cover:

- Never stretch the image unnaturally.
- Use `cover/fill` behavior by default.
- Later allow crop/reposition.
- Optionally show/hide title overlay.

---

## 6. Editor design

Document View should prioritize the content.

### Avoid

Persistent giant toolbar like:

```text
File Edit View Insert ... Font 12 B I U Alignment ...
```

### Prefer

- Minimal top-level controls.
- Contextual formatting bubble when text is selected.
- Slash or plus insert menu for blocks.
- Clear hierarchy between title/headings/body.
- Generous writing width and margins.

Editor should feel closer to a clean modern writing app than an office suite.

---

## 7. Image interaction

Images are structured blocks.

When selected, reveal contextual options such as:

```text
Left | Center | Right | Full
```

Changing layout should animate gently if doing so does not cause distracting document movement.

No unrestricted rotation or free x/y movement in V1.

---

## 8. Book View design

Book View is the most tactile reading surface.

Desired cues:

- Two-page spread on wide desktop layouts.
- Center gutter shadow.
- Page edge / paper depth cue.
- Soft page shadows.
- Subtle response when cursor approaches a flippable edge if supported.
- Page numbers.

Target balance:

**~70% clean digital UI / ~30% physical-book character.**

Do not chase photorealism.

---

## 9. Accessibility / usability

- Text contrast must remain readable.
- Focus states must exist for keyboard users.
- Motion should respect reduced-motion preferences where feasible.
- Avoid using color as the only state indicator.
- Hover-only functionality must have click/keyboard equivalent where practical.

---

## 10. Design iteration policy

The product is being designed while it is built.

Therefore:

- Components should be tokenized and reusable.
- Do not treat early pixel values as final branding.
- Do not introduce a large UI framework purely to make the first mockup faster if it makes the final aesthetic harder to customize.
- Visual feedback may change spacing, colors, shadows, radius, book proportions, or motion without changing product architecture.
