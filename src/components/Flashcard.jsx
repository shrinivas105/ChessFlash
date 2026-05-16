import { useState, useEffect, useCallback, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'

// ─── Status constants ────────────────────────────────────────────────────────
// idle       → waiting for the user to click a piece
// selected   → a piece is selected; showing legal-move highlights
// correct    → user played the best move (auto-advance after 1.5 s)
// wrong      → user played a legal but wrong move
// solution   → showing the best-move squares + SAN text

// ─── Color helpers ───────────────────────────────────────────────────────────
const HIGHLIGHT = {
  selected:    'rgba(201,148,26,0.75)',   // gold – selected piece
  legalMove:   'rgba(201,148,26,0.28)',   // gold dim – reachable squares
  solution:    'rgba(34, 197, 94, 0.55)', // green – best-move squares
}

function buildLegalMoveStyles(game, square) {
  if (!game || !square) return {}
  const moves = game.moves({ square, verbose: true })
  const styles = {
    [square]: {
      background: HIGHLIGHT.selected,
      borderRadius: '6px',
      boxShadow: `inset 0 0 0 3px rgba(201,148,26,0.9)`,
    },
  }
  moves.forEach(({ to, flags }) => {
    // Dot for empty squares, ring for captures
    const isCapture = flags.includes('c') || flags.includes('e')
    styles[to] = isCapture
      ? {
          background: 'radial-gradient(circle, rgba(201,148,26,0.5) 65%, transparent 70%)',
          borderRadius: '50%',
        }
      : {
          background: `radial-gradient(circle, ${HIGHLIGHT.legalMove} 28%, transparent 32%)`,
        }
  })
  return styles
}

function Flashcard({ category, flashcards, onGoHome }) {
  const [currentCard, setCurrentCard] = useState(null)
  const [game, setGame]               = useState(null)
  const [status, setStatus]           = useState('idle')
  const [selectedSquare, setSelectedSquare] = useState(null)  // click-to-move state
  const [customSquareStyles, setCustomSquareStyles] = useState({})
  const [boardWidth, setBoardWidth]   = useState(
    () => Math.min(window.innerWidth - 32, 480)
  )

  const lastCardIdRef = useRef(null)

  // ── Board width ──────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setBoardWidth(Math.min(window.innerWidth - 32, 480))
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // ── Pick a random card ───────────────────────────────────────────────────
  const pickRandom = useCallback(() => {
    if (!flashcards.length) return null
    const pool =
      flashcards.length > 1
        ? flashcards.filter((c) => c.id !== lastCardIdRef.current)
        : flashcards
    return pool[Math.floor(Math.random() * pool.length)]
  }, [flashcards])

  // ── Load a card ──────────────────────────────────────────────────────────
  const loadCard = useCallback((card) => {
    const newGame = new Chess(card.fen)
    setGame(newGame)
    setCurrentCard(card)
    setStatus('idle')
    setSelectedSquare(null)
    setCustomSquareStyles({})
    lastCardIdRef.current = card.id
  }, [])

  useEffect(() => {
    const card = pickRandom()
    if (card) loadCard(card)
  }, []) // eslint-disable-line

  const goNext = useCallback(() => {
    const card = pickRandom()
    if (card) loadCard(card)
  }, [pickRandom, loadCard])

  // ── UCI → SAN helper ─────────────────────────────────────────────────────
  const uciToSan = (fen, uci) => {
    try {
      const g     = new Chess(fen)
      const from  = uci.slice(0, 2)
      const to    = uci.slice(2, 4)
      const promo = uci.slice(4) || undefined
      const move  = g.move({ from, to, promotion: promo ?? 'q' })
      return move ? move.san : uci
    } catch {
      return uci
    }
  }

  // ── Attempt a move (shared by click and drag) ─────────────────────────────
  const attemptMove = useCallback(
    (from, to) => {
      if (!game || !currentCard) return false

      const piece = game.get(from)
      const isPawnPromo =
        piece?.type === 'p' &&
        (to[1] === '8' || to[1] === '1')

      const gameCopy = new Chess(game.fen())
      let move = null
      try {
        move = gameCopy.move({
          from,
          to,
          promotion: isPawnPromo ? 'q' : undefined,
        })
      } catch {
        return false
      }
      if (!move) return false

      const playedUci = (from + to + (isPawnPromo ? 'q' : '')).toLowerCase()
      const bestUci   = currentCard.bestMove.trim().toLowerCase()

      setSelectedSquare(null)
      setCustomSquareStyles({})

      if (playedUci === bestUci) {
        setGame(gameCopy)
        setStatus('correct')
        setTimeout(goNext, 1500)
        return true
      } else {
        setStatus('wrong')
        return false
      }
    },
    [game, currentCard, goNext]
  )

  // ── Click-to-move: square click handler ──────────────────────────────────
  const onSquareClick = useCallback(
    (square) => {
      if (status !== 'idle' && status !== 'selected') return
      if (!game) return

      const clickedPiece = game.get(square)
      const activeColor  = game.turn()

      // Case 1: Nothing selected yet → select the clicked piece (if it belongs to the side to move)
      if (!selectedSquare) {
        if (clickedPiece && clickedPiece.color === activeColor) {
          setSelectedSquare(square)
          setStatus('selected')
          setCustomSquareStyles(buildLegalMoveStyles(game, square))
        }
        return
      }

      // Case 2: A square is already selected
      if (square === selectedSquare) {
        // Clicking the same square → deselect
        setSelectedSquare(null)
        setStatus('idle')
        setCustomSquareStyles({})
        return
      }

      // Clicking another own piece → switch selection
      if (clickedPiece && clickedPiece.color === activeColor) {
        setSelectedSquare(square)
        setStatus('selected')
        setCustomSquareStyles(buildLegalMoveStyles(game, square))
        return
      }

      // Otherwise → attempt the move
      const moved = attemptMove(selectedSquare, square)
      if (!moved) {
        // Illegal square – keep selection if piece is still there, else clear
        if (clickedPiece && clickedPiece.color === activeColor) {
          setSelectedSquare(square)
          setStatus('selected')
          setCustomSquareStyles(buildLegalMoveStyles(game, square))
        } else {
          setSelectedSquare(null)
          setStatus('idle')
          setCustomSquareStyles({})
        }
      }
    },
    [status, game, selectedSquare, attemptMove]
  )

  // ── Drag-and-drop still supported ───────────────────────────────────────
  const onPieceDrop = useCallback(
    (sourceSquare, targetSquare, piece) => {
      if ((status !== 'idle' && status !== 'selected') || !game || !currentCard) return false
      // Clear any click-selection first
      setSelectedSquare(null)
      setCustomSquareStyles({})
      setStatus('idle')
      const result = attemptMove(sourceSquare, targetSquare)
      return result
    },
    [status, game, currentCard, attemptMove]
  )

  // ── Retry ────────────────────────────────────────────────────────────────
  const handleRetry = () => {
    if (!currentCard) return
    setGame(new Chess(currentCard.fen))
    setStatus('idle')
    setSelectedSquare(null)
    setCustomSquareStyles({})
  }

  // ── Show solution ────────────────────────────────────────────────────────
  const handleShowSolution = () => {
    if (!currentCard) return
    const from = currentCard.bestMove.slice(0, 2)
    const to   = currentCard.bestMove.slice(2, 4)
    setCustomSquareStyles({
      [from]: { background: HIGHLIGHT.solution, borderRadius: '4px' },
      [to]:   { background: HIGHLIGHT.solution, borderRadius: '4px' },
    })
    setSelectedSquare(null)
    setStatus('solution')
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const sideToMove       = game ? (game.turn() === 'w' ? 'White to move' : 'Black to move') : ''
  const boardOrientation = game?.turn() === 'b' ? 'black' : 'white'
  const bestMoveSan      = currentCard ? uciToSan(currentCard.fen, currentCard.bestMove) : ''
  const catLabel         = category ? category.charAt(0).toUpperCase() + category.slice(1) : ''

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!flashcards.length) {
    return (
      <div className="fc-empty">
        <p>No flashcards found for <strong>{catLabel}</strong>.</p>
        <button className="btn btn--ghost" onClick={onGoHome}>← Back to Home</button>
      </div>
    )
  }

  if (!currentCard || !game) {
    return <div className="splash"><div className="splash-inner"><p>Loading…</p></div></div>
  }

  const isActive = status === 'idle' || status === 'selected'

  return (
    <div className="fc">
      {/* ── Top bar ── */}
      <div className="fc-topbar">
        <button className="btn btn--ghost btn--sm" onClick={onGoHome}>← Home</button>
        <span className={`fc-badge fc-badge--${category}`}>{catLabel}</span>
      </div>

      {/* ── Side-to-move pill ── */}
      <div className="fc-side">
        <span className={`side-dot side-dot--${game.turn()}`} />
        {sideToMove}
      </div>

      {/* ── Chessboard ── */}
      <div className="fc-board" style={{ cursor: isActive ? 'pointer' : 'default' }}>
        <Chessboard
          id="flashcard-board"
          position={game.fen()}
          onPieceDrop={onPieceDrop}
          onSquareClick={onSquareClick}
          boardOrientation={boardOrientation}
          boardWidth={boardWidth}
          customSquareStyles={customSquareStyles}
          animationDuration={200}
          areArrowsAllowed={false}
          arePiecesDraggable={isActive}
          customBoardStyle={{
            borderRadius: '8px',
            boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
          }}
        />
      </div>

      {/* ── Feedback area ── */}
      <div className="fc-feedback">
        {(status === 'idle' || status === 'selected') && (
          <p className="hint">
            {status === 'selected'
              ? 'Click a highlighted square to move'
              : 'Click a piece to select it'}
          </p>
        )}

        {status === 'correct' && (
          <div className="feedback feedback--correct">
            ✅ Correct! Congrats
          </div>
        )}

        {status === 'wrong' && (
          <div className="feedback feedback--wrong">
            <p>❌ Wrong move — try again!</p>
            <div className="fc-actions">
              <button className="btn btn--secondary" onClick={handleRetry}>
                ↺ Retry
              </button>
              <button className="btn btn--ghost" onClick={handleShowSolution}>
                💡 Show Solution
              </button>
            </div>
          </div>
        )}

        {status === 'solution' && (
          <div className="feedback feedback--solution">
            <p>
              Best move:{' '}
              <strong className="best-move-san">{bestMoveSan}</strong>
            </p>
            <button className="btn btn--primary" onClick={goNext}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Flashcard
