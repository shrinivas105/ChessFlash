import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import Home from './components/Home'
import Flashcard from './components/Flashcard'
import AddFlashcard from './components/AddFlashcard'

const LS_KEY = 'chessflash_custom_cards'

function loadCustomCards() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCustomCards(cards) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cards))
  } catch {}
}

function App() {
  const [screen, setScreen]             = useState('home')
  const [category, setCategory]         = useState(null)
  const [csvCards, setCsvCards]         = useState([])
  const [customCards, setCustomCards]   = useState(loadCustomCards)
  const [loading, setLoading]           = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    Papa.parse('/flashcards.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvCards(results.data)
        setLoading(false)
      },
      error: () => setLoading(false),
    })
  }, [])

  const handleAddCard = (card) => {
    const newCard = {
      ...card,
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    }
    const updated = [...customCards, newCard]
    setCustomCards(updated)
    saveCustomCards(updated)
    setShowAddModal(false)
  }

  const handleDeleteCustomCard = (id) => {
    const updated = customCards.filter((c) => c.id !== id)
    setCustomCards(updated)
    saveCustomCards(updated)
  }

  const allCards = [...csvCards, ...customCards]

  const handleSelectCategory = (cat) => {
    setCategory(cat)
    setScreen('flashcard')
  }

  const handleGoHome = () => {
    setScreen('home')
    setCategory(null)
  }

  if (loading) {
    return (
      <div className="splash">
        <div className="splash-inner">
          <span className="splash-icon">♚</span>
          <p>Loading flashcards…</p>
        </div>
      </div>
    )
  }

  const filteredCards = allCards.filter(
    (card) => card.category?.toLowerCase() === category
  )

  return (
    <div className="app">
      {screen === 'home' && (
        <Home
          onSelectCategory={handleSelectCategory}
          onAddCard={() => setShowAddModal(true)}
          customCardCount={customCards.length}
        />
      )}
      {screen === 'flashcard' && (
        <Flashcard
          category={category}
          flashcards={filteredCards}
          onGoHome={handleGoHome}
        />
      )}
      {showAddModal && (
        <AddFlashcard
          onAdd={handleAddCard}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}

export default App
