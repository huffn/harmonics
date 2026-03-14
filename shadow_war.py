from flask import Flask, render_template_string, jsonify, request, session
import urllib.request
import unicodedata
import random
import os

app = Flask(__name__)

app.secret_key = os.environ.get("SECRET_KEY", "super-secret-shadow-key-123")

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

# TARGET_WORDS = {
#     "en": random.choice(list(DICTIONARIES["en"])),
#     "es": random.choice(list(DICTIONARIES["es"])),
#     "ca": random.choice(list(DICTIONARIES["ca"]))
# }

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
    <title>ShadoWord</title>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta property="og:title" content="ShadoWord – Infinite Shadow Word Puzzle">
    <meta property="og:description" content="Guess the hidden word using shrinking constraint shadows. Infinite puzzles.">
    <meta property="og:image" content="https://shadoword.onrender.com/static/preview.png">
    <meta property="og:url" content="https://shadoword.onrender.com/">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="ShadoWord">

    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>ƒ</text></svg>">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js"></script>
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

        /* --- NEW LAYOUT FOR SIDE ADS --- */
        .layout-wrapper {
            display: grid;
            grid-template-columns: 1fr min(100%, 500px) 1fr;
            align-items: start;
            width: 100%;
        }

        .side-panel {
            display: none; /* Hidden completely on mobile! */
            width: 160px; 
            position: sticky;
            top: 20px; 
        }

        .side-panel.left {
            grid-column: 1; /* Left lane */
            justify-self: start; /* Glued to the far left */
        }

        .side-panel.right {
            grid-column: 3; /* Right lane */
            justify-self: end; /* Glued to the far right */
        }
        
        .container { 
            grid-column: 2; /* Middle lane */
            width: 100%; 
            max-width: 500px; 
            display: flex; 
            flex-direction: column;
            position: relative;
        }

        /* Show the ads only if the screen is wide enough */
        @media (min-width: 1000px) {
            .side-panel { display: block; }
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

    <script defer src="https://cloud.umami.is/script.js" data-website-id="c4bce8ba-8667-48aa-b318-61203f4ca006"></script>

    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2459227402455868"
     crossorigin="anonymous"></script>    
</head>
<body>

    <div class="layout-wrapper">
        
        <div class="side-panel left">
            <ins class="adsbygoogle"
                style="display:block"
                data-ad-client="ca-pub-2459227402455868"
                data-ad-slot="2867346921"
                data-ad-format="auto"
                data-full-width-responsive="true"></ins>
            <script>
                (adsbygoogle = window.adsbygoogle || []).push({});
            </script>
        </div>

            <div class="container">
                <header>
                    <div class="header-left">
                        <button class="icon-btn" onclick="openModal('helpModal')">
                            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                        </button>
                        <a href="https://buymeacoffee.com/shadoword" target="_blank" class="bmac-btn">
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
                        <button class="icon-btn" onclick="openModal('configModal')" title="Settings">
                            <svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
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

                <div class="keyboard" id="keyboardContainer"></div>
            </div>

            <div class="side-panel right">
                <ins class="adsbygoogle"
                    style="display:block"
                    data-ad-client="ca-pub-2459227402455868"
                    data-ad-slot="2867346921"
                    data-ad-format="auto"
                    data-full-width-responsive="true"></ins>
                <script>
                    (adsbygoogle = window.adsbygoogle || []).push({});
                </script>
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
            
            <div id="txt-help-footer" style="font-size: 11px; margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 15px; line-height: 1.4;">
            </div>
            
            <div style="margin-top: 15px; text-align: center;">
                <a href="https://buymeacoffee.com/shadoword" target="_blank" class="bmac-btn">
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
                <a href="https://buymeacoffee.com/shadoword" target="_blank" class="bmac-btn">
                    <svg viewBox="0 0 24 24"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 5h-2V5h2v3zM4 19h16v2H4z"/></svg>
                    <span id="txt-coffee-2">Support the Dev</span>
                </a>
            </div>
        </div>
    </div>

    <div id="configModal" class="modal" onclick="closeModalOnBg(event, 'configModal')">
        <div class="modal-content">
            <button class="close-btn" onclick="closeModal('configModal')">&times;</button>
            <h2 id="txt-config-title">Settings</h2>
            
            <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 20px;">
                <button class="action-btn secondary" style="display: flex; justify-content: space-between;" onclick="toggleTheme()">
                    <span>Theme</span>
                    <span id="txt-cfg-theme-val">Dark</span> 
                </button>
                <button class="action-btn secondary" style="display: flex; justify-content: space-between;" onclick="toggleGuidelines()">
                    <span>Guide Lines</span>
                    <span id="txt-cfg-guide-val">Hidden</span> 
                </button>
                <button class="action-btn secondary" style="display: flex; justify-content: space-between;" onclick="toggleKeyboard()">
                    <span>Keyboard</span>
                    <span id="txt-cfg-kbd-val">QWERTY</span> 
                </button>
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
                h_foot: 'Inspired by the original <strong>WordWavr</strong> concept (<a href="https://wordwavr.app" target="_blank" style="color: var(--accent); text-decoration: underline;">wordwavr.app</a>). If you enjoy this twist, be sure to check that out!<br><div style="margin-top: 15px; font-size: 13px; font-weight: bold;"><a href="/about" style="color: var(--accent);">Read full rules & About</a></div><div style="margin-top: 10px; font-size: 11px; opacity: 0.7;"><a href="/privacy" style="color: inherit; margin-right: 10px;">Privacy Policy</a> | <a href="/terms" style="color: inherit; margin-left: 10px;">Terms of Service</a></div>',
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
                h_foot: 'Inspirado en el concepto original de <strong>WordWavr</strong> (<a href="https://wordwavr.app" target="_blank" style="color: var(--accent); text-decoration: underline;">wordwavr.app</a>).<br><div style="margin-top: 15px; font-size: 13px; font-weight: bold;"><a href="/about" style="color: var(--accent);">Leer reglas completas y Acerca de</a></div><div style="margin-top: 10px; font-size: 11px; opacity: 0.7;"><a href="/privacy" style="color: inherit; margin-right: 10px;">Política de Privacidad</a> | <a href="/terms" style="color: inherit; margin-left: 10px;">Términos de Servicio</a></div>',
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
                h_foot: 'Inspirat en el concepte original de <strong>WordWavr</strong> (<a href="https://wordwavr.app" target="_blank" style="color: var(--accent); text-decoration: underline;">wordwavr.app</a>).<br><div style="margin-top: 15px; font-size: 13px; font-weight: bold;"><a href="/about" style="color: var(--accent);">Llegir regles completes i Sobre</a></div><div style="margin-top: 10px; font-size: 11px; opacity: 0.7;"><a href="/privacy" style="color: inherit; margin-right: 10px;">Política de Privacitat</a> | <a href="/terms" style="color: inherit; margin-left: 10px;">Termes de Servei</a></div>',
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

        // Keyboard State
        let keyboardLayout = localStorage.getItem('shadowKeyboard') || 'qwerty';

        const KEYBOARD_LAYOUTS = {
            qwerty: [
                ['Q','W','E','R','T','Y','U','I','O','P'],
                ['A','S','D','F','G','H','J','K','L'],
                ['ENTER','Z','X','C','V','B','N','M','DEL']
            ],
            alpha: [
                ['A','B','C','D','E','F','G','H','I'],
                ['J','K','L','M','N','O','P','Q','R'],
                ['ENTER','S','T','U','V','W','X','Y','Z','DEL']
            ]
        };

        // Render the keyboard dynamically based on selected layout
        function renderKeyboard() {
            const container = document.getElementById('keyboardContainer');
            container.innerHTML = ''; 
            const layout = KEYBOARD_LAYOUTS[keyboardLayout];

            layout.forEach(row => {
                const rowDiv = document.createElement('div');
                rowDiv.className = 'key-row';
                row.forEach(key => {
                    const btn = document.createElement('button');
                    btn.className = 'key' + (key === 'ENTER' || key === 'DEL' ? ' wide' : '');
                    btn.onclick = () => handleKey(key);
                    btn.innerText = key;
                    rowDiv.appendChild(btn);
                });
                container.appendChild(rowDiv);
            });
            
            // Update the text in the config modal
            const kbdStatusEl = document.getElementById('txt-kbd-status');
            if (kbdStatusEl) kbdStatusEl.innerText = keyboardLayout.toUpperCase();
        }

        // Function to toggle between layouts
        function toggleKeyboard() {
            keyboardLayout = keyboardLayout === 'qwerty' ? 'alpha' : 'qwerty';
            localStorage.setItem('shadowKeyboard', keyboardLayout);
            
            // Update button text
            const kbdValEl = document.getElementById('txt-cfg-kbd-val');
            if (kbdValEl) kbdValEl.innerText = keyboardLayout === 'qwerty' ? 'QWERTY' : 'Alphabetical';
            
            renderKeyboard();
        }

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
        renderKeyboard();

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
            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            
            // Update button text
            const themeValEl = document.getElementById('txt-cfg-theme-val');
            if (themeValEl) themeValEl.innerText = isLight ? 'Light' : 'Dark';
            
            if(chart) drawChart(guessHistory, currentFinalTargetWave); 
        }

        function toggleGuidelines() {
            showGuidelines = !showGuidelines;
            
            // Update button text
            const guideValEl = document.getElementById('txt-cfg-guide-val');
            if (guideValEl) guideValEl.innerText = showGuidelines ? 'Visible' : 'Hidden';

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
            localStorage.setItem('shadowLang', currentLang);
            applyTranslations();
            resetGame(); 
        }

        const savedLang = localStorage.getItem('shadowLang');
        if (savedLang) {
            currentLang = savedLang;
            document.getElementById('langSelect').value = currentLang;
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
            setTimeout(() => {
                if(chart) chart.update('none');
            }, 100);
        }
    </script>
