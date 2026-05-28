import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync('dist/preguntas-frecuentes.html', 'utf8');
const dom = new JSDOM(html, {
  url: 'https://pixon.com.mx/preguntas-frecuentes',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.matchMedia = window.matchMedia || function () {
      return {
        matches: false,
        media: '',
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return false;
        },
      };
    };
  },
});

await new Promise((resolve) => {
  dom.window.addEventListener('load', resolve, { once: true });
  setTimeout(resolve, 250);
});

const { document } = dom.window;
const questions = [...document.querySelectorAll('[data-faq-question]')];
const answers = [...document.querySelectorAll('.faq-answer-inner')];
const items = [...document.querySelectorAll('[data-faq-item]')];
const input = document.querySelector('#faq-search-input');
const resultCount = document.querySelector('#faq-result-count');
const emptyState = document.querySelector('#faq-no-results');

questions[0].click();
const firstExpandedAfterClick = questions[0]?.getAttribute('aria-expanded');
const firstAnswerHiddenAfterClick = document.querySelector('.faq-answer')?.getAttribute('aria-hidden');

input.value = 'garantia';
input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
const garantiaVisible = items.filter((item) => !item.hidden && item.style.display !== 'none').length;
const garantiaCounter = resultCount?.textContent;

input.value = 'zzzz-no-existe';
input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
const emptyVisible = items.filter((item) => !item.hidden && item.style.display !== 'none').length;
const emptyStateDisplay = emptyState?.style.display;

input.value = '';
input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
const restoredVisible = items.filter((item) => !item.hidden && item.style.display !== 'none').length;

const result = {
  totalQuestions: questions.length,
  totalAnswers: answers.length,
  firstExpanded: firstExpandedAfterClick,
  firstAnswerHidden: firstAnswerHiddenAfterClick,
  garantiaVisible,
  garantiaCounter,
  emptyVisible,
  emptyStateDisplay,
  restoredVisible,
};

console.log(JSON.stringify(result, null, 2));

if (result.totalQuestions !== 35 || result.totalAnswers !== 35) throw new Error('FAQ count mismatch');
if (result.firstExpanded !== 'true' || result.firstAnswerHidden !== 'false') throw new Error('FAQ item did not open');
if (result.garantiaVisible < 1 || !result.garantiaCounter?.includes('resultado')) throw new Error('FAQ search failed');
if (result.emptyVisible !== 0 || result.emptyStateDisplay === 'none') throw new Error('FAQ empty state failed');
if (result.restoredVisible !== 35) throw new Error('FAQ reset failed');
