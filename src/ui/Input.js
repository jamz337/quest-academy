import { THEME, hex } from './theme.js';
import { uiScale } from '../systems/Layout.js';
import { FONT } from './TextStyles.js';

/**
 * Themed DOM text input (so the on-screen keyboard works on phones). Returns the DOMElement with `.input` set.
 * opts: value, placeholder, type, accent, maxLength, autocapitalize, autocomplete, fontSize, onInput(value), onEnter().
 */
export function textInput(scene, x, y, w, h, opts = {}) {
  const { value = '', placeholder = '', type = 'text', accent = THEME.primary, maxLength = 200, autocapitalize = 'none', autocomplete = null, fontSize = 17, onInput = null, onEnter = null } = opts;
  const s = uiScale(scene);
  const input = typeof document !== 'undefined' ? document.createElement('input') : { style: {}, addEventListener() {} };
  input.type = type; input.value = value; input.placeholder = placeholder; input.maxLength = maxLength;
  input.autocapitalize = autocapitalize;
  if (autocomplete) input.autocomplete = autocomplete;
  Object.assign(input.style, {
    width: w + 'px', height: h + 'px', fontSize: Math.round(fontSize * s) + 'px', borderRadius: '12px',
    border: '2px solid ' + hex(THEME.line), padding: '0 14px', boxSizing: 'border-box', fontFamily: FONT,
    fontWeight: '600', color: hex(THEME.ink), background: hex(THEME.surface), outline: 'none',
    boxShadow: '0 2px 0 rgba(45,42,74,0.05)', transition: 'border-color .15s, box-shadow .15s'
  });
  input.addEventListener('focus', () => { input.style.borderColor = hex(accent); input.style.boxShadow = '0 0 0 4px ' + hex(accent) + '33'; });
  input.addEventListener('blur', () => { input.style.borderColor = hex(THEME.line); input.style.boxShadow = '0 2px 0 rgba(45,42,74,0.05)'; });
  if (onInput) input.addEventListener('input', () => onInput(input.value));
  if (onEnter) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') onEnter(); });
  const dom = scene.add.dom(x, y, input);
  dom.input = input;
  return dom;
}
