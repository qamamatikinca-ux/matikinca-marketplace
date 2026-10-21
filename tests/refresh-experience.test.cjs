const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
// Initialize Next's image helpers before any simulated browser environment.
require('next/image');

function load(file, overrides = {}, sourceOverride) {
  const source = path.resolve(__dirname, '..', file);
  const m = new Module(source, module);
  m.filename = source;
  m.paths = module.paths;
  m.require = id => id in overrides ? overrides[id] : require(id);
  m._compile(ts.transpileModule(sourceOverride || fs.readFileSync(source, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, source);
  return m.exports;
}

function enhancementEnvironment(pathname) {
  let effect;
  let closestCalls = 0;
  let addedNodes = 0;
  const card = { querySelector: () => ({}), parentElement: null };
  const heading = {
    textContent: 'Follow verified dealerships, see updates and discover popular dealers around you.',
    closest(selector) {
      closestCalls++;
      // Browser selector parsing rejects unescaped Tailwind arbitrary-value classes.
      if (selector.includes('.rounded-[')) throw new DOMException('Invalid selector', 'SyntaxError');
      return card;
    },
  };
  global.window = { location: { pathname }, requestAnimationFrame: () => 1 };
  global.localStorage = { getItem: () => null };
  global.document = {
    documentElement: { dataset: {} },
    body: { appendChild() { addedNodes++; } },
    querySelector: () => null,
    querySelectorAll(selector) { return selector.startsWith('h1,h2') ? [heading] : []; },
  };
  global.MutationObserver = class { observe() {} disconnect() {} };
  const Component = load('components/LoadLinkSmartUxPass20260826.tsx', {
    react: { ...React, useEffect: fn => { effect = fn; } },
    'next/navigation': { usePathname: () => pathname },
  }).default;
  Component();
  return { run: () => effect(), closestCalls: () => closestCalls, addedNodes: () => addedNodes };
}

test('directory reload never treats its verified-dealership heading as a seller card', () => {
  for (const pathname of ['/dealership', '/following']) {
    const env = enhancementEnvironment(pathname);
    assert.doesNotThrow(env.run);
    assert.equal(env.closestCalls(), 0);
    assert.equal(env.addedNodes(), 0);
  }
});

test('listing seller-card enhancement uses a selector valid for rounded Tailwind classes', () => {
  const env = enhancementEnvironment('/listing/vehicle-123');
  assert.doesNotThrow(env.run);
  assert.equal(env.closestCalls(), 1);
});

test('sort styling stays on the control instead of spreading to page containers', () => {
  let effect;
  const label = { textContent: 'Sort by Newest first', dataset: {}, querySelector: () => ({}) };
  const outer = { textContent: 'Sort by Newest first Post job All listings', dataset: {}, querySelector: () => ({}) };
  const select = { closest: () => label };
  global.window = { location: { pathname: '/jobs' }, requestAnimationFrame: () => 1 };
  global.document = {
    documentElement: { dataset: {} }, body: {}, querySelector: () => null,
    querySelectorAll(selector) { return selector === 'select' ? [select] : selector === 'label,button,div' ? [label, outer] : []; },
  };
  const C = load('components/LoadLinkSmartUxPass20260826.tsx', {
    react: { ...React, useEffect: fn => { effect = fn; } }, 'next/navigation': { usePathname: () => '/jobs' },
  }).default;
  C(); effect();
  assert.equal(label.dataset.loadlinkUnifiedSort, 'true');
  assert.equal(outer.dataset.loadlinkUnifiedSort, undefined);
});

function themeEnvironment(stored, deviceDark, blocked = false) {
  const classes = new Set();
  let writes = 0;
  const root = {
    dataset: new Proxy({}, { set(target, key, value) { writes++; target[key] = value; return true; } }),
    classList: { contains: key => classes.has(key), toggle(key, on) { writes++; on ? classes.add(key) : classes.delete(key); } },
    style: {},
  };
  const localStorage = {
    getItem(key) { if (blocked) throw Error('Storage disabled'); return key === 'loadlink-theme' ? stored : null; },
    setItem() { if (blocked) throw Error('Storage disabled'); },
  };
  global.document = { documentElement: root, body: { dataset: {}, style: {} }, querySelector: () => null, addEventListener() {} };
  global.window = { setTimeout: () => 1, localStorage, matchMedia: () => ({ matches: deviceDark }), dispatchEvent() {} };
  return { root, localStorage, count: () => writes };
}
const theme = load('lib/useLoadLinkTheme.ts');
const layout = fs.readFileSync(path.resolve(__dirname, '../app/layout.tsx'), 'utf8');
const prepaint = layout.match(/__html: `([^`]+)`/)[1];

test('prepaint and React agree on saved light mode even on a dark-mode device', () => {
  const env = themeEnvironment('light', true);
  vm.runInNewContext(prepaint, { window, document, localStorage: env.localStorage });
  assert.equal(env.root.dataset.loadlinkTheme, 'light');
  assert.equal(theme.readLoadLinkTheme(), 'light');
  assert.equal(env.root.classList.contains('dark'), false);
});

test('blocked storage cannot crash theme startup or prevent a theme change', () => {
  const env = themeEnvironment(null, true, true);
  vm.runInNewContext(prepaint, { window, document, localStorage: env.localStorage });
  assert.equal(theme.readLoadLinkTheme(), 'dark');
  assert.doesNotThrow(() => theme.setLoadLinkTheme('light'));
  assert.equal(theme.readLoadLinkTheme(), 'light');
});

test('reapplying the current theme does not retrigger attribute observers', () => {
  const env = themeEnvironment('light', true);
  theme.applyLoadLinkTheme('light');
  const before = env.count();
  theme.applyLoadLinkTheme('light');
  assert.equal(env.count(), before);
});

function imageHarness(props) {
  global.window = { location: { href: 'https://loadlink.test/' } };
  const states = [], refs = [];
  let stateIndex = 0, refIndex = 0, effects = [];
  const C = load('components/LoadLinkImage.tsx', { react: {
    ...React,
    useState(initial) {
      const index = stateIndex++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useRef(initial) { const index = refIndex++; return refs[index] ||= { current: initial }; },
    useLayoutEffect(fn) { effects.push(fn); },
    useImperativeHandle() {},
  } }).default;
  return {
    render(next = props) { stateIndex = refIndex = 0; effects = []; return C(next).props; },
    commit(image) { refs[0].current = image; for (const effect of effects) effect(); },
  };
}

test('images remain hidden until loaded, retry the actual photo, then use one neutral fallback', () => {
  const harness = imageHarness({ src: '/images/truck-1.jpg', alt: 'Truck' });
  let imageProps = harness.render();
  assert.equal(imageProps['data-loadlink-image-state'], 'pending');
  const image = { src: imageProps.src, naturalWidth: 0, complete: false };
  harness.commit(image);
  imageProps.onError({ currentTarget: image });
  imageProps = harness.render();
  assert.equal(imageProps.src, '/images/truck-1.jpg');
  assert.equal(imageProps.srcSet, undefined);
  image.src = imageProps.src;
  imageProps.onError({ currentTarget: image });
  imageProps = harness.render();
  assert.equal(imageProps.src, '/images/image-unavailable.svg');
  image.src = imageProps.src; image.naturalWidth = 960;
  imageProps.onLoad({ currentTarget: image });
  assert.equal(harness.render()['data-loadlink-image-state'], 'ready');
});

test('cached image successes and failures are resolved even when their events preceded hydration', () => {
  const success = imageHarness({ src: '/images/truck-1.jpg', alt: 'Truck' });
  success.render(); success.commit({ complete: true, naturalWidth: 800 });
  assert.equal(success.render()['data-loadlink-image-state'], 'ready');
  const failure = imageHarness({ src: '/images/truck-1.jpg', alt: 'Truck' });
  failure.render(); failure.commit({ complete: true, naturalWidth: 0 });
  assert.equal(failure.render().src, '/images/truck-1.jpg');
});

test('failed avatars never substitute an unrelated vehicle image and source changes reset loading', () => {
  const harness = imageHarness({ src: 'https://example.test/avatar.jpg', alt: 'Profile avatar' });
  const imageProps = harness.render();
  imageProps.onError({ currentTarget: { src: imageProps.src } });
  assert.equal(harness.render()['data-loadlink-image-state'], 'unavailable');
  const changed = harness.render({ src: '/images/truck-2.jpg', alt: 'Truck' });
  assert.match(changed.src, /_next\/image/);
  assert.equal(changed['data-loadlink-image-state'], 'pending');
});
