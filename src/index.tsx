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

function flippableInDirection(
  board: Marker[][], x: number, y: number, i: number, j: number, player: Marker
) : [number,number][] {
  let flippable: [number,number][] = []
  while (true) {
    x += i
    y += j
    if (x < 0 || x >= board[0].length || y < 0 || y >= board.length) { return [] }
    if (board[y][x] === Marker.FREE) {
      return []
    } else if (board[y][x] === player) {
      return flippable
    } else {
      flippable.push([x,y])
    }
  }
}

function flippablePositions(board: Marker[][], x: number, y: number, player: Marker) : [number,number][] {
  if (board[y][x] !== Marker.FREE) { return [] }
  let flippable: [number,number][] = []
  for (let i = -1; i <= 1; ++i) {
    for (let j = -1; j <= 1; ++j) {
      flippable = flippable.concat(flippableInDirection(board, x, y, i, j, player))
    }
  }
  return flippable
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
  const BOARD_HEIGHT = 8
  const BOARD_WIDTH = 8
  const [isHumanNext, setIsHumanNext] = useState(true)
  const [boardArray, setBoardArray] = useState(createBoardArray(BOARD_WIDTH, BOARD_HEIGHT))
  const [lastPlayerPassed, setLastPlayerPassed] = useState(false)
  const [isGameFinished, setIsGameFinished] = useState(false)
  const nextPlayer = isHumanNext ? Marker.HUMAN : Marker.BOT
  const status = isGameFinished ? 'Game over.' : `Next player: ${markerToStr(nextPlayer)}`
  let validMoves = new Map<string, [number, number][]>()
  if (!isGameFinished) {
    for (let i = 0; i < BOARD_HEIGHT; ++i) {
      for (let j = 0; j < BOARD_WIDTH; ++j) {
        let flippable = flippablePositions(boardArray, i, j, nextPlayer)
        if (flippable.length > 0) {
          validMoves.set(`${i},${j}`, flippable)
        }
      }
    }
    if (validMoves.size === 0) {
      if (lastPlayerPassed) {
        setIsGameFinished(true)
      } else {
        setIsHumanNext(!isHumanNext)
        setLastPlayerPassed(true)
      }
    }
  }
  const handleBoardClick = (x: number, y: number) => {
    if (isGameFinished) { return }
    const currentKey = `${x},${y}`
    if (!validMoves.has(currentKey)) { return }
    setIsHumanNext(!isHumanNext)
    const boardArrayClone = boardArray.slice()
    boardArrayClone[y][x] = nextPlayer
    validMoves.get(currentKey)?.forEach(([i,j]) => {
      boardArrayClone[j][i] = nextPlayer
    });
    setBoardArray(boardArrayClone)
    setLastPlayerPassed(false)
  }
  return (
    <div className="game">
      <div className="status">{status}</div>
      <div className="game-board">
        <Board handleBoardClick={handleBoardClick} boardArray={boardArray} />
      </div>
    </div>
  )
}

// ========================================

ReactDOM.render(
  <Game />,
  document.getElementById('root')
)
