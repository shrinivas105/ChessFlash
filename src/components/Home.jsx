// Home screen – category buttons + Add Flashcard CTA

const CATEGORIES = [
  {
    id: 'opening',
    label: 'Opening',
    icon: '♟',
    desc: 'Learn the best first moves & develop your pieces',
    color: 'amber',
  },
  {
    id: 'tactics',
    label: 'Tactics',
    icon: '⚔',
    desc: 'Sharpen your pattern recognition & combinational eye',
    color: 'crimson',
  },
  {
    id: 'endgame',
    label: 'Endgame',
    icon: '♔',
    desc: 'Master king activity, pawn races & promotion',
    color: 'sapphire',
  },
]

function Home({ onSelectCategory, onAddCard, customCardCount }) {
  return (
    <div className="home">
      {/* ── Header ── */}
      <header className="home-header">
        <div className="logo">
          <span className="logo-king">♚</span>
          <span className="logo-text">Chess<em>Flash</em></span>
        </div>
        <p className="tagline">Train your chess pattern recognition</p>
      </header>

      {/* ── Category buttons ── */}
      <main className="categories">
        <p className="pick-label">Choose a category to begin</p>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`cat-btn cat-btn--${cat.color}`}
            onClick={() => onSelectCategory(cat.id)}
            aria-label={`Start ${cat.label} flashcards`}
          >
            <span className="cat-icon">{cat.icon}</span>
            <div className="cat-text">
              <span className="cat-name">{cat.label}</span>
              <span className="cat-desc">{cat.desc}</span>
            </div>
            <span className="cat-arrow">→</span>
          </button>
        ))}

        {/* ── Add flashcard button ── */}
        <button
          className="cat-btn cat-btn--add"
          onClick={onAddCard}
          aria-label="Add a new flashcard"
        >
          <span className="cat-icon add-icon">➕</span>
          <div className="cat-text">
            <span className="cat-name">Add New Flashcard</span>
            <span className="cat-desc">
              Create your own position &amp; best-move drill
              {customCardCount > 0 && (
                <span className="custom-badge">{customCardCount} custom</span>
              )}
            </span>
          </div>
          <span className="cat-arrow">→</span>
        </button>
      </main>

      {/* ── Footer ── */}
      <footer className="home-footer">
        <p>Click a piece, then click a target square to answer</p>
      </footer>
    </div>
  )
}

export default Home
