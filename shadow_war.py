from flask import Flask, render_template_string, jsonify, request
import urllib.request
import unicodedata
import random
import os

app = Flask(__name__)

# --- MULTILINGUAL DICTIONARY SETUP ---
def clean_word(w):
    w = unicodedata.normalize('NFKD', w).encode('ASCII', 'ignore').decode('utf-8')
    return w.upper()

def load_dictionary(lang, url, fallback_list):
    local_file = f"words_{lang}.txt"
    words = set()
    if os.path.exists(local_file):
        with open(local_file, 'r', encoding='utf-8') as f:
            for line in f:
                w = clean_word(line.strip())
                if len(w) == 5: words.add(w)
        print(f"[{lang.upper()}] Loaded {len(words)} words from local file.")
        return words
    print(f"[{lang.upper()}] Loaded fallback dictionary.")
    return {clean_word(w) for w in fallback_list if len(clean_word(w)) == 5}

print("Loading dictionaries...")
DICTIONARIES = {
    "en": load_dictionary("en", None, ["CRANE", "FLASK", "GHOST", "BRAIN", "SMART", "PLANT", "WATER", "AUDIO", "REACT"]),
    "es": load_dictionary("es", None, ["PERRO", "GATOS", "CINCO", "PLATA", "ARBOL", "LUNES", "FELIZ", "AMIGO", "COSTA"]),
    "ca": load_dictionary("ca", None, ["TEMPS", "DONES", "PARLA", "ARBRE", "LLUNA", "FOSCA", "LLUMS", "AMICS", "MORTS"])
}

TARGET_WORDS = {
    "en": random.choice(list(DICTIONARIES["en"])),
    "es": random.choice(list(DICTIONARIES["es"])),
    "ca": random.choice(list(DICTIONARIES["ca"]))
}

# --- MATH LOGIC ---
def word_to_wave(word):
    return [ord(char) - ord('A') + 1 for char in word.upper()]

def calc_similarity(target_wave, guess_wave):
    if not target_wave or not guess_wave: return 0
    total_diff = sum(abs(t - g) for t, g in zip(target_wave, guess_wave))
    match_pct = 100 - ((total_diff / 125.0) * 100)
    return int(max(0, min(100, match_pct)))

