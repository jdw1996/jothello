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

interface BoardProps {
  isHumanNext: boolean
  boardArray: Marker[][]
  handleBoardClick: (x: number, y: number) => void
}

function Board(props: BoardProps) : JSX.Element {
  const handleSquareClick = (x: number, y: number) => { props.handleBoardClick(x, y) }
  return (
    <div>
      <table><tbody>
        {props.boardArray.map((row, y) => (
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
  const [isHumanNext, setIsHumanNext] = useState(true)
  const [boardArray, setBoardArray] = useState(createBoardArray(8,8))
  const nextPlayer = isHumanNext ? Marker.HUMAN : Marker.BOT
  const status = `Next player: ${markerToStr(nextPlayer)}`
  const handleBoardClick = (x: number, y: number) => {
    if (boardArray[y][x] !== Marker.FREE) { return }
    setIsHumanNext(!isHumanNext)
    setBoardArray(boardArray.map((row, rowNum) => (
      row.map((marker, colNum) => ((rowNum === y && colNum === x) ? nextPlayer : marker))
    )))
  }
  return (
    <div className="game">
      <div className="status">{status}</div>
      <div className="game-board">
        <Board isHumanNext={isHumanNext} handleBoardClick={handleBoardClick} boardArray={boardArray} />
      </div>
    </div>
  )
}

// ========================================

ReactDOM.render(
  <Game />,
  document.getElementById('root')
)
