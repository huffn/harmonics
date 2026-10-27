// GM: edit this file to write the real riddles.
//  - `prompt` is the text the party sees; line breaks show as written.
//  - `answers` lists every accepted answer (put synonyms as separate entries).
//    Matching ignores case, accents, punctuation and a leading "a/an/the", and
//    forgives small typos in longer answers (5-8 letters: 1 typo, 9+: 2 typos).
//    Anything else close enough: press Alt+Shift+N to accept it.
//  - Keep the riddles in the order the party should solve them.

export type Riddle = { prompt: string; answers: string[] }

export const RIDDLES: Riddle[] = [
	{
		prompt: `I change the shape of every truth I touch,
Yet truth itself remains unaltered.
Heroes and villains both claim me as ally.
What am I?`,
		answers: [
			'perception', 'perceptions', 'perspective', 'perspectives', 'point of view',
			'viewpoint', 'interpretation', 'outlook', 'impression', 'bias', 'spin'
		]
	},
	{
		prompt: `I am neither recollection nor sight,
Yet I am born from both.
I glimpse what the world has not yet become.
What am I?`,
		answers: [
			'vision', 'visions', 'foresight', 'premonition', 'prophecy', 'prediction',
			'imagination', 'dream', 'dreams', 'insight', 'foretelling', 'precognition'
		]
	},
	{
		prompt: `I can bring tears to your eyes, resurrect the dead,
make you smile, and reverse time.
I form in an instant but I last a lifetime.
What am I?`,
		answers: [
			'memory', 'memories', 'recollection', 'recollections', 'remembrance',
			'reminiscence', 'nostalgia', 'the past', 'past'
		]
	}
]

export const SOLVED_TEXT = 'The memory is restored.'
