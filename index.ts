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

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

const canvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
if (canvases.length === 0) {
  const c = document.createElement('canvas');
  document.body.appendChild(c);
  canvases.push(c);
}
canvases.forEach((canvas) => {
  applyFullscreenCanvasStyles(canvas);
});

(async () => {
  try {
    await clampCanvasBackingSize(canvases[0]);
  } catch (e) {
    console.error(e);
    return;
  }

  const reconfigureAll = () => canvases.forEach(resizeCanvasToDisplaySize);
  window.addEventListener('resize', reconfigureAll);
  const ro = new ResizeObserver(reconfigureAll);
  canvases.forEach((c) => ro.observe(c));

  const controlsPanel = document.createElement('div');
  controlsPanel.style.position = 'fixed';
  controlsPanel.style.top = '12px';
  controlsPanel.style.left = '12px';
  controlsPanel.style.zIndex = '10';
  controlsPanel.style.display = 'grid';
  controlsPanel.style.gridTemplateColumns = '1fr 1fr';
  controlsPanel.style.gap = '0.5rem';
  controlsPanel.style.padding = '0.5rem 0.75rem';
  controlsPanel.style.borderRadius = '0.5rem';
  controlsPanel.style.background = 'rgba(0,0,0,0.6)';
  controlsPanel.style.backdropFilter = 'blur(6px)';
  controlsPanel.style.color = '#fff';
  controlsPanel.style.fontFamily = 'system-ui, sans-serif';
  controlsPanel.style.fontSize = '14px';
  body.appendChild(controlsPanel);

  import('./src/index.ts').then((example) => {
    for (const controls of Object.values(example)) {
      if (typeof controls === 'function') continue;

      for (const [label, params] of Object.entries(
        controls as unknown as Record<string, ExampleControlParam>,
      )) {
        if ('onButtonClick' in params) {
          const button = document.createElement('button');
          button.innerText = label;
          button.style.gridColumn = 'span 2';
          button.style.padding = '0.4rem 0.6rem';
          button.style.borderRadius = '0.4rem';
          button.style.border = '1px solid rgba(255,255,255,0.2)';
          button.style.background = 'rgba(255,255,255,0.1)';
          button.style.color = 'white';
          button.style.cursor = 'pointer';
          button.addEventListener('click', () => params.onButtonClick());
          controlsPanel.appendChild(button);
        } else {
          const labelDiv = document.createElement('div');
          labelDiv.innerText = label;
          labelDiv.style.alignSelf = 'center';
          controlsPanel.appendChild(labelDiv);

          if ('onSliderChange' in params) {
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = `${params.min ?? 0}`;
            slider.max = `${params.max ?? 1}`;
            slider.step = `${params.step ?? 0.1}`;
            slider.value = `${params.initial ?? params.min ?? 0}`;
            slider.addEventListener('input', () => {
              params.onSliderChange(Number.parseFloat(slider.value));
            });
            controlsPanel.appendChild(slider);
            params.onSliderChange(Number.parseFloat(slider.value));
          }

          if ('onSelectChange' in params) {
            const select = document.createElement('select');
            select.style.minWidth = '8rem';
            select.innerHTML = params.options
              .map((option) => `<option value="${option}">${option}</option>`)
              .join('');
            select.value = params.initial ?? params.options[0];
            select.addEventListener('change', () => {
              params.onSelectChange(select.value);
            });
            controlsPanel.appendChild(select);
            params.onSelectChange(select.value);
          }

          if ('onVectorSliderChange' in params) {
            const sliderContainer = document.createElement('div');
            sliderContainer.style.gridColumn = 'span 1';
            sliderContainer.style.display = 'flex';
            sliderContainer.style.flexDirection = 'column';
            sliderContainer.style.gap = '0.25rem';

            const currentValues = params.initial
              ? [...params.initial]
              : [...params.min];
            const length = params.min.length;
            const axisLabels = ['x', 'y', 'z', 'w'];

            for (let i = 0; i < length; i++) {
              const row = document.createElement('div');
              row.style.display = 'flex';
              row.style.alignItems = 'center';
              row.style.gap = '0.4rem';

              const labelSpan = document.createElement('span');
              labelSpan.textContent = axisLabels[i];

              const slider = document.createElement('input');
              slider.type = 'range';
              slider.min = `${params.min[i]}`;
              slider.max = `${params.max[i]}`;
              slider.step = `${params.step[i] ?? 0.1}`;
              slider.value = `${currentValues[i]}`;
              slider.style.flex = '1';

              slider.addEventListener('input', () => {
                currentValues[i] = Number.parseFloat(slider.value);
                params.onVectorSliderChange(currentValues);
              });

              row.appendChild(labelSpan);
              row.appendChild(slider);
              sliderContainer.appendChild(row);
            }

            params.onVectorSliderChange(currentValues);
            controlsPanel.appendChild(sliderContainer);
          }

          if ('onColorChange' in params) {
            const input = document.createElement('input');
            input.type = 'color';

            const initial = params.initial ?? ([0, 0, 0] as const);
            input.value = rgbToHex(initial);

            input.addEventListener('input', () => {
              params.onColorChange(hexToRgb(input.value));
            });

            params.onColorChange(initial);
            controlsPanel.appendChild(input);
          }

          if ('onTextChange' in params) {
            const input = document.createElement('input');
            input.value = params.initial ?? '';
            input.addEventListener('input', () => {
              params.onTextChange(input.value);
            });
            controlsPanel.appendChild(input);
            params.onTextChange(input.value);
          }
        }
      }
    }
  });
})();

type SelectControlParam = {
  onSelectChange: (newValue: string) => void;
  initial?: string;
  options: string[];
};
type ToggleControlParam = {
  onToggleChange: (newValue: boolean) => void;
  initial?: boolean;
};
type SliderControlParam = {
  onSliderChange: (newValue: number) => void;
  initial?: number;
  min?: number;
  max?: number;
  step?: number;
};
type VectorSliderControlParam = {
  onVectorSliderChange: (newValue: number[]) => void;
  initial?: number[];
  min: number[];
  max: number[];
  step: number[];
};
type ColorPickerControlParam = {
  onColorChange: (newValue: readonly [number, number, number]) => void;
  initial?: readonly [number, number, number];
};
type ButtonControlParam = {
  onButtonClick: (() => void) | (() => Promise<void>);
};
type TextAreaControlParam = {
  onTextChange: (newValue: string) => void;
  initial?: string;
};
type ExampleControlParam =
  | SelectControlParam
  | ToggleControlParam
  | SliderControlParam
  | ButtonControlParam
  | TextAreaControlParam
  | VectorSliderControlParam
  | ColorPickerControlParam;

function hexToRgb(hex: string): readonly [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16) / 255,
    Number.parseInt(hex.slice(3, 5), 16) / 255,
    Number.parseInt(hex.slice(5, 7), 16) / 255,
  ] as const;
}
function componentToHex(c: number) {
  const n = Math.max(0, Math.min(255, Math.round(c * 255)));
  const hex = n.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}
function rgbToHex(rgb: readonly [number, number, number]) {
  return `#${rgb.map(componentToHex).join('')}`;
}
