import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './index.css';

enum Marker {
  HUMAN,
  BOT,
  FREE,
}

function markerToStr(marker: Marker): string {
  if (marker === Marker.HUMAN) {
    return '👍';
  } else if (marker === Marker.BOT) {
    return '🤖';
  } else {
    return '';
  }
}

interface SquareContent {
  marker: Marker;
  isValidMove: boolean;
  wouldBeFlipped: boolean;
}

function createBoardArray(
  width: number,
  height: number,
  nextPlayer: Marker,
): SquareContent[][] {
  const ret: SquareContent[][] = [];
  for (let j = 0; j < height; ++j) {
    const row = [];
    for (let i = 0; i < width; ++i) {
      row.push({
        marker: Marker.FREE,
        isValidMove: false,
        wouldBeFlipped: false,
      });
    }
    ret.push(row);
  }
  const halfWidth = Math.floor(width / 2);
  const halfHeight = Math.floor(height / 2);
  ret[halfHeight][halfWidth].marker = Marker.BOT;
  ret[halfHeight][halfWidth - 1].marker = Marker.HUMAN;
  ret[halfHeight - 1][halfWidth].marker = Marker.HUMAN;
  ret[halfHeight - 1][halfWidth - 1].marker = Marker.BOT;
  getValidMoves(ret, nextPlayer).forEach((_v, k) => {
    const [x, y] = k.split(',');
    ret[Number(y)][Number(x)].isValidMove = true;
  });
  return ret;
}

function flippableInDirection(
  board: SquareContent[][],
  x: number,
  y: number,
  i: number,
  j: number,
  player: Marker,
): [number, number][] {
  const flippable: [number, number][] = [];
  while (true) {
    x += i;
    y += j;
    if (x < 0 || x >= board[0].length || y < 0 || y >= board.length) {
      return [];
    }
    if (board[y][x].marker === Marker.FREE) {
      return [];
    } else if (board[y][x].marker === player) {
      return flippable;
    } else {
      flippable.push([x, y]);
    }
  }
}

function flippablePositions(
  board: SquareContent[][],
  x: number,
  y: number,
  player: Marker,
): [number, number][] {
  if (board[y][x].marker !== Marker.FREE) {
    return [];
  }
  let flippable: [number, number][] = [];
  for (let i = -1; i <= 1; ++i) {
    for (let j = -1; j <= 1; ++j) {
      flippable = flippable.concat(
        flippableInDirection(board, x, y, i, j, player),
      );
    }
  }
  return flippable;
}

function getValidMoves(
  boardArray: SquareContent[][],
  nextPlayer: Marker,
): Map<string, [number, number][]> {
  const validMoves = new Map<string, [number, number][]>();
  for (let i = 0; i < boardArray.length; ++i) {
    for (let j = 0; j < boardArray[0].length; ++j) {
      const flippable = flippablePositions(boardArray, i, j, nextPlayer);
      if (flippable.length > 0) {
        validMoves.set(`${i},${j}`, flippable);
      }
    }
  }
  return validMoves;
}

interface SquareProps {
  value: SquareContent;
  nextPlayer: Marker;
  onClick: () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

function Square(props: SquareProps): JSX.Element {
  let cssClasses = 'square';
  if (props.value.isValidMove) {
    cssClasses += ' valid-move';
    if (props.nextPlayer === Marker.HUMAN) {
      cssClasses += ' valid-human-move';
    } else {
      cssClasses += ' valid-bot-move';
    }
  }
  if (props.value.wouldBeFlipped) {
    cssClasses += ' would-be-flipped';
    if (props.nextPlayer === Marker.HUMAN) {
      cssClasses += ' would-be-flipped-human';
    } else {
      cssClasses += ' would-be-flipped-bot';
    }
  }
  return (
    <td
      className={cssClasses}
      onClick={props.onClick}
      onMouseEnter={props.handleMouseEnter}
      onMouseLeave={props.handleMouseLeave}
    >
      {markerToStr(props.value.marker)}
    </td>
  );
}

interface BoardProps {
  boardArray: SquareContent[][];
  nextPlayer: Marker;
  handleBoardClick: (x: number, y: number) => void;
  handleSquareMouseEnter: (x: number, y: number) => void;
  handleSquareMouseLeave: () => void;
}

function Board(props: BoardProps): JSX.Element {
  return (
    <div>
      <table>
        <tbody>
          {props.boardArray.map((row, y) => (
            <tr key={y} className="board-row">
              {row.map((sc, x) => (
                <Square
                  key={`${x} ${y}`}
                  value={sc}
                  nextPlayer={props.nextPlayer}
                  onClick={() => props.handleBoardClick(x, y)}
                  handleMouseEnter={() => props.handleSquareMouseEnter(x, y)}
                  handleMouseLeave={props.handleSquareMouseLeave}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Game(): JSX.Element {
  const BOARD_HEIGHT = 8;
  const BOARD_WIDTH = 8;
  const [isHumanNext, setIsHumanNext] = useState(true);
  const nextPlayer = isHumanNext ? Marker.HUMAN : Marker.BOT;
  const [boardArray, setBoardArray] = useState(
    createBoardArray(BOARD_WIDTH, BOARD_HEIGHT, nextPlayer),
  );
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [validMoves, setValidMoves] = useState(
    getValidMoves(boardArray, nextPlayer),
  );
  const status = isGameFinished
    ? 'Game over.'
    : `Next player: ${markerToStr(nextPlayer)}`;

  const handleBoardClick = (x: number, y: number) => {
    if (isGameFinished) {
      return;
    }
    const currentKey = `${x},${y}`;
    if (!validMoves.has(currentKey)) {
      return;
    }
    const boardArrayClone = boardArray.slice();
    boardArrayClone[y][x].marker = nextPlayer;
    for (const [i, j] of validMoves.get(currentKey) || []) {
      boardArrayClone[j][i].marker = nextPlayer;
    }
    let newValidMoves = getValidMoves(
      boardArrayClone,
      isHumanNext ? Marker.BOT : Marker.HUMAN,
    );
    if (newValidMoves.size === 0) {
      newValidMoves = getValidMoves(boardArrayClone, nextPlayer);
      if (newValidMoves.size === 0) {
        setIsGameFinished(true);
      }
    } else {
      setIsHumanNext(!isHumanNext);
    }
    for (let i = 0; i < BOARD_WIDTH; ++i) {
      for (let j = 0; j < BOARD_HEIGHT; ++j) {
        boardArrayClone[j][i].isValidMove = newValidMoves.has(`${i},${j}`);
        boardArrayClone[j][i].wouldBeFlipped = false;
      }
    }
    setBoardArray(boardArrayClone);
    setValidMoves(newValidMoves);
  };
  const handleSquareMouseEnter = (x: number, y: number) => {
    const currentKey = `${x},${y}`;
    if (!validMoves.has(currentKey)) {
      return;
    }
    const boardArrayClone = boardArray.slice();
    for (const [i, j] of validMoves.get(currentKey) || []) {
      boardArrayClone[j][i].wouldBeFlipped = true;
    }
    setBoardArray(boardArrayClone);
  };
  const handleSquareMouseLeave = () => {
    const boardArrayClone = boardArray.slice();
    for (let i = 0; i < boardArrayClone[0].length; ++i) {
      for (let j = 0; j < boardArrayClone.length; ++j) {
        boardArrayClone[j][i].wouldBeFlipped = false;
      }
    }
    setBoardArray(boardArrayClone);
  };
  return (
    <div className="game">
      <div className="status">{status}</div>
      <div className="game-board">
        <Board
          boardArray={boardArray}
          nextPlayer={nextPlayer}
          handleBoardClick={handleBoardClick}
          handleSquareMouseEnter={handleSquareMouseEnter}
          handleSquareMouseLeave={handleSquareMouseLeave}
        />
      </div>
    </div>
  );
}

// ========================================

ReactDOM.render(<Game />, document.getElementById('root'));