# --- HTML FRONTEND ---
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>ShadoWord</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>ƒ</text></svg>">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        /* --- THEME VARIABLES --- */
        :root {
            --bg-color: #111520;
            --text-color: #f8fafc;
            --text-muted: #94a3b8;
            --box-bg: #1e2536;
            --border-color: #334155;
            --accent: #8ab4f8;
            --accent-guess: #ff5a00; 
            --shadow-fill: rgba(148, 163, 184, 0.15);
            --modal-overlay: rgba(0, 0, 0, 0.7);
        }

        body.light-mode {
            --bg-color: #f8fafc;
            --text-color: #0f172a;
            --text-muted: #64748b;
            --box-bg: #ffffff;
            --border-color: #cbd5e1;
            --accent: #2563eb;
            --accent-guess: #ea580c;
            --shadow-fill: rgba(100, 116, 139, 0.15);
            --modal-overlay: rgba(0, 0, 0, 0.4);
        }

        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            text-align: center; background: var(--bg-color); color: var(--text-color); 
            margin: 0; padding: 20px 20px 0 20px; display: flex; justify-content: center;
            transition: background 0.3s, color 0.3s;
            min-height: 100vh;
            overflow-x: hidden;
            overflow-y: auto;
        }
        .container { 
            width: 100%; max-width: 500px; 
            display: flex; flex-direction: column;
            position: relative;
        }
        
        /* HEADER */
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-shrink: 0; }
        .header-left, .header-right { display: flex; gap: 6px; align-items: center; }
        .icon-btn { 
            background: transparent; border: 1px solid var(--border-color); color: var(--text-muted); 
            border-radius: 6px; width: 34px; height: 34px; cursor: pointer;
            display: flex; justify-content: center; align-items: center;
            transition: all 0.2s; padding: 0;
        }
        .icon-btn:hover { background: var(--box-bg); color: var(--text-color); }
        .icon-btn svg { width: 18px; height: 18px; fill: currentColor; }
        
        .lang-select {
            background: var(--box-bg); color: var(--accent); border: 1px solid var(--border-color);
            border-radius: 6px; padding: 6px; font-weight: bold;
            cursor: pointer; outline: none; appearance: none;
            text-align: center; font-size: 13px; margin-right: 2px;
        }
        h1 { margin: 0; font-size: 18px; letter-spacing: 3px; font-weight: bold; }

        /* BUY ME A COFFEE BTN */
        .bmac-btn {
            background: #FFDD00; color: #000000; font-weight: bold; font-size: 11px;
            text-decoration: none; padding: 6px 10px; border-radius: 20px;
            display: inline-flex; align-items: center; gap: 5px; border: none; cursor: pointer;
            white-space: nowrap;
        }
        .bmac-btn svg { width: 14px; height: 14px; }

        /* CHART SCROLL BOX */
        .chart-scroll-box {
            position: relative;
            height: 280px; 
            min-height: 280px;
            width: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            margin-bottom: 15px;
            border: 1px solid var(--bg-color);
            border-radius: 8px;
            background: var(--bg-color);
            flex-shrink: 0;
            scroll-behavior: smooth;
        }
        
        .chart-scroll-box::-webkit-scrollbar { width: 6px; }
        .chart-scroll-box::-webkit-scrollbar-track { background: transparent; }
        .chart-scroll-box::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }

        .chart-container {
            position: relative;
            height: 500px; 
            width: 100%;
        }

        .dots { display: flex; justify-content: center; gap: 8px; margin-bottom: 15px; flex-shrink: 0; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border-color); }
        .dot.active { background: var(--accent-guess); }
        
        .input-row { display: flex; justify-content: center; gap: 8px; margin-bottom: 15px; flex-shrink: 0; }
        .letter-box {
            width: 45px; height: 55px; font-size: 28px; font-weight: bold;
            text-align: center; text-transform: uppercase;
            background: transparent; color: var(--text-color);
            border: 2px solid var(--border-color); border-radius: 6px; outline: none;
            transition: border-color 0.2s;
        }
        .letter-box:focus { border-color: var(--accent); }

        #message { font-size: 16px; font-weight: bold; margin-bottom: 5px; height: 24px; flex-shrink: 0; }
        
        .btn-row { display: flex; gap: 10px; margin-bottom: 10px; flex-shrink: 0; }
        .action-btn { 
            background: var(--accent); color: #fff; font-weight: bold; font-size: 16px;
            border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;
            width: 100%; display: none; justify-content: center; align-items: center; gap: 8px;
        }
        .action-btn.secondary { background: var(--box-bg); color: var(--text-color); border: 1px solid var(--border-color); }

        #history { 
            display: flex; flex-direction: column; gap: 8px; 
            flex-grow: 1; overflow-y: auto; margin-bottom: 15px; padding-right: 5px; max-height: 160px; 
        }
        #history::-webkit-scrollbar { width: 6px; }
        #history::-webkit-scrollbar-track { background: transparent; }
        #history::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }

        .guess-row {
            display: flex; align-items: center; justify-content: space-between;
            background: var(--box-bg); border: 1px solid var(--border-color); 
            padding: 10px 15px; border-radius: 8px; font-size: 14px; font-weight: bold; letter-spacing: 2px;
            flex-shrink: 0;
        }
        .guess-row .num { color: var(--text-muted); width: 20px; text-align: left; }
        .guess-row .word { flex-grow: 1; text-align: left; margin-left: 10px; color: var(--text-color); }
        .mini-chart-container { width: 70px; height: 25px; margin-right: 15px; transition: opacity 0.2s; }
        .guess-row .pct { background: var(--border-color); color: var(--accent); padding: 4px 10px; border-radius: 12px; font-size: 12px; }

        /* KEYBOARD (STICKY AT BOTTOM) */
        .keyboard {
            display: flex; flex-direction: column; gap: 7px; flex-shrink: 0; 
            position: sticky; bottom: 0; 
            background: var(--bg-color);
            /* Adds safe area padding for modern phones */
            padding: 15px 0 calc(30px + env(safe-area-inset-bottom)) 0; 
            z-index: 100;
            border-top: 1px solid var(--border-color);
        }
        .key-row { display: flex; justify-content: center; gap: 6px; }
        .key {
            background: var(--box-bg); border: 1px solid var(--border-color); color: var(--text-color);
            font-size: 16px; font-weight: bold; border-radius: 4px; cursor: pointer;
            height: 48px; min-width: 32px; flex: 1; max-width: 45px; display: flex; justify-content: center; align-items: center;
            transition: background 0.1s;
        }
        .key:active { background: var(--border-color); }
        .key.wide { min-width: 55px; max-width: 65px; font-size: 12px; }

        /* MODALS */
        .modal {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: var(--modal-overlay); z-index: 100; justify-content: center; align-items: center;
        }
        .modal-content {
            background: var(--bg-color); border: 1px solid var(--border-color);
            padding: 25px; border-radius: 12px; width: 90%; max-width: 400px;
            text-align: left; position: relative; max-height: 90vh; overflow-y: auto;
        }
        .close-btn {
            position: absolute; top: 15px; right: 15px; background: transparent; 
            border: none; color: var(--text-muted); font-size: 20px; cursor: pointer;
        }
        .modal h2 { margin-top: 0; font-size: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; }
        .stats-grid { display: flex; gap: 15px; justify-content: center; margin: 20px 0; text-align: center; }
        .stat-box .val { font-size: 24px; font-weight: bold; }
        .stat-box .lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }

        /* --- MOBILE RESPONSIVENESS FIXES --- */
        @media (max-width: 450px) {
            h1 { font-size: 14px; letter-spacing: 1px; } /* Shrink title */
            #txt-coffee-main { display: none; } /* Hide 'Coffee' text, leave only cup icon */
            .bmac-btn { padding: 8px; border-radius: 50%; } /* Make it circular */
            .header-left, .header-right { gap: 4px; }
            .icon-btn { width: 32px; height: 32px; }
            .key { font-size: 14px; height: 44px; }
            .key.wide { font-size: 10px; }
            .letter-box { width: 40px; height: 50px; font-size: 24px; } /* Shrink input boxes slightly */
        }

    </style>
