// ─────────────────────────────────────────────────────────────
// Adding a part category
//
// Append an entry to FEATURES. The page renders whatever is here — no
// component changes needed, and DEFAULT_CHARACTER picks it up on its own.
//
//   {
//     id: 'eyebrows',        // key in the character object
//     label: 'eyebrows',     // sidebar heading
//     z: 46,                 // draw order; see the z map below
//     colorKey: 'hair',      // which entry of DEFAULT_COLORS drives it
//     shade: -22,            // optional: darken colorKey by this much
//     defaultOption: 'flat', // optional; defaults to the first option
//     options: [{ id: 'flat', paths: [{ d: 'M…', fill: '@' }] }],
//   }
//
// z map: neck 5 · body 10 · ears 20 · head 30 · nose 40 · eyes 45 ·
//        beard 50 · mouth 55 · hair 60 · accessories 70
//
// Every part is authored against a shared 200x240 viewBox, so options layer
// onto the same face. Landmarks: head spans x 52–148 / y 44–166, eyes sit on
// y 100 at x 80 and 120, mouth y 140, chin y 166, shoulders y 182.
//
// A path is { d, fill, opacity?, transform? } where fill is:
//   '@'      -> the feature's own colorKey
//   '@skin'  -> that named colorKey (lets an eyelid borrow the skin tone)
//   '#hex'   -> a literal color
// MIRROR flips a path about x=100, so left-side parts are authored once.
// ─────────────────────────────────────────────────────────────
export const VIEW_W = 200
export const VIEW_H = 240
export const MIRROR = 'translate(200,0) scale(-1,1)'

// Fixed parts, drawn between the selectable features (see FEATURES z values).
export const NECK = { z: 5, colorKey: 'skin', d: 'M86 148 h28 v42 h-28 Z' }
export const HEAD = {
  z: 30,
  colorKey: 'skin',
  d: 'M100 44 C132 44 148 66 148 104 C148 142 128 166 100 166 C72 166 52 142 52 104 C52 66 68 44 100 44 Z',
}
// above the beard (z 50) so a full beard still shows a mouth
export const MOUTH = { z: 55, d: 'M88 140 C94 148 106 148 112 140 C106 144 94 144 88 140 Z' }

