import type { Register, ThemeSetArgs } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './scene.js'

// CyberNetrix Dark: a control room at night. Muted blue-black grays so long
// sessions stay easy on the eyes; cyan/teal for primary highlights, violet for
// the AI/neural accents, a soft red kept for alerts.
const { theme, problems } = makeColors({
  label: 'CyberNetrix Dark',
  id: 'cybernetrix-dark',
  only: 'dark',
  roles: {
    accent: '#00f0ff', // neon cyan: primary highlights, keywords
    success: '#0aff9d', // matrix teal-green: strings, success
    pro: '#bd00ff', // electric violet: AI / neural accents, literals
    danger: '#ff3860', // soft red: alerts and errors only
    warning: '#ffb454', // warm amber: warnings, variables
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0b0f15',
        'surface-1': '#0f141c',
        'surface-2': '#131a23',
        'surface-3': '#18202b',
        'text-primary': '#dde6ef',
        'text-secondary': '#b2bfcd',
        'text-muted': '#8d9aab',
      },
    },
    git: {
      added: '#0aff9d',
      removed: '#ff3860',
      modified: '#00c8e0',
      merged: '#c58aff',
      closed: '#ff6b85',
      conflicting: '#ffb454',
      draft: '#a3afbf',
    },
  },
})

const SCENE_NAME = 'cybernetrix-neural-net'

const LOOK: ThemeSetArgs = {
  colors: theme,
  overrideColorScheme: 'dark',
  // Frosted, blue-black glass over the moving scene: panels read as layers
  // floating above the network, which is where the depth comes from.
  backdrop: {
    scene: SCENE_NAME,
    glass: { blur: 18, tint: '#0d1117', opacity: 0.7 },
  },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    const set = await $.theme.set(LOOK)

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.props.scene !== SCENE_NAME || (e.surface !== 'desktop' && e.surface !== 'mobile')) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return (
      <Svg
        source={SCENE}
        alt="A dim neural network drifting over faint circuit traces, with signals pulsing between nodes"
        isInteractive
      />
    )
  })
}
