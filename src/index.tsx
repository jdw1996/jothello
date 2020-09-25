import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import './index.css'

enum Marker {
  HUMAN,
  BOT,
  FREE
}

function markerToStr(marker: Marker): string {
  if (marker === Marker.HUMAN) {
    return '👍'
  } else if (marker === Marker.BOT) {
    return '🤖'
  } else {
    return ''
  }
}

function createBoardArray(x: number, y: number) : Marker[][] {
  let ret = []
  for (let i = 0; i < y; ++i) {
    let row = Array(x).fill(Marker.FREE)
    ret.push(row)
  }
  return ret
}

interface SquareProps {
  x: number
  y: number
  value: Marker
  onClick: (x: number, y: number) => void
}

function Square(props: SquareProps) : JSX.Element {
  return (
      <td className="square" onClick={() => props.onClick(props.x, props.y) }>
        {markerToStr(props.value)}
      </td>
    )
}

function Board() : JSX.Element {
  const status = 'Next player: X'
  const [boardArray, setBoardArray] = useState(createBoardArray(8,8))
  const handleSquareClick = (x: number, y: number) => {
    console.log(`Received click at ${x} ${y}`)
    boardArray[y][x] = Marker.HUMAN
    setBoardArray(boardArray.map((row, rowNum) => (
      row.map((marker, colNum) => ((rowNum === y && colNum === x) ? Marker.HUMAN : marker))
    )))
  }
  return (
    <div>
      <div className="status">{status}</div>
      <table><tbody>
        {boardArray.map((row, y) => (
          <tr key={y} className="board-row">
            {row.map((marker, x) => (
              <Square key={`${x} ${y}`} value={marker} onClick={handleSquareClick} x={x} y={y} />
            ))}
          </tr>
        ))}
      </tbody></table>
    </div>
  )
}

function Game() : JSX.Element {
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

// ========================================

ReactDOM.render(
  <Game />,
  document.getElementById('root')
)
