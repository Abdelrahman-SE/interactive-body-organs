import React, { useState, useEffect } from "react";
import { useGame } from "../context/GameContext";
import { playSound } from "../utils/audio";
import CheckBtnSvg from "../../public/assets/project_photos/check_btn.svg?react";
import CheckBtnDimmedSvg from "../../public/assets/project_photos/check_btn_dimmed.svg?react";
import "./PhaseTwo.css";

const ORGANS_CONFIG = {
  brain: { id: "brain", top: "28%", left: "25.8%" },
  heart: { id: "heart", top: "54%", left: "26%" },
  kidneys: { id: "kidneys", top: "79.5%", left: "26%" },
  lungs: { id: "lungs", top: "28%", left: "74%" },
  stomach: { id: "stomach", top: "54%", left: "74%" },
  intestine: { id: "intestine", top: "79.5%", left: "74%" },
};

const normalizeArabic = (text) => {
  return text.trim().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه");
};

const PhaseTwo = () => {
  const { state, dispatch } = useGame();
  const [inputs, setInputs] = useState({
    brain: "",
    heart: "",
    kidneys: "",
    lungs: "",
    stomach: "",
    intestine: "",
  });

  const isAllFilled = Object.keys(ORGANS_CONFIG).every((id) => {
    const organ = state.organs[id];
    if (organ.isNamed) return true;
    return inputs[id] && inputs[id].trim() !== "";
  });

  const handleInputChange = (id, value) => {
    setInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleVerify = () => {
    let allCorrect = true;
    let anyError = false;

    Object.keys(ORGANS_CONFIG).forEach((id) => {
      const organ = state.organs[id];
      if (organ.isNamed) return; // already solved

      const val = inputs[id];
      const normalizedInput = normalizeArabic(val);

      if (val.trim() === "") {
        allCorrect = false;
        return; // Skip empty
      }

      const isMatch = organ.names.some(
        (correctName) => normalizeArabic(correctName) === normalizedInput,
      );

      if (isMatch) {
        dispatch({ type: "NAME_ORGAN", payload: { id } });
      } else {
        allCorrect = false;
        anyError = true;
        dispatch({ type: "RECORD_NAME_ERROR", payload: { id } });
      }
    });

    if (allCorrect) {
      // GameContext handles moving to feedback if all are named, but we still play sound
      playSound("success");
    } else if (anyError) {
      playSound("error");
    }

    setTimeout(() => {
      dispatch({ type: "ADVANCE_FEEDBACK" });
    }, 1500);
  };

  return (
    <div className="phase-container">
      <img
        src="./assets/project_photos/scene2.svg"
        alt="Background"
        className="bg-image-contain"
        draggable="false"
      />

      {/* Top Left Buttons */}
      <div className="top-left-buttons">
        {/* <img
          src="./assets/project_photos/home_btn.svg"
          alt="Home"
          className="nav-btn"
          onClick={() => dispatch({ type: "RESTART_GAME" })}
          draggable="false"
        /> */}
        <img
          src="./assets/project_photos/hint_btn.svg"
          alt="Hint"
          className="nav-btn"
          onClick={() => {
            playSound("click");
            dispatch({ type: "TOGGLE_HINT" });
          }}
          draggable="false"
        />
      </div>

      {/* Verify Button */}
      {isAllFilled ? (
        <CheckBtnSvg
          onClick={() => {
            playSound("click");
            handleVerify();
          }}
          className="nav-btn verify-btn active"
          style={{ userSelect: "none", cursor: "pointer", direction: "ltr" }}
        />
      ) : (
        <CheckBtnDimmedSvg
          className="nav-btn verify-btn dimmed"
          style={{
            userSelect: "none",
            pointerEvents: "none",
            direction: "ltr",
          }}
        />
      )}

      {/* Center Image */}
      <img
        src="./assets/project_photos/humanBodyScene2.svg"
        alt="Human Body"
        className="human-body-center"
        draggable="false"
      />

      {/* Input Fields */}
      {Object.values(ORGANS_CONFIG).map((config) => {
        const organ = state.organs[config.id];
        const isSuccess = organ.isNamed;
        const isError = !isSuccess && organ.namedErrors > 0;

        return (
          <div
            key={`input-${config.id}`}
            className="input-bubble-container"
            style={{
              top: config.top,
              left: config.left,
            }}
          >
            <img
              src={`./assets/project_photos/${isSuccess ? "input_correct_highlight.svg" : isError ? "input_wrong_highlight.svg" : "input_section.svg"}`}
              alt="Input background"
              className="input-bg"
              draggable="false"
            />
            <input
              type="text"
              value={isSuccess ? organ.names[0] : inputs[config.id]}
              onChange={(e) => handleInputChange(config.id, e.target.value)}
              disabled={isSuccess}
              className="input-field-bubble"
              style={{
                border: "none",
                textAlign: "center",
                fontSize: "2vw",
                fontWeight: "normal",
                color: isError ? "#ef4444" : isSuccess ? "#10b981" : "#000",
                outline: "none",
                fontFamily: "Cairo, sans-serif",
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

export default PhaseTwo;
