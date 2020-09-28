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
  const halfX = Math.floor(x / 2)
  const halfY = Math.floor(y / 2)
  ret[halfY][halfX] = Marker.BOT
  ret[halfY][halfX-1] = Marker.HUMAN
  ret[halfY-1][halfX] = Marker.HUMAN
  ret[halfY-1][halfX-1] = Marker.BOT
  return ret
}

function canFlipInDirection(board: Marker[][], x: number, y: number, i: number, j: number, player: Marker) : boolean {
  x += i
  y += j
  let foundSomeToFlip = false
  while (x >= 0 && x < board[0].length && y >= 0 && y < board.length) {
    console.log(`${i} ${j}`, markerToStr(board[y][x]))
    if (board[y][x] === Marker.FREE) {
      return false
    } else if (board[y][x] === player) {
      return foundSomeToFlip
    } else {
      foundSomeToFlip = true
    }
    x += i
    y += j
  }
  return false
}

function isValidMove(board: Marker[][], x: number, y: number, player: Marker) : boolean {
  if (board[y][x] !== Marker.FREE) { return false }
  let ret = false
  for (let i = -1; i <= 1; ++i) {
    for (let j = -1; j <= 1; ++j) {
      ret = ret || canFlipInDirection(board, x, y, i, j, player)
    }
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
    if (!isValidMove(boardArray, x, y, nextPlayer)) { return }
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
