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

function flipped(currentScore: [number, number], numFlipped: number, isHumanMove: boolean): [number, number] {
  const newScore: [number, number] = [...currentScore];
  if (isHumanMove) {
    newScore[0] += 1 + numFlipped;
    newScore[1] -= numFlipped;
  } else {
    newScore[0] -= numFlipped;
    newScore[1] += 1 + numFlipped;
  }
  return newScore;
}

function botGo(validMoves: Map<string, [number, number][]>): string {
  let ret = '';
  for (const [key] of validMoves) {
    ret = key;
    break;
  }
  return ret;
}

interface SquareProps {
  value: SquareContent;
  onClick: () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
}

function Square(props: SquareProps): JSX.Element {
  const { value, onClick, handleMouseEnter, handleMouseLeave } = props;
  let cssClasses = 'square';
  if (value.isValidMove) {
    cssClasses += ' valid-human-move';
  }
  if (value.wouldBeFlipped) {
    cssClasses += ' would-be-flipped-human';
  }
  return (
    <td className={cssClasses} onClick={onClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {markerToStr(value.marker)}
    </td>
  );
}

interface BoardProps {
  boardWidth: number;
  boardHeight: number;
  nextPlayer: Marker;
  isGameOver: boolean;
  gameIsOver: () => void;
  otherPlayersTurn: () => void;
  updateScore: (score: [number, number]) => void;
}

function Board(props: BoardProps): JSX.Element {
  const { boardWidth, boardHeight, isGameOver, gameIsOver, updateScore } = props;
  const [boardArray, setBoardArray] = useState(createBoardArray(boardWidth, boardHeight, Marker.HUMAN));
  const [validMoves, setValidMoves] = useState(getValidMoves(boardArray, Marker.HUMAN));

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
    boardArrayClone[y][x].marker = Marker.HUMAN;
    for (const [i, j] of validMoves.get(currentKey) || []) {
      boardArrayClone[j][i].marker = Marker.HUMAN;
    }
    let scoreDiff = flipped([0, 0], validMoves.get(currentKey)?.length || 0, true);
    let newValidMoves: Map<string, [number, number][]> = validMoves;

    while (true) {
      let botPassed = false;
      // TODO: Pull most of this logic into a separate function that outputs numFlipped.
      // Maybe just put it in botGo.
      newValidMoves = getValidMoves(boardArrayClone, Marker.BOT);
      if (newValidMoves.size === 0) {
        botPassed = true;
      } else {
        const botMove = botGo(newValidMoves);
        const [botMoveX, botMoveY] = botMove.split(',').map(Number);
        boardArrayClone[botMoveY][botMoveX].marker = Marker.BOT;
        for (const [i, j] of newValidMoves.get(botMove) || []) {
          boardArrayClone[j][i].marker = Marker.BOT;
        }
        scoreDiff = flipped(scoreDiff, newValidMoves.get(botMove)?.length || 0, false);
      }
      newValidMoves = getValidMoves(boardArrayClone, Marker.HUMAN);
      if (newValidMoves.size === 0) {
        if (botPassed) {
          gameIsOver();
          break;
        } else {
          continue;
        }
      } else {
        break;
      }
    }

    // Reset the valid moves marked on the board.
    modifySquareContents(boardArrayClone, (target, x, y) => {
      target.isValidMove = newValidMoves.has(`${x},${y}`);
      target.wouldBeFlipped = false;
    });

    // Persist the board changes, the new set of valid moves, and the new score.
    setBoardArray(boardArrayClone);
    setValidMoves(newValidMoves);
    updateScore(scoreDiff);
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
  const [score, setScore] = useState<[number, number]>([2, 2]);

  function updateScore(diff: [number, number]): void {
    const newScore = score.slice();
    newScore[0] += diff[0];
    newScore[1] += diff[1];
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
          updateScore={updateScore}
        />
      </div>
    </div>
  );
}

// ========================================

ReactDOM.render(<Game />, document.getElementById('root'));
