/**
 * Tokens de thème exportés en JS, pour usage dans des props JS/Framer Motion
 * (animations, styles calculés) là où les classes Tailwind ne suffisent pas.
 * Doit rester synchronisé avec `styles/globals.css` et `tailwind.config.js`.
 */
export const theme = {
  colors: {
    ink: '#1B1F2A',
    paper: '#F5F1E6',
    lacquer: '#C33C3C',
    gold: '#D4A657',
  },
  fonts: {
    display: '"Shippori Mincho", serif',
    sans: 'Inter, system-ui, sans-serif',
  },
} as const

export type Theme = typeof theme