</body>
</html>
"""

# --- LEGAL & ABOUT TEMPLATES ---
SHARED_CSS_JS = """
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>ƒ</text></svg>">
    
    <style>
        :root {
            --bg-color: #111520; --text-color: #f8fafc; --text-muted: #94a3b8;
            --box-bg: #1e2536; --border-color: #334155; --accent: #8ab4f8; 
            --accent-guess: #ff5a00; 
            --success: #4ade80; 
            --shadow-fill: rgba(148, 163, 184, 0.15);
        }
        body.light-mode {
            --bg-color: #f8fafc; --text-color: #0f172a; --text-muted: #64748b;
            --box-bg: #ffffff; --border-color: #cbd5e1; --accent: #2563eb; 
            --accent-guess: #ea580c;
            --success: #166534;
            --shadow-fill: rgba(100, 116, 139, 0.15);
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--bg-color); color: var(--text-color);
            margin: 0; padding: 0; transition: background 0.3s, color 0.3s;
            line-height: 1.6;
        }
        /* Reduced max-width to match the main game container */
        .container { max-width: 500px; margin: 0 auto; padding: 20px 20px 60px 20px; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid var(--border-color); padding-bottom: 15px; }
        .header-right { display: flex; gap: 6px; align-items: center; }
        h1.logo-title { margin: 0; font-size: 18px; letter-spacing: 3px; font-weight: bold; text-align: center; flex-grow: 1; color: var(--text-color); }
        h2 { color: var(--accent); font-size: 18px; margin-top: 35px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; font-weight: 600; }
        a { color: var(--accent); text-decoration: none; }
        a:hover { text-decoration: underline; }
        .icon-btn { 
            background: transparent; border: 1px solid var(--border-color); color: var(--text-muted); 
            border-radius: 6px; width: 36px; height: 36px; cursor: pointer;
            display: flex; justify-content: center; align-items: center; padding: 0;
        }
        .icon-btn:hover { background: var(--box-bg); color: var(--text-color); }
        .icon-btn svg { width: 18px; height: 18px; fill: currentColor; }
        .lang-select {
            background: var(--box-bg); color: var(--accent); border: 1px solid var(--border-color);
            border-radius: 6px; padding: 6px 12px; font-weight: bold; cursor: pointer; outline: none; 
            appearance: none; text-align: center; font-size: 14px;
        }
        .content-box { background: var(--box-bg); padding: 25px; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .lang-section { display: none; }
        
        /* Game replicas */
        .svg-box { background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; margin: 15px 0; text-align: center; }
        .svg-label { font-size: 13px; color: var(--text-muted); margin-top: 15px; font-style: italic; }
        
        .input-row { display: flex; justify-content: center; gap: 8px; margin: 25px 0 10px 0; }
        .letter-box {
            width: 40px; height: 50px; font-size: 24px; font-weight: bold;
            text-align: center; text-transform: uppercase;
            background: transparent; color: var(--text-color);
            border: 2px solid var(--border-color); border-radius: 6px;
            display: flex; justify-content: center; align-items: center;
        }

        .legend { display: flex; justify-content: center; gap: 15px; font-size: 12px; margin-bottom: 10px; color: var(--text-color); font-weight: bold; }
        .leg-item { display: flex; align-items: center; gap: 5px; }
        .leg-color { width: 12px; height: 12px; border-radius: 50%; }

        footer.humble-links { margin-top: 50px; text-align: center; font-size: 13px; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 20px; }
    </style>
    <script>
        function toggleTheme() {
            document.body.classList.toggle('light-mode');
            localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
        }
        function changeLang() {
            const lang = document.getElementById('langSelect').value;
            document.querySelectorAll('.lang-section').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.lang-' + lang).forEach(el => el.style.display = 'block');
            localStorage.setItem('shadowLang', lang);
        }
        window.onload = () => {
            if(localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');
            const savedLang = localStorage.getItem('shadowLang') || 'en';
            const select = document.getElementById('langSelect');
            if(select) select.value = savedLang;
            changeLang();
        };
    </script>
"""

HEADER_HTML = """
    <header>
        <a href="/" class="icon-btn" title="Back to Game">
            <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
        </a>
        <h1 class="logo-title">SHADOWORD</h1>
        <div class="header-right">
            <select id="langSelect" class="lang-select" onchange="changeLang()">
                <option value="en">EN</option>
                <option value="es">ES</option>
                <option value="ca">CA</option>
            </select>
            <button class="icon-btn" onclick="toggleTheme()" title="Toggle Theme">
                <svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4C12.92 3.04 12.46 3 12 3z"/></svg>
            </button>
        </div>
    </header>
"""

PRIVACY_HTML = f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Privacy Policy - ShadoWord</title>{SHARED_CSS_JS}</head>
<body>
    <div class="container">
        {HEADER_HTML}
        <div class="content-box">
            <div class="lang-section lang-en">
                <h1>Privacy Policy</h1><p><em>Last Updated: March 2026</em></p>
                <p>At ShadoWord, we value your privacy. This page explains how we handle information.</p>
                <h2>1. Google AdSense</h2>
                <p>We use Google AdSense to serve ads. Google uses cookies to serve ads based on a user's prior visits to our website or other websites.</p>
                <h2>2. Cookies</h2>
                <p>You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank">Google Ads Settings</a>. We also use a basic consent management banner for EU users to comply with GDPR.</p>
                <h2>3. Analytics</h2>
                <p>We use Umami/Google Analytics to understand how many people play our game. This data is anonymous.</p>
                <footer class="humble-links">
                    Enjoying ShadoWord? Consider <a href="https://buymeacoffee.com/shadoword" target="_blank">buying me a coffee</a> (humble jiji).
                </footer>
            </div>
            <div class="lang-section lang-es">
                <h1>Política de Privacidad</h1><p><em>Última actualización: Marzo 2026</em></p>
                <p>En ShadoWord valoramos tu privacidad. Esta página explica cómo manejamos la información.</p>
                <h2>1. Google AdSense</h2>
                <p>Utilizamos Google AdSense para mostrar anuncios. Google utiliza cookies para mostrar anuncios basados en las visitas anteriores de un usuario a nuestro sitio web u otros sitios.</p>
                <h2>2. Cookies</h2>
                <p>Puedes inhabilitar la publicidad personalizada visitando la <a href="https://www.google.com/settings/ads" target="_blank">Configuración de anuncios de Google</a>. También utilizamos un banner de consentimiento para usuarios de la UE para cumplir con el RGPD.</p>
                <h2>3. Analíticas</h2>
                <p>Usamos Umami para entender cuántas personas juegan nuestro juego. Estos datos son anónimos.</p>
                <footer class="humble-links">
                    ¿Te gusta ShadoWord? Considera <a href="https://buymeacoffee.com/shadoword" target="_blank">invitarme a un café</a> (humble jiji).
                </footer>
            </div>
            <div class="lang-section lang-ca">
                <h1>Política de Privacitat</h1><p><em>Última actualització: Març 2026</em></p>
                <p>A ShadoWord valorem la teva privacitat. Aquesta pàgina explica com gestionem la informació.</p>
                <h2>1. Google AdSense</h2>
                <p>Utilitzem Google AdSense per mostrar anuncis. Google utilitza galetes per mostrar anuncis basats en les visites anteriors d'un usuari al nostre lloc web o altres llocs.</p>
                <h2>2. Galetes (Cookies)</h2>
                <p>Pots desactivar la publicitat personalitzada visitant la <a href="https://www.google.com/settings/ads" target="_blank">Configuració d'anuncis de Google</a>. També utilitzem un bàner de consentiment per a usuaris de la UE per complir amb el RGPD.</p>
                <h2>3. Analítiques</h2>
                <p>Utilitzem Umami per entendre quantes persones juguen al nostre joc. Aquestes dades són anònimes.</p>
                <footer class="humble-links">
                    T'agrada ShadoWord? Considera <a href="https://buymeacoffee.com/shadoword" target="_blank">convidar-me a un cafè</a> (humble jiji).
                </footer>
            </div>
        </div>
    </div>
</body>
</html>
"""

TERMS_HTML = f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Terms of Service - ShadoWord</title>{SHARED_CSS_JS}</head>
<body>
    <div class="container">
        {HEADER_HTML}
        <div class="content-box">
            <div class="lang-section lang-en">
                <h1>Terms of Service</h1>
                <p>ShadoWord is a free-to-play puzzle game provided "as is", without any warranties.</p>
                <p>Usage of this site implies acceptance of our cookie policy for functional and advertising purposes.</p>
                <p>Hope you enjoy playing! Remember, it's just a game designed for fun and mental exercise. Don't overthink it, and have a good time squeezing that shadow!</p>
                <footer class="humble-links">
                    Enjoying ShadoWord? Consider <a href="https://buymeacoffee.com/shadoword" target="_blank">buying me a coffee</a> (humble jiji).
                </footer>
            </div>
            <div class="lang-section lang-es">
                <h1>Términos de Servicio</h1>
                <p>ShadoWord es un juego de rompecabezas gratuito proporcionado "tal cual", sin ninguna garantía.</p>
                <p>El uso de este sitio implica la aceptación de nuestra política de cookies para fines funcionales y publicitarios.</p>
                <p>¡Esperamos que disfrutes jugando! Recuerda, es solo un juego diseñado para la diversión y el ejercicio mental. No lo pienses demasiado, ¡y diviértete exprimiendo esa sombra!</p>
                <footer class="humble-links">
                    ¿Te gusta ShadoWord? Considera <a href="https://buymeacoffee.com/shadoword" target="_blank">invitarme a un café</a> (humble jiji).
                </footer>
            </div>
            <div class="lang-section lang-ca">
                <h1>Termes de Servei</h1>
                <p>ShadoWord és un joc de trencaclosques gratuït proporcionat "tal qual", sense cap garantia.</p>
                <p>L'ús d'aquest lloc implica l'acceptació de la nostra política de galetes per a finalitats funcionals i publicitàries.</p>
                <p>Esperem que gaudeixis jugant! Recorda, és només un joc dissenyat per a la diversió i l'exercici mental. No ho pensis massa, i diverteix-te exprimint aquesta ombra!</p>
                <footer class="humble-links">
                    T'agrada ShadoWord? Considera <a href="https://buymeacoffee.com/shadoword" target="_blank">convidar-me a un cafè</a> (humble jiji).
                </footer>
            </div>
        </div>
    </div>
</body>
</html>
"""

ABOUT_HTML = f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>About - ShadoWord</title>{SHARED_CSS_JS}</head>
<body>
    <div class="container">
        {HEADER_HTML}
        <div class="content-box">
            
            <div class="lang-section lang-en">
                <h1>How to play ShadoWord</h1>
                <p>Welcome to <strong>ShadoWord</strong>, a puzzle where you don't guess letters, you hunt for the mathematical wave of a hidden word.</p>
                
                <h2>Step 1: The Hidden Target</h2>
                <p>Every word has a numerical wave based on the alphabet (A=1, B=2, C=3... Z=26). At the start of the game, there is a hidden target word. Think of it as a <strong>Green Line</strong> waiting to be found.</p>
                
                <div class="svg-box">
                    <svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none">
                        <path d="M20,40 C45,40 60,90 85,90 C110,90 125,50 150,50 C175,50 190,80 215,80 C240,80 255,60 280,60" fill="none" stroke="var(--success)" stroke-width="4"/>
                    </svg>
                    <div class="svg-label">The target is hidden. You have 6 tries to find its exact shape.</div>
                </div>

                <h2>Step 2: Your First Guess</h2>
                <p>You type your first word. The game plots it as an <strong>Orange Line</strong>. Then, it calculates the difference between your guess and the hidden target, drawing a <strong>Shadow</strong> (dashed boundaries) around your guess.</p>
                
                <div class="input-row">
                    <div class="letter-box">G</div><div class="letter-box">H</div><div class="letter-box">O</div><div class="letter-box">S</div><div class="letter-box">T</div>
                </div>

                <div class="svg-box">
                    <div class="legend">
                        <div class="leg-item"><div class="leg-color" style="background:var(--success);"></div>Target</div>
                        <div class="leg-item"><div class="leg-color" style="background:var(--accent-guess);"></div>Guess</div>
                    </div>
                    <svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none">
                        <path d="M20,40 C45,40 60,10 85,10 C110,10 125,50 150,50 C175,50 190,0 215,0 C240,0 255,60 280,60 L280,100 C255,100 240,80 215,80 C190,80 175,90 150,90 C125,90 110,90 85,90 C60,90 45,120 20,120 Z" fill="var(--shadow-fill)"/>
                        <path d="M20,40 C45,40 60,10 85,10 C110,10 125,50 150,50 C175,50 190,0 215,0 C240,0 255,60 280,60" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="5,5"/>
                        <path d="M20,120 C45,120 60,90 85,90 C110,90 125,90 150,90 C175,90 190,80 215,80 C240,80 255,100 280,100" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="5,5"/>
                        <path d="M20,40 C45,40 60,90 85,90 C110,90 125,50 150,50 C175,50 190,80 215,80 C240,80 255,60 280,60" fill="none" stroke="var(--success)" stroke-width="4"/>
                        <path d="M20,80 C45,80 60,50 85,50 C110,50 125,70 150,70 C175,70 190,40 215,40 C240,40 255,80 280,80" fill="none" stroke="var(--accent-guess)" stroke-width="3"/>
                    </svg>
                    <div class="svg-label">The target is <em>always</em> trapped inside the shadow. The wider the shadow, the further away your guess was.</div>
                </div>

                <h2>Step 3: Squeezing the Shadow</h2>
                <p>Use the shrinking boundaries to deduce the letters. When your new guess is mathematically closer, the shadow gets tighter!</p>
                
                <div class="input-row">
                    <div class="letter-box">W</div><div class="letter-box">A</div><div class="letter-box">T</div><div class="letter-box">E</div><div class="letter-box">R</div>
                </div>

                <div class="svg-box">
                    <svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none">
                        <path d="M20,40 C45,40 60,70 85,70 C110,70 125,30 150,30 C175,30 190,60 215,60 C240,60 255,40 280,40 L280,60 C255,60 240,80 215,80 C190,80 175,50 150,50 C125,50 110,90 85,90 C60,90 45,60 20,60 Z" fill="var(--shadow-fill)"/>
                        <path d="M20,40 C45,40 60,70 85,70 C110,70 125,30 150,30 C175,30 190,60 215,60 C240,60 255,40 280,40" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="5,5"/>
                        <path d="M20,60 C45,60 60,90 85,90 C110,90 125,50 150,50 C175,50 190,80 215,80 C240,80 255,60 280,60" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="5,5"/>
                        <path d="M20,40 C45,40 60,90 85,90 C110,90 125,50 150,50 C175,50 190,80 215,80 C240,80 255,60 280,60" fill="none" stroke="var(--success)" stroke-width="4"/>
                        <path d="M20,50 C45,50 60,80 85,80 C110,80 125,40 150,40 C175,40 190,70 215,70 C240,70 255,50 280,50" fill="none" stroke="var(--accent-guess)" stroke-width="3"/>
                    </svg>
                    <div class="svg-label">A great guess! The shadow boundaries squeeze tightly around the target, revealing the correct word.</div>
                </div>
                
                <footer class="humble-links">
                    Enjoying the challenge? Consider <a href="https://buymeacoffee.com/shadoword" target="_blank">buying me a coffee</a> (humble jiji).
                </footer>
            </div>
            
            <div class="lang-section lang-es">
                <h1>Cómo jugar ShadoWord</h1>
                <p>Bienvenido a <strong>ShadoWord</strong>, un rompecabezas donde no adivinas letras, sino que cazas la onda matemática de una palabra oculta.</p>
                
                <h2>Paso 1: El Objetivo Oculto</h2>
                <p>Cada palabra tiene una onda numérica (A=1, B=2... Z=26). Al inicio, hay una palabra oculta. Imagínala como una <strong>Línea Verde</strong> esperando ser descubierta.</p>
                
                <div class="svg-box">
                    <svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none">
                        <path d="M20,40 C45,40 60,90 85,90 C110,90 125,50 150,50 C175,50 190,80 215,80 C240,80 255,60 280,60" fill="none" stroke="var(--success)" stroke-width="4"/>
                    </svg>
                    <div class="svg-label">El objetivo está oculto. Tienes 6 intentos para encontrar su forma exacta.</div>
                </div>

                <h2>Paso 2: Tu Primer Intento</h2>
                <p>Escribes tu primera palabra. El juego la dibuja como una <strong>Línea Naranja</strong>. Luego, calcula la diferencia con el objetivo y dibuja una <strong>Sombra</strong> (límites discontinuos) alrededor de tu intento.</p>
                
                <div class="input-row">
                    <div class="letter-box">G</div><div class="letter-box">H</div><div class="letter-box">O</div><div class="letter-box">S</div><div class="letter-box">T</div>
                </div>

                <div class="svg-box">
                    <div class="legend">
                        <div class="leg-item"><div class="leg-color" style="background:var(--success);"></div>Objetivo</div>
                        <div class="leg-item"><div class="leg-color" style="background:var(--accent-guess);"></div>Intento</div>
                    </div>
                    <svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none">
                        <path d="M20,40 C45,40 60,10 85,10 C110,10 125,50 150,50 C175,50 190,0 215,0 C240,0 255,60 280,60 L280,100 C255,100 240,80 215,80 C190,80 175,90 150,90 C125,90 110,90 85,90 C60,90 45,120 20,120 Z" fill="var(--shadow-fill)"/>
                        <path d="M20,40 C45,40 60,10 85,10 C110,10 125,50 150,50 C175,50 190,0 215,0 C240,0 255,60 280,60" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="5,5"/>
                        <path d="M20,120 C45,120 60,90 85,90 C110,90 125,90 150,90 C175,90 190,80 215,80 C240,80 255,100 280,100" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="5,5"/>
                        <path d="M20,40 C45,40 60,90 85,90 C110,90 125,50 150,50 C175,50 190,80 215,80 C240,80 255,60 280,60" fill="none" stroke="var(--success)" stroke-width="4"/>
                        <path d="M20,80 C45,80 60,50 85,50 C110,50 125,70 150,70 C175,70 190,40 215,40 C240,40 255,80 280,80" fill="none" stroke="var(--accent-guess)" stroke-width="3"/>
                    </svg>
                    <div class="svg-label">El objetivo <em>siempre</em> está atrapado dentro de la sombra. Cuanto más ancha es, más lejos estabas.</div>
                </div>

                <h2>Paso 3: Reduciendo la Sombra</h2>
                <p>Usa los límites para deducir las letras. Cuando tu nuevo intento es matemáticamente más cercano, ¡la sombra se estrecha!</p>
                
                <div class="input-row">
                    <div class="letter-box">W</div><div class="letter-box">A</div><div class="letter-box">T</div><div class="letter-box">E</div><div class="letter-box">R</div>
                </div>

                <div class="svg-box">
                    <svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none">
                        <path d="M20,40 C45,40 60,70 85,70 C110,70 125,30 150,30 C175,30 190,60 215,60 C240,60 255,40 280,40 L280,60 C255,60 240,80 215,80 C190,80 175,50 150,50 C125,50 110,90 85,90 C60,90 45,60 20,60 Z" fill="var(--shadow-fill)"/>
                        <path d="M20,40 C45,40 60,70 85,70 C110,70 125,30 150,30 C175,30 190,60 215,60 C240,60 255,40 280,40" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="5,5"/>
                        <path d="M20,60 C45,60 60,90 85,90 C110,90 125,50 150,50 C175,50 190,80 215,80 C240,80 255,60 280,60" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="5,5"/>
                        <path d="M20,40 C45,40 60,90 85,90 C110,90 125,50 150,50 C175,50 190,80 215,80 C240,80 255,60 280,60" fill="none" stroke="var(--success)" stroke-width="4"/>
                        <path d="M20,50 C45,50 60,80 85,80 C110,80 125,40 150,40 C175,40 190,70 215,70 C240,70 255,50 280,50" fill="none" stroke="var(--accent-guess)" stroke-width="3"/>
                    </svg>
                    <div class="svg-label">¡Un gran intento! Los límites se estrechan alrededor del objetivo, revelando la palabra.</div>
                </div>
                
                <footer class="humble-links">
                    ¿Te gusta el desafío? Considera <a href="https://buymeacoffee.com/shadoword" target="_blank">invitarme a un café</a> (humble jiji).
                </footer>
            </div>

            <div class="lang-section lang-ca">
                <h1>Com jugar ShadoWord</h1>
                <p>Benvingut a <strong>ShadoWord</strong>, un trencaclosques on no endevines lletres, sinó que caces l'ona matemàtica d'una paraula oculta.</p>
                
                <h2>Pas 1: L'Objectiu Ocult</h2>
                <p>Cada paraula té una ona numèrica (A=1, B=2... Z=26). A l'inici, hi ha una paraula oculta. Imagina-la com una <strong>Línia Verda</strong> esperant ser descoberta.</p>
                
                <div class="svg-box">
                    <svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none">
                        <path d="M20,40 C45,40 60,90 85,90 C110,90 125,50 150,50 C175,50 190,80 215,80 C240,80 255,60 280,60" fill="none" stroke="var(--success)" stroke-width="4"/>
                    </svg>
                    <div class="svg-label">L'objectiu està ocult. Tens 6 intents per trobar la seva forma exacta.</div>
                </div>

                <h2>Pas 2: El Teu Primer Intent</h2>
                <p>Escrius la teva primera paraula. El joc la dibuixa com una <strong>Línia Taronja</strong>. Després, calcula la diferència amb l'objectiu i dibuixa una <strong>Ombra</strong> (límits discontinus) al voltant del teu intent.</p>
                
                <div class="input-row">
                    <div class="letter-box">G</div><div class="letter-box">H</div><div class="letter-box">O</div><div class="letter-box">S</div><div class="letter-box">T</div>
                </div>

                <div class="svg-box">
                    <div class="legend">
                        <div class="leg-item"><div class="leg-color" style="background:var(--success);"></div>Objectiu</div>
                        <div class="leg-item"><div class="leg-color" style="background:var(--accent-guess);"></div>Intent</div>
                    </div>
                    <svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none">
                        <path d="M20,40 C45,40 60,10 85,10 C110,10 125,50 150,50 C175,50 190,0 215,0 C240,0 255,60 280,60 L280,100 C255,100 240,80 215,80 C190,80 175,90 150,90 C125,90 110,90 85,90 C60,90 45,120 20,120 Z" fill="var(--shadow-fill)"/>
                        <path d="M20,40 C45,40 60,10 85,10 C110,10 125,50 150,50 C175,50 190,0 215,0 C240,0 255,60 280,60" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="5,5"/>
                        <path d="M20,120 C45,120 60,90 85,90 C110,90 125,90 150,90 C175,90 190,80 215,80 C240,80 255,100 280,100" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="5,5"/>
                        <path d="M20,40 C45,40 60,90 85,90 C110,90 125,50 150,50 C175,50 190,80 215,80 C240,80 255,60 280,60" fill="none" stroke="var(--success)" stroke-width="4"/>
                        <path d="M20,80 C45,80 60,50 85,50 C110,50 125,70 150,70 C175,70 190,40 215,40 C240,40 255,80 280,80" fill="none" stroke="var(--accent-guess)" stroke-width="3"/>
                    </svg>
                    <div class="svg-label">L'objectiu <em>sempre</em> està atrapat dins l'ombra. Com més ampla és, més lluny estaves.</div>
                </div>

                <h2>Pas 3: Reduint l'Ombra</h2>
                <p>Usa els límits per deduir les lletres. Quan el teu nou intent és matemàticament més proper, l'ombra s'estreny!</p>
                
                <div class="input-row">
                    <div class="letter-box">W</div><div class="letter-box">A</div><div class="letter-box">T</div><div class="letter-box">E</div><div class="letter-box">R</div>
                </div>

                <div class="svg-box">
                    <svg width="100%" height="120" viewBox="0 0 300 120" preserveAspectRatio="none">
                        <path d="M20,40 C45,40 60,70 85,70 C110,70 125,30 150,30 C175,30 190,60 215,60 C240,60 255,40 280,40 L280,60 C255,60 240,80 215,80 C190,80 175,50 150,50 C125,50 110,90 85,90 C60,90 45,60 20,60 Z" fill="var(--shadow-fill)"/>
                        <path d="M20,40 C45,40 60,70 85,70 C110,70 125,30 150,30 C175,30 190,60 215,60 C240,60 255,40 280,40" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="5,5"/>
                        <path d="M20,60 C45,60 60,90 85,90 C110,90 125,50 150,50 C175,50 190,80 215,80 C240,80 255,60 280,60" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="5,5"/>
                        <path d="M20,40 C45,40 60,90 85,90 C110,90 125,50 150,50 C175,50 190,80 215,80 C240,80 255,60 280,60" fill="none" stroke="var(--success)" stroke-width="4"/>
                        <path d="M20,50 C45,50 60,80 85,80 C110,80 125,40 150,40 C175,40 190,70 215,70 C240,70 255,50 280,50" fill="none" stroke="var(--accent-guess)" stroke-width="3"/>
                    </svg>
                    <div class="svg-label">Un gran intent! Els límits s'estrenyen al voltant de l'objectiu, revelant la paraula.</div>
                </div>
                
                <footer class="humble-links">
                    T'agrada el desafiament? Considera <a href="https://buymeacoffee.com/shadoword" target="_blank">convidar-me a un cafè</a> (humble jiji).
                </footer>
            </div>
        </div>
    </div>
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
    
    session_key = f'target_word_{lang}'
    if session_key not in session:
        session[session_key] = random.choice(list(DICTIONARIES[lang]))
        
    current_target = session[session_key]
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
    
    session_key = f'target_word_{lang}'
    session[session_key] = random.choice(list(DICTIONARIES[lang]))

    print(f"[{lang.upper()}] Cheat: New target word is: {session[session_key]}")
    
    return jsonify({"status": "reset"})

@app.route('/privacy')
def privacy():
    return render_template_string(PRIVACY_HTML)

@app.route('/terms')
def terms():
    return render_template_string(TERMS_HTML)

@app.route('/about')
def about():
    return render_template_string(ABOUT_HTML)

@app.route('/ads.txt')
def ads_txt():
    # Google's standard ads.txt line for AdSense
    ads_content = "google.com, pub-2459227402455868, DIRECT, f08c47fec0942fa0"
    return ads_content, 200, {'Content-Type': 'text/plain'}

if __name__ == '__main__':
    # Use environment variables for the port (required by many cloud hosts)
    # Turn debug=False to prevent security vulnerabilities in production
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)