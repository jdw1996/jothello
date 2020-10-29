import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './index.css';

function getMapMax<K, V>(map: Map<K, V>, comparator: (key1: K, val1: V, key2: K, val2: V) => number): K | undefined {
  let bestKeyYet = undefined;
  let bestValYet = undefined;
  for (const [currentKey, currentVal] of map) {
    if (!bestKeyYet || !bestValYet || comparator(bestKeyYet, bestValYet, currentKey, currentVal) > 0) {
      bestKeyYet = currentKey;
      bestValYet = currentVal;
    }
  }
  return bestKeyYet;
}

enum Marker {
  HUMAN,
  BOT,
  FREE,
}
type SquareContent = {
  marker: Marker;
  isValidMove: boolean;
  wouldBeFlipped: boolean;
  noLongerWouldBeFlipped: boolean;
  justPlaced: boolean;
  justFlipped: boolean;
};
type BoardArray = SquareContent[][];
type Score = [number, number];
type Coordinate = [number, number];
type ValidMoves = Map<string, Coordinate[]>;

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

function otherMarker(marker: Marker): Marker {
  return getMarker(marker !== Marker.HUMAN);
}

function coordToString(coord: Coordinate): string {
  return `${coord[0]},${coord[1]}`;
}

function stringToCoord(key: string): Coordinate {
  const ret = key.split(',').map(Number);
  if (ret.length === 2) return ret as Coordinate;
  throw new Error('Cannot convert given string to Coordinate!');
}

