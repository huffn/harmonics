type ColumnDataTypes = {
  letters: string[];
  initialPosition: number;
};

type DifficultyTypes = {
  goalWords: string[];
  potentialWords?: string[];
  ColumnData: ColumnDataTypes[];
};

interface LettersDataType {
  [key: string]: any;
  EASY: DifficultyTypes;
  MEDIUM: DifficultyTypes;
  HARD: DifficultyTypes;
}

const RAW: LettersDataType = {
  EASY: {
    goalWords: ["AERO", "BLOW", "GALE", "MIST"],
    potentialWords: [
      "AIRT",
      "ALOE",
      "ALOW",
      "ALSO",
      "BALE",
      "BARE",
      "BASE",
      "BAST",
      "BELT",
      "BEST",
      "BILE",
      "BISE",
      "BLOT",
      "GAST",
      "GELT",
      "GEST",
      "GILT",
      "GIRO",
      "GIRT",
      "GIST",
      "GLOW",
      "MALE",
      "MALT",
      "MARE",
      "MART",
      "MAST",
      "MELT",
      "MEOW",
      "MERE",
      "MILE",
      "MILO",
      "MILT",
      "MIRE",
      "MISE",
      "MISO",
    ],
    ColumnData: [
      {
        letters: ["A", "B", "G", "M"],
        initialPosition: 1,
      },
      {
        letters: ["A", "E", "I", "L"],
        initialPosition: 0,
      },
      {
        letters: ["L", "O", "R", "S"],
        initialPosition: 1,
      },
      {
        letters: ["E", "O", "T", "W"],
        initialPosition: 1,
      },
    ],
  },
  MEDIUM: {
    goalWords: ["CLOUD", "GUSTS", "SKIES", "STORM"],
    potentialWords: [
      "CLOTS",
      "SKIED",
      "SKITS",
      "SLITS",
      "SLOES",
      "SLOTS",
      "STIED",
      "STIES",
      "STIRS",
      "SUITS",
      ],
    ColumnData: [
      {
        letters: ["C", "G", "S"],
        initialPosition: 1,
      },
      {
        letters: ["K", "L", "T", "U"],
        initialPosition: 2,
      },
      {
        letters: ["I", "O", "S"],
        initialPosition: 1,
      },
      {
        letters: ["E", "R", "T", "U"],
        initialPosition: 2,
      },
      {
        letters: ["D", "M", "S"],
        initialPosition: 1,
      },
    ],
  },
  HARD: {
    goalWords: [
      "BREATH",
      "BREEZE",
      "SQUALL",
      "ZEPHYR",
    ],
    potentialWords: [
    ],
    ColumnData: [
      {
        letters: ["B", "S", "Z"],
        initialPosition: 2,
      },
      {
        letters: ["E", "Q", "R"],
        initialPosition: 1,
      },
      {
        letters: ["E", "P", "U"],
        initialPosition: 2,
      },
      {
        letters: ["A", "E", "H"],
        initialPosition: 0,
      },
      {
        letters: ["L", "T", "Y", "Z"],
        initialPosition: 1,
      },
      {
        letters: ["E", "H", "L", "R"],
        initialPosition: 2,
      },
    ],
  },
};


export type LevelId = 'EASY' | 'MEDIUM' | 'HARD'
export type Level = {
  goalWords: string[]
  potentialWords: string[]
  columns: { letters: string[]; initialPosition: number }[]
}

export const LEVEL_ORDER: LevelId[] = ['EASY', 'MEDIUM', 'HARD']
export const LEVEL_LABELS: Record<LevelId, string> = { EASY: '1st Level', MEDIUM: '2nd Level', HARD: '3rd Level' }

const toLevel = (d: DifficultyTypes): Level => ({
  goalWords: d.goalWords,
  potentialWords: d.potentialWords ?? [],
  columns: d.ColumnData
})

export const LEVELS: Record<LevelId, Level> = {
  EASY: toLevel(RAW.EASY),
  MEDIUM: toLevel(RAW.MEDIUM),
  HARD: toLevel(RAW.HARD)
}
