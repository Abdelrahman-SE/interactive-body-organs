import React, { useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import StartScreen from './components/StartScreen';
import HintModal from './components/HintModal';
import PhaseOne from './components/PhaseOne';
import PhaseTwo from './components/PhaseTwo';
import FeedbackScreen from './components/FeedbackScreen';
import './index.css';
import './App.css';

function GameRunner() {
  const { state } = useGame();

  return (
    <>
      {state.phase === 'start' && <StartScreen />}
      {state.phase === 'phase1' && <PhaseOne />}
      {state.phase === 'phase2' && <PhaseTwo />}
      {state.phase === 'feedback' && <FeedbackScreen />}
      
      {state.hintModalOpen && (
        <HintModal />
      )}
    </>
  );
}

function App() {
  useEffect(() => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      // @ts-ignore
      if (window.gameSCORM) {
        clearInterval(interval);
        try {
          // @ts-ignore
          window.gameSCORM.setupCourse(true, 0, 0);
          // @ts-ignore
          window.gameSCORM.initializeQuestions(12); // Adjust number based on total questions
        } catch {}
      } else if (attempts > 20) {
        clearInterval(interval); // Timeout after 2 seconds
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <GameProvider>
      <div className="game-wrapper">
        <div className="game-container">
          <GameRunner />
        </div>
      </div>
    </GameProvider>
  );
}

export default App;