function createBoardArray(width: number, height: number, nextPlayer: Marker): BoardArray {
  const ret: BoardArray = [];
  for (let j = 0; j < height; ++j) {
    const row = [];
    for (let i = 0; i < width; ++i) {
      row.push({
        marker: Marker.FREE,
        isValidMove: false,
        wouldBeFlipped: false,
        noLongerWouldBeFlipped: false,
        justPlaced: false,
        justFlipped: false,
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
    const [x, y] = stringToCoord(k);
    ret[y][x].isValidMove = true;
  });
  return ret;
}

function isCorner([x, y]: Coordinate, boardWidth: number, boardHeight: number): boolean {
  return (x === 0 || x === boardWidth - 1) && (y === 0 || y === boardHeight - 1);
}

function isCornerAdjacent([x, y]: Coordinate, boardWidth: number, boardHeight: number): boolean {
  return (
    !isCorner([x, y], boardHeight, boardWidth) && (x <= 1 || x >= boardWidth - 2) && (y <= 1 || y >= boardHeight - 2)
  );
}

function isEdge([x, y]: Coordinate, boardWidth: number, boardHeight: number): boolean {
  return (
    !isCorner([x, y], boardHeight, boardWidth) && (x === 0 || x === boardWidth - 1 || y === 0 || y === boardHeight - 1)
  );
}

function isEdgeAdjacent([x, y]: Coordinate, boardWidth: number, boardHeight: number): boolean {
  return (
    !isCornerAdjacent([x, y], boardHeight, boardWidth) &&
    (x === 1 || x === boardWidth - 2 || y === 1 || y === boardHeight - 2)
  );
}

function modifySquareContents(board: BoardArray, modifier: (target: SquareContent, i: number, j: number) => void) {
  for (let j = 0; j < board.length; ++j) {
    for (let i = 0; i < board[j].length; ++i) {
      modifier(board[j][i], i, j);
    }
  }
}

function flippableInDirection(
  board: BoardArray,
  x: number,
  y: number,
  i: number,
  j: number,
  player: Marker,
): Coordinate[] {
  const flippable: Coordinate[] = [];
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

function flippablePositions(board: BoardArray, x: number, y: number, player: Marker): Coordinate[] {
  if (board[y][x].marker !== Marker.FREE) {
    return [];
  }
  let flippable: Coordinate[] = [];
  for (let i = -1; i <= 1; ++i) {
    for (let j = -1; j <= 1; ++j) {
      flippable = flippable.concat(flippableInDirection(board, x, y, i, j, player));
    }
  }
  return flippable;
}

function getValidMoves(board: BoardArray, nextPlayer: Marker): ValidMoves {
  const validMoves: ValidMoves = new Map<string, Coordinate[]>();
  modifySquareContents(board, (_target, x, y) => {
    const flippable = flippablePositions(board, x, y, nextPlayer);
    if (flippable.length > 0) {
      validMoves.set(coordToString([x, y]), flippable);
    }
  });
  return validMoves;
}

function flipped(currentScore: Score, numFlipped: number, isHumanMove: boolean): Score {
  const newScore: Score = [...currentScore];
  if (isHumanMove) {
    newScore[0] += 1 + numFlipped;
    newScore[1] -= numFlipped;
  } else {
    newScore[0] -= numFlipped;
    newScore[1] += 1 + numFlipped;
  }
  return newScore;
}

function takeMove(board: BoardArray, player: Marker, position: Coordinate, toFlip: Coordinate[]): void {
  board[position[1]][position[0]].marker = player;
  for (const [i, j] of toFlip) {
    board[j][i].marker = player;
  }
}

function botGo(board: BoardArray): number {
  // Get the list of possible moves. If none, return.
  const validMoves = getValidMoves(board, Marker.BOT);
  if (validMoves.size === 0) return 0;

  // Sort the moves based on their position on the board.
  let move = '';
  const boardHeight = board.length;
  const boardWidth = board[0].length;
  const corners = new Map<string, Coordinate[]>();
  const cornerAdjacent = new Map<string, Coordinate[]>();
  const edges = new Map<string, Coordinate[]>();
  const edgeAdjacent = new Map<string, Coordinate[]>();
  const interior = new Map<string, Coordinate[]>();
  for (const [key] of validMoves) {
    const checkingArgs: [Coordinate, number, number] = [stringToCoord(key), boardWidth, boardHeight];
    const settingArgs: [string, Coordinate[]] = [key, validMoves.get(key) || []];
    if (isCorner(...checkingArgs)) {
      corners.set(...settingArgs);
    } else if (isCornerAdjacent(...checkingArgs)) {
      cornerAdjacent.set(...settingArgs);
    } else if (isEdge(...checkingArgs)) {
      edges.set(...settingArgs);
    } else if (isEdgeAdjacent(...checkingArgs)) {
      edgeAdjacent.set(...settingArgs);
    } else {
      interior.set(...settingArgs);
    }
  }
  if (corners.size > 0) {
    // If any corner moves are available, choose the one that flips the most
    // pieces.
    move = getMapMax(corners, (_k1, v1, _k2, v2) => v2.length - v1.length) || move;
  } else if (edges.size > 0) {
    // If any edge moves are available, choose the one that flips the most
    // pieces.
    move = getMapMax(edges, (_k1, v1, _k2, v2) => v2.length - v1.length) || move;
  } else if (interior.size > 0) {
    // If any interior moves are available, choose the one that flips the fewest
    // pieces.
    move = getMapMax(interior, (_k1, v1, _k2, v2) => v1.length - v2.length) || move;
  } else if (edgeAdjacent.size > 0) {
    // If any edge-adjacent moves are available, choose the one that flips the
    // fewest pieces.
    move = getMapMax(edgeAdjacent, (_k1, v1, _k2, v2) => v1.length - v2.length) || move;
  } else {
    // If only corner-adjacent moves are available, choose the one that flips
    // the fewest pieces.
    move = getMapMax(cornerAdjacent, (_k1, v1, _k2, v2) => v1.length - v2.length) || move;
  }
  const [x, y] = stringToCoord(move);

  // Modify the board to reflect the chosen move.
  const flippedPosns: Coordinate[] = validMoves.get(move) || [];
  takeMove(board, Marker.BOT, [x, y], flippedPosns);
  board[y][x].justPlaced = true;
  for (const [i, j] of flippedPosns) {
    board[j][i].justFlipped = true;
  }

  // Return the number of pieces flipped.
  return flippedPosns.length;
}

type SquareProps = {
  value: SquareContent;
  onClick: () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
};

function Square(props: SquareProps): JSX.Element {
  const { value, onClick, handleMouseEnter, handleMouseLeave } = props;
  let cssClasses = 'square';
  if (value.isValidMove) {
    cssClasses += ' valid-move';
  }
  if (value.wouldBeFlipped) {
    cssClasses += ' would-be-flipped';
  }
  if (value.noLongerWouldBeFlipped) {
    cssClasses += ' no-longer-would-be-flipped';
  }
  if (value.justPlaced) {
    cssClasses += ' just-placed';
  }
  if (value.justFlipped) {
    cssClasses += ' just-flipped';
  }
  return (
    <td className={cssClasses} onClick={onClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="square-container">
        <div className="square-front">{markerToStr(value.marker)}</div>
        <div className="square-back">{markerToStr(otherMarker(value.marker))}</div>
      </div>
    </td>
  );
}

type BoardProps = {
  boardWidth: number;
  boardHeight: number;
  nextPlayer: Marker;
  isGameOver: boolean;
  gameIsOver: () => void;
  otherPlayersTurn: () => void;
  updateScore: (score: Score) => void;
};

function Board(props: BoardProps): JSX.Element {
  const { boardWidth, boardHeight, isGameOver, gameIsOver, updateScore } = props;
  const [board, setBoard] = useState(createBoardArray(boardWidth, boardHeight, Marker.HUMAN));
  const [validMoves, setValidMoves] = useState(getValidMoves(board, Marker.HUMAN));

  const handleBoardClick = (x: number, y: number) => {
    // If the game is over, no more moves can be made.
    if (isGameOver) {
      return;
    }

    // If the clicked square is an invalid move, we do nothing.
    const currentKey = coordToString([x, y]);
    if (!validMoves.has(currentKey)) {
      return;
    }

    // Since the move is valid, we save it and flip the appropriate pieces.
    const boardClone = board.slice();
    takeMove(boardClone, Marker.HUMAN, [x, y], validMoves.get(currentKey) || []);
    let scoreDiff = flipped([0, 0], validMoves.get(currentKey)?.length || 0, true);

    // Clear data about what the bot did previously.
    modifySquareContents(boardClone, (target) => {
      target.justPlaced = false;
      target.justFlipped = false;
      target.noLongerWouldBeFlipped = false;
    });

    let newValidMoves: ValidMoves = validMoves;
    let botPassed = false;
    do {
      // Let the bot take its turn.
      const numFlipped = botGo(boardClone);
      botPassed = numFlipped === 0;
      if (numFlipped > 0) {
        scoreDiff = flipped(scoreDiff, numFlipped, false);
      }

      // Determine whether there are any valid moves for humans; if there
      // aren't and the bot passed, then the game is over.
      newValidMoves = getValidMoves(boardClone, Marker.HUMAN);
      if (newValidMoves.size === 0 && botPassed) {
        gameIsOver();
      }

      // If the bot went and the human cannot go, the bot can go again.
    } while (newValidMoves.size === 0 && !botPassed);

    // Reset the valid moves marked on the board.
    modifySquareContents(boardClone, (target, x, y) => {
      target.isValidMove = newValidMoves.has(coordToString([x, y]));
      target.wouldBeFlipped = false;
    });

    // Persist the board changes, the new set of valid moves, and the new score.
    setBoard(boardClone);
    setValidMoves(newValidMoves);
    updateScore(scoreDiff);
  };

  const handleHover = (x: number, y: number, isEnter: boolean) => {
    const currentKey = coordToString([x, y]);
    if (!validMoves.has(currentKey)) {
      return;
    }
    const boardClone = board.slice();
    const changeToApply = isEnter
      ? (sc: SquareContent) => {
          sc.wouldBeFlipped = true;
          sc.noLongerWouldBeFlipped = false;
        }
      : (sc: SquareContent) => {
          sc.wouldBeFlipped = false;
          sc.noLongerWouldBeFlipped = true;
        };
    for (const [i, j] of validMoves.get(currentKey) || []) {
      changeToApply(boardClone[j][i]);
    }
    setBoard(boardClone);
  };

  return (
    <div>
      <table>
        <tbody>
          {board.map((row, y) => (
            <tr key={y} className="board-row">
              {row.map((sc, x) => (
                <Square
                  key={coordToString([x, y])}
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
  const [score, setScore] = useState<Score>([2, 2]);

  function updateScore(diff: Score): void {
    const newScore: Score = [...score];
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
