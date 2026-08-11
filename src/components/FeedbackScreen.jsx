import React, { useEffect, useRef, useState } from "react";
import anime from "animejs";
import { useGame } from "../context/GameContext";
import { playSound } from "../utils/audio";
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
    const scaledTotalScore = totalRawScore / 2; // Out of 6 (3 for phase 1, 3 for phase 2)
    const percentage = (scaledTotalScore / 6) * 100;

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

    setScoreData({ score: scaledTotalScore, stars, text, title });

    // Animate container entrance
    anime({
      targets: containerRef.current,
      opacity: [0, 1],
      duration: 800,
      easing: "easeOutElastic(1, .8)",
    });

    // Play end sound based on score
    playSound(`feedbackStars_${stars}`);
  }, [state.organs]);

  const handleRestart = () => {
    playSound("start");
    dispatch({ type: "RESTART_GAME" });
  };

  const getStarsImg = () => {
    switch (scoreData.stars) {
      case 3:
        return "stars_filled.svg";
      case 2:
        return "stars2.svg"; // Assuming it's named like this
      case 1:
        return "stars1.svg";
      case 0:
      default:
        return "stars_dimmed.svg";
    }
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
        <img
          src={`./assets/project_photos/${getStarsImg()}`}
          alt="Stars"
          className="feedback-stars-img"
          draggable="false"
        />

        {/* Content */}
        <div className="feedback-content">
          <h1 className="feedback-title">{scoreData.title}</h1>
          <p className="feedback-text">{scoreData.text}</p>
        </div>

        {/* Score Pill */}
        <div className="feedback-score-pill">
          <img
            src="./assets/project_photos/score_border.svg"
            alt="Score background"
            className="feedback-score-border"
            draggable="false"
          />
          <span className="feedback-score-value">{scoreData.score} / 6</span>
        </div>

        {/* Replay Button */}
        <img
          src="./assets/project_photos/reload_btn.svg"
          alt="Replay"
          onClick={handleRestart}
          className="feedback-reload-btn"
          draggable="false"
        />
      </div>
    </div>
  );
};

export default FeedbackScreen;
