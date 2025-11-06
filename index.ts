const html = document.documentElement as HTMLElement;
const body = document.body as HTMLBodyElement;

html.style.height = '100%';
body.style.margin = '0';
body.style.padding = '0';
body.style.height = '100%';
body.style.overflow = 'hidden';
body.style.boxSizing = 'border-box';
body.style.background = '#000';

function applyFullscreenCanvasStyles(canvas: HTMLCanvasElement) {
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100dvh';
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none';
}

function showOverlay(text: string) {
  let el = document.getElementById('wgpu-overlay') as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = 'wgpu-overlay';
    Object.assign(el.style, {
      position: 'fixed',
      inset: '16px',
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      font: '14px/1.4 system-ui, sans-serif',
      padding: '12px 14px',
      borderRadius: '10px',
      zIndex: '9999',
      whiteSpace: 'pre-wrap'
    } as CSSStyleDeclaration);
    document.body.appendChild(el);
  }
  el.textContent = text;
}

async function clampCanvasBackingSize(canvas: HTMLCanvasElement) {
  if (!('gpu' in navigator)) {
    showOverlay('WebGPU is not supported on this device/browser.');
    throw new Error('WebGPU not supported');
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    showOverlay('No compatible GPU adapter found.');
    throw new Error('No GPU adapter');
  }
  const MAX_TEX = adapter.limits.maxTextureDimension2D;

  const resize = () => {
    const cssW = canvas.clientWidth || window.innerWidth;
    const cssH = canvas.clientHeight || window.innerHeight;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const maxCss = Math.max(cssW, cssH);
    const maxSafeDpr = Math.max(1, Math.floor(MAX_TEX / Math.max(1, maxCss)));
    const effDpr = Math.min(dpr, maxSafeDpr);
    const width = Math.min(MAX_TEX, Math.round(cssW * effDpr));
    const height = Math.min(MAX_TEX, Math.round(cssH * effDpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  };

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  let lastDpr = window.devicePixelRatio;
  setInterval(() => {
    const cur = window.devicePixelRatio;
    if (cur !== lastDpr) {
      lastDpr = cur;
      resize();
    }
  }, 500);
}

const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
if (canvases.length === 0) {
  const c = document.createElement('canvas');
  document.body.appendChild(c);
  canvases.push(c);
}
canvases.forEach(applyFullscreenCanvasStyles);

(async () => {
  try {
    await clampCanvasBackingSize(canvases[0]);
  } catch (e) {
    console.error(e);
    return;
  }

  import('./src/index.ts');
})();
