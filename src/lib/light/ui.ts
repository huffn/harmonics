// GM controls: mirrors by mouse, harmonics by drag, hidden keys, reset and
// saving the board so an accidental reload loses nothing. The save lives in
// sessionStorage: it survives a reload but not closing the tab, so a rehearsal
// never carries over to game night.
import type { Color } from './geometry';
import { level } from './level';
import { cellFromEvent, COLOR_HEX, createBoard, drawDynamic } from './render';
import * as S from './state';
import type { TableState } from './state';
import { trace } from './trace';

const STORAGE_KEY = 'puzzle:light';
const NONE_LEFT = 'No mirrors left.';
const REVEAL_WORD = 'harmonic';

type Cell = { c: number; r: number } | null;

export function mountTable(root: HTMLElement): { destroy(): void; fullReset(): void } {
  let s: TableState;
  let showSolution = false;
  let messageTimer: ReturnType<typeof setTimeout> | undefined;
  let justDragged = false;
  let typed = '';
  // Cleanups for everything added to window/document, so destroy() leaves nothing behind.
  const cleanups: (() => void)[] = [];
  const listen = (
    target: Window | Element, type: string, fn: (e: any) => void, opts?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };

  const $ = (id: string) => root.querySelector<HTMLElement>(`#${id}`)!;
  const stack = $('board-stack');
  const svg = createBoard(stack, level); // the interactive board layer

  function save() {
    try {
      sessionStorage.setItem(STORAGE_KEY, S.serialize(s));
    } catch {
      // Storage can be unavailable (private window); the board still works.
    }
  }

  function load(): TableState | null {
    try {
      return S.deserialize(level, sessionStorage.getItem(STORAGE_KEY) as string);
    } catch {
      return null;
    }
  }

  function say(text: string) {
    const el = $('message');
    el.textContent = text;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => (el.textContent = ''), 3000);
  }

  function update() {
    const result = trace(level, s);
    drawDynamic(stack, level, s, result, { showSolution });
    $('mirrors-used').textContent = String(s.mirrors.size);
    $('mirrors-available').textContent = String(s.mirrorsAvailable);
    $('lit-count').textContent = String(Object.values(result.lit).filter(Boolean).length);
    for (const card of root.querySelectorAll<HTMLElement>('.harmonics-only')) card.hidden = !s.harmonicsRevealed;
    for (const token of root.querySelectorAll<HTMLElement>('.token')) {
      const placed = token.dataset.piece === 'splitter' ? s.splitterPlaced : s.harmonics[token.dataset.color as Color];
      token.classList.toggle('placed', !!placed);
    }
    save();
  }

  // --- Mirrors -------------------------------------------------------------

  function onBoardClick(evt: MouseEvent) {
    if (evt.button !== 0) return;
    const cell = cellFromEvent(svg, evt);
    if (!cell) return;
    if (s.mirrors.has(`${cell.c},${cell.r}`)) {
      S.rotateMirror(s, cell.c, cell.r, evt.shiftKey ? -1 : 1);
    } else {
      const res = S.placeMirror(level, s, cell.c, cell.r);
      if (!res.ok && res.reason === 'none-left') say(NONE_LEFT);
    }
    update();
  }

  function onBoardContextMenu(evt: MouseEvent) {
    evt.preventDefault();
    const cell = cellFromEvent(svg, evt);
    if (cell && s.mirrors.has(`${cell.c},${cell.r}`)) {
      S.removeMirror(s, cell.c, cell.r);
      update();
    }
  }

  function onBoardWheel(evt: WheelEvent) {
    const cell = cellFromEvent(svg, evt);
    if (!cell || !s.mirrors.has(`${cell.c},${cell.r}`)) return;
    evt.preventDefault();
    S.rotateMirror(s, cell.c, cell.r, evt.deltaY > 0 ? 1 : -1);
    update();
  }

  // --- Harmonics -----------------------------------------------------------

  // `piece` is a harmonic's color or 'splitter'.
  function startDrag(piece: Color | 'splitter', evt: PointerEvent, onDrop: (cell: Cell) => void) {
    evt.preventDefault();
    const ghost = document.createElement('div');
    if (piece === 'splitter') {
      ghost.className = 'drag-ghost prism-ghost';
    } else {
      ghost.className = 'drag-ghost';
      ghost.style.background = COLOR_HEX[piece];
      ghost.style.color = COLOR_HEX[piece];
    }
    document.body.appendChild(ghost);
    const move = (e: PointerEvent) => {
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
    };
    move(evt);
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      ghost.remove();
      const i = cleanups.indexOf(stop);
      if (i >= 0) cleanups.splice(i, 1);
    };
    const up = (e: PointerEvent) => {
      stop();
      // The click that follows a drop must not also place a mirror.
      justDragged = true;
      setTimeout(() => (justDragged = false), 0);
      onDrop(cellFromEvent(svg, e));
      update();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    // A drag in flight when the page is torn down must not leave listeners or a ghost behind.
    cleanups.push(stop);
  }

  function onTokenDown(evt: PointerEvent) {
    const token = (evt.target as Element).closest<HTMLElement>('.token');
    if (!token || evt.button !== 0) return;
    if (token.dataset.piece === 'splitter') {
      if (s.splitterPlaced) return;
      startDrag('splitter', evt, (cell) => cell && S.placeSplitter(level, s, cell.c, cell.r));
      return;
    }
    const color = token.dataset.color as Color;
    if (s.harmonics[color]) return;
    // Any empty temple slot takes it; anywhere else it quietly returns.
    startDrag(color, evt, (cell) => cell && S.placeHarmonic(level, s, color, cell.c, cell.r));
  }

  function onBoardPointerDown(evt: PointerEvent) {
    if (evt.button !== 0) return;
    const target = evt.target as Element;
    if (target.closest('.splitter-piece')) {
      const sp = level.splitter;
      startDrag('splitter', evt, (cell) => {
        if (!cell || cell.c !== sp.c || cell.r !== sp.r) S.removeSplitter(s);
      });
      return;
    }
    const piece = target.closest<SVGElement>('.harmonic');
    if (!piece) return;
    const color = piece.dataset.color as Color;
    // Dropped on another empty slot it moves there; anywhere else, back to the panel.
    startDrag(color, evt, (cell) => {
      if (!cell || !S.placeHarmonic(level, s, color, cell.c, cell.r).ok) S.removeHarmonic(s, color);
    });
  }

  // --- Keys and reset -------------------------------------------------------

  // Typing the word "harmonic" anywhere on the page reveals the harmonics.
  function watchForRevealWord(evt: KeyboardEvent) {
    if (!s || evt.altKey || evt.ctrlKey || evt.metaKey) return;
    if (evt.key.length !== 1) return;
    typed = (typed + evt.key.toLowerCase()).slice(-REVEAL_WORD.length);
    if (typed === REVEAL_WORD && !s.harmonicsRevealed) {
      S.revealHarmonics(s);
      update();
    }
  }

  function onKey(evt: KeyboardEvent) {
    watchForRevealWord(evt);
    if (!evt.altKey || !evt.shiftKey) return;
    if (evt.code === 'KeyS') {
      evt.preventDefault();
      showSolution = !showSolution;
      update();
    }
  }

  // Starts over completely, as if in a new tab: harmonics hidden again and the
  // solution overlay off.
  function fullReset() {
    s = S.createState(level);
    showSolution = false;
    typed = '';
    $('message').textContent = '';
    update();
  }

  function onReset(evt: MouseEvent) {
    if (evt.shiftKey) {
      if (!confirm('Start the puzzle over from the very beginning?')) return;
      fullReset();
      return;
    }
    if (!confirm('Clear every mirror, harmonic and the prism from the table?')) return;
    S.resetBoard(s);
    update();
  }

  listen(stack.querySelector('.bowl')!, 'click', () => {
    if (s.lightUncovered) return;
    S.uncoverLight(s);
    update();
  });
  listen(svg, 'click', (evt: MouseEvent) => {
    if (!justDragged && !(evt.target as Element).closest('.harmonic, .splitter-piece')) onBoardClick(evt);
  });
  listen(svg, 'contextmenu', onBoardContextMenu);
  listen(svg, 'wheel', onBoardWheel, { passive: false });
  listen(svg, 'pointerdown', onBoardPointerDown);
  listen($('tray'), 'pointerdown', onTokenDown);
  listen($('prism-tray'), 'pointerdown', onTokenDown);
  listen($('reset'), 'click', onReset);
  listen(window, 'keydown', onKey);

  // The party always has the full set of mirrors.
  s = load() || S.createState(level);
  S.setMirrorsAvailable(s, S.MAX_MIRRORS);
  update();

  return {
    fullReset,
    destroy() {
      for (const fn of [...cleanups]) fn();
      cleanups.length = 0;
      clearTimeout(messageTimer);
    },
  };
}
