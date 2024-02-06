// eslint-disable-next-line @typescript-eslint/no-var-requires

module.exports = {
  future: {
    hoverOnlyWhenSupported: true
  },
  content: ['./index.html', './src/**/*.{js,ts,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      borderColor: {
        DEFAULT: 'rgba(var(--border), <alpha-value>)'
      },
      colors: {
        // IMPORTANT: Color variables that require opacity modifiers must be defined
        // without space function and opacity value. They can be recognized by the
        // <alpha-value> placeholder. See: https://tailwindcss.com/docs/customizing-colors#using-css-variables
        transparent: 'transparent',

        // backgrounds
        'skin-bg': 'rgba(var(--bg), <alpha-value>)',
        'skin-block-bg': 'rgba(var(--block-bg), <alpha-value>)',
        'skin-input-bg': 'rgba(var(--input-bg), <alpha-value>)',
        'skin-hover-bg': 'rgba(var(--hover-bg), <alpha-value>)',
        'skin-active-bg': 'rgba(var(--active-bg), <alpha-value>)',
        'skin-border': 'rgba(var(--border), <alpha-value>)',

        // text
        'skin-heading': 'rgba(var(--heading), <alpha-value>)',
        'skin-link': 'rgba(var(--link), <alpha-value>)',
        'skin-text': 'rgba(var(--text), <alpha-value>)',
        'skin-content': 'var(--content)',

        // accents
        'skin-primary': 'rgba(var(--primary), <alpha-value>)',
        'skin-accent-foreground': 'rgba(var(--accent-foreground), <alpha-value>)',
        'skin-danger': 'rgba(var(--danger), <alpha-value>)',
        'skin-success': 'rgba(var(--success), <alpha-value>)',

        'skin-accent-hover': 'var(--accent-hover)',
        'skin-accent-active': 'var(--accent-active)',
        'skin-danger-border': 'var(--danger-border)',
        'skin-danger-hover': 'var(--danger-hover)',
        'skin-danger-active': 'var(--danger-active)',
        'skin-success-border': 'var(--success-border)',
        'skin-success-hover': 'var(--success-hover)',
        'skin-success-active': 'var(--success-active)'
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    },
    screens: {
      xs: '420px',
      sm: '544px',
      md: '768px',
      lg: '1012px',
      xl: '1280px'
    },
    spacing: {
      0: '0px',
      1: '4px',
      2: '8px',
      2.5: '14px',
      3: '16px',
      4: '24px',
      5: '32px',
      6: '40px',
      7: '48px',
      8: '64px'
    },
    fontFamily: {
      serif: ['"Calibre", Helvetica, Arial, sans-serif']
    },
    fontSize: {
      '2xl': ['34px'],
      xl: ['28px'],
      lg: ['22px'],
      md: ['20px'],
      base: ['18px'],
      sm: ['17px'],
      xs: ['13px']
    }
  }
};
