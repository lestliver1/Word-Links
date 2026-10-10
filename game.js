(() => {
  'use strict';

  const SIZE = 15;
  const START_WORDS = [
    'CAT', 'DOG', 'SUN', 'MAP', 'INK', 'PEN', 'BIRD', 'FISH', 'TREE', 'MOON',
    'BOOK', 'RAIN', 'STAR', 'WIND', 'PAPER', 'RIVER', 'STONE', 'LIGHT', 'MUSIC',
    'WATER', 'APPLE', 'CHAIR', 'CLOUD', 'DREAM', 'FIELD', 'GREEN', 'HEART',
    'HOUSE', 'NIGHT', 'OCEAN', 'PAINT', 'QUEEN', 'SMILE', 'SOUND', 'TRAIN',
    'BRIDGE', 'GARDEN', 'PLANET', 'POCKET', 'SILVER', 'MARKET', 'ANIMAL',
    'BANANA', 'BASKET', 'BUTTON', 'CANDLE', 'CASTLE', 'CIRCLE', 'COFFEE',
    'COOKIE', 'COTTON', 'DRAGON', 'FLOWER', 'FOREST', 'GOLDEN', 'HAMMER',
    'ISLAND', 'JACKET', 'JUNGLE', 'KITTEN', 'LADDER', 'LETTER', 'MAGNET',
    'MARBLE', 'MEADOW', 'MIRROR', 'ORANGE', 'PENCIL', 'RABBIT', 'ROCKET',
    'SCHOOL', 'SHADOW', 'SPIDER', 'SPRING', 'SUMMER', 'SUNSET', 'TOMATO',
    'TURTLE', 'WINDOW', 'WINTER', 'YELLOW'
  ];
  const DIFFICULTY = [
    { name: 'Easy', rowGap: 2, colGap: 0, minLength: 3, maxLength: 4 },
    { name: 'Gentle', rowGap: 3, colGap: 0, minLength: 3, maxLength: 4 },
    { name: 'Moderate', rowGap: 4, colGap: 1, minLength: 4, maxLength: 5 },
    { name: 'Tricky', rowGap: 5, colGap: 2, minLength: 4, maxLength: 5 },
    { name: 'Hard', rowGap: 6, colGap: 3, minLength: 5, maxLength: 6 },
    { name: 'Tough', rowGap: 8, colGap: 4, minLength: 5, maxLength: 6 },
    { name: 'Expert', rowGap: 10, colGap: 5, minLength: 6, maxLength: 6 }
  ];

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function parseDateKey(key) {
    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (dateKey(date) !== key) throw new Error('Invalid puzzle date');
    return date;
  }

  function hashDate(key) {
    let hash = 2166136261;
    for (const character of `word-links-v1:${key}`) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = seed;
    return () => {
      state = (state + 0x6D2B79F5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function puzzleForDate(key) {
    const date = parseDateKey(key);
    const level = DIFFICULTY[date.getDay()];
    const random = seededRandom(hashDate(key));
    const candidates = START_WORDS.filter(word => word.length >= level.minLength && word.length <= level.maxLength);
    const first = candidates.splice(Math.floor(random() * candidates.length), 1)[0];
    const second = candidates[Math.floor(random() * candidates.length)];
    const firstCol = Math.floor(random() * (SIZE - level.colGap - level.maxLength + 1));
    const secondCol = firstCol + level.colGap;
    const firstRow = Math.floor(random() * (SIZE - level.rowGap));
    const secondRow = firstRow + level.rowGap;
    return {
      date: key,
      difficulty: level.name,
      words: [
        { text: first, row: firstRow, col: firstCol, direction: 'horizontal' },
        { text: second, row: secondRow, col: secondCol, direction: 'horizontal' }
      ]
    };
  }

  const els = {
    home: document.querySelector('#homeScreen'),
    game: document.querySelector('#gameScreen'),
    grid: document.querySelector('#grid'),
    score: document.querySelector('#score'),
    puzzleNumber: document.querySelector('#puzzleNumber'),
    puzzleDate: document.querySelector('#puzzleDate'),
    difficulty: document.querySelector('#difficulty'),
    word: document.querySelector('#wordInput'),
    position: document.querySelector('#selectedPosition'),
    message: document.querySelector('#message'),
    place: document.querySelector('#placeButton'),
    rules: document.querySelector('#rulesDialog'),
    win: document.querySelector('#winDialog'),
    finalMoves: document.querySelector('#finalMoves'),
    finalScore: document.querySelector('#finalScore'),
    calendar: document.querySelector('#calendarDialog'),
    calendarMonth: document.querySelector('#calendarMonth'),
    calendarDays: document.querySelector('#calendarDays'),
    previousMonth: document.querySelector('#previousMonth'),
    nextMonth: document.querySelector('#nextMonth')
  };

  let cells = [];
  let words = [];
  let selected = null;
  let score = 0;
  let moves = 0;
  let activeDate = null;
  let displayedMonth = null;
  let nextWordId = 0;

  function makeBoard() {
    els.grid.innerHTML = '';
    cells = Array.from({ length: SIZE }, (_, row) =>
      Array.from({ length: SIZE }, (_, col) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cell';
        button.setAttribute('role', 'gridcell');
        button.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}, empty`);
        button.dataset.row = row;
        button.dataset.col = col;
        button.addEventListener('click', () => selectCell(row, col));
        els.grid.append(button);
        return { letter: '', wordIds: new Set(), element: button };
      })
    );
  }

  function startGame(key = dateKey(new Date())) {
    const puzzle = puzzleForDate(key);
    activeDate = key;
    score = 0;
    moves = 0;
    selected = null;
    words = [];
    nextWordId = 0;
    makeBoard();
    puzzle.words.forEach((word, index) => addWord(word.text, word.row, word.col, word.direction, true, index));
    els.score.textContent = '0';
    els.puzzleNumber.textContent = key;
    els.puzzleDate.textContent = parseDateKey(key).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    els.difficulty.textContent = puzzle.difficulty;
    els.word.value = '';
    els.position.textContent = '—';
    setMessage('');
    showScreen('game');
    requestAnimationFrame(() => els.word.focus());
  }

  function showScreen(name) {
    els.home.classList.toggle('is-active', name === 'home');
    els.game.classList.toggle('is-active', name === 'game');
  }

  function addWord(text, row, col, direction, isStart = false, startIndex = null, crossedIds = []) {
    const id = nextWordId++;
    const word = { id, text, row, col, direction, isStart, startIndex, links: new Set(crossedIds) };
    words.push(word);
    crossedIds.forEach(otherId => words.find(item => item.id === otherId)?.links.add(id));

    for (let index = 0; index < text.length; index++) {
      const r = row + (direction === 'vertical' ? index : 0);
      const c = col + (direction === 'horizontal' ? index : 0);
      const cell = cells[r][c];
      cell.letter = text[index];
      cell.wordIds.add(id);
      cell.element.textContent = text[index];
      cell.element.classList.add('filled');
      cell.element.classList.toggle('start', [...cell.wordIds].some(wordId => words.find(item => item.id === wordId)?.isStart));
      cell.element.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}, letter ${text[index]}${isStart ? ', starting word' : ''}`);
    }
  }

  function selectCell(row, col) {
    document.querySelectorAll('.cell.selected').forEach(cell => cell.classList.remove('selected'));
    selected = { row, col };
    cells[row][col].element.classList.add('selected');
    els.position.textContent = `${columnName(col)}${row + 1}`;
    setMessage('');
    updatePreview();
    els.word.focus();
  }

  function columnName(col) {
    return String.fromCharCode(65 + col);
  }

  function getDirection() {
    return document.querySelector('input[name="direction"]:checked').value;
  }

  function clearPreview() {
    document.querySelectorAll('.cell.preview, .cell.preview-conflict').forEach(cell => cell.classList.remove('preview', 'preview-conflict'));
  }

  function updatePreview() {
    clearPreview();
    if (!selected) return;
    const text = cleanWord(els.word.value);
    const direction = getDirection();
    for (let index = 0; index < text.length; index++) {
      const row = selected.row + (direction === 'vertical' ? index : 0);
      const col = selected.col + (direction === 'horizontal' ? index : 0);
      if (!inBounds(row, col)) break;
      const cell = cells[row][col];
      const conflict = cell.letter && cell.letter !== text[index];
      cell.element.classList.add(conflict ? 'preview-conflict' : 'preview');
    }
  }

  function cleanWord(value) {
    return value.toUpperCase().replace(/[^A-Z]/g, '');
  }

  function inBounds(row, col) {
    return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
  }

  function validatePlacement(text, row, col, direction) {
    if (text.length < 2) return { ok: false, message: 'Enter a word with at least two letters.' };
    if (!window.WORD_LIST.has(text.toLowerCase())) return { ok: false, message: `${text} is not in the dictionary. Try another word.` };
    const endRow = row + (direction === 'vertical' ? text.length - 1 : 0);
    const endCol = col + (direction === 'horizontal' ? text.length - 1 : 0);
    if (!inBounds(endRow, endCol)) return { ok: false, message: 'That word runs off the board.' };

    const crossedIds = new Set();
    let overlapCount = 0;
    let newLetterCount = 0;

    for (let index = 0; index < text.length; index++) {
      const r = row + (direction === 'vertical' ? index : 0);
      const c = col + (direction === 'horizontal' ? index : 0);
      const cell = cells[r][c];
      if (cell.letter) {
        if (cell.letter !== text[index]) return { ok: false, message: `The letter at ${columnName(c)}${r + 1} does not match.` };
        overlapCount++;
        cell.wordIds.forEach(id => crossedIds.add(id));
      } else {
        newLetterCount++;
      }
    }

    if (overlapCount === 0) return { ok: false, message: 'Your word must cross a word already on the board.' };
    if (newLetterCount === 0) return { ok: false, message: 'Add at least one new letter to the board.' };

    return { ok: true, crossedIds: [...crossedIds] };
  }

  function reachableFrom(startId) {
    const seen = new Set([startId]);
    const queue = [startId];
    while (queue.length) {
      const currentId = queue.shift();
      const current = words.find(word => word.id === currentId);
      current.links.forEach(id => {
        if (!seen.has(id)) { seen.add(id); queue.push(id); }
      });
    }
    return seen;
  }

  function areStartsConnected() {
    const starts = words.filter(word => word.isStart);
    return reachableFrom(starts[0].id).has(starts[1].id);
  }

  function placeCurrentWord() {
    const text = cleanWord(els.word.value);
    els.word.value = text;
    if (!selected) { setMessage('Choose a starting square on the board.', true); return; }
    const direction = getDirection();
    const result = validatePlacement(text, selected.row, selected.col, direction);
    if (!result.ok) { setMessage(result.message, true); return; }

    addWord(text, selected.row, selected.col, direction, false, null, result.crossedIds);
    const cost = 10 + text.length;
    score += cost;
    moves++;
    els.score.textContent = score;
    clearPreview();
    document.querySelectorAll('.cell.selected').forEach(cell => cell.classList.remove('selected'));
    selected = null;
    els.position.textContent = '—';
    els.word.value = '';
    setMessage(`${text} placed for ${cost} points.`);

    if (areStartsConnected()) {
      els.finalMoves.textContent = `${moves} ${moves === 1 ? 'move' : 'moves'}`;
      els.finalScore.textContent = `${score} ${score === 1 ? 'point' : 'points'}`;
      window.setTimeout(() => els.win.showModal(), 250);
    }
  }

  function setMessage(text, error = false) {
    els.message.textContent = text;
    els.message.classList.toggle('error', error);
  }

  function showCalendar() {
    const today = new Date();
    displayedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    renderCalendar();
    els.calendar.showModal();
  }

  function renderCalendar() {
    const year = displayedMonth.getFullYear();
    const month = displayedMonth.getMonth();
    const today = dateKey(new Date());
    els.calendarMonth.textContent = displayedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    els.calendarDays.innerHTML = '';
    for (let i = 0; i < displayedMonth.getDay(); i++) {
      const spacer = document.createElement('span');
      spacer.className = 'calendar-spacer';
      els.calendarDays.append(spacer);
    }
    const days = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= days; day++) {
      const key = dateKey(new Date(year, month, day));
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'calendar-day';
      button.textContent = String(day);
      button.title = `${key} · ${DIFFICULTY[new Date(year, month, day).getDay()].name}`;
      button.setAttribute('aria-label', button.title);
      if (key === today) button.classList.add('today');
      if (key === activeDate) button.classList.add('active-date');
      button.disabled = key > today;
      button.addEventListener('click', () => { els.calendar.close(); startGame(key); });
      els.calendarDays.append(button);
    }
    els.nextMonth.disabled = year === new Date().getFullYear() && month === new Date().getMonth();
  }

  document.querySelector('#playButton').addEventListener('click', () => startGame());
  document.querySelector('#calendarButton').addEventListener('click', showCalendar);
  document.querySelector('#closeCalendar').addEventListener('click', () => els.calendar.close());
  els.previousMonth.addEventListener('click', () => { displayedMonth.setMonth(displayedMonth.getMonth() - 1); renderCalendar(); });
  els.nextMonth.addEventListener('click', () => { displayedMonth.setMonth(displayedMonth.getMonth() + 1); renderCalendar(); });
  document.querySelector('#modalPlayButton').addEventListener('click', () => {
    if (!els.game.classList.contains('is-active')) startGame();
  });
  document.querySelectorAll('[data-open-rules]').forEach(button => button.addEventListener('click', () => els.rules.showModal()));
  document.querySelectorAll('[data-go-home]').forEach(button => button.addEventListener('click', () => showScreen('home')));
  document.querySelectorAll('input[name="direction"]').forEach(input => input.addEventListener('change', updatePreview));
  els.word.addEventListener('input', () => {
    const cleaned = cleanWord(els.word.value);
    if (els.word.value !== cleaned) els.word.value = cleaned;
    updatePreview();
  });
  els.word.addEventListener('keydown', event => { if (event.key === 'Enter') placeCurrentWord(); });
  els.place.addEventListener('click', placeCurrentWord);
  document.querySelector('#menuButton').addEventListener('click', () => { els.win.close(); showScreen('home'); });

  [els.rules, els.win, els.calendar].forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  }));
})();