</head>
<body>

    <div class="container">
        <header>
            <div class="header-left">
                <button class="icon-btn" onclick="openModal('helpModal')">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                </button>
                <a href="#" class="bmac-btn">
                    <svg viewBox="0 0 24 24"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 5h-2V5h2v3zM4 19h16v2H4z"/></svg>
                    <span id="txt-coffee-main">Coffee</span>
                </a>
            </div>
            
            <h1>SHADOWORD</h1>
            
            <div class="header-right">
                <select id="langSelect" class="lang-select" onchange="changeLanguage()">
                    <option value="en">EN</option>
                    <option value="es">ES</option>
                    <option value="ca">CA</option>
                </select>
                <button class="icon-btn" onclick="toggleGuidelines()" title="Toggle Guide Lines">
                    <svg viewBox="0 0 24 24"><path d="M4 19h16v2H4v-2zm0-4h16v2H4v-2zm0-4h16v2H4V7zm0-4h16v2H4V3z"/></svg>
                </button>
                <button class="icon-btn" onclick="toggleTheme()">
                    <svg id="themeIcon" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4C12.92 3.04 12.46 3 12 3z"/></svg>
                </button>
                <button class="icon-btn" onclick="openModal('statsModal'); renderStats();">
                    <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
                </button>
            </div>
        </header>
        
        <div class="chart-scroll-box" id="chartScrollBox">
            <div class="chart-container">
                <canvas id="waveChart"></canvas>
            </div>
        </div>

        <div class="dots" id="dotContainer">
            <div class="dot active"></div><div class="dot"></div><div class="dot"></div>
            <div class="dot"></div><div class="dot"></div><div class="dot"></div>
        </div>
        
        <div class="input-row" id="inputRow">
            <input type="text" class="letter-box" maxlength="1" readonly>
            <input type="text" class="letter-box" maxlength="1" readonly>
            <input type="text" class="letter-box" maxlength="1" readonly>
            <input type="text" class="letter-box" maxlength="1" readonly>
            <input type="text" class="letter-box" maxlength="1" readonly>
        </div>

        <div id="message"></div>
        
        <div class="btn-row">
            <button id="actionBtn" class="action-btn" onclick="resetGame()">
                <span id="txt-play-again">PLAY AGAIN</span>
            </button>
            <button id="shareBtn" class="action-btn secondary" onclick="shareResults()">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
                <span id="txt-share">SHARE</span>
            </button>
        </div>

        <div id="history"></div>

        <div class="keyboard" id="keyboardContainer">
            <div class="key-row">
                <button class="key" onclick="handleKey('A')">A</button>
                <button class="key" onclick="handleKey('B')">B</button>
                <button class="key" onclick="handleKey('C')">C</button>
                <button class="key" onclick="handleKey('D')">D</button>
                <button class="key" onclick="handleKey('E')">E</button>
                <button class="key" onclick="handleKey('F')">F</button>
                <button class="key" onclick="handleKey('G')">G</button>
                <button class="key" onclick="handleKey('H')">H</button>
                <button class="key" onclick="handleKey('I')">I</button>
            </div>
            <div class="key-row">
                <button class="key" onclick="handleKey('J')">J</button>
                <button class="key" onclick="handleKey('K')">K</button>
                <button class="key" onclick="handleKey('L')">L</button>
                <button class="key" onclick="handleKey('M')">M</button>
                <button class="key" onclick="handleKey('N')">N</button>
                <button class="key" onclick="handleKey('O')">O</button>
                <button class="key" onclick="handleKey('P')">P</button>
                <button class="key" onclick="handleKey('Q')">Q</button>
                <button class="key" onclick="handleKey('R')">R</button>
            </div>
            <div class="key-row">
                <button class="key wide" onclick="handleKey('ENTER')">ENTER</button>
                <button class="key" onclick="handleKey('S')">S</button>
                <button class="key" onclick="handleKey('T')">T</button>
                <button class="key" onclick="handleKey('U')">U</button>
                <button class="key" onclick="handleKey('V')">V</button>
                <button class="key" onclick="handleKey('W')">W</button>
                <button class="key" onclick="handleKey('X')">X</button>
                <button class="key" onclick="handleKey('Y')">Y</button>
                <button class="key" onclick="handleKey('Z')">Z</button>
                <button class="key wide" onclick="handleKey('DEL')">DEL</button>
            </div>
        </div>
    </div>

    <div id="helpModal" class="modal" onclick="closeModalOnBg(event, 'helpModal')">
        <div class="modal-content">
            <button class="close-btn" onclick="closeModal('helpModal')">&times;</button>
            <h2 id="txt-help-title">How to Play ShadoWord</h2>
            <p id="txt-help-desc" style="font-size: 14px; margin-bottom: 5px;">Guess the hidden word in 6 tries.</p>
            
            <div style="text-align:center; margin: 15px 0; background: var(--box-bg); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);">
                <svg width="100%" height="70" viewBox="0 0 200 70">
                    <path d="M10,50 Q50,15 100,45 T190,30" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="4,4"/>
                    <path d="M10,20 Q50,65 100,25 T190,60" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="4,4"/>
                    <path d="M10,50 Q50,15 100,45 T190,30 L190,60 T100,25 Q50,65 10,20 Z" fill="var(--shadow-fill)"/>
                    <path d="M10,35 Q50,40 100,35 T190,45" fill="none" stroke="var(--accent-guess)" stroke-width="3"/>
                </svg>
                <div id="txt-help-img" style="font-size: 11px; color: var(--text-muted); margin-top: 5px;">The target is always inside the shadow!</div>
            </div>

            <ul style="color: var(--text-muted); font-size: 13px; padding-left: 20px; line-height: 1.5;">
                <li id="txt-help-1">Every word forms a numerical wave based on the alphabet (A=1, B=2... Z=26).</li>
                <li id="txt-help-2">Instead of green or yellow letters, you get a <strong>Shadow</strong> (a bounded area).</li>
                <li id="txt-help-3">The dashed lines show the upper and lower limits. The closer your guess is to the target, the narrower the shadow becomes.</li>
                <li id="txt-help-4">Use the shrinking boundaries to deduce the correct letters!</li>
                <li id="txt-help-5"><strong>Tip:</strong> Click the mini-charts in your history to hide/show those lines on the main board!</li>
            </ul>
            
            <div id="txt-help-footer" style="font-size: 12px; margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                Inspired by the original <strong>WordWavr</strong> concept a (<a href="https://wordwavr.app/" target="_blank">https://wordwavr.app/</a>). If you enjoy this twist, be sure to check that out!
            </div>
            
            <div style="margin-top: 15px; text-align: center;">
                <a href="#" class="bmac-btn">
                    <svg viewBox="0 0 24 24"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 5h-2V5h2v3zM4 19h16v2H4z"/></svg>
                    <span id="txt-coffee-1">Buy me a Coffee</span>
                </a>
            </div>
        </div>
    </div>

    <div id="statsModal" class="modal" onclick="closeModalOnBg(event, 'statsModal')">
        <div class="modal-content">
            <button class="close-btn" onclick="closeModal('statsModal')">&times;</button>
            <h2 id="txt-stat-title">Statistics</h2>
            <div class="stats-grid">
                <div class="stat-box"><div class="val" id="statPlayed">0</div><div class="lbl" id="txt-stat-played">Played</div></div>
                <div class="stat-box"><div class="val" id="statWinPct">0</div><div class="lbl" id="txt-stat-win">Win %</div></div>
                <div class="stat-box"><div class="val" id="statStreak">0</div><div class="lbl" id="txt-stat-streak">Streak</div></div>
                <div class="stat-box"><div class="val" id="statMax">0</div><div class="lbl" id="txt-stat-max">Max</div></div>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <a href="#" class="bmac-btn">
                    <svg viewBox="0 0 24 24"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 5h-2V5h2v3zM4 19h16v2H4z"/></svg>
                    <span id="txt-coffee-2">Support the Dev</span>
                </a>
            </div>
        </div>
    </div>

    <script>
        // --- TRANSLATIONS ---
        const i18n = {
            en: {
                play_again: "PLAY AGAIN", share: "SHARE", coffee_main: "Coffee",
                h_title: "How to Play ShadoWord", h_desc: "Guess the hidden word in 6 tries.",
                h_img: "The target is always inside the shadow!",
                h_1: "Every word forms a numerical wave based on the alphabet (A=1, B=2... Z=26).",
                h_2: "Instead of green or yellow letters, you get a <strong>Shadow</strong> (a bounded area).",
                h_3: "The dashed lines show the upper and lower limits. The closer your guess is to the target, the narrower the shadow becomes.",
                h_4: "Use the shrinking boundaries to deduce the correct letters!",
                h_5: "<strong>Tip:</strong> Click the mini-charts in your history to hide/show those lines on the main board!",
                h_foot: 'Inspired by the original <strong>WordWavr</strong> concept (<a href="https://wordwavr.app" target="_blank" style="color: var(--accent); text-decoration: underline;">wordwavr.app</a>). If you enjoy this twist, be sure to check that out!',                s_title: "Statistics", s_play: "Played", s_win: "Win %", s_streak: "Streak", s_max: "Max",
                coffee: "Buy me a Coffee", msg_need: "Need 5 letters.", msg_copy: "Results copied to clipboard!",
                msg_win: "🎉 Correct!", msg_over: "Game Over! Word was "
            },
            es: {
                play_again: "JUGAR DE NUEVO", share: "COMPARTIR", coffee_main: "Café",
                h_title: "Cómo jugar ShadoWord", h_desc: "Adivina la palabra oculta en 6 intentos.",
                h_img: "¡El objetivo siempre está dentro de la sombra!",
                h_1: "Cada palabra forma una onda numérica basada en el alfabeto (A=1, B=2... Z=26).",
                h_2: "En lugar de letras verdes o amarillas, obtienes una <strong>Sombra</strong> (un área delimitada).",
                h_3: "Las líneas muestran los límites. Cuanto más cerca esté tu intento, más estrecha será la sombra.",
                h_4: "¡Usa estos límites para deducir las letras correctas!",
                h_5: "<strong>Consejo:</strong> ¡Haz clic en los mini-gráficos para ocultar/mostrar líneas en el tablero!",
                h_foot: 'Inspirado en el concepto original de <strong>WordWavr</strong> (<a href="https://wordwavr.app" target="_blank" style="color: var(--accent); text-decoration: underline;">wordwavr.app</a>).',
                s_title: "Estadísticas", s_play: "Jugado", s_win: "% Victorias", s_streak: "Racha", s_max: "Máx",
                coffee: "Invítame un Café", msg_need: "Necesitas 5 letras.", msg_copy: "¡Copiado al portapapeles!",
                msg_win: "🎉 ¡Correcto!", msg_over: "¡Fin del juego! Era "
            },
            ca: {
                play_again: "JUGAR DE NOU", share: "COMPARTIR", coffee_main: "Cafè",
                h_title: "Com jugar a ShadoWord", h_desc: "Endevina la paraula oculta en 6 intents.",
                h_img: "L'objectiu sempre està dins de l'ombra!",
                h_1: "Cada paraula forma una ona numèrica basada en l'alfabet (A=1, B=2... Z=26).",
                h_2: "En lloc de lletres verdes o grogues, obtens una <strong>Ombra</strong> (una àrea delimitada).",
                h_3: "Les línies mostren els límits. Com més a prop estigui el teu intent, més estreta serà l'ombra.",
                h_4: "Utilitza aquests límits per deduir les lletres correctes!",
                h_5: "<strong>Consell:</strong> Fes clic als mini-gràfics per ocultar/mostrar línies al tauler!",
                h_foot: 'Inspirat en el concepte original de <strong>WordWavr</strong> (<a href="https://wordwavr.app" target="_blank" style="color: var(--accent); text-decoration: underline;">wordwavr.app</a>).',
                s_title: "Estadístiques", s_play: "Jugat", s_win: "% Victòries", s_streak: "Ratxa", s_max: "Màx",
                coffee: "Convida'm a un Cafè", msg_need: "Necessites 5 lletres.", msg_copy: "Copiat al porta-retalls!",
                msg_win: "🎉 Correcte!", msg_over: "Fi del joc! Era "
            }
        };

        let chart;
        let attemptCount = 0;
        const maxAttempts = 6;
        let currentLang = 'en';
        let guessHistory = [];
        let gameActive = true;
        let gameWon = false;
        let currentFinalTargetWave = null; 
        let showGuidelines = false;

        // LOAD THEME
        if(localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');

        const inputs = document.querySelectorAll('.letter-box');

        // Allow physical keyboard typing
        document.addEventListener('keydown', (e) => {
            if(!gameActive) return;
            const key = e.key.toUpperCase();
            if (key === 'ENTER') handleKey('ENTER');
            else if (key === 'BACKSPACE') handleKey('DEL');
            else if (/^[A-Z]$/.test(key)) handleKey(key);
        });

        // Virtual Keyboard Handler
        function handleKey(key) {
            if (!gameActive) return;

            if (key === 'ENTER') {
                makeGuess();
            } else if (key === 'DEL') {
                for (let i = 4; i >= 0; i--) {
                    if (inputs[i].value !== '') {
                        inputs[i].value = '';
                        break;
                    }
                }
            } else {
                for (let i = 0; i < 5; i++) {
                    if (inputs[i].value === '') {
                        inputs[i].value = key;
                        break;
                    }
                }
            }
        }

        drawChart([]); 
        centerChart(); // Center alphabet vertically on page load
        applyTranslations();

        function applyTranslations() {
            const l = i18n[currentLang];
            document.getElementById('txt-play-again').innerText = l.play_again;
            document.getElementById('txt-share').innerText = l.share;
            document.getElementById('txt-coffee-main').innerText = l.coffee_main;
            document.getElementById('txt-help-title').innerText = l.h_title;
            document.getElementById('txt-help-desc').innerText = l.h_desc;
            document.getElementById('txt-help-img').innerText = l.h_img;
            document.getElementById('txt-help-1').innerText = l.h_1;
            document.getElementById('txt-help-2').innerHTML = l.h_2;
            document.getElementById('txt-help-3').innerText = l.h_3;
            document.getElementById('txt-help-4').innerText = l.h_4;
            document.getElementById('txt-help-5').innerHTML = l.h_5;
            document.getElementById('txt-help-footer').innerHTML = l.h_foot;
            document.getElementById('txt-stat-title').innerText = l.s_title;
            document.getElementById('txt-stat-played').innerText = l.s_play;
            document.getElementById('txt-stat-win').innerText = l.s_win;
            document.getElementById('txt-stat-streak').innerText = l.s_streak;
            document.getElementById('txt-stat-max').innerText = l.s_max;
            document.getElementById('txt-coffee-1').innerText = l.coffee;
            document.getElementById('txt-coffee-2').innerText = l.coffee;
        }

        function toggleTheme() {
            document.body.classList.toggle('light-mode');
            localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
            if(chart) drawChart(guessHistory, currentFinalTargetWave); 
        }

        function toggleGuidelines() {
            showGuidelines = !showGuidelines;
            if(chart) {
                chart.options.scales.y.grid.color = (ctx) => {
                    if(!showGuidelines) return 'transparent';
                    const boundsColor = getCSSVar('--text-muted');
                    return [1, 9, 18, 26].includes(ctx.tick.value) ? boundsColor + '40' : 'transparent';
                };
                chart.update();
            }
        }

        function changeLanguage() {
            currentLang = document.getElementById('langSelect').value;
            applyTranslations();
            resetGame(); 
        }

        function centerChart() {
            // Because the canvas is 650px high inside a 280px scroll window,
            // scrolling slightly centers the 1-26 alphabet perfectly.
            const box = document.getElementById('chartScrollBox');
            if(box) box.scrollTop = (box.scrollHeight - box.clientHeight) / 2;
        }

        function openModal(id) { document.getElementById(id).style.display = 'flex'; }
        function closeModal(id) { document.getElementById(id).style.display = 'none'; }
        function closeModalOnBg(e, id) { if(e.target.id === id) closeModal(id); }

        function updateStats(won) {
            let stats = JSON.parse(localStorage.getItem('shadowStats')) || { played: 0, wins: 0, streak: 0, max: 0 };
            stats.played++;
            if(won) {
                stats.wins++;
                stats.streak++;
                stats.max = Math.max(stats.max, stats.streak);
            } else {
                stats.streak = 0;
            }
            localStorage.setItem('shadowStats', JSON.stringify(stats));
        }

        function renderStats() {
            let stats = JSON.parse(localStorage.getItem('shadowStats')) || { played: 0, wins: 0, streak: 0, max: 0 };
            document.getElementById('statPlayed').innerText = stats.played;
            document.getElementById('statWinPct').innerText = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
            document.getElementById('statStreak').innerText = stats.streak;
            document.getElementById('statMax').innerText = stats.max;
        }

        function shareResults() {
            const epoch = new Date('2024-01-01T00:00:00');
            const today = new Date();
            const diffTime = Math.abs(today - epoch);
            const dayNumber = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let text = `ShadoWord ${currentLang.toUpperCase()} #${dayNumber} ${gameWon ? attemptCount : 'X'}/${maxAttempts}\n\n`;

            guessHistory.forEach((h, i) => {
                let emoji = '🔴'; 
                if (h.similarity >= 90) emoji = '🟢';
                else if (h.similarity >= 75) emoji = '🟡';
                else if (h.similarity >= 50) emoji = '🟠';
                text += `${emoji} 🌊 ${h.similarity}%\n`;
            });

            navigator.clipboard.writeText(text).then(() => {
                showMessage(i18n[currentLang].msg_copy, "var(--accent)", false);
            });
        }

        function makeGuess() {
            if (attemptCount >= maxAttempts || !gameActive) return;

            let guess = '';
            inputs.forEach(inp => guess += inp.value);
            if (guess.length !== 5) return showMessage(i18n[currentLang].msg_need, "var(--accent-guess)");

            fetch('/api/guess', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: guess, lang: currentLang }) 
            })
            .then(r => r.json())
            .then(data => {
                if (data.error) return showMessage(data.error, "var(--accent-guess)");

                attemptCount++;
                
                guessHistory.push({
                    guess: data.wave,
                    upper: data.upper_bound,
                    lower: data.lower_bound,
                    similarity: data.similarity,
                    hidden: false 
                });
                
                updateDots();
                drawChart(guessHistory); 
                addHistoryRow(attemptCount, guess.toUpperCase(), data.similarity, guessHistory[guessHistory.length - 1]);
                
                inputs.forEach(inp => inp.value = '');

                if (data.is_correct) {
                    gameWon = true;
                    updateStats(true);
                    showMessage(i18n[currentLang].msg_win, "var(--accent)", true); 
                    endGame(data.target_wave);
                } else if (attemptCount >= maxAttempts) {
                    gameWon = false;
                    updateStats(false);
                    showMessage(i18n[currentLang].msg_over + data.target_word, "var(--accent-guess)", true);
                    endGame(data.target_wave);
                }
            });
        }

        function addHistoryRow(num, word, pct, historyData) {
            const historyDiv = document.getElementById('history');
            const row = document.createElement('div');
            row.className = 'guess-row';
            row.innerHTML = `
                <span class="num">${num}</span>
                <span class="word">${word}</span>
                <div class="mini-chart-container" id="miniContainer-${num}" title="Click to hide/show on main graph" style="cursor: pointer;"><canvas id="miniChart-${num}"></canvas></div>
                <span class="pct">${pct}%</span>
            `;
            
            const miniContainer = row.querySelector(`#miniContainer-${num}`);
            miniContainer.onclick = function() {
                const idx = num - 1;
                guessHistory[idx].hidden = !guessHistory[idx].hidden;
                miniContainer.style.opacity = guessHistory[idx].hidden ? '0.3' : '1';
                drawChart(guessHistory, currentFinalTargetWave);
            };

            historyDiv.prepend(row); 
            historyDiv.scrollTop = 0; 

            drawMiniChart(`miniChart-${num}`, historyData);
        }

        function getCSSVar(name) { return getComputedStyle(document.body).getPropertyValue(name).trim(); }

        function drawMiniChart(canvasId, hData) {
            const ctx = document.getElementById(canvasId).getContext('2d');
            const borderColor = getCSSVar('--text-muted');
            const guessColor = getCSSVar('--accent-guess');

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['1', '2', '3', '4', '5'],
                    datasets: [
                        { data: hData.upper, borderColor: borderColor, borderDash: [2, 2], borderWidth: 1, fill: false, pointRadius: 0, tension: 0.4 },
                        { data: hData.lower, borderColor: borderColor, borderDash: [2, 2], borderWidth: 1, fill: false, pointRadius: 0, tension: 0.4 },
                        { data: hData.guess, borderColor: guessColor, borderWidth: 1.5, pointRadius: 0, tension: 0.4 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, animation: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: { x: { display: false }, y: { display: false, min: -25, max: 55 } } 
                }
            });
        }

        function updateDots() {
            const dots = document.querySelectorAll('.dot');
            dots.forEach((dot, idx) => {
                dot.className = idx === attemptCount ? 'dot active' : 'dot';
                if (idx < attemptCount) dot.style.background = 'var(--box-bg)';
            });
        }

        function showMessage(text, color, keep = false) {
            const msgEl = document.getElementById('message');
            msgEl.innerText = text;
            msgEl.style.color = color;
            if (!keep) setTimeout(() => { if (msgEl.innerText === text) msgEl.innerText = ''; }, 3000);
        }

        function endGame(finalTargetWave) {
            gameActive = false;
            currentFinalTargetWave = finalTargetWave; 
            document.getElementById('keyboardContainer').style.display = 'none';
            
            const actionBtns = document.querySelectorAll('.action-btn');
            actionBtns.forEach(btn => btn.style.display = 'flex');
            
            drawChart(guessHistory, finalTargetWave);
        }

        function resetGame() {
            fetch('/api/reset', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lang: currentLang })
            })
            .then(() => {
                attemptCount = 0;
                guessHistory = []; 
                gameActive = true;
                gameWon = false;
                currentFinalTargetWave = null;
                
                document.getElementById('history').innerHTML = '';
                document.getElementById('keyboardContainer').style.display = 'flex';
                
                const actionBtns = document.querySelectorAll('.action-btn');
                actionBtns.forEach(btn => btn.style.display = 'none');
                
                document.getElementById('message').innerText = '';
                inputs.forEach(inp => inp.value = '');
                
                const dots = document.querySelectorAll('.dot');
                dots.forEach(dot => { dot.className = 'dot'; dot.style.background = 'var(--border-color)'; });
                dots[0].className = 'dot active';

                drawChart([]); 
                centerChart(); // Re-center for the new game
            });
        }

        function drawChart(historyArray, targetData = null) {
            const ctx = document.getElementById('waveChart').getContext('2d');
            const labels = ['1', '2', '3', '4', '5'];
            
            const boundsColor = getCSSVar('--text-muted');
            const shadowFill = getCSSVar('--shadow-fill');
            const guessColor = getCSSVar('--accent-guess');
            const targetColor = getCSSVar('--accent');

            if (chart) chart.destroy();
            const datasets = [];

            if (historyArray && historyArray.length > 0) {
                let global_upper = [Infinity, Infinity, Infinity, Infinity, Infinity];
                let global_lower = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity];
                
                historyArray.forEach(h => {
                    for(let i=0; i<5; i++) {
                        global_upper[i] = Math.min(global_upper[i], h.upper[i]);
                        global_lower[i] = Math.max(global_lower[i], h.lower[i]);
                    }
                });

                datasets.push({
                    data: global_lower, borderColor: boundsColor, borderWidth: 2, borderDash: [5, 5],
                    fill: false, pointRadius: 0, pointHoverRadius: 0, tension: 0.4
                });

                datasets.push({
                    data: global_upper, borderColor: boundsColor, borderWidth: 2, borderDash: [5, 5],
                    backgroundColor: shadowFill, fill: '-1', pointRadius: 0, pointHoverRadius: 0, tension: 0.4
                });

                historyArray.forEach((h, index) => {
                    if(h.hidden) return; 

                    const isLast = index === historyArray.length - 1;
                    
                    // Add '33' (Hex for 20% opacity) to older lines 
                    const lineColor = isLast ? guessColor : guessColor + '33';

                    datasets.push({
                        data: h.guess, 
                        borderColor: lineColor, 
                        borderWidth: isLast ? 4 : 2, 
                        pointRadius: 0,         
                        pointHoverRadius: 0,    
                        pointBackgroundColor: guessColor,
                        tension: 0.4
                    });
                });
            }

            if (targetData) {
                datasets.push({
                    data: targetData, borderColor: targetColor, borderWidth: 5, 
                    pointRadius: 0, pointHoverRadius: 0, pointBackgroundColor: targetColor, tension: 0.4
                });
            }
            
            chart = new Chart(ctx, {
                type: 'line',
                data: { labels: labels, datasets: datasets },
                options: {
                    responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    interaction: { mode: 'nearest', intersect: false },
                    scales: { 
                        x: { display: false }, 
                        y: { 
                            display: true, 
                            min: -25, // Locks boundaries so guide lines never shift
                            max: 55,
                            position: 'left',
                            border: { display: false },
                            grid: {
                                color: (ctx) => {
                                    if(!showGuidelines) return 'transparent';
                                    return [1, 9, 18, 26].includes(ctx.tick.value) ? boundsColor + '40' : 'transparent';
                                },
                                drawTicks: false
                            },
                            ticks: {
                                stepSize: 1,
                                color: (ctx) => {
                                    if(!showGuidelines) return 'transparent';
                                    return [1, 9, 18, 26].includes(ctx.tick.value) ? boundsColor + '40' : 'transparent';
                                },
                                font: { family: 'monospace', size: 12, weight: 'bold' },
                                padding: 5,
                                callback: (val) => {
                                    if (val === 1) return 'A';
                                    if (val === 9) return 'I';
                                    if (val === 18) return 'R';
                                    if (val === 26) return 'Z';
                                    return null;
                                }
                            }
                        } 
                    }
                }
            });
        }
    </script>
