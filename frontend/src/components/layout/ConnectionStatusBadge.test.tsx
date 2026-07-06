import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConnectionStatusBadge } from './ConnectionStatusBadge'
import { WebSocketContext } from '../../ws/WebSocketProvider'

describe('ConnectionStatusBadge', () => {
  it('renders the current connection status label', () => {
    render(
      <WebSocketContext.Provider value={{ status: 'open', send: () => {} }}>
        <ConnectionStatusBadge />
      </WebSocketContext.Provider>,
    )

    expect(screen.getByText('Connecté')).toBeInTheDocument()
  })
})
