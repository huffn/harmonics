// GM: edit this file to write the real riddles.
//  - `prompt` is the text the party sees. Replace each "TODO(GM): ..." placeholder.
//  - `answers` lists every accepted answer (put synonyms as separate entries).
//    Matching ignores case, accents, punctuation and a leading "a/an/the", and
//    forgives small typos in longer answers (5-8 letters: 1 typo, 9+: 2 typos).
//  - Keep exactly three riddles, in the order the party should solve them.
// The placeholder answers below are throwaway; replace them too.

export type Riddle = { prompt: string; answers: string[] }

export const RIDDLES: Riddle[] = [
	{ prompt: 'TODO(GM): write riddle 1 here.', answers: ['placeholder one'] },
	{ prompt: 'TODO(GM): write riddle 2 here.', answers: ['placeholder two'] },
	{ prompt: 'TODO(GM): write riddle 3 here.', answers: ['placeholder three'] }
]

export const SOLVED_TEXT = 'The memory is restored.'
