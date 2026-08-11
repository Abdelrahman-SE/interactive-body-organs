import React, { useEffect, useRef } from "react";
import anime from "animejs";
import { useGame } from "../context/GameContext";
import { playSound } from "../utils/audio";
import StartScreenSvg from "../../public/assets/project_photos/start_screen.svg?react";
import "./StartScreen.css";

const StartScreen = () => {
  const { dispatch } = useGame();
  const playBtnRef = useRef(null);

  useEffect(() => {
    const animation = anime({
      targets: playBtnRef.current,
      scale: [1, 1.05],
      duration: 1000,
      direction: "alternate",
      loop: true,
      easing: "easeInOutSine",
    });

    return () => animation.pause();
  }, []);

  const handleStart = () => {
    playSound("click");
    dispatch({ type: "START_GAME" });
  };

  return (
    <div className="start-screen-container">
      <StartScreenSvg
        className="bg-image-contain"
        style={{ pointerEvents: "none", userSelect: "none", direction: "ltr" }}
      />

      {/* Start Button */}
      <img
        ref={playBtnRef}
        src="./assets/project_photos/start_btn.svg"
        alt="Start Game"
        onClick={handleStart}
        className="start-btn"
        draggable="false"
      />
    </div>
  );
};

export default StartScreen;
