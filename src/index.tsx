import React, { useEffect, useState } from 'react';
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

function sleep(ms: number): Promise<unknown> {
  return new Promise((v) => setTimeout(v, ms));
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

function cloneBoardArray(board: BoardArray): BoardArray {
  const ret: BoardArray = [];
  for (const row of board) {
    const newRow: SquareContent[] = [];
    for (const sc of row) {
      newRow.push({ ...sc });
    }
    ret.push(newRow);
  }
  return ret;
}

class MoveRegion {
  private categorizer: ([x, y]: Coordinate, boardWidth: number, boardHeight: number) => boolean;
  private comparator: (key1: string, val1: Coordinate[], key2: string, val2: Coordinate[]) => number;
  private boardWidth: number;
  private boardHeight: number;
  private moves: ValidMoves;

  constructor(
    categorizer: ([x, y]: Coordinate, boardWidth: number, boardHeight: number) => boolean,
    comparator: (key1: string, val1: Coordinate[], key2: string, val2: Coordinate[]) => number,
    boardWidth: number,
    boardHeight: number,
  ) {
    this.categorizer = categorizer;
    this.comparator = comparator;
    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;
    this.moves = new Map<string, Coordinate[]>();
  }

  tryAddMove(move: string, wouldFlip: Coordinate[]): boolean {
    if (this.categorizer(stringToCoord(move), this.boardWidth, this.boardHeight) && wouldFlip.length > 0) {
      this.moves.set(move, wouldFlip);
      return true;
    }
    return false;
  }

  getBestMove(): [string, Coordinate[]] {
    const bestMove = getMapMax(this.moves, this.comparator) || '';
    return [bestMove, this.moves.get(bestMove) || []];
  }

  hasMoves(): boolean {
    return this.moves.size > 0;
  }
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
    !isCorner([x, y], boardHeight, boardWidth) &&
    !isCornerAdjacent([x, y], boardHeight, boardWidth) &&
    (x === 0 || x === boardWidth - 1 || y === 0 || y === boardHeight - 1)
  );
}

function isEdgeAdjacent([x, y]: Coordinate, boardWidth: number, boardHeight: number): boolean {
  return (
    !isCornerAdjacent([x, y], boardHeight, boardWidth) &&
    (x === 1 || x === boardWidth - 2 || y === 1 || y === boardHeight - 2)
  );
}

function isInterior(...args: [Coordinate, number, number]): boolean {
  return !isCorner(...args) && !isCornerAdjacent(...args) && !isEdge(...args) && !isEdgeAdjacent(...args);
}

function loopOverBoard(board: BoardArray, modifier: (target: SquareContent, i: number, j: number) => void) {
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
  loopOverBoard(board, (_target, x, y) => {
    const flippable = flippablePositions(board, x, y, nextPlayer);
    if (flippable.length > 0) {
      validMoves.set(coordToString([x, y]), flippable);
    }
  });
  return validMoves;
}

function flipped(numFlipped: number, isHumanMove: boolean): Score {
  const newScore: Score = [0, 0];
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
  const boardHeight = board.length;
  const boardWidth = board[0].length;
  const longestValueComparator = (_k1: string, v1: Coordinate[], _k2: string, v2: Coordinate[]) =>
    v2.length - v1.length;
  const shortestValueComparator = (_k1: string, v1: Coordinate[], _k2: string, v2: Coordinate[]) =>
    v1.length - v2.length;
  const moveRegions: MoveRegion[] = [
    new MoveRegion(isCorner, longestValueComparator, boardWidth, boardHeight),
    new MoveRegion(isEdge, longestValueComparator, boardWidth, boardHeight),
    new MoveRegion(isInterior, shortestValueComparator, boardWidth, boardHeight),
    new MoveRegion(isEdgeAdjacent, shortestValueComparator, boardWidth, boardHeight),
    new MoveRegion(isCornerAdjacent, shortestValueComparator, boardWidth, boardHeight),
  ];

  let move = '';
  let flippedPosns: Coordinate[] = [];
  for (const [key] of validMoves) {
    for (let i = 0; i < moveRegions.length; ++i) {
      if (moveRegions[i].tryAddMove(key, validMoves.get(key) || [])) {
        break;
      }
    }
  }
  for (let i = 0; i < moveRegions.length; ++i) {
    if (moveRegions[i].hasMoves()) {
      const bestMove = moveRegions[i].getBestMove();
      move = bestMove[0];
      flippedPosns = bestMove[1];
      if (move) {
        break;
      }
    }
  }
  const [x, y] = stringToCoord(move);

  // Modify the board to reflect the chosen move.
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
  score: Score;
  gameIsOver: () => void;
  otherPlayersTurn: () => void;
  updateScore: (score: Score) => void;
};

