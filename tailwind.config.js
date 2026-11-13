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
// Fundo da página distinto dos cartões e tons de leitura para superfícies claras.
const lightOverrides = {
  bg: {
    white: '#EAF0F7',
    'slate-50': '#DDE6F0',
    'slate-100': '#D6E6FF',
    'slate-200': '#BFD4FF',
    'brand-50': '#D6E6FF',
    'brand-600': '#335B9C',
    'brand-700': '#274B86',
    'brand-800': '#203C6B',
    'indigo-50': '#E2DCF0',
    'rose-50': '#F1E5EC',
    'emerald-50': '#DFEDE6',
    'amber-50': '#F1EAD9',
  },
  text: {
    'slate-400': '#4e6075',
    'slate-500': '#40546a',
    'slate-600': '#34485b',
    'brand-600': '#284F88',
    'brand-700': '#203F70',
    'rose-500': '#aa2045',
    'rose-600': '#a31c40',
    'emerald-600': '#086344',
    'amber-600': '#825005',
  },
  border: {
    'slate-100': '#D6E6FF',
    'slate-200': '#BFD4FF',
    'slate-300': '#748AA8',
    'brand-100': '#BFD4FF',
  },
};
const dark = {
  bg: {
    white: '#172335',
    'brand-800': colors.teal[800],
    'brand-600': colors.teal[600],
    'brand-700': colors.teal[700],
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
      const light = lightOverrides[group]?.[key] ?? (shade ? palette[color][shade] : palette[color]);
      return [key, `rgb(var(--${group}-${key}, ${rgb(light)}) / <alpha-value>)`];
    })
  );
}

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          ...colors.teal,
          50: 'rgb(var(--brand-tint) / <alpha-value>)',
          500: 'rgb(var(--brand-accent) / <alpha-value>)',
          600: 'rgb(var(--brand-stroke) / <alpha-value>)',
        },
      },
      backgroundColor: themed('bg'),
      textColor: themed('text'),
      borderColor: themed('border'),
      gradientColorStops: themed('gradient'),
    },
  },
  plugins: [
    ({ addBase }) => {
      const vars = {
        '--brand-tint': rgb(colors.teal[50]),
        '--brand-accent': rgb(colors.teal[500]),
        '--brand-stroke': rgb(colors.teal[600]),
        '--focus-color': '#5eead4',
      };
      for (const [group, values] of Object.entries(dark))
        for (const [key, value] of Object.entries(values)) vars[`--${group}-${key}`] = rgb(value);
      addBase({
        ':root': {
          colorScheme: 'light',
          '--brand-tint': rgb('#D6E6FF'),
          '--brand-accent': rgb('#466CA8'),
          '--brand-stroke': rgb('#335B9C'),
          '--focus-color': '#335B9C',
        },
        ':root[data-theme="dark"]': { colorScheme: 'dark', ...vars },
        '@media (prefers-color-scheme: dark)': {
          ':root:not([data-theme])': { colorScheme: 'dark', ...vars },
        },
      });
    },
  ],
};