</body>
</html>
"""

# --- ROUTES ---

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/guess', methods=['POST'])
def check_guess():
    data = request.json
    lang = data.get('lang', 'en') 
    guess = clean_word(data.get('word', ''))
    
    if len(guess) != 5:
        return jsonify({"error": "Word must be 5 letters."}), 400
    if guess not in DICTIONARIES[lang]:
        return jsonify({"error": "Not in word list!"}), 400
        
    current_target = TARGET_WORDS[lang]
    guess_wave = word_to_wave(guess)
    target_wave = word_to_wave(current_target)
    
    upper_bound = []
    lower_bound = []
    for g, t in zip(guess_wave, target_wave):
        diff = abs(t - g)
        upper_bound.append(g + diff)
        lower_bound.append(g - diff)
    
    is_correct = (guess == current_target)
    similarity = calc_similarity(target_wave, guess_wave)
    if is_correct: similarity = 100

    return jsonify({
        "wave": guess_wave,
        "upper_bound": upper_bound,
        "lower_bound": lower_bound,
        "is_correct": is_correct,
        "similarity": similarity,
        "target_word": current_target,
        "target_wave": target_wave 
    })

@app.route('/api/reset', methods=['POST'])
def reset_game():
    data = request.json or {}
    lang = data.get('lang', 'en')
    
    TARGET_WORDS[lang] = random.choice(list(DICTIONARIES[lang]))
    print(f"[{lang.upper()}] Cheat: New target word is: {TARGET_WORDS[lang]}")
    
    return jsonify({"status": "reset"})

if __name__ == '__main__':
    # Print targets for local debugging
    for l in TARGET_WORDS:
        print(f"[{l.upper()}] Target at startup: {TARGET_WORDS[l]}")
    
    # Use environment variables for the port (required by many cloud hosts)
    # Turn debug=False to prevent security vulnerabilities in production
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)