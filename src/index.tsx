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

function getMarker(isHuman: boolean): Marker {
  return isHuman ? Marker.HUMAN : Marker.BOT;
}

function otherPlayer(marker: Marker): Marker {
  return marker === Marker.HUMAN ? Marker.BOT : Marker.HUMAN;
}

interface SquareContent {
  marker: Marker;
  isValidMove: boolean;
  wouldBeFlipped: boolean;
}

function createBoardArray(width: number, height: number, nextPlayer: Marker): SquareContent[][] {
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

function modifySquareContents(
  board: SquareContent[][],
  modifier: (target: SquareContent, i: number, j: number) => void,
) {
  for (let j = 0; j < board.length; ++j) {
    for (let i = 0; i < board[j].length; ++i) {
      modifier(board[j][i], i, j);
    }
  }
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

function flippablePositions(board: SquareContent[][], x: number, y: number, player: Marker): [number, number][] {
  if (board[y][x].marker !== Marker.FREE) {
    return [];
  }
  let flippable: [number, number][] = [];
  for (let i = -1; i <= 1; ++i) {
    for (let j = -1; j <= 1; ++j) {
      flippable = flippable.concat(flippableInDirection(board, x, y, i, j, player));
    }
  }
  return flippable;
}

function getValidMoves(boardArray: SquareContent[][], nextPlayer: Marker): Map<string, [number, number][]> {
  const validMoves = new Map<string, [number, number][]>();
  modifySquareContents(boardArray, (_target, x, y) => {
    const flippable = flippablePositions(boardArray, x, y, nextPlayer);
    if (flippable.length > 0) {
      validMoves.set(`${x},${y}`, flippable);
    }
  });
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
  boardWidth: number;
  boardHeight: number;
  nextPlayer: Marker;
  flipped: (numFlipped: number) => void;
  isGameOver: boolean;
  gameIsOver: () => void;
  otherPlayersTurn: () => void;
}

function Board(props: BoardProps): JSX.Element {
  const { boardWidth, boardHeight, nextPlayer, flipped, isGameOver, gameIsOver, otherPlayersTurn } = props;
  const [boardArray, setBoardArray] = useState(createBoardArray(boardWidth, boardHeight, nextPlayer));
  const [validMoves, setValidMoves] = useState(getValidMoves(boardArray, nextPlayer));

  const handleBoardClick = (x: number, y: number) => {
    // If the game is over, no more moves can be made.
    if (isGameOver) {
      return;
    }

    // If the clicked square is an invalid move, we do nothing.
    const currentKey = `${x},${y}`;
    if (!validMoves.has(currentKey)) {
      return;
    }

    // Since the move is valid, we save it and flip the appropriate pieces.
    const boardArrayClone = boardArray.slice();
    boardArrayClone[y][x].marker = nextPlayer;
    for (const [i, j] of validMoves.get(currentKey) || []) {
      boardArrayClone[j][i].marker = nextPlayer;
    }
    flipped(validMoves.get(currentKey)?.length || 0);

    // Get the valid moves for the other player. If there are none, then the
    // current player gets another turn. If the current player has none either,
    // then the game is over.
    let newValidMoves = getValidMoves(boardArrayClone, otherPlayer(nextPlayer));
    if (newValidMoves.size === 0) {
      newValidMoves = getValidMoves(boardArrayClone, nextPlayer);
      if (newValidMoves.size === 0) {
        gameIsOver();
      }
    } else {
      otherPlayersTurn();
    }

    // Reset the valid moves marked on the board.
    modifySquareContents(boardArrayClone, (target, x, y) => {
      target.isValidMove = newValidMoves.has(`${x},${y}`);
      target.wouldBeFlipped = false;
    });

    // Persist the board changes and the new set of valid moves.
    setBoardArray(boardArrayClone);
    setValidMoves(newValidMoves);
  };

  const handleHover = (x: number, y: number, isEnter: boolean) => {
    const currentKey = `${x},${y}`;
    if (!validMoves.has(currentKey)) {
      return;
    }
    const boardArrayClone = boardArray.slice();
    for (const [i, j] of validMoves.get(currentKey) || []) {
      boardArrayClone[j][i].wouldBeFlipped = isEnter;
    }
    setBoardArray(boardArrayClone);
  };

  return (
    <div>
      <table>
        <tbody>
          {boardArray.map((row, y) => (
            <tr key={y} className="board-row">
              {row.map((sc, x) => (
                <Square
                  key={`${x} ${y}`}
                  value={sc}
                  nextPlayer={nextPlayer}
                  onClick={() => handleBoardClick(x, y)}
                  handleMouseEnter={() => handleHover(x, y, true)}
                  handleMouseLeave={() => handleHover(x, y, false)}
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
  const nextPlayer = getMarker(isHumanNext);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState([2, 2]);

  function flipped(numFlipped: number): void {
    const newScore = score.slice();
    if (isHumanNext) {
      newScore[0] += 1 + numFlipped;
      newScore[1] -= numFlipped;
    } else {
      newScore[0] -= numFlipped;
      newScore[1] += 1 + numFlipped;
    }
    setScore(newScore);
  }

  return (
    <div className="game">
      <div className="status">{isGameOver ? 'Game over.\n' : `Next player: ${markerToStr(nextPlayer)}\n`}</div>
      <div className="score">{`The score is ${score[0]} for ${markerToStr(Marker.HUMAN)} and ${
        score[1]
      } for ${markerToStr(Marker.BOT)}.`}</div>
      <div className="game-board">
        <Board
          boardWidth={BOARD_WIDTH}
          boardHeight={BOARD_HEIGHT}
          nextPlayer={nextPlayer}
          isGameOver={isGameOver}
          gameIsOver={() => setIsGameOver(true)}
          otherPlayersTurn={() => setIsHumanNext(!isHumanNext)}
          flipped={flipped}
        />
      </div>
    </div>
  );
}

// ========================================

ReactDOM.render(<Game />, document.getElementById('root'));