function Board(props: BoardProps): JSX.Element {
  const { boardWidth, boardHeight, nextPlayer, isGameOver, score, gameIsOver, otherPlayersTurn, updateScore } = props;
  const [board, setBoard] = useState(createBoardArray(boardWidth, boardHeight, Marker.HUMAN));
  const [validMoves, setValidMoves] = useState(getValidMoves(board, Marker.HUMAN));

  useEffect(() => {
    const f = async () => {
      // If it's the human's turn or the game is over, do nothing.
      if (nextPlayer !== Marker.BOT || isGameOver) return;

      const boardClone = cloneBoardArray(board);
      let endGame = false;

      // Let the bot take its turn.
      const numFlipped = botGo(boardClone);
      const scoreDiff = flipped(numFlipped, false);

      // If the bot made a move, wait before persisting changes.
      await sleep(scoreDiff[0] === 0 && scoreDiff[1] === 0 ? 0 : 500);

      // Find the possible moves for the human.
      const newValidMoves = getValidMoves(boardClone, Marker.HUMAN);
      if (newValidMoves.size > 0) {
        // If the human can go, it is their turn.
        otherPlayersTurn();
        // Mark valid moves on the board.
        loopOverBoard(boardClone, (target, x, y) => {
          target.isValidMove = newValidMoves.has(coordToString([x, y]));
        });
      } else if (numFlipped === 0) {
        // If the human can't go and the bot passed, the game is over.
        endGame = true;
      }

      endGame && gameIsOver();
      setBoard(boardClone);
      setValidMoves(newValidMoves);
      updateScore(scoreDiff);
    };
    f();
  }, [score]);

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
    const boardClone = cloneBoardArray(board);
    takeMove(boardClone, Marker.HUMAN, [x, y], validMoves.get(currentKey) || []);
    const scoreDiff = flipped(validMoves.get(currentKey)?.length || 0, true);

    // Clear data about what happened previously.
    loopOverBoard(boardClone, (target) => {
      target.isValidMove = false;
      target.wouldBeFlipped = false;
      target.justPlaced = false;
      target.justFlipped = false;
      target.noLongerWouldBeFlipped = false;
    });

    // End turn and persist board changes, new set of valid moves, and new score.
    otherPlayersTurn();
    setBoard(boardClone);
    setValidMoves(new Map<string, Coordinate[]>());
    updateScore(scoreDiff);
  };

  const handleHover = (x: number, y: number, isEnter: boolean) => {
    const currentKey = coordToString([x, y]);
    if (!validMoves.has(currentKey)) {
      return;
    }
    const changeToApply = isEnter
      ? (sc: SquareContent) => {
          sc.wouldBeFlipped = true;
          sc.noLongerWouldBeFlipped = false;
        }
      : (sc: SquareContent) => {
          sc.wouldBeFlipped = false;
          sc.noLongerWouldBeFlipped = true;
        };
    setBoard((b) => {
      const bClone = cloneBoardArray(b);
      for (const [i, j] of validMoves.get(currentKey) || []) {
        changeToApply(bClone[j][i]);
      }
      return bClone;
    });
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
  const [boardKey, setBoardKey] = useState(0);

  function updateScore(diff: Score): void {
    setScore((s) => {
      const sClone: Score = [...s];
      sClone[0] += diff[0];
      sClone[1] += diff[1];
      return sClone;
    });
  }

  function newGame(): void {
    setIsHumanNext(true);
    setIsGameOver(false);
    setScore([2, 2]);
    setBoardKey((n) => n + 1);
  }

  return (
    <div className="game">
      <p className="status">
        {isGameOver ? (
          <>
            Game over. <button onClick={newGame}>Reset</button>
          </>
        ) : (
          `Next player: ${markerToStr(nextPlayer)}\n`
        )}
      </p>
      <p className="score">{`The score is ${score[0]} for ${markerToStr(Marker.HUMAN)} and ${
        score[1]
      } for ${markerToStr(Marker.BOT)}.`}</p>
      <div className="game-board">
        <Board
          key={boardKey}
          boardWidth={BOARD_WIDTH}
          boardHeight={BOARD_HEIGHT}
          nextPlayer={nextPlayer}
          isGameOver={isGameOver}
          score={score}
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
