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
        'skin-accent-foreground':
          'rgba(var(--accent-foreground), <alpha-value>)',
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
      },
      gridTemplateColumns: {
        'explore-3': 'repeat(3, minmax(0, 230px))',
        'explore-4': 'repeat(4, minmax(0, 230px))',
        'explore-5': 'repeat(5, minmax(0, 230px))'
      }
    },
    screens: {
      xs: '420px',
      sm: '544px',
      md: '768px',
      lg: '1012px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '1844px'
    },
    spacing: {
      0: '0px',
      0.5: '2px',
      1: '4px',
      1.5: '6px',
      2: '8px',
      2.5: '12px',
      3: '16px',
      3.5: '20px',
      4: '24px',
      5: '32px',
      6: '40px',
      7: '48px',
      8: '64px',
      9: '72px',
      10: '80px',
      11: '88px',
      12: '96px'
    },
    fontFamily: {
      serif: ['"Calibre", Helvetica, Arial, sans-serif']
    },
    fontSize: {
      xl: ['28px'],
      lg: ['22px'],
      md: ['20px'],
      base: ['18px'],
      sm: ['16px'],
      xs: ['14px']
    }
  }
};
