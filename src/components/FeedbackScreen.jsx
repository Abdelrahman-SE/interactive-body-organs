import React, { useEffect, useRef, useState } from "react";
import anime from "animejs";
import { useGame } from "../context/GameContext";
import { playSound, stopAllSounds } from "../utils/audio";
import textData from "../data/textData.json";
import "./FeedbackScreen.css";

const FeedbackScreen = () => {
  const { state, dispatch } = useGame();
  const containerRef = useRef(null);
  const [scoreData, setScoreData] = useState({
    score: 0,
    stars: 0,
    text: "",
    title: "",
  });

  useEffect(() => {
    // Calculate score
    let dragScore = 0;
    let textScore = 0;

    Object.values(state.organs).forEach((organ) => {
      if (organ.placedErrors < 2) dragScore += 1;
      if (organ.namedErrors === 0) textScore += 1;
    });

    const totalRawScore = dragScore + textScore; // Out of 12
    const percentage = (totalRawScore / 12) * 100;

    let stars = 0;
    let text = "";
    let title = "";

    if (percentage >= 85) {
      stars = 3;
      title = textData.feedback.excellent.title;
      text = textData.feedback.excellent.text;
    } else if (percentage >= 65) {
      stars = 2;
      title = textData.feedback.veryGood.title;
      text = textData.feedback.veryGood.text;
    } else if (percentage >= 50) {
      stars = 1;
      title = textData.feedback.good.title;
      text = textData.feedback.good.text;
    } else {
      stars = 0;
      title = textData.feedback.fair.title;
      text = textData.feedback.fair.text;
    }

    setScoreData({ score: totalRawScore, stars, text, title });

    // Animate container entrance
    anime({
      targets: containerRef.current,
      opacity: [0, 1],
      duration: 800,
      easing: "easeOutElastic(1, .8)",
    });

    // Animate stars pop in one by one after state updates DOM
    setTimeout(() => {
      anime({
        targets: ".star-animated",
        scale: [0, 1], // Scale from center
        opacity: [0, 1],
        duration: 1000,
        delay: anime.stagger(250, { start: 400 }), // Staggered appearance!
        easing: "easeOutElastic(1, .5)",
      });
    }, 50);

    // Play end sound based on score
    playSound(`feedbackStars_${stars}`);
  }, [state.organs]);

  const handleRestart = () => {
    stopAllSounds();
    dispatch({ type: "RESTART_GAME" });
  };

  return (
    <div className="start-screen-container">
      <img
        src="./assets/project_photos/background_img.svg"
        alt="Background"
        className="bg-image-contain"
        draggable="false"
      />

      <div ref={containerRef} className="feedback-modal">
        <img
          src="./assets/project_photos/feedback_border.svg"
          alt="Border"
          className="feedback-border"
          draggable="false"
        />

        {/* Stars */}
        <div className="feedback-stars-container">
          <div className="star-wrapper star-right">
            <img
              src={`./assets/project_photos/${scoreData.stars >= 1 ? "star_fill_right.svg" : "star_dimmed_right.svg"}`}
              alt="Star Right"
              className="star-base star-animated"
              draggable="false"
            />
          </div>

          <div className="star-wrapper star-mid">
            <img
              src={`./assets/project_photos/${scoreData.stars >= 2 ? "star_fill_mid.svg" : "star_dimed_mid.svg"}`}
              alt="Star Mid"
              className="star-base star-animated"
              draggable="false"
            />
          </div>

          <div className="star-wrapper star-left">
            <img
              src={`./assets/project_photos/${scoreData.stars >= 3 ? "star_fill_left.svg" : "star_dimmed_left.svg"}`}
              alt="Star Left"
              className="star-base star-animated"
              draggable="false"
            />
          </div>
        </div>

        {/* Score Pill */}
        <div className="feedback-score-pill">
          <img
            src="./assets/project_photos/score_border.svg"
            alt="Score background"
            className="feedback-score-border"
            draggable="false"
          />
          <span className="feedback-score-value">{scoreData.score} / 12</span>
        </div>

        {/* Content */}
        <div className="feedback-content">
          <h1 className="feedback-title">{scoreData.title}</h1>
          <p className="feedback-text">{scoreData.text}</p>
        </div>

        {/* Replay Button */}
        <img
          src="./assets/project_photos/reload_btn.svg"
          alt="Replay"
          onClick={() => {
            handleRestart();
            playSound("click");
          }}
          className="feedback-reload-btn"
          draggable="false"
        />
      </div>
    </div>
  );
};

export default FeedbackScreen;
