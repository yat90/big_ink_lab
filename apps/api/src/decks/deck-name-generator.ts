/**
 * Generates a random Lorcana-themed deck name (e.g. "Mickey steals the Lore").
 */
export function generateLorcanaDeckName(): string {
  const characters = [
    'Mickey',
    'Goofy',
    'Donald',
    'Stitch',
    'Elsa',
    'Ursula',
    'Simba',
    'Moana',
    'Hades',
    'Genie',
    'Aladdin',
    'Scar',
  ];
  const actions = [
    'steals',
    'breaks',
    'taxes',
    'quests',
    'misplays',
    'topdecks',
    'controls',
    'sings',
    'summons',
    'ruins',
  ];
  const objects = [
    'the Lore',
    'your turn',
    'the meta',
    'my deck',
    'the ink economy',
    'the matchup',
    'the RNG',
    'your strategy',
    'the topdeck',
    'the table',
  ];
  const formats = [
    (c: string, a: string, o: string) => `${c} ${a} ${o}`,
    (c: string, a: string, o: string) => `${c}'s ${o}`,
    (c: string, a: string, o: string) => `${o} but it's ${c}`,
    (c: string, a: string, o: string) => `${c} and the ${o}`,
    (c: string, a: string, _o: string) => `${c} ${a} again`,
  ];
  const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const character = rand(characters);
  const action = rand(actions);
  const object = rand(objects);
  const format = rand(formats);
  return format(character, action, object);
}
