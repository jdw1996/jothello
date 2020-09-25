import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import './index.css'

interface SquareProps {
  value: number
}

function Square(props: SquareProps) : JSX.Element {
  const [ value, setValue ] = useState('')
  return (
      <td className="square" onClick={() => setValue('X') }>
        {value}
      </td>
    )
}

class Board extends React.Component {
  renderSquare(i: number) {
    return <Square value={i} />
  }

  render() {
    const status = 'Next player: X'

    return (
      <div>
        <div className="status">{status}</div>
        <table>
          <tr className="board-row">
            {this.renderSquare(0)}
            {this.renderSquare(1)}
            {this.renderSquare(2)}
          </tr>
          <tr className="board-row">
            {this.renderSquare(3)}
            {this.renderSquare(4)}
            {this.renderSquare(5)}
          </tr>
          <tr className="board-row">
            {this.renderSquare(6)}
            {this.renderSquare(7)}
            {this.renderSquare(8)}
          </tr>
        </table>
      </div>
    )
  }
}

class Game extends React.Component {
  render() {
    return (
      <div className="game">
        <div className="game-board">
          <Board />
        </div>
        <div className="game-info">
          <div>{/* status */}</div>
          <ol>{/* TODO */}</ol>
        </div>
      </div>
    )
  }
}

// ========================================

ReactDOM.render(
  <Game />,
  document.getElementById('root')
)
