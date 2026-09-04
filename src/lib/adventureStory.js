// EUPHORIA — a branching survival story.
//
// Ported from a C console game (cave escape -> jungle crossing -> a "death
// village" -> one of six endings). Every node is a screen: `beats` are
// paragraphs shown one at a time (press to continue), then either `choices`
// (a numbered decision) or `next` (auto-continues into another node).
// `end: 'death'` nodes are just regular nodes that route to the shared
// `death` screen; there's nothing special about them structurally.

export const START_NODE = 'menu'

export const STORY = {
  menu: {
    beats: [],
    choices: [
      { label: 'Start New Game', to: 'c1' },
      { label: 'Chapters', to: 'chapters' },
      { label: 'Exit', to: 'exit' },
    ],
  },
  chapters: {
    beats: [],
    choices: [
      { label: "Chapter 1 — The Cave", to: 'c1' },
      { label: "Chapter 2 — The Jungle (with Max)", to: 'c2v1' },
      { label: "Chapter 2 — The Jungle (alone)", to: 'c2v2' },
      { label: "Chapter 3 — Death Village (Max + companion)", to: 'c3v1' },
      { label: "Chapter 3 — Death Village (alone + companion)", to: 'c3v2' },
      { label: "Chapter 3 — Death Village (alone)", to: 'c3v3' },
      { label: "Chapter 3 — Death Village (with Max)", to: 'c3v4' },
      { label: 'Ending 1', to: 'ending1' },
      { label: 'Ending 2', to: 'ending2' },
      { label: 'Ending 3', to: 'ending3' },
      { label: 'Ending 4', to: 'ending4' },
      { label: 'Ending 5', to: 'ending5' },
      { label: 'Ending 6', to: 'ending6' },
      { label: 'Back to menu', to: 'menu' },
    ],
  },

  // ── Chapter 1: The Cave ──────────────────────────────────────────
  c1: {
    title: 'THE CAVE',
    beats: [
      "You wake to the sound of water dripping somewhere close. Rubbing your eyes, you try to make sense of it — you're in a vast cave system, and the only way out is through.",
      "You switch on your torch and start reading the walls. Ahead, the passage splits into three branches. Choose carefully.",
      "The first looks pitch dark — but a torch can only help so much. The second has a faint light pulling you toward it. The third looks slick and dangerous, the kind of path only the reckless take.",
    ],
    choices: [
      { label: 'Go toward the dark tunnel', to: 'c1_dark' },
      { label: 'Go toward the dim light', to: 'c1_dim' },
      { label: 'Go toward the slippery path', to: 'c1_slip' },
    ],
  },
  c1_dark: {
    beats: [
      "You start down the dark tunnel. A low growl rises around you. Then you see it — a huge shape, yellowed teeth, one enormous eye catching the torchlight.",
      "A cyclops. What do you do — run, or take your chances and fight?",
    ],
    choices: [
      { label: 'Run away', to: 'c1_dark_run' },
      { label: 'Fight', to: 'c1_dark_fight' },
    ],
  },
  c1_dark_fight: {
    beats: [
      'You steady your grip on the small knife and creep toward the monster.',
      "The blade sinks into its hand. It screams — then grabs you and slams you into the wall.",
      "Everything goes dark. You're dead.",
    ],
    next: 'death',
  },
  c1_dark_run: {
    beats: [
      "Fear takes over. Run, you tell yourself — and your legs listen before your brain catches up. When you finally stop, you've put real distance between yourself and it.",
      "You've run so far you're exhausted. You sit on a rock to catch your breath. The torch flickers — it's dying.",
      'Do you keep moving, or stay put?',
    ],
    choices: [
      { label: 'Keep walking', to: 'c1_dark_run_walk' },
      { label: 'Stay there', to: 'c1_dark_run_stay' },
    ],
  },
  c1_dark_run_walk: {
    beats: [
      "You search for the exit in a hurry, desperate to see the sun — the stone walls have started to feel like they're closing in. Then you find it.",
      'Daylight. It looks like heaven out there.',
    ],
    next: 'c2v2',
  },
  c1_dark_run_stay: {
    beats: [
      "You're too tired to move another inch. You shout for help.",
      '“Hey, I’m Max — let’s survive this together, shall we?” Someone shouts back and pulls you up. Together, you climb out of the cave.',
      'Daylight. It looks like heaven out there.',
    ],
    next: 'c2v1',
  },
  c1_dim: {
    beats: [
      '“Hey…” You move slowly toward the light and call out. Someone shouts back — there’s a monster, they need help. You run toward the voice.',
    ],
    choices: [
      { label: 'Help him', to: 'c1_dim_help' },
      { label: 'Hesitate', to: 'c1_dim_hesitate' },
    ],
  },
  c1_dim_help: {
    beats: [
      "You close the distance fast, knife out, and start swinging. Together you're strong enough to bring the thing down.",
      '“Thanks, mate,” he says, offering a hand. It’s easier with two. You catch his name — Max — and start walking together.',
    ],
    next: 'c1_supplies',
  },
  c1_dim_hesitate: {
    beats: [
      '“It’s scary,” you shout back. “That’s exactly why I need help,” he shouts. You’re frozen with fear.',
      '“Slam!” He swings his torch and catches the monster across the face. It bolts. “Scary, right?” he says, catching his breath.',
      'You catch his name — Max — and start walking together.',
    ],
    next: 'c1_supplies',
  },
  c1_supplies: {
    beats: ['“Should we find water first, or food?” Max asks.'],
    choices: [
      { label: 'Find water', to: 'c1_water' },
      { label: 'Find food', to: 'c1_food' },
    ],
  },
  c1_water: {
    beats: [
      '“Hey, look there,” Max says — a thin stream trickles down the rock. You follow it.',
      'It opens into a huge underground lake, waiting to be discovered. Exciting — but be careful.',
    ],
    choices: [
      { label: 'Jump in', to: 'c1_water_jump' },
      { label: 'Examine it first', to: 'c1_water_examine' },
    ],
  },
  c1_water_jump: {
    beats: [
      "Too excited to think it through, you jump in whooping and drink handfuls of water. Your stomach starts to turn — maybe something in the cave got into it.",
      "Your vision fades. You see Max reaching for the water too, try to warn him — but your voice gives out before the words do.",
    ],
    next: 'death',
  },
  c1_water_examine: {
    beats: [
      '“Stop,” Max says, moving in carefully — the water’s contaminated, don’t drink it.',
      'He pulls out a bottle, drops in some kind of yellow powder, does the same to yours. “Give it ten minutes.”',
      '“There’s a trail,” you say. “Let’s follow it,” Max agrees. On the way, he asks if you have a family out there. “Yes,” you say, thinking of them. “Yes, I do.”',
      'As you step out of the cave, you whisper, “Wait a little longer, my love,” and look up at the sun for the first time in what feels like forever.',
    ],
    next: 'c2v1',
  },
  c1_food: {
    beats: [
      '“I’m starving, let’s find food,” you say. Max agrees. You stroll the cave, drawn by a strange sound.',
    ],
    choices: [
      { label: "It's a bat cave. Attack", to: 'c1_food_attack' },
      { label: 'Bail out', to: 'c1_food_bail' },
    ],
  },
  c1_food_attack: {
    beats: ["The sound grows — a little sinister, honestly. Still want to go through with it?"],
    choices: [
      { label: 'Yes', to: 'c1_food_attack_yes' },
      { label: 'No', to: 'c1_food_attack_no' },
    ],
  },
  c1_food_attack_yes: {
    beats: [
      'The sound swells until every bat in the cave breaks loose at once, knocking you flat.',
      'The light fades. You catch a glimpse of Max running from the swarm — then it all goes dark.',
    ],
    next: 'death',
  },
  c1_food_attack_no: {
    beats: [
      'You back off slowly and tell Max about the noise. He agrees to push on instead. Your stomach growls, and Max holds up a handful of mushrooms — “These ones are edible.”',
      '“There’s a trail,” you say. “Let’s follow it,” Max agrees. On the way, he asks if you have a family out there. “Yes,” you say, thinking of them. “Yes, I do.”',
      'As you step out of the cave, you whisper, “Wait a little longer, my love,” and look up at the sun for the first time in what feels like forever.',
    ],
    next: 'c2v1',
  },
  c1_food_bail: {
    beats: [
      '“There’s a trail,” you say. “Let’s follow it,” Max agrees. On the way, he asks if you have a family out there. “Yes,” you say, thinking of them. “Yes, I do.”',
      'As you step out of the cave, you whisper, “Wait a little longer, my love,” and look up at the sun for the first time in what feels like forever.',
    ],
    next: 'c2v1',
  },
  c1_slip: {
    beats: [
      'The path is slick underfoot. This was a bad idea, you think, right before you fall through a hole in the floor.',
      "Yes — you're dead.",
    ],
    next: 'death',
  },

  // ── Chapter 2, variant 1: The Jungle (with Max) ─────────────────
  c2v1: {
    title: 'THE JUNGLE',
    beats: [
      'You scavenge what supplies you can and pack the food.',
      'The jungle stretches out ahead — it looks like a long way through. “Let’s get to high ground, see what we’re working with,” Max suggests.',
      'Max: “There’s a huge jungle ahead.” You: “There’s a lake to the east.” Max: “And a river down west.” Where do you go?',
    ],
    choices: [
      { label: 'Into the jungle', to: 'c2v1_jungle' },
      { label: 'To the lake', to: 'c2v1_lake' },
      { label: 'To the river', to: 'c2v1_river' },
    ],
  },
  c2v1_jungle: {
    beats: [
      "You and Max start down a narrow path. Max nudges you and points — some kind of creature, and it looks like it's in pain.",
      'Do you go toward it, or keep your distance?',
    ],
    choices: [
      { label: 'Go toward it', to: 'c2v1_jungle_approach' },
      { label: 'Keep away', to: 'c2v1_jungle_away' },
    ],
  },
  c2v1_jungle_approach: {
    beats: [
      '“Hey — I think it’s friendly,” Max says. “Let’s go over.” The creature cries out again.',
      '“That really sounds like it hurts,” you say. Should you offer it some of your food?',
    ],
    choices: [
      { label: 'Feed it', to: 'c2v1_jungle_feed' },
      { label: "Don't", to: 'c2v1_jungle_dont' },
    ],
  },
  c2v1_jungle_feed: {
    beats: [
      '“Here, this is for you,” Max says, and you carefully work a thorn free from its leg. Relief washes over it almost instantly.',
      '“He says thanks,” Max says. “I know a little monster language, apparently.” You smile — sounds like he wants to come with you.',
      'You, Max, and your new companion walk on together, deeper toward something far more dangerous.',
    ],
    next: 'c3v1',
  },
  c2v1_jungle_dont: {
    beats: [
      '“Hey, it’s a monster, get back—” but Max is already close. It grabs him and throws him. He’s dead.',
      "It turns on you next. You try to outrun it, but it's faster. One hit and your head is ringing, blood everywhere.",
      'Blood everywhere. Max is dead, and you…',
    ],
    next: 'death',
  },
  c2v1_jungle_away: {
    beats: [
      "You decide it's not worth the risk and keep your distance. Whatever it was, it doesn't follow.",
      '“Best not to go looking for trouble,” Max says. You both agree to steer clear of anything else that looks like it, and press on.',
    ],
    next: 'c3v4',
  },
  c2v1_lake: {
    beats: [
      'You and Max head for the lake, taken in by the flowers and undergrowth on the way.',
      "The water opens up ahead of you — huge, no far shore in sight.",
      '“What do you think?” Max says. “There’s a boat, but it looks broken.” “We could always swim,” he adds.',
    ],
    choices: [
      { label: 'Repair the boat', to: 'c2v1_lake_repair' },
      { label: 'Swim', to: 'c2v1_lake_swim' },
    ],
  },
  c2v1_lake_repair: {
    beats: [
      "You gather wood and whatever else you can find and get to work. Once it looks seaworthy, you both climb in.",
      '“There’s a hole in the boat!” Max shouts, mid-row. You have a second to decide.',
    ],
    choices: [
      { label: 'Bail water while Max rows', to: 'c2v1_lake_bucket' },
      { label: 'Row faster for shore', to: 'c2v1_lake_faster' },
    ],
  },
  c2v1_lake_bucket: {
    beats: [
      'You bail as fast as your hands will move while Max fights toward the shore.',
      '“There’s a village, past that mountain — see the smoke?” you shout, pointing. You start moving toward it.',
      '“I want to see my little girl,” you smile. “It feels so close now.”',
    ],
    next: 'c3v4',
  },
  c2v1_lake_faster: {
    beats: [
      "You both paddle harder. “Faster!” he shouts — but the water's rising faster than you can outrun it.",
      "The boat goes under. You're both shouting, sinking, and then everything is white noise, and then it's black.",
    ],
    next: 'death',
  },
  c2v1_lake_swim: {
    beats: [
      '“Let’s just swim,” you say, and go in. Half an hour later, you realize that was a mistake.',
      "Your body is freezing — hypothermia, but you keep swimming anyway.",
      "You make it to the other side, but you're in bad shape. Max tries to warm you up, but…",
      "It's getting dark.",
    ],
    next: 'death',
  },
  c2v1_river: {
    beats: [
      "You climb down out of the cave mouth and head for the river. The path is strange — thick with vines all leading toward water.",
      "The river isn't far. Before long you're standing on the bank.",
      'Do you swim across, or build a boat?',
    ],
    choices: [
      { label: 'Swim', to: 'c2v1_river_swim' },
      { label: 'Build a boat', to: 'c2v1_river_boat' },
    ],
  },
  c2v1_river_swim: {
    beats: [
      "Without thinking it through, you dive in. The current is much faster than it looked.",
      'It slams you into one rock after another.',
    ],
    next: 'death',
  },
  c2v1_river_boat: {
    beats: [
      "You gather wood and supplies and build something that floats. Once you're sure it's sound, you climb aboard.",
      'Rowing starts out fine — then a hard current catches you.',
      '“Go with it, or fight it?” Max asks.',
    ],
    choices: [
      { label: 'Go with the flow', to: 'c2v1_river_flow' },
      { label: 'Fight the current', to: 'c2v1_river_against' },
    ],
  },
  c2v1_river_flow: {
    beats: [
      'You angle the boat with the current instead of against it. “You’ve got it!” Max shouts as the river does the work.',
      '“There’s a village — I can see it,” you say, and steer for the bank.',
      "It's close. You can feel it.",
    ],
    next: 'c3v4',
  },
  c2v1_river_against: {
    beats: [
      'You decide to fight the current. The boat lurches, straining against water that’s simply too fast.',
      'It starts to come apart under you.',
      'Max screams as he’s thrown clear — and then the river takes you too.',
      "It's dark.",
    ],
    next: 'death',
  },

  // ── Chapter 2, variant 2: The Jungle (alone) ────────────────────
  c2v2: {
    title: 'THE JUNGLE',
    beats: [
      'You scavenge what supplies you can and pack the food.',
      'The jungle stretches out ahead — it looks like a long way through. Better to get to high ground first and see what you’re working with.',
      'A huge jungle ahead. A lake to the east. A river down west. Where do you go?',
    ],
    choices: [
      { label: 'Into the jungle', to: 'c2v2_jungle' },
      { label: 'To the lake', to: 'c2v2_lake' },
      { label: 'To the river', to: 'c2v2_river' },
    ],
  },
  c2v2_jungle: {
    beats: [
      "You start down a narrow path and spot something moving fast toward you — it looks like it's hunting.",
      'Fight, or run?',
    ],
    choices: [
      { label: 'Fight', to: 'c2v2_jungle_fight' },
      { label: 'Run', to: 'c2v2_jungle_run' },
    ],
  },
  c2v2_jungle_fight: {
    beats: [
      'You plant your feet, knife ready. It swings first.',
      "You dodge and drive the blade into its arm — again, and again — until it's screaming.",
      "It gives up, begging for mercy. It says — somehow — that it'll follow you now.",
    ],
    choices: [
      { label: 'Let it come with you', to: 'c2v2_jungle_befriend' },
      { label: 'Kill it', to: 'c2v2_jungle_kill' },
    ],
  },
  c2v2_jungle_befriend: {
    beats: [
      'You lower the knife and start walking. It follows quietly at your heels.',
      'Smoke, far ahead. You start toward it.',
    ],
    next: 'c3v2',
  },
  c2v2_jungle_kill: {
    beats: [
      "One motion and it's over. You've won.",
      '“Let’s go,” you tell yourself, and start toward the smoke rising against the sky a little further on.',
    ],
    next: 'c3v3',
  },
  c2v2_jungle_run: {
    beats: [
      "Your heart is going faster than seems possible. It's fast — too fast.",
      'It catches you. One hit and your head is ringing, blood everywhere.',
      'Blood everywhere, and you…',
    ],
    next: 'death',
  },
  c2v2_lake: {
    beats: [
      'You head for the lake, taken in by the flowers and undergrowth on the way.',
      "The water opens up ahead of you — huge, no far shore in sight.",
      '“What now?” you murmur. There’s a boat, broken-looking — or you could just walk the shoreline.',
    ],
    choices: [
      { label: 'Repair the boat', to: 'c2v2_lake_repair' },
      { label: 'Walk around', to: 'c2v2_lake_walk' },
    ],
  },
  c2v2_lake_repair: {
    beats: [
      "You gather wood and get to work. Once it looks seaworthy, you climb in.",
      'Rowing goes fine, right up until you spot a hole letting water in — but the repairs hold, and it carries you to the far shore.',
      'Smoke rises in the distance. Seems worth investigating.',
    ],
    next: 'c3v3',
  },
  c2v2_lake_walk: {
    beats: [
      "You follow the shoreline instead. Generous water, generous land — it feeds you along the way.",
      "A cry of pain nearby. Something's hurt.",
      '“That sounds bad,” you say to yourself. Feed it some of what you’ve collected?',
    ],
    choices: [
      { label: 'Feed it', to: 'c2v2_lake_walk_feed' },
      { label: "Don't", to: 'c2v2_lake_walk_dont' },
    ],
  },
  c2v2_lake_walk_feed: {
    beats: [
      '“Here, this is for you,” you say, working a thorn loose from its leg. It settles almost at once.',
      "It thanks you, somehow — and you find yourself smiling, telling it it's welcome to come along.",
      'You and your new companion walk on together, deeper toward something far more dangerous.',
    ],
    next: 'c3v2',
  },
  c2v2_lake_walk_dont: {
    beats: [
      "It turns toward you instead. You try to outrun it, but it's faster — one hit and your head is ringing, blood everywhere.",
      'Blood everywhere, and you…',
    ],
    next: 'death',
  },
  c2v2_river: {
    beats: [
      "You climb down and head for the river. The path is strange, thick with vines all leading toward water.",
      "The river isn't far. Before long you're on the bank.",
      'Swim, or build a boat?',
    ],
    choices: [
      { label: 'Swim', to: 'c2v2_river_swim' },
      { label: 'Build a boat', to: 'c2v2_river_boat' },
    ],
  },
  c2v2_river_swim: {
    beats: [
      "Without thinking it through, you dive in. The current is faster than it looked.",
      'It slams you into rock after rock.',
    ],
    next: 'death',
  },
  c2v2_river_boat: {
    beats: [
      "You gather wood and build something that floats. Once you trust it, you climb aboard.",
      'A hard current catches you almost immediately.',
      'Go with it, or fight it?',
    ],
    choices: [
      { label: 'Go with the flow', to: 'c2v2_river_flow' },
      { label: 'Fight the current', to: 'c2v2_river_against' },
    ],
  },
  c2v2_river_flow: {
    beats: [
      'You let the current carry the boat instead of fighting it, gripping the paddle hard to hold your line.',
      '“There’s a village — I see it,” you say, and steer for the bank.',
      "It's close. You can feel it.",
    ],
    next: 'c3v3',
  },
  c2v2_river_against: {
    beats: [
      'You fight the current. The boat lurches, straining against water too fast to argue with.',
      'It starts to break apart beneath you.',
      'You scream as you’re thrown clear, and the river takes you too.',
      "It's dark.",
    ],
    next: 'death',
  },

  // ── Chapter 3, variant 1: Death Village (Max + companion) ───────
  c3v1: {
    title: 'DEATH VILLAGE',
    beats: [
      "You've been walking a long while now. The village comes into view — blue fire torches ringing its edge.",
      "You're excited despite yourself. What now?",
    ],
    choices: [
      { label: 'Run for the village', to: 'c3v1_run' },
      { label: 'Sit and wait', to: 'c3v1_quiet' },
      { label: 'Talk it over with Max', to: 'c3v1_discuss' },
    ],
  },
  c3v1_captured: {
    beats: [
      'The sight of a real village is too much — you break into a run straight for it.',
      "Something falls behind you. You turn — your companion, down, and Max with his hands already raised.",
      "You raise yours too. Both of you are marched to a cage. You're captured.",
      '“This is our chance,” Max whispers, once the villagers file off toward a large house. “Let’s run.”',
    ],
    choices: [
      { label: 'Run for it', to: 'c3v1_captured_run' },
      { label: 'Stay in the cage', to: 'c3v1_captured_stay' },
    ],
  },
  c3v1_run: { beats: [], next: 'c3v1_captured' },
  c3v1_captured_run: {
    beats: [
      '“Let’s run,” you say, breaking the cage door. Max grabs a map from one of the huts on the way and you move fast, staying low.',
      "Near the village edge you grab your companion's horn as a keepsake and keep running. Eventually, exhausted, you both stop to rest under a tree.",
    ],
    next: 'ending1',
  },
  c3v1_captured_stay: {
    beats: [
      'You clench your fists and start shouting. Max tries to calm you down. The villagers come back out.',
      "They look furious — maybe it's the creature you brought with you. They blindfold you both and march you to a cliff edge.",
      'Blindfolded, you feel the ground fall away.',
    ],
    next: 'death',
  },
  c3v1_quiet: {
    beats: [
      "You're thrown by the blue flames. You glance at Max — he points out your companion, trembling with fear.",
      'Go to it, or ask Max what to do?',
    ],
    choices: [
      { label: 'Go to it', to: 'c3v1_quiet_go' },
      { label: 'Ask Max', to: 'c3v1_quiet_ask' },
    ],
  },
  c3v1_quiet_go: { beats: [], next: 'c3v1_captured' },
  c3v1_quiet_ask: {
    beats: [
      'You ask Max what to do. He suggests your companion hides here while you two head into the village. You agree.',
      'You start toward the village — and the villagers attack on sight.',
      'Fight, or run?',
    ],
    choices: [
      { label: 'Fight back', to: 'c3v1_attacked_fight' },
      { label: 'Run', to: 'c3v1_attacked_run' },
    ],
  },
  c3v1_attacked_fight: {
    beats: [
      "You draw your knife, Max arms himself too. The villagers are strong, and there are too many.",
      'One of them cuts Max down. Your companion charges in to help — but a dart finds you first, and the light goes with it.',
    ],
    next: 'death',
  },
  c3v1_attacked_run: {
    beats: [
      '“Too many of them,” you say, and you and Max break into a run. You pass your companion on the way out.',
      "It's holding the line against the villagers. “He’s buying us time,” Max says. “Just run.”",
      "You make it out. Your companion doesn't follow.",
    ],
    next: 'ending1',
  },
  c3v1_discuss: {
    beats: ['You ask your companion and Max what to do. “This village is dangerous,” your companion warns.'],
    choices: [
      { label: 'Go in', to: 'c3v1_discuss_go' },
      { label: 'Wait and watch', to: 'c3v1_discuss_wait' },
      { label: 'Ask Max', to: 'c3v1_discuss_ask' },
    ],
  },
  c3v1_discuss_go: { beats: [], next: 'c3v1_captured' },
  c3v1_discuss_wait: {
    beats: [
      'Your companion stays hidden while you and Max walk in together. The villagers are wary but let you approach.',
      '“Where are you headed?” the chief asks. “We’re lost,” you say. “We’re trying to reach Euphoria.”',
      'He hands you a map, and offers an escort for the road ahead. You thank him but decline — you’d rather go on with Max.',
      'You leave the village. A little further down the road, your companion rejoins you.',
    ],
    next: 'ending2',
  },
  c3v1_discuss_ask: { beats: [], next: 'c3v1_quiet_ask' },

  // ── Chapter 3, variant 2: Death Village (alone + companion) ─────
  c3v2: {
    title: 'DEATH VILLAGE',
    beats: [
      "You've been walking a long while now. The village comes into view — blue fire torches ringing its edge.",
      "You're excited despite yourself. What now?",
    ],
    choices: [
      { label: 'Run for the village', to: 'c3v2_run' },
      { label: 'Sit and wait', to: 'c3v2_quiet' },
      { label: 'Talk it over with your companion', to: 'c3v2_discuss' },
    ],
  },
  c3v2_captured: {
    beats: [
      'The sight of a real village is too much — you break into a run straight for it.',
      "Something falls behind you. You turn — your companion, down, and you're already surrounded.",
      "You raise your hands. You're marched to a cage. You're captured.",
      '“This is our chance,” you tell yourself, once the villagers file off toward a large house. “Let’s run.”',
    ],
    choices: [
      { label: 'Run for it', to: 'c3v2_captured_run' },
      { label: 'Stay in the cage', to: 'c3v2_captured_stay' },
    ],
  },
  c3v2_run: { beats: [], next: 'c3v2_captured' },
  c3v2_captured_run: {
    beats: [
      '“Let’s run,” you say, breaking the cage door. You grab a map from one of the huts on the way and move fast, staying low.',
      "Near the village edge you grab your companion's horn as a keepsake and keep running. Eventually, exhausted, you stop to rest under a tree.",
    ],
    next: 'ending3',
  },
  c3v2_captured_stay: {
    beats: [
      'You clench your fists and shout, trying to calm yourself down. The villagers come back out.',
      "They look furious — maybe it's the creature you brought with you. They blindfold you and march you to a cliff edge.",
      'Blindfolded, you feel the ground fall away.',
    ],
    next: 'death',
  },
  c3v2_quiet: {
    beats: [
      "You're thrown by the blue flames. You glance over — your companion, trembling with fear.",
      'Go to it, or think it through first?',
    ],
    choices: [
      { label: 'Go to it', to: 'c3v2_quiet_go' },
      { label: 'Think it over', to: 'c3v2_quiet_ask' },
    ],
  },
  c3v2_quiet_go: { beats: [], next: 'c3v2_captured' },
  c3v2_quiet_ask: {
    beats: [
      'You decide your companion should hide here while you head into the village alone.',
      'You start toward the village — and the villagers attack on sight.',
      'Fight, or run?',
    ],
    choices: [
      { label: 'Fight back', to: 'c3v2_attacked_fight' },
      { label: 'Run', to: 'c3v2_attacked_run' },
    ],
  },
  c3v2_attacked_fight: {
    beats: [
      'You draw your knife. The villagers are strong, and there are too many. One of them cuts you.',
      'Your companion charges in to help — but a dart finds you first, and the light goes with it.',
      'The last thing you see is your companion tearing through them. Then nothing.',
    ],
    next: 'death',
  },
  c3v2_attacked_run: {
    beats: [
      '“Too many of them,” you say, and break into a run, passing your companion on the way out.',
      "It's holding the line against the villagers. “He’s buying you time,” you think. “Just run.”",
      "You make it out. Your companion doesn't follow.",
    ],
    next: 'ending3',
  },
  c3v2_discuss: {
    beats: ['You ask your companion what to do. “This village is dangerous,” it warns.'],
    choices: [
      { label: 'Go in', to: 'c3v2_discuss_go' },
      { label: 'Wait and watch', to: 'c3v2_discuss_wait' },
    ],
  },
  c3v2_discuss_go: { beats: [], next: 'c3v2_captured' },
  c3v2_discuss_wait: {
    beats: [
      'Your companion stays hidden while you walk in alone. The villagers are wary but let you approach.',
      '“Where are you headed?” the chief asks. “I’m lost,” you say. “I’m trying to reach Euphoria.”',
      'He hands you a map, and offers an escort. You thank him but decline — you’d rather finish this alone.',
      'You leave the village. A little further down the road, your companion rejoins you.',
    ],
    next: 'ending4',
  },

  // ── Chapter 3, variant 3: Death Village (alone) ─────────────────
  c3v3: {
    title: 'DEATH VILLAGE',
    beats: [
      "You've been walking a long while now. The village comes into view — blue fire torches ringing its edge.",
      "You're excited despite yourself. What now?",
    ],
    choices: [
      { label: 'Ask for help', to: 'c3v3_help' },
      { label: 'Go straight in', to: 'c3v3_inside' },
    ],
  },
  c3v3_help: {
    beats: [
      "You're weak and worn thin from the hike. You look around for someone, anyone.",
      'A man approaches as your vision starts to swim.',
      "You try to ask for a map, but he doesn't follow. Your stomach growls too.",
    ],
    choices: [
      { label: 'Signal for a map', to: 'c3v3_help_map' },
      { label: 'Signal for food', to: 'c3v3_help_food' },
    ],
  },
  c3v3_help_map: {
    beats: [
      "He brings you to his leader, who feeds you and asks where you're from.",
      '“I want to reach Euphoria,” you say. He offers you an escort — help sounds like a good idea right about now.',
    ],
    next: 'ending5',
  },
  c3v3_help_food: {
    beats: [
      'He takes you in and feeds you. You stay two days.',
      "When you're ready to leave, he sends you off with food and a fresh set of tools.",
      'You wave goodbye and set off alone.',
    ],
    next: 'ending3',
  },
  c3v3_inside: {
    beats: [
      'You come in loud, shouting. The villagers, startled, reach for their weapons.',
      'Fight, or put your hands up?',
    ],
    choices: [
      { label: 'Draw a weapon', to: 'c3v3_inside_fight' },
      { label: 'Surrender', to: 'c3v3_inside_surrender' },
    ],
  },
  c3v3_inside_fight: {
    beats: [
      "You draw and stand your ground — but there are more than a dozen of them, and you're worn out from the road.",
      "It doesn't last a minute.",
    ],
    next: 'death',
  },
  c3v3_inside_surrender: {
    beats: [
      'You raise your hands. The villagers seem to settle — until, just as you start to speak, one of them stabs your arm.',
      'You cry out. They patch you up, then bring you to the village chief.',
      '“Where are you headed?” he asks. “I’m lost,” you say. “I’m trying to reach Euphoria.”',
      'He hands you a map and offers an escort — surprisingly generous, given the circumstances. With help and protection, you start the journey home.',
    ],
    next: 'ending5',
  },

  // ── Chapter 3, variant 4: Death Village (with Max) ──────────────
  c3v4: {
    title: 'DEATH VILLAGE',
    beats: [
      "You've both been walking a long while now. The village comes into view — blue fire torches ringing its edge.",
      "You're excited despite yourself. What now?",
    ],
    choices: [
      { label: 'Ask for help', to: 'c3v4_help' },
      { label: 'Go straight in', to: 'c3v4_inside' },
    ],
  },
  c3v4_help: {
    beats: [
      "You're weak and worn thin from the hike. “What should we do?” you ask Max, vision starting to blur.",
      'A man approaches.',
      "You try to ask for a map, but he doesn't follow. Your stomach growls too.",
    ],
    choices: [
      { label: 'Signal for a map', to: 'c3v4_help_map' },
      { label: 'Signal for food', to: 'c3v4_help_food' },
    ],
  },
  c3v4_help_map: {
    beats: [
      "He brings you both to his leader, who feeds you and asks where you're from.",
      '“We want to reach Euphoria,” you say. He offers you and Max an escort — help sounds like a good idea right about now.',
    ],
    next: 'ending6',
  },
  c3v4_help_food: {
    beats: [
      'He takes you both in and feeds you. You stay two days.',
      "When you're ready to leave, he sends you off with food and a fresh set of tools.",
      'You wave goodbye and set off together.',
    ],
    next: 'ending1',
  },
  c3v4_inside: {
    beats: [
      'You come in loud, shouting. The villagers, startled, reach for their weapons. You glance back — Max is calm, trying to signal you something.',
      'Fight, or put your hands up?',
    ],
    choices: [
      { label: 'Draw a weapon', to: 'c3v4_inside_fight' },
      { label: 'Surrender', to: 'c3v4_inside_surrender' },
    ],
  },
  c3v4_inside_fight: {
    beats: [
      "You draw and stand your ground — but there are more than a dozen of them, and the road has worn you thin.",
      'As the fighting starts you see Max surrendering outright. Too late, you realize he had the right idea.',
    ],
    next: 'death',
  },
  c3v4_inside_surrender: {
    beats: [
      'You raise your hands. The villagers seem to settle — until, just as you start to speak, one of them stabs your arm.',
      'You cry out. They patch you up, then bring you both to the village chief, where Max is already waiting.',
      '“Where are you headed?” he asks. “We’re lost,” you say. “We’re trying to reach Euphoria.”',
      'He hands you a map and offers an escort — surprisingly generous, given the circumstances. With help and protection, you start the journey home.',
    ],
    next: 'ending6',
  },

  // ── Endings ──────────────────────────────────────────────────────
  ending1: {
    title: 'ENDING',
    beats: [
      "You and Max ran for the trees — two people who trust each other more now than ever, after the mountain, the river, all of it.",
      "You've reached your hometown. Max is married now, two kids running circles around him.",
      'Isn’t this what a good life looks like — the people you love, close by?',
    ],
    next: 'happy',
  },
  ending2: {
    title: 'ENDING',
    beats: [
      'You, your companion, and Max ran for the trees together — closer now than you’ve ever been, after the mountain, the river, all of it.',
      "You've reached your hometown. Max is married now, two kids running circles — one of them climbing your companion's back like a jungle gym.",
      'It helps out with the chores these days. A strange little family, in a good way.',
      'Isn’t this what a good life looks like?',
    ],
    next: 'happy',
  },
  ending3: {
    title: 'ENDING',
    beats: [
      'Alone and careful, you pick your way past every obstacle on the road to Euphoria, and somehow, you find something like happiness in it.',
      'When the city finally comes into view, you run — straight for the person you love. Tears before words.',
      '“I’m just happy you’re alive,” she says. There’s nothing like finally coming home.',
    ],
    next: 'happy',
  },
  ending4: {
    title: 'ENDING',
    beats: [
      "You and your faithful companion outlast every obstacle the road throws at you — the mountains, the rivers, none of it was ever a match.",
      'The city comes into view. “I’m coming, my love,” you say, and run for it, your companion at your side.',
    ],
    next: 'happy',
  },
  ending5: {
    title: 'ENDING',
    beats: [
      "The escort sent by the village chief walks you within sight of the city, then bids you farewell.",
      "You head for Euphoria. It's been a long time since you've seen your daughter. You quicken your pace.",
    ],
    next: 'happy',
  },
  ending6: {
    title: 'ENDING',
    beats: [
      "You and Max are led by the chief's companions, learning more about this place than you expected. Three days later, they leave you near Euphoria's gates.",
      'A year on. Max is married, a small child asleep in his arms.',
      'You look toward the person you love. She’s as beautiful as you remember. Euphoria, it turns out, is exactly what its name promises.',
    ],
    next: 'happy',
  },

  // ── Shared terminal screens ──────────────────────────────────────
  death: {
    title: 'YOU DIED',
    beats: [],
    choices: [
      { label: 'Main menu', to: 'menu' },
      { label: 'Chapters', to: 'chapters' },
      { label: 'Exit', to: 'exit' },
    ],
  },
  happy: {
    title: 'THE END',
    beats: [
      "You've reached the end of this particular road. But this isn't really the end — there are six different endings out there, and a whole tangle of paths to find them.",
    ],
    choices: [
      { label: 'Main menu', to: 'menu' },
      { label: 'Chapters', to: 'chapters' },
      { label: 'Exit', to: 'exit' },
    ],
  },
}
