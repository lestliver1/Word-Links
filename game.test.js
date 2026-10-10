const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

function setupGame(today = '2026-10-10') {
  const elements = new Map();
  let direction = 'horizontal';
  const RealDate = Date;
  class FixedDate extends RealDate {
    constructor(...args) { super(...(args.length ? args : [`${today}T12:00:00`])); }
  }

  function element() {
    const classes = new Set();
    const listeners = new Map();
    const children = [];
    return {
      children,
      classList: {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        contains: name => classes.has(name),
        toggle: (name, force) => force ? classes.add(name) : classes.delete(name)
      },
      addEventListener: (name, callback) => listeners.set(name, callback),
      click() { if (!this.disabled) listeners.get('click')?.(); },
      setAttribute(name, value) { this[name] = value; },
      focus() {},
      append(child) { children.push(child); },
      showModal() { this.open = true; },
      close() { this.open = false; },
      dataset: {},
      textContent: '',
      value: '',
      disabled: false,
      set innerHTML(_) { children.length = 0; }
    };
  }

  const ids = ['homeScreen', 'gameScreen', 'grid', 'score', 'puzzleNumber', 'puzzleDate',
    'difficulty', 'wordInput', 'selectedPosition', 'message', 'placeButton',
    'rulesDialog', 'winDialog', 'finalMoves', 'finalScore', 'playButton',
    'modalPlayButton', 'menuButton', 'calendarButton', 'calendarDialog',
    'calendarMonth', 'calendarDays', 'previousMonth', 'nextMonth', 'closeCalendar'];
  ids.forEach(id => elements.set(`#${id}`, element()));
  elements.get('#homeScreen').classList.add('is-active');

  const document = {
    createElement: element,
    querySelector(selector) {
      if (selector === 'input[name="direction"]:checked') return { value: direction };
      return elements.get(selector);
    },
    querySelectorAll(selector) {
      const cells = elements.get('#grid').children;
      if (selector === '.cell.selected') return cells.filter(cell => cell.classList.contains('selected'));
      if (selector === '.cell.preview, .cell.preview-conflict') {
        return cells.filter(cell => cell.classList.contains('preview') || cell.classList.contains('preview-conflict'));
      }
      return [];
    }
  };
  const window = { setTimeout() {} };
  const context = vm.createContext({ document, window, Date: FixedDate, requestAnimationFrame() {} });
  vm.runInContext(fs.readFileSync('word-list.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('game.js', 'utf8'), context);

  return {
    get: id => elements.get(`#${id}`),
    cell: (row, col) => elements.get('#grid').children[row * 15 + col],
    board: () => elements.get('#grid').children.map(cell => cell.textContent).join(''),
    chooseDate: day => elements.get('#calendarDays').children.find(cell => cell.textContent === String(day)).click(),
    setDirection: value => { direction = value; }
  };
}

test('today has one stable hashed board across fresh sessions and menu visits', () => {
  const game = setupGame();
  game.get('playButton').click();
  const board = game.board();
  assert.equal(game.get('puzzleNumber').textContent, '2026-10-10');
  assert.equal(game.get('difficulty').textContent, 'Expert');
  game.get('menuButton').click();
  game.get('playButton').click();
  assert.equal(game.board(), board);
  const fresh = setupGame();
  fresh.get('playButton').click();
  assert.equal(fresh.board(), board);
  assert.equal(fresh.get('score').textContent, '0');
});

test('calendar opens past puzzles and blocks future dates', () => {
  const game = setupGame('2026-10-10');
  game.get('calendarButton').click();
  assert.equal(game.get('calendarDialog').open, true);
  assert.equal(game.get('calendarMonth').textContent, 'October 2026');
  assert.equal(game.get('calendarDays').children.find(cell => cell.textContent === '11').disabled, true);
  game.chooseDate(4);
  assert.equal(game.get('calendarDialog').open, false);
  assert.equal(game.get('puzzleNumber').textContent, '2026-10-04');
  assert.equal(game.get('difficulty').textContent, 'Easy');
});

test('difficulty grows through the week and dates produce distinct layouts', () => {
  const game = setupGame();
  const names = ['Easy', 'Gentle', 'Moderate', 'Tricky', 'Hard', 'Tough', 'Expert'];
  const boards = [];
  game.get('calendarButton').click();
  for (let day = 4; day <= 10; day++) {
    game.chooseDate(day);
    boards.push(game.board());
    assert.equal(game.get('difficulty').textContent, names[day - 4]);
    if (day < 10) game.get('calendarButton').click();
  }
  assert.equal(new Set(boards).size, 7);
});

test('invalid words are still rejected', () => {
  const game = setupGame('2026-10-04');
  game.get('playButton').click();
  const first = game.get('grid').children.find(cell => cell.textContent);
  first.click();
  game.get('wordInput').value = 'ZZZZQQ';
  game.get('placeButton').click();
  assert.match(game.get('message').textContent, /not in the dictionary/);
  assert.equal(game.get('score').textContent, '0');
});
