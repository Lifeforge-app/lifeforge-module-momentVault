import { keyframes, style } from '@vanilla-extract/css'

export const widget = style({
  padding: 'calc(var(--spacing) * 2) !important',
  '@media': {
    '(min-width: 400px)': {
      padding: 'calc(var(--spacing) * 4) !important'
    }
  }
})

export const button = style({
  aspectRatio: '1',
  touchAction: 'none',
  '@media': {
    '(min-width: 400px)': {
      borderRadius: '9999px !important'
    }
  }
})

export const buttonTall = style({
  width: '100%',
  height: '100%',
  '@media': {
    '(min-width: 400px)': {
      height: 'auto'
    }
  }
})

const pulse = keyframes({
  '0%, 100%': {
    opacity: 1
  },
  '50%': {
    opacity: 0.5
  }
})

export const pulsing = style({
  animation: `${pulse} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`
})
