// The word pool for Word Zap — a mix of everyday words and a few of this
// site's own running jokes, all lowercase. Lengths range from 3 to 12;
// wordZapUtils.js buckets these by length and weights spawns so short
// words show up far more often than the long ones.
export const WORD_BANK = [
  // 3
  'cat', 'dog', 'sun', 'run', 'sky', 'ice', 'tea', 'bee', 'owl', 'fox',
  'egg', 'ant', 'bat', 'cow', 'pig', 'hat', 'bag', 'cup', 'pen', 'key',
  'box', 'bus', 'van', 'jet', 'gum', 'jam', 'oak', 'elm', 'ivy', 'zap',

  // 4
  'jump', 'fire', 'wind', 'blue', 'gold', 'moon', 'star', 'leaf', 'rain', 'snow',
  'tree', 'book', 'desk', 'lamp', 'door', 'wall', 'fish', 'bird', 'frog', 'rock',
  'sand', 'wave', 'wolf', 'bear', 'lion', 'swan', 'crab', 'worm', 'mint', 'plum',
  'kiwi', 'corn', 'rice', 'soup', 'cake', 'milk', 'salt', 'palm', 'moss', 'fern',
  'dust', 'mist', 'glow', 'dawn', 'dusk', 'tide', 'gust', 'bolt', 'echo', 'dino',
  'byte', 'code', 'loop', 'blip',

  // 5
  'bloom', 'ocean', 'cloud', 'storm', 'eagle', 'tiger', 'zebra', 'koala', 'otter', 'whale',
  'shark', 'mango', 'apple', 'grape', 'peach', 'lemon', 'olive', 'honey', 'bread', 'sugar',
  'spice', 'coral', 'amber', 'ivory', 'jelly', 'candy', 'pearl', 'spark', 'flame', 'ember',
  'frost', 'blaze', 'brisk', 'drift', 'gleam', 'brick', 'hinge', 'latch', 'pouch', 'satin',
  'snake', 'pixel', 'combo', 'crash', 'level', 'arena', 'array', 'string', 'kayak',

  // 6
  'garden', 'forest', 'meadow', 'canyon', 'desert', 'jungle', 'island', 'castle', 'bridge', 'tunnel',
  'rocket', 'planet', 'comet', 'galaxy', 'nebula', 'signal', 'engine', 'wizard', 'dragon', 'knight',
  'wallet', 'basket', 'ladder', 'pencil', 'candle', 'mirror', 'button', 'zipper', 'blanket', 'pillow',
  'banana', 'coffee', 'cookie', 'cheese', 'cereal', 'muffin', 'walnut', 'orange', 'coconut', 'pumpkin',
  'sticker', 'bounce', 'sprite', 'canvas', 'cursor', 'arcade', 'joystick', 'gallery', 'fortune',

  // 7
  'thunder', 'blizzard', 'volcano', 'glacier', 'horizon', 'compass', 'lantern', 'anchor', 'harbor', 'voyage',
  'journey', 'mystery', 'shadow', 'whisper', 'flicker', 'crystal', 'diamond', 'emerald', 'sapphire', 'plastic',
  'sandwich', 'popcorn', 'pretzel', 'noodle', 'biscuit', 'oatmeal', 'avocado', 'radish', 'lettuce', 'spinach',
  'penguin', 'octopus', 'dolphin', 'giraffe', 'leopard', 'panther', 'hamster', 'rabbit', 'raccoon', 'sparrow',
  'keyboard', 'monitor', 'battery', 'browser', 'terminal', 'network', 'gateway', 'gadget', 'respawn',
  'playground', 'pomodoro',

  // 8+
  'asteroid', 'universe', 'skeleton', 'treasure', 'triangle', 'mountain', 'waterfall', 'butterfly',
  'chocolate', 'hurricane', 'astronaut', 'labyrinth', 'telescope', 'dinosaur', 'dinodaur', 'satellite',
  'symphony', 'orchestra', 'adventure', 'discovery', 'wonderful', 'beautiful', 'fantastic', 'ridiculous',
  'wordzap', 'highscore', 'leaderboard', 'checkpoint', 'powerup', 'sidequest',
]
