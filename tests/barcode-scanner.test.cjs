const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('src/components/BarcodeScannerModal.tsx', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
  target: ts.ScriptTarget.ES2020
} }).outputText;
const tick = () => new Promise(resolve => setImmediate(resolve));

function harness({ pendingStart = false, nativeFormats = null, brokenCapabilities = false } = {}) {
  const states = [], refs = [], instances = [], effects = [];
  let stateIndex = 0, refIndex = 0, first = true, live = 0, maxLive = 0;
  let finishStart;
  const gate = pendingStart ? new Promise(resolve => { finishStart = resolve; }) : Promise.resolve();
  const timers = new Map();
  let timerId = 0;
  const React = {
    createElement(type, props, ...children) { return { type, props: props || {}, children: children.flat() }; },
    useState(value) { const i = stateIndex++; if (first) states[i] = value; return [states[i], next => { states[i] = next; }]; },
    useRef(value) { const i = refIndex++; if (first) refs[i] = { current: value }; return refs[i]; },
    useEffect(fn) { if (first) effects.push(fn); }
  };
  class Scanner {
    constructor(id, options) { this.id = id; this.options = options; this.isScanning = false; instances.push(this); }
    async start(camera, config, success) {
      assert.deepEqual(Object.keys(camera), ['facingMode']);
      assert.equal(config.videoConstraints.width.ideal, 1920);
      assert.equal(config.videoConstraints.width.min, undefined);
      this.success = success;
      await gate;
      live++; maxLive = Math.max(maxLive, live); this.isScanning = true;
    }
    async stop() { assert.equal(this.isScanning, true); live--; this.isScanning = false; }
    clear() { assert.equal(this.isScanning, false); this.cleared = true; }
    getRunningTrackCapabilities() { if (brokenCapabilities) throw Error('Unsupported'); return {}; }
    getRunningTrackSettings() { return {}; }
    async scanFile() { return '12345670'; }
  }
  const exports = {};
  const window = { addEventListener() {}, removeEventListener() {} };
  if (nativeFormats) window.BarcodeDetector = { getSupportedFormats: async () => nativeFormats };
  vm.runInNewContext(compiled, {
    exports, window, console,
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); },
    require(name) {
      if (name === 'react') return React;
      if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => key });
      if (name === 'html5-qrcode') return { Html5Qrcode: Scanner, Html5QrcodeSupportedFormats: { EAN_13: 1, EAN_8: 2, UPC_A: 3, UPC_E: 4 } };
      throw Error(name);
    }
  });
  let found = [], closed = 0;
  const props = { products: [{ id: 'test', name: 'Producto', ean: '0123456789012' }], onProductFound: p => found.push(p), onClose: () => closed++ };
  const render = () => {
    stateIndex = refIndex = 0;
    const tree = exports.BarcodeScannerModal(props);
    first = false;
    return tree;
  };
  render();
  const cleanup = effects[0]();
  function nodes(tree, predicate) {
    if (!tree || typeof tree !== 'object') return [];
    return [...(predicate(tree) ? [tree] : []), ...tree.children.flatMap(child => nodes(child, predicate))];
  }
  return {
    states, instances, props, found, timers, render, cleanup, finishStart,
    get live() { return live; }, get maxLive() { return maxLive; }, get closed() { return closed; },
    button(label) { return nodes(render(), node => node.type === 'button' && JSON.stringify(node.children).includes(label))[0]; },
    nodes(predicate) { return nodes(render(), predicate); }
  };
}

test('starts with valid constraints, visible scanner, and JS fallback when native lacks EAN', async () => {
  const h = harness({ nativeFormats: ['qr_code'] }); await tick();
  assert.equal(h.live, 1);
  assert.equal(h.instances[0].options.useBarCodeDetectorIfSupported, false);
  assert.ok(!h.nodes(n => n.props.id === 'reader-fallback')[0].props.className.includes('hidden'));
  h.cleanup(); await tick(); assert.equal(h.live, 0);
});
test('enables dual decoding when native supports all retail formats', async () => {
  const h = harness({ nativeFormats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }); await tick();
  assert.equal(h.instances[0].options.useBarCodeDetectorIfSupported, true);
  h.cleanup(); await tick();
});
test('unknown barcode is reported as read and retry never opens overlapping cameras', async () => {
  const h = harness(); await tick();
  h.instances[0].success('12345670'); await tick();
  assert.match(h.states[1], /Código leído correctamente: 12345670/);
  assert.equal(h.live, 0);
  h.button('Volver a escanear').props.onClick();
  h.button('Volver a escanear')?.props.onClick();
  await tick(); assert.equal(h.live, 1); assert.equal(h.maxLive, 1);
  h.cleanup(); await tick();
});
test('closing while permission is pending releases late camera without stale updates', async () => {
  const h = harness({ pendingStart: true }); await tick(); h.cleanup();
  h.finishStart(); await tick();
  assert.equal(h.live, 0); assert.equal(h.instances[0].cleared, true);
  h.instances[0].success('12345670'); assert.equal(h.states[1], '');
});
test('UPC-A matches equivalent EAN-13 and repeated callbacks produce one result', async () => {
  const h = harness(); await tick();
  h.instances[0].success('123456789012');
  h.instances[0].success('123456789012'); await tick();
  assert.equal(h.timers.size, 1); assert.equal(h.live, 0);
  for (const fn of h.timers.values()) fn();
  assert.equal(h.found.length, 1); assert.equal(h.closed, 1);
  h.cleanup(); await tick();
});
test('closing cancels delayed product navigation', async () => {
  const h = harness(); await tick();
  h.instances[0].success('123456789012'); h.cleanup(); await tick();
  assert.equal(h.timers.size, 0); assert.equal(h.found.length, 0);
});
test('photo scanning releases live camera and distinguishes a decoded unknown product', async () => {
  const h = harness(); await tick();
  h.nodes(n => n.type === 'input' && n.props.type === 'file')[0].props.onChange({ target: { files: [{}], value: 'photo' } });
  await tick(); assert.equal(h.live, 0);
  assert.match(h.states[1], /Código leído correctamente/);
  assert.equal(h.instances[1].cleared, true);
  h.cleanup(); await tick();
});

test('unsupported camera controls do not stop recognition', async () => {
  const h = harness({ brokenCapabilities: true }); await tick();
  assert.equal(h.live, 1); assert.equal(h.states[3], true);
  h.instances[0].success('12345670'); await tick();
  assert.match(h.states[1], /Código leído correctamente/);
  h.cleanup(); await tick();
});
test('lookup uses products updated while the camera was already open', async () => {
  const h = harness(); await tick();
  h.props.products = [{ id: 'new', name: 'Nuevo', ean: '12345670' }]; h.render();
  h.instances[0].success('12345670'); await tick();
  for (const fn of h.timers.values()) fn();
  assert.equal(h.found[0].id, 'new'); h.cleanup(); await tick();
});
