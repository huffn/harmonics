const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());
app.use(session({
    secret: 'your-secret-key', // Change this in production!
    resave: false,
    saveUninitialized: true
}));

// --- Utility Functions ---

function cleanWord(w) {
    // Remove accents/diacritics and convert to uppercase
    return w.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function loadDictionary(lang, fallbackList) {
    const localFile = path.join(__dirname, `words_${lang}.txt`);
    let words = new Set();
    if (fs.existsSync(localFile)) {
        const lines = fs.readFileSync(localFile, 'utf-8').split('\n');
        for (let line of lines) {
            const w = cleanWord(line.trim());
            if (w.length === 5) words.add(w);
        }
        console.log(`[${lang.toUpperCase()}] Loaded ${words.size} words from local file.`);
        return words;
    }
    console.log(`[${lang.toUpperCase()}] Loaded fallback dictionary.`);
    return new Set(fallbackList.map(cleanWord).filter(w => w.length === 5));
}

function wordToWave(word) {
    return word.toUpperCase().split('').map(char => char.charCodeAt(0) - 'A'.charCodeAt(0) + 1);
}

function calcSimilarity(targetWave, guessWave) {
    if (!targetWave || !guessWave) return 0;
    let totalDiff = 0;
    for (let i = 0; i < targetWave.length; i++) {
        totalDiff += Math.abs(targetWave[i] - guessWave[i]);
    }
    let matchPct = 100 - ((totalDiff / 125.0) * 100);
    return Math.max(0, Math.min(100, Math.floor(matchPct)));
}

// --- Dictionary Setup (Example) ---

// Replace with your actual fallback word lists
const PUZZLE_WORDS_EN = ['CYCLE', 'MUSIC', 'SOUND'];

const DICTIONARIES = {
    en: loadDictionary('en', PUZZLE_WORDS_EN),
};

// --- HTML Templates (Replace with actual HTML or use a template engine) ---

const HTML_TEMPLATE = fs.readFileSync(path.join(__dirname, 'html_template.html'), 'utf-8');

// --- Routes ---

app.get('/', (req, res) => {
    res.send(HTML_TEMPLATE);
});

app.post('/api/guess', (req, res) => {
    const data = req.body;
    const lang = data.lang || 'en';
    const guess = cleanWord(data.word || '');

    if (guess.length !== 5) {
        return res.status(400).json({ error: "Word must be 5 letters." });
    }
    if (!DICTIONARIES[lang] || !DICTIONARIES[lang].has(guess)) {
        return res.status(400).json({ error: "Not in word list!" });
    }

  const sessionKey = `target_word_${lang}`;
  const sessionPosition = `position_${lang}`;
    if (!req.session[sessionKey]) {
        const words = Array.from(DICTIONARIES[lang]);
      req.session[sessionKey] = PUZZLE_WORDS_EN[0];
      req.session[sessionPosition] = 0;
    }

    const currentTarget = req.session[sessionKey];
    const guessWave = wordToWave(guess);
    const targetWave = wordToWave(currentTarget);

    let upperBound = [];
    let lowerBound = [];
    for (let i = 0; i < guessWave.length; i++) {
        const diff = Math.abs(targetWave[i] - guessWave[i]);
        upperBound.push(guessWave[i] + diff);
        lowerBound.push(guessWave[i] - diff);
    }

    const isCorrect = (guess === currentTarget);
    let similarity = calcSimilarity(targetWave, guessWave);
    if (isCorrect) similarity = 100;

    res.json({
        wave: guessWave,
        upper_bound: upperBound,
        lower_bound: lowerBound,
        is_correct: isCorrect,
        similarity: similarity,
        target_word: currentTarget,
        target_wave: targetWave
    });
});

app.post('/api/reset', (req, res) => {
    const data = req.body || {};
  const lang = data.lang || 'en';
  const sessionKey = `target_word_${lang}`;
  const sessionPosition = `position_${lang}`;
  let position = (req.session[sessionPosition] || 0) + 1;
  if (position >= PUZZLE_WORDS_EN.length) {
    position = 0;
  }
  req.session[sessionPosition] = position;

    const words = Array.from(DICTIONARIES[lang]);
    req.session[sessionKey] = PUZZLE_WORDS_EN[position];
    console.log(`[${lang.toUpperCase()}] Cheat: New target word is: ${req.session[sessionKey]}`);
    res.json({ status: "reset" });
});

// --- Start Server ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