// circle-as-path helper, used to author the eye stacks below
const circle = (cx, cy, r) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`

// A pair of eyes: white, colored iris, dark pupil. dx nudges the gaze sideways.
const eyeStack = (whiteR, irisR, pupilR, dx = 0) => [
  { d: circle(80, 100, whiteR), fill: '#ffffff' },
  { d: circle(120, 100, whiteR), fill: '#ffffff' },
  { d: circle(80 + dx, 100, irisR), fill: '@' },
  { d: circle(120 + dx, 100, irisR), fill: '@' },
  { d: circle(80 + dx, 100, pupilR), fill: '#141414' },
  { d: circle(120 + dx, 100, pupilR), fill: '#141414' },
]

// left lens/lid shapes reused by sleepy eyes and the glasses
const LID_L = 'M69 100 a11 11 0 0 1 22 0 Z'
const LID_R = 'M109 100 a11 11 0 0 1 22 0 Z'

export const FEATURES = [
  {
    id: 'body',
    label: 'body',
    z: 10,
    colorKey: 'shirt',
    options: [
      {
        id: 'tee',
        paths: [
          { d: 'M100 182 C88 182 82 188 60 196 C48 200 44 208 42 240 L158 240 C156 208 152 200 140 196 C118 188 112 182 100 182 Z', fill: '@' },
        ],
      },
      {
        id: 'hoodie',
        paths: [
          { d: 'M100 182 C86 182 78 188 56 196 C42 202 38 212 36 240 L164 240 C162 212 158 202 144 196 C122 188 114 182 100 182 Z', fill: '@' },
          { d: 'M84 184 C90 202 110 202 116 184 C110 194 90 194 84 184 Z', fill: '#141414', opacity: 0.25 },
          { d: 'M92 200 h4 v22 h-4 Z', fill: '#141414', opacity: 0.35 },
          { d: 'M104 200 h4 v22 h-4 Z', fill: '#141414', opacity: 0.35 },
        ],
      },
      {
        id: 'tank',
        paths: [
          { d: 'M100 184 C92 184 88 190 74 196 C62 201 58 210 56 240 L144 240 C142 210 138 201 126 196 C112 190 108 184 100 184 Z', fill: '@' },
        ],
      },
      {
        id: 'collar',
        paths: [
          { d: 'M100 182 C88 182 82 188 60 196 C48 200 44 208 42 240 L158 240 C156 208 152 200 140 196 C118 188 112 182 100 182 Z', fill: '@' },
          { d: 'M86 184 L100 204 L88 208 L80 190 Z', fill: '#faf8f3' },
          { d: 'M114 184 L100 204 L112 208 L120 190 Z', fill: '#faf8f3' },
        ],
      },
      {
        id: 'sweater',
        paths: [
          { d: 'M100 184 C86 184 76 190 56 198 C42 204 38 214 36 240 L164 240 C162 214 158 204 144 198 C124 190 114 184 100 184 Z', fill: '@' },
          { d: 'M82 186 C88 198 112 198 118 186 C112 194 88 194 82 186 Z', fill: '#141414', opacity: 0.2 },
        ],
      },
      {
        id: 'jacket',
        paths: [
          { d: 'M100 182 C88 182 82 188 60 196 C48 200 44 208 42 240 L158 240 C156 208 152 200 140 196 C118 188 112 182 100 182 Z', fill: '@' },
          { d: 'M86 184 L100 210 L96 240 L74 240 L78 192 Z', fill: '#141414', opacity: 0.28 },
          { d: 'M114 184 L100 210 L104 240 L126 240 L122 192 Z', fill: '#141414', opacity: 0.28 },
        ],
      },
      {
        id: 'turtleneck',
        paths: [
          { d: 'M100 176 C88 176 82 184 60 194 C48 199 44 208 42 240 L158 240 C156 208 152 199 140 194 C118 184 112 176 100 176 Z', fill: '@' },
          { d: 'M84 172 h32 v16 h-32 Z', fill: '@' },
          { d: 'M84 172 h32 v4 h-32 Z', fill: '#141414', opacity: 0.18 },
        ],
      },
      {
        id: 'overalls',
        paths: [
          { d: 'M100 182 C88 182 82 188 60 196 C48 200 44 208 42 240 L158 240 C156 208 152 200 140 196 C118 188 112 182 100 182 Z', fill: '#faf8f3' },
          { d: 'M72 202 h56 v38 h-56 Z', fill: '@' },
          { d: 'M76 186 L86 182 L92 202 L82 204 Z', fill: '@' },
          { d: 'M124 186 L114 182 L108 202 L118 204 Z', fill: '@' },
        ],
      },
      {
        id: 'stripes',
        paths: [
          { d: 'M100 182 C88 182 82 188 60 196 C48 200 44 208 42 240 L158 240 C156 208 152 200 140 196 C118 188 112 182 100 182 Z', fill: '@' },
          { d: 'M43 206 h114 v8 h-114 Z', fill: '#faf8f3', opacity: 0.85 },
          { d: 'M42 222 h116 v8 h-116 Z', fill: '#faf8f3', opacity: 0.85 },
        ],
      },
      {
        id: 'scarf',
        paths: [
          { d: 'M100 182 C88 182 82 188 60 196 C48 200 44 208 42 240 L158 240 C156 208 152 200 140 196 C118 188 112 182 100 182 Z', fill: '#faf8f3' },
          { d: 'M74 184 C84 196 116 196 126 184 C130 192 128 200 122 204 C110 210 90 210 78 204 C72 200 70 192 74 184 Z', fill: '@' },
          { d: 'M104 204 h14 l-4 34 h-14 Z', fill: '@' },
        ],
      },
    ],
  },
  {
    id: 'ears',
    label: 'ears',
    z: 20,
    colorKey: 'skin',
    options: [
      {
        id: 'round',
        paths: [
          { d: 'M58 98 C44 96 38 110 46 122 C52 131 62 128 62 120 Z', fill: '@' },
          { d: 'M58 98 C44 96 38 110 46 122 C52 131 62 128 62 120 Z', fill: '@', transform: MIRROR },
        ],
      },
      {
        id: 'pointy',
        paths: [
          { d: 'M58 98 C46 86 38 96 44 112 C48 124 60 128 62 118 Z', fill: '@' },
          { d: 'M58 98 C46 86 38 96 44 112 C48 124 60 128 62 118 Z', fill: '@', transform: MIRROR },
        ],
      },
      {
        id: 'small',
        paths: [
          { d: 'M58 102 C48 102 46 112 52 118 C56 122 62 120 62 114 Z', fill: '@' },
          { d: 'M58 102 C48 102 46 112 52 118 C56 122 62 120 62 114 Z', fill: '@', transform: MIRROR },
        ],
      },
      {
        id: 'big',
        paths: [
          { d: 'M56 92 C36 90 30 114 44 130 C53 140 64 133 62 122 Z', fill: '@' },
          { d: 'M56 92 C36 90 30 114 44 130 C53 140 64 133 62 122 Z', fill: '@', transform: MIRROR },
        ],
      },
      {
        id: 'tall',
        paths: [
          { d: 'M58 90 C46 88 42 112 50 126 C55 133 62 130 62 122 Z', fill: '@' },
          { d: 'M58 90 C46 88 42 112 50 126 C55 133 62 130 62 122 Z', fill: '@', transform: MIRROR },
        ],
      },
      {
        id: 'elf',
        paths: [
          { d: 'M58 100 C48 80 34 82 42 106 C46 122 60 128 62 116 Z', fill: '@' },
          { d: 'M58 100 C48 80 34 82 42 106 C46 122 60 128 62 116 Z', fill: '@', transform: MIRROR },
        ],
      },
      {
        id: 'tiny',
        paths: [
          { d: 'M58 106 C51 106 50 113 54 117 C57 120 62 118 62 113 Z', fill: '@' },
          { d: 'M58 106 C51 106 50 113 54 117 C57 120 62 118 62 113 Z', fill: '@', transform: MIRROR },
        ],
      },
      {
        id: 'wide',
        paths: [
          { d: 'M58 100 C38 98 32 108 44 118 C52 126 62 124 62 116 Z', fill: '@' },
          { d: 'M58 100 C38 98 32 108 44 118 C52 126 62 124 62 116 Z', fill: '@', transform: MIRROR },
        ],
      },
      {
        id: 'square',
        paths: [
          { d: 'M62 98 h-14 a4 4 0 0 0 -4 4 v16 a4 4 0 0 0 4 4 h14 Z', fill: '@' },
          { d: 'M62 98 h-14 a4 4 0 0 0 -4 4 v16 a4 4 0 0 0 4 4 h14 Z', fill: '@', transform: MIRROR },
        ],
      },
      { id: 'none', paths: [] },
    ],
  },
  {
    id: 'nose',
    label: 'nose',
    z: 40,
    colorKey: 'skin',
    shade: -22, // nose reads as a shadow off the skin tone
    options: [
      { id: 'button', paths: [{ d: 'M100 110 C108 117 110 126 100 128 C90 126 92 117 100 110 Z', fill: '@' }] },
      { id: 'pointed', paths: [{ d: 'M100 104 C104 118 111 128 100 130 C92 130 89 126 96 122 Z', fill: '@' }] },
      { id: 'wide', paths: [{ d: 'M100 111 C113 118 115 128 100 130 C85 128 87 118 100 111 Z', fill: '@' }] },
      { id: 'small', paths: [{ d: 'M100 116 C105 121 106 127 100 128 C94 127 95 121 100 116 Z', fill: '@' }] },
      { id: 'long', paths: [{ d: 'M100 100 C103 118 108 130 100 132 C93 132 91 128 96 124 Z', fill: '@' }] },
      { id: 'hook', paths: [{ d: 'M100 104 C106 114 112 126 102 130 C96 132 92 128 96 124 C102 122 102 114 96 106 Z', fill: '@' }] },
      { id: 'flat', paths: [{ d: 'M87 126 C92 121 108 121 113 126 C108 130 92 130 87 126 Z', fill: '@' }] },
      { id: 'round', paths: [{ d: circle(100, 120, 9), fill: '@' }] },
      { id: 'upturned', paths: [{ d: 'M100 112 C109 120 108 128 98 128 C92 128 92 124 96 121 Z', fill: '@' }] },
      { id: 'none', paths: [] },
    ],
  },
  {
    id: 'eyes',
    label: 'eyes',
    z: 45,
    colorKey: 'eye',
    options: [
      { id: 'round', paths: eyeStack(11, 6, 3) },
      { id: 'wide', paths: eyeStack(13, 7, 3) },
      { id: 'big', paths: eyeStack(15, 9, 4.5) },
      { id: 'tiny', paths: eyeStack(7, 4, 2) },
      {
        id: 'dot',
        paths: [
          { d: circle(80, 100, 4), fill: '@' },
          { d: circle(120, 100, 4), fill: '@' },
        ],
      },
      {
        id: 'sleepy',
        paths: [
          ...eyeStack(11, 6, 3),
          { d: LID_L, fill: '@skin' },
          { d: LID_R, fill: '@skin' },
          { d: 'M68 98 h24 v3 h-24 Z', fill: '#141414' },
          { d: 'M108 98 h24 v3 h-24 Z', fill: '#141414' },
        ],
      },
      {
        id: 'happy',
        paths: [
          { d: 'M69 106 C76 92 86 92 93 106 C86 99 76 99 69 106 Z', fill: '@' },
          { d: 'M109 106 C116 92 126 92 133 106 C126 99 116 99 109 106 Z', fill: '@' },
        ],
      },
      {
        id: 'wink',
        paths: [
          ...eyeStack(11, 6, 3).slice(0, 1),
          { d: circle(80, 100, 11), fill: '#ffffff' },
          { d: circle(80, 100, 6), fill: '@' },
          { d: circle(80, 100, 3), fill: '#141414' },
          { d: 'M109 106 C116 92 126 92 133 106 C126 99 116 99 109 106 Z', fill: '@' },
        ],
      },
      {
        id: 'angry',
        paths: [
          ...eyeStack(11, 6, 3),
          { d: 'M66 82 L94 94 L94 88 L66 76 Z', fill: '#141414' },
          { d: 'M66 82 L94 94 L94 88 L66 76 Z', fill: '#141414', transform: MIRROR },
        ],
      },
      { id: 'side-eye', paths: eyeStack(11, 6, 3, 5) },
      {
        id: 'sparkle',
        paths: [
          ...eyeStack(12, 7, 3.5),
          { d: circle(76, 95, 2.5), fill: '#ffffff' },
          { d: circle(116, 95, 2.5), fill: '#ffffff' },
        ],
      },
    ],
  },
  {
    id: 'beard',
    label: 'beard',
    z: 50,
    colorKey: 'hair',
    options: [
      { id: 'none', paths: [] },
      {
        id: 'full',
        paths: [
          { d: 'M54 104 C54 148 74 168 100 168 C126 168 146 148 146 104 C146 130 138 138 124 136 C116 148 84 148 76 136 C62 138 54 130 54 104 Z', fill: '@' },
        ],
      },
      {
        id: 'stubble',
        paths: [
          { d: 'M54 104 C54 148 74 168 100 168 C126 168 146 148 146 104 C146 130 138 138 124 136 C116 148 84 148 76 136 C62 138 54 130 54 104 Z', fill: '@', opacity: 0.32 },
        ],
      },
      {
        id: 'mustache',
        paths: [
          { d: 'M82 132 C90 126 96 130 100 133 C104 130 110 126 118 132 C110 140 90 140 82 132 Z', fill: '@' },
        ],
      },
      {
        id: 'handlebar',
        paths: [
          { d: 'M78 130 C86 124 96 130 100 134 C104 130 114 124 122 130 C124 139 115 143 111 136 C107 132 93 132 89 136 C85 143 76 139 78 130 Z', fill: '@' },
        ],
      },
      {
        // mustache + chin tuft, framing the mouth rather than covering it
        id: 'goatee',
        paths: [
          { d: 'M83 132 C90 126 96 130 100 133 C104 130 110 126 117 132 C110 139 90 139 83 132 Z', fill: '@' },
          { d: 'M89 150 C89 147 111 147 111 150 C111 161 106 166 100 166 C94 166 89 161 89 150 Z', fill: '@' },
        ],
      },
      {
        id: 'soul-patch',
        paths: [
          { d: 'M94 144 C94 141 106 141 106 144 C106 152 103 155 100 155 C97 155 94 152 94 144 Z', fill: '@' },
        ],
      },
      {
        id: 'chinstrap',
        paths: [
          { d: 'M54 104 C54 148 74 168 100 168 C126 168 146 148 146 104 C142 104 138 105 138 109 C138 143 122 157 100 157 C78 157 62 143 62 109 C62 105 58 104 54 104 Z', fill: '@' },
        ],
      },
      {
        id: 'long',
        paths: [
          { d: 'M54 104 C54 148 70 166 88 171 C88 191 92 202 100 202 C108 202 112 191 112 171 C130 166 146 148 146 104 C146 130 138 138 124 136 C116 148 84 148 76 136 C62 138 54 130 54 104 Z', fill: '@' },
        ],
      },
      {
        id: 'muttonchops',
        paths: [
          { d: 'M54 104 C54 132 58 146 66 153 C74 151 77 140 75 120 C68 118 60 112 54 104 Z', fill: '@' },
          { d: 'M54 104 C54 132 58 146 66 153 C74 151 77 140 75 120 C68 118 60 112 54 104 Z', fill: '@', transform: MIRROR },
        ],
      },
    ],
  },
  {
    id: 'hair',
    label: 'hair',
    z: 60,
    colorKey: 'hair',
    defaultOption: 'bob',
    options: [
      { id: 'bald', paths: [] },
      {
        id: 'buzz',
        paths: [
          { d: 'M100 40 C134 40 150 64 150 92 C150 74 132 66 100 66 C68 66 50 74 50 92 C50 64 66 40 100 40 Z', fill: '@' },
        ],
      },
      {
        id: 'bob',
        paths: [
          { d: 'M100 38 C136 38 152 62 152 96 L152 132 L138 132 L138 84 C138 74 122 66 100 66 C78 66 62 74 62 84 L62 132 L48 132 L48 96 C48 62 64 38 100 38 Z', fill: '@' },
        ],
      },
      {
        id: 'side-part',
        paths: [
          { d: 'M100 38 C136 38 152 62 152 94 C148 78 140 70 128 66 C120 78 96 84 62 80 C56 86 52 90 50 96 C48 62 64 38 100 38 Z', fill: '@' },
        ],
      },
      {
        id: 'spiky',
        paths: [
          { d: 'M50 92 L58 58 L69 78 L78 48 L89 74 L100 42 L111 74 L122 48 L131 78 L142 58 L150 92 C150 74 132 66 100 66 C68 66 50 74 50 92 Z', fill: '@' },
        ],
      },
      {
        id: 'mohawk',
        paths: [
          { d: 'M88 68 C88 40 96 22 100 15 C104 22 112 40 112 68 Z', fill: '@' },
        ],
      },
      {
        id: 'afro',
        paths: [
          { d: 'M100 26 C136 26 160 52 160 86 C160 96 156 103 150 105 C152 76 132 64 100 64 C68 64 48 76 50 105 C44 103 40 96 40 86 C40 52 64 26 100 26 Z', fill: '@' },
        ],
      },
      {
        id: 'curls',
        paths: [
          { d: 'M50 94 C43 94 39 86 46 78 C41 68 50 59 58 62 C58 50 70 43 78 50 C82 37 98 36 104 46 C112 36 126 40 128 52 C139 50 147 58 144 68 C154 73 156 85 150 94 C150 74 132 66 100 66 C68 66 50 74 50 94 Z', fill: '@' },
        ],
      },
      {
        id: 'ponytail',
        paths: [
          { d: 'M100 38 C136 38 152 62 152 96 L152 110 C167 117 173 141 166 165 C160 150 154 142 148 138 L148 84 C148 74 122 66 100 66 C78 66 62 74 62 84 L62 120 L48 120 L48 96 C48 62 64 38 100 38 Z', fill: '@' },
        ],
      },
      {
        id: 'bun',
        paths: [
          { d: 'M100 38 C134 38 150 62 150 92 C150 74 132 66 100 66 C68 66 50 74 50 92 C50 62 66 38 100 38 Z', fill: '@' },
          { d: circle(100, 26, 15), fill: '@' },
        ],
      },
      {
        id: 'long',
        paths: [
          { d: 'M100 38 C138 38 154 62 154 98 L154 188 L138 188 L138 84 C138 74 122 66 100 66 C78 66 62 74 62 84 L62 188 L46 188 L46 98 C46 62 62 38 100 38 Z', fill: '@' },
        ],
      },
    ],
  },
  {
    id: 'accessories',
    label: 'accessories',
    z: 70,
    colorKey: 'accent',
    options: [
      { id: 'none', paths: [] },
      {
        id: 'glasses',
        paths: [
          { d: circle(80, 100, 15), fill: '#ffffff', opacity: 0.3 },
          { d: circle(120, 100, 15), fill: '#ffffff', opacity: 0.3 },
          { d: 'M65 100 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0 Z M69 100 a11 11 0 1 1 22 0 a11 11 0 1 1 -22 0 Z', fill: '@' },
          { d: 'M105 100 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0 Z M109 100 a11 11 0 1 1 22 0 a11 11 0 1 1 -22 0 Z', fill: '@' },
          { d: 'M95 98 h10 v4 h-10 Z', fill: '@' },
          { d: 'M52 98 h13 v4 h-13 Z', fill: '@' },
          { d: 'M52 98 h13 v4 h-13 Z', fill: '@', transform: MIRROR },
        ],
      },
      {
        id: 'sunglasses',
        paths: [
          { d: 'M64 92 h32 a3 3 0 0 1 3 3 v10 a13 13 0 0 1 -13 13 h-12 a13 13 0 0 1 -13 -13 v-10 a3 3 0 0 1 3 -3 Z', fill: '#141414' },
          { d: 'M64 92 h32 a3 3 0 0 1 3 3 v10 a13 13 0 0 1 -13 13 h-12 a13 13 0 0 1 -13 -13 v-10 a3 3 0 0 1 3 -3 Z', fill: '#141414', transform: MIRROR },
          { d: 'M96 96 h8 v5 h-8 Z', fill: '#141414' },
          { d: 'M52 94 h12 v4 h-12 Z', fill: '#141414' },
          { d: 'M52 94 h12 v4 h-12 Z', fill: '#141414', transform: MIRROR },
          { d: 'M70 98 l14 0 l-10 10 l-8 0 Z', fill: '@', opacity: 0.45 },
        ],
      },
      {
        id: 'earring',
        paths: [
          { d: circle(53, 126, 4), fill: '@' },
          { d: circle(53, 126, 4), fill: '@', transform: MIRROR },
        ],
      },
      {
        id: 'headband',
        paths: [
          { d: 'M52 80 C62 68 78 62 100 62 C122 62 138 68 148 80 L148 90 C138 78 122 72 100 72 C78 72 62 78 52 90 Z', fill: '@' },
        ],
      },
      {
        id: 'cap',
        paths: [
          { d: 'M46 68 C46 44 68 30 100 30 C132 30 154 44 154 68 L154 72 L46 72 Z', fill: '@' },
          { d: 'M38 68 h124 a6 6 0 0 1 0 12 h-124 a6 6 0 0 1 0 -12 Z', fill: '@' },
          { d: 'M38 68 h124 a6 6 0 0 1 0 12 h-124 a6 6 0 0 1 0 -12 Z', fill: '#141414', opacity: 0.22 },
        ],
      },
      {
        id: 'beanie',
        paths: [
          { d: 'M48 72 C48 42 70 26 100 26 C130 26 152 42 152 72 Z', fill: '@' },
          { d: 'M46 70 h108 v14 h-108 Z', fill: '@' },
          { d: 'M46 70 h108 v14 h-108 Z', fill: '#141414', opacity: 0.2 },
          { d: circle(100, 20, 8), fill: '@' },
        ],
      },
      {
        id: 'eyepatch',
        paths: [
          { d: 'M52 84 L148 96 L148 101 L52 89 Z', fill: '#141414' },
          { d: 'M64 88 h32 a4 4 0 0 1 4 4 v14 a4 4 0 0 1 -4 4 h-32 a4 4 0 0 1 -4 -4 v-14 a4 4 0 0 1 4 -4 Z', fill: '#141414' },
        ],
      },
      {
        id: 'blush',
        paths: [
          { d: circle(70, 124, 9), fill: '#ff6b9d', opacity: 0.4 },
          { d: circle(130, 124, 9), fill: '#ff6b9d', opacity: 0.4 },
        ],
      },
      {
        id: 'freckles',
        paths: [
          { d: circle(72, 118, 2), fill: '#141414', opacity: 0.35 },
          { d: circle(79, 124, 2), fill: '#141414', opacity: 0.35 },
          { d: circle(68, 127, 2), fill: '#141414', opacity: 0.35 },
          { d: circle(72, 118, 2), fill: '#141414', opacity: 0.35, transform: MIRROR },
          { d: circle(79, 124, 2), fill: '#141414', opacity: 0.35, transform: MIRROR },
          { d: circle(68, 127, 2), fill: '#141414', opacity: 0.35, transform: MIRROR },
        ],
      },
    ],
  },
]

export const SKIN_SWATCHES = ['#f2d5c0', '#e8b895', '#d99e6a', '#c68642', '#8d5524', '#5c3317']
export const HAIR_SWATCHES = ['#141414', '#5c3317', '#c68642', '#e8e3d8', '#ff6b9d', '#7c6cf0']
export const EYE_SWATCHES = ['#141414', '#5c3317', '#4a6741', '#5b8def', '#4ecdc4', '#7c6cf0']
export const SHIRT_SWATCHES = ['#4ecdc4', '#ff6b9d', '#ffd23f', '#7c6cf0', '#141414', '#faf8f3']
export const ACCENT_SWATCHES = ['#57b894', '#141414', '#ff6b9d', '#4ecdc4', '#ffd23f', '#7c6cf0']

export const COLOR_KEYS = [
  { key: 'skin', label: 'skin', swatches: SKIN_SWATCHES },
  { key: 'hair', label: 'hair', swatches: HAIR_SWATCHES },
  { key: 'eye', label: 'eyes', swatches: EYE_SWATCHES },
  { key: 'shirt', label: 'shirt', swatches: SHIRT_SWATCHES },
  { key: 'accent', label: 'accessory', swatches: ACCENT_SWATCHES },
]

// Derived from FEATURES so a new category needs no edit here.
export const DEFAULT_CHARACTER = Object.fromEntries(
  FEATURES.map((f) => [f.id, f.defaultOption ?? f.options[0].id])
)

export const DEFAULT_COLORS = {
  skin: '#f2d5c0',
  hair: '#141414',
  eye: '#141414',
  shirt: '#4ecdc4',
  accent: '#57b894',
}

// Features sorted back-to-front.
export function drawOrder() {
  return [...FEATURES].sort((a, b) => a.z - b.z)
}

export function optionFor(featureId, optionId) {
  const feature = FEATURES.find((f) => f.id === featureId)
  if (!feature) return null
  return feature.options.find((o) => o.id === optionId) || feature.options[0]
}

export function randomCharacter(current) {
  const roll = () => {
    const next = {}
    for (const feature of FEATURES) {
      const options = feature.options
      next[feature.id] = options[Math.floor(Math.random() * options.length)].id
    }
    return next
  }

  let next = roll()
  let guard = 0
  while (current && sameCharacter(next, current) && guard < 12) {
    next = roll()
    guard++
  }
  return next
}

function sameCharacter(a, b) {
  return FEATURES.every((f) => a[f.id] === b[f.id])
}

// Shift a hex toward black (negative) or white (positive) by `amount` steps.
export function shadeColor(hex, amount) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const num = parseInt(full, 16)
  if (Number.isNaN(num)) return hex

  const clamp = (v) => Math.max(0, Math.min(255, v))
  const r = clamp(((num >> 16) & 255) + amount)
  const g = clamp(((num >> 8) & 255) + amount)
  const b = clamp((num & 255) + amount)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

export function exportCharacterPng(svgEl, scale = 3, filename = 'character.png') {
  if (!svgEl) return

  const clone = svgEl.cloneNode(true)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', VIEW_W)
  clone.setAttribute('height', VIEW_H)
  const xml = new XMLSerializer().serializeToString(clone)

  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = VIEW_W * scale
    canvas.height = VIEW_H * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#faf8f3'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      // revoking synchronously can cancel the download in some browsers
      setTimeout(() => URL.revokeObjectURL(url), 0)
    }, 'image/png')
  }
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
}
