import React, { createContext, useReducer, useContext } from 'react';

import textData from '../data/textData.json';

const initialState = {
  phase: 'start', // 'start', 'phase1', 'phase2', 'feedback'
  hintModalOpen: false,
  organs: {
    brain: { id: 'brain', names: textData.organs.brain, isPlaced: false, isNamed: false, placedErrors: 0, namedErrors: 0 },
    lungs: { id: 'lungs', names: textData.organs.lungs, isPlaced: false, isNamed: false, placedErrors: 0, namedErrors: 0 },
    heart: { id: 'heart', names: textData.organs.heart, isPlaced: false, isNamed: false, placedErrors: 0, namedErrors: 0 },
    stomach: { id: 'stomach', names: textData.organs.stomach, isPlaced: false, isNamed: false, placedErrors: 0, namedErrors: 0 },
    kidneys: { id: 'kidneys', names: textData.organs.kidneys, isPlaced: false, isNamed: false, placedErrors: 0, namedErrors: 0 },
    intestine: { id: 'intestine', names: textData.organs.intestine, isPlaced: false, isNamed: false, placedErrors: 0, namedErrors: 0 }
  }
};

const GameContext = createContext();

function gameReducer(state, action) {
  switch (action.type) {
    case 'START_GAME':
      return { ...state, phase: 'hint1', hintModalOpen: true };
    case 'TOGGLE_HINT': {
      const newHintState = action.payload !== undefined ? action.payload : !state.hintModalOpen;
      let newPhase = state.phase;
      if (!newHintState) {
        if (state.phase === 'hint1') newPhase = 'phase1';
        if (state.phase === 'hint2') newPhase = 'phase2';
      }
      return { ...state, hintModalOpen: newHintState, phase: newPhase };
    }
    case 'PLACE_ORGAN': {
      const newState = {
        ...state,
        organs: {
          ...state.organs,
          [action.payload.id]: {
            ...state.organs[action.payload.id],
            isPlaced: true
          }
        }
      };
      return newState;
    }
    case 'ADVANCE_PHASE_TWO_HINT': {
      return {
        ...state,
        phase: 'hint2',
        hintModalOpen: true
      };
    }
    case 'RECORD_PLACE_ERROR':
      return {
        ...state,
        organs: {
          ...state.organs,
          [action.payload.id]: {
            ...state.organs[action.payload.id],
            placedErrors: state.organs[action.payload.id].placedErrors + 1
          }
        }
      };
    case 'NAME_ORGAN': {
      const newState = {
        ...state,
        organs: {
          ...state.organs,
          [action.payload.id]: {
            ...state.organs[action.payload.id],
            isNamed: true
          }
        }
      };
      return newState;
    }
    case 'ADVANCE_FEEDBACK': {
      return {
        ...state,
        phase: 'feedback',
        hintModalOpen: false
      };
    }
    case 'RECORD_NAME_ERROR':
      return {
        ...state,
        organs: {
          ...state.organs,
          [action.payload.id]: {
            ...state.organs[action.payload.id],
            namedErrors: state.organs[action.payload.id].namedErrors + 1
          }
        }
      };
    case 'RESTART_GAME':
      return initialState;
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}
