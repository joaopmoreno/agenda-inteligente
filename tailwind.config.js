import colors from 'tailwindcss/colors.js';

// As utilidades continuam aceitando opacidade, foco e hover nos dois temas.
const palette = {
  white: '#ffffff',
  slate: colors.slate,
  rose: colors.rose,
  emerald: colors.emerald,
  amber: colors.amber,
  brand: colors.teal,
  teal: colors.teal,
  indigo: colors.indigo,
};
const dark = {
  bg: {
    white: '#172335',
    'slate-50': '#101a29',
    'slate-100': '#223248',
    'slate-200': '#314258',
    'slate-300': '#50637a',
    'rose-50': '#391f2c',
    'rose-100': '#4b2436',
    'emerald-50': '#102d27',
    'emerald-100': '#163e34',
    'amber-50': '#302a1b',
    'amber-100': '#42371f',
    'brand-50': '#133331',
    'indigo-50': '#242843',
  },
  text: {
    'slate-900': '#f0f5fc',
    'slate-800': '#e1e9f4',
    'slate-700': '#ccd8e7',
    'slate-600': '#b6c6da',
    'slate-500': '#a5b7cc',
    'slate-400': '#97aac2',
    'brand-600': '#64e1cb',
    'brand-700': '#76e9d4',
    'brand-900': '#a4f4e8',
    'rose-500': '#ffa3b1',
    'rose-600': '#ff94a8',
    'rose-700': '#ffadbb',
    'rose-800': '#ffc2cb',
    'rose-900': '#ffd0d9',
    'rose-950': '#ffe3e8',
    'emerald-600': '#69ddb3',
    'emerald-700': '#74e6bb',
    'emerald-900': '#b1f4d8',
    'emerald-950': '#ceffe8',
    'amber-600': '#f7c66b',
    'amber-700': '#f7cc78',
    'amber-800': '#ffdb96',
    'amber-900': '#ffe2ac',
    'amber-950': '#ffedcf',
    'indigo-700': '#bdc4ff',
  },
  border: {
    'slate-100': '#2a384c',
    'slate-200': '#38495e',
    'slate-300': '#50637a',
    'brand-100': '#224441',
    'brand-200': '#295c56',
    'brand-300': '#36766e',
    'rose-200': '#824056',
    'rose-600': '#f1758e',
    'emerald-200': '#2d6a55',
    'amber-200': '#806536',
    'indigo-200': '#504e82',
  },
  gradient: { 'brand-50': '#173430', 'teal-50': '#152c2b' },
};
const rgb = (hex) =>
  hex
    .match(/[a-f\d]{2}/gi)
    .map((pair) => parseInt(pair, 16))
    .join(' ');
function themed(group) {
  return Object.fromEntries(
    Object.keys(dark[group]).map((key) => {
      const [color, shade] = key.split('-');
      const light = shade ? palette[color][shade] : palette[color];
      return [key, `rgb(var(--${group}-${key}, ${rgb(light)}) / <alpha-value>)`];
    })
  );
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: { brand: colors.teal },
      backgroundColor: themed('bg'),
      textColor: themed('text'),
      borderColor: themed('border'),
      gradientColorStops: themed('gradient'),
    },
  },
  plugins: [
    ({ addBase }) => {
      const vars = {};
      for (const [group, values] of Object.entries(dark))
        for (const [key, value] of Object.entries(values)) vars[`--${group}-${key}`] = rgb(value);
      addBase({
        ':root': { colorScheme: 'light' },
        ':root[data-theme="dark"]': { colorScheme: 'dark', ...vars },
        '@media (prefers-color-scheme: dark)': {
          ':root:not([data-theme])': { colorScheme: 'dark', ...vars },
        },
      });
    },
  ],
};
