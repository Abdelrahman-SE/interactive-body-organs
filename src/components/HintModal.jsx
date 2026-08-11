import React, { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { playSound } from '../utils/audio';
import anime from 'animejs';
import textData from '../data/textData.json';
import './HintModal.css';

const HintModal = () => {
  const { state, dispatch } = useGame();
  const modalRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (state.phase === 'phase1' || state.phase === 'hint1') {
      playSound('hint_1');
    } else if (state.phase === 'phase2' || state.phase === 'hint2') {
      playSound('hint_2');
    }
    // Fade in the full screen
    anime({
      targets: containerRef.current,
      opacity: [0, 1],
      duration: 300,
      easing: 'easeOutQuad'
    });
    
    // Bounce in the modal box
    anime({
      targets: modalRef.current,
      scale: [0.8, 1],
      duration: 500,
      delay: 100,
      easing: 'easeOutElastic(1, .8)'
    });
  }, []);

  const handleClose = () => {
    playSound('close');
    anime({
      targets: containerRef.current,
      opacity: [1, 0],
      duration: 300,
      easing: 'easeInExpo',
      complete: () => {
        dispatch({ type: 'TOGGLE_HINT', payload: false });
      }
    });
  };

  const getHintText = () => {
    if (state.phase === 'phase1' || state.phase === 'hint1') {
      return textData.hints.phase1;
    }
    if (state.phase === 'phase2' || state.phase === 'hint2') {
      return textData.hints.phase2;
    }
    return "";
  };

  return (
    <div 
      ref={containerRef}
      className="hint-modal-overlay"
    >
      <img 
        src="./assets/project_photos/background_img.svg" 
        alt="Background" 
        className="feedback-border"
        draggable="false"
      />
      
      <div className="hint-modal-content-wrapper">
        <div 
          ref={modalRef} 
          className="hint-modal-box"
        >
          {/* Close Button matching the new design */}
          <div 
            className="hint-modal-close-btn"
            onClick={handleClose}
          >
            <div className="hint-modal-close-icon">
              <div className="hint-modal-close-line"></div>
              <div className="hint-modal-close-line"></div>
            </div>
          </div>

          <p 
            className="hint-modal-text" 
            dangerouslySetInnerHTML={{ __html: getHintText() }}
          ></p>
        </div>
      </div>
    </div>
  );
};

export default HintModal;
