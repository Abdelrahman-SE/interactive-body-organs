import React, { useRef, useState, useEffect } from "react";
import anime from "animejs";
import { useGame } from "../context/GameContext";
import { playSound } from "../utils/audio";
import textData from "../data/textData.json";
import "./PhaseOne.css";

const ORGANS_CONFIG = {
  brain: {
    id: "brain",
    highlight: {
      width: "6%",
      height: "10%",
      top: "16.5%",
      left: "47.7%",
      zIndex: 1,
    },
    hitArea: {
      width: "6%",
      height: "10%",
      top: "16.5%",
      left: "47.7%",
      zIndex: 1,
    },
    draggable: {
      width: "50%",
      height: "68%",
      placedTop: "13.6%",
      placedLeft: "46.4%",
      placedScale: 0.7,
      placedRotate: "0deg",
    },
    startPos: { top: "16.5%", left: "25.5%" },
    container: { top: "14%", left: "12%", width: "17%", height: "25%" },
    feedbackHighlight: { top: "0%", left: "0%", width: "100%", height: "100%" },
    screenSize: { width: "8.5%", height: "17%" },
    screenStartPos: { top: "18.125%", left: "16.335%" },
  },
  lungs: {
    id: "lungs",
    highlight: {
      width: "10%",
      height: "18%",
      top: "36.5%",
      left: "45%",
      zIndex: 5,
    },
    hitArea: {
      top: "39.5%",
      left: "45%",
      width: "10%",
      height: "15%",
      zIndex: 4,
    },
    draggable: {
      width: "50%",
      height: "68%",
      placedTop: "37%",
      placedLeft: "45.75%",
      placedScale: 1.2,
      placedRotate: "0deg",
    },
    startPos: { top: "10.5%", left: "26.5%" },
    container: { top: "14%", left: "72%", width: "17%", height: "25%" },
    feedbackHighlight: { top: "0%", left: "0%", width: "100%", height: "100%" },
    screenSize: { width: "8.5%", height: "17%" },
    screenStartPos: { top: "16.625%", left: "76.505%" },
  },
  heart: {
    id: "heart",
    highlight: {
      width: "12%",
      height: "15%",
      top: "38.5%",
      left: "44.5%",
      zIndex: 4,
    },
    hitArea: {
      width: "5%",
      height: "10%",
      top: "42.5%",
      left: "47.5%",
      zIndex: 4,
    },
    draggable: {
      width: "42%",
      height: "68%",
      placedTop: "38.5%",
      placedLeft: "47.4%",
      placedScale: 0.7,
      placedRotate: "0deg",
    },
    startPos: { top: "12.5%", left: "32.5%" },
    container: { top: "43%", left: "11%", width: "17%", height: "25%" },
    feedbackHighlight: { top: "0%", left: "0%", width: "100%", height: "100%" },
    screenSize: { width: "7.14%", height: "17%" },
    screenStartPos: { top: "46.125%", left: "16.525%" },
  },
  stomach: {
    id: "stomach",
    highlight: {
      width: "12%",
      height: "15%",
      top: "45.5%",
      left: "45%",
      zIndex: 3,
    },
    hitArea: {
      top: "51.5%",
      left: "47%",
      width: "10%",
      height: "8%",
      zIndex: 4,
    },
    draggable: {
      width: "46%",
      height: "68%",
      placedTop: "45%",
      placedLeft: "47%",
      placedScale: 0.7,
      placedRotate: "10deg",
    },
    startPos: { top: "14.5%", left: "30.5%" },
    container: { top: "43%", left: "72%", width: "17%", height: "25%" },
    feedbackHighlight: { top: "0%", left: "0%", width: "100%", height: "100%" },
    screenSize: { width: "7.82%", height: "17%" },
    screenStartPos: { top: "46.625%", left: "77.185%" },
  },
  kidneys: {
    id: "kidneys",
    highlight: {
      width: "8%",
      height: "15%",
      top: "54.5%",
      left: "46%",
      zIndex: 1,
    },
    hitArea: {
      width: "8%",
      height: "15%",
      top: "54.5%",
      left: "46%",
      zIndex: 1,
    },
    draggable: {
      width: "50%",
      height: "68%",
      placedTop: "54.5%",
      placedLeft: "45.7%",
      placedScale: 0.9,
      placedRotate: "0deg",
    },
    startPos: { top: "16.5%", left: "25.5%" },
    container: { top: "72%", left: "11%", width: "17%", height: "25%" },
    feedbackHighlight: { top: "0%", left: "0%", width: "100%", height: "100%" },
    screenSize: { width: "8.5%", height: "17%" },
    screenStartPos: { top: "76.125%", left: "15.335%" },
  },
  intestine: {
    id: "intestine",
    highlight: {
      width: "12%",
      height: "15%",
      top: "57%",
      left: "44%",
      zIndex: 4,
    },
    hitArea: {
      width: "10%",
      height: "13%",
      top: "57%",
      left: "45%",
      zIndex: 4,
    },
    draggable: {
      width: "49%",
      height: "69%",
      placedTop: "57%",
      placedLeft: "45.7%",
      placedScale: 0.9,
      placedRotate: "0deg",
    },
    startPos: { top: "17.5%", left: "26.5%" },
    container: { top: "72%", left: "72%", width: "17%", height: "25%" },
    feedbackHighlight: { top: "0%", left: "0%", width: "100%", height: "100%" },
    screenSize: { width: "8.33%", height: "17.25%" },
    screenStartPos: { top: "76.375%", left: "76.505%" },
  },
};
const DraggableOrgan = ({ organConfig, containerRef, currentTargetId }) => {
  const { state, dispatch } = useGame();
  const organ = state.organs[organConfig.id];
  const elRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const position = useRef({ x: 0, y: 0 });
  const initialPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (organ.isPlaced) {
      position.current = { x: 0, y: 0 };
      if (elRef.current) {
        elRef.current.style.transform = `translate(0px, 0px) scale(${organConfig.draggable.placedScale}) rotate(${organConfig.draggable.placedRotate})`;
      }
      anime({
        targets: elRef.current,
        scale: [organConfig.draggable.placedScale],
        duration: 200,
        easing: "easeInOutQuad",
      });
    }
  }, [organ.isPlaced]);

  const handlePointerDown = (e) => {
    if (organ.isPlaced) return;
    setIsDragging(true);
    initialPointer.current = { x: e.clientX, y: e.clientY };
    e.target.setPointerCapture(e.pointerId);
    playSound("pick");
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - initialPointer.current.x;
    const dy = e.clientY - initialPointer.current.y;

    if (elRef.current) {
      elRef.current.style.transform = `translate(${position.current.x + dx}px, ${position.current.y + dy}px) scale(${organ.isPlaced ? organConfig.draggable.placedScale : 1}) rotate(${organ.isPlaced ? organConfig.draggable.placedRotate : "0deg"})`;
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);

    const dx = e.clientX - initialPointer.current.x;
    const dy = e.clientY - initialPointer.current.y;
    position.current = {
      x: position.current.x + dx,
      y: position.current.y + dy,
    };
    const dropZones = containerRef.current.querySelectorAll(".drop-zone");

    let droppedZoneId = null;
    let hitZones = [];
    const padding = -5; // 20px forgiving padding
    dropZones.forEach((zone) => {
      const zoneRect = zone.getBoundingClientRect();
      const pointerX = e.clientX;
      const pointerY = e.clientY;
      if (
        pointerX >= zoneRect.left - padding &&
        pointerX <= zoneRect.right + padding &&
        pointerY >= zoneRect.top - padding &&
        pointerY <= zoneRect.bottom + padding
      ) {
        hitZones.push(zone.dataset.id);
      }
    });

    if (hitZones.includes(organConfig.id)) {
      droppedZoneId = organConfig.id; // Prioritize the correct zone if it overlaps with others!
    } else if (hitZones.length > 0) {
      droppedZoneId = hitZones[hitZones.length - 1];
    }

    console.log("Dropped item:", organConfig.id, "on zone:", droppedZoneId);

    const isCorrectOrgan = organConfig.id === currentTargetId;

    const bounceBack = () => {
      anime({
        targets: position.current,
        x: 0,
        y: 0,
        duration: 500,
        easing: "easeOutElastic(1, .8)",
        update: function () {
          if (elRef.current) {
            elRef.current.style.transform = `translate(${position.current.x}px, ${position.current.y}px) scale(${organ.isPlaced ? organConfig.draggable.placedScale : 1}) rotate(${organ.isPlaced ? organConfig.draggable.placedRotate : "0deg"})`;
          }
        },
      });
    };

    if (isCorrectOrgan && droppedZoneId === organConfig.id) {
      playSound("success");
      dispatch({ type: "PLACE_ORGAN", payload: { id: organConfig.id } });
      console.log(
        `تم وضع ${organConfig.id} بنجاح! إجمالي المحاولات (شاملة هذه المحاولة):`,
        state.organs[organConfig.id].placedErrors + 1,
      );
    } else if (droppedZoneId !== null) {
      playSound("error");

      dispatch({
        type: "RECORD_PLACE_ERROR",
        payload: { id: currentTargetId },
      });

      const targetOrganState = state.organs[currentTargetId];
      console.log(
        `محاولة خاطئة! عدد المحاولات الخاطئة حتى الآن للعضو ${currentTargetId}:`,
        targetOrganState.placedErrors + 1,
      );

      if (targetOrganState.placedErrors >= 1) {
        dispatch({ type: "PLACE_ORGAN", payload: { id: currentTargetId } });
        if (!isCorrectOrgan) {
          bounceBack();
        }
      } else {
        bounceBack();
      }
    } else {
      // Dropped on empty space, don't count as error
      bounceBack();
    }
  };
  return (
    <>
      <div
        className="organ-container-wrapper"
        style={{
          position: "absolute",
          top: organConfig.container.top,
          left: organConfig.container.left,
          width: organConfig.container.width,
          height: organConfig.container.height,
          zIndex: 5,
        }}
      >
        {/* Background Container Image */}
        <img
          src="./assets/project_photos/draggedItemContainer.svg"
          alt="Container"
          style={{ width: "100%", height: "100%", pointerEvents: "none" }}
          draggable="false"
        />

        {organ.isPlaced && organ.placedErrors < 2 && (
          <img
            src="./assets/project_photos/correct_highlight.svg"
            alt="correct"
            style={{
              position: "absolute",
              top: organConfig.feedbackHighlight.top,
              left: organConfig.feedbackHighlight.left,
              width: organConfig.feedbackHighlight.width,
              height: organConfig.feedbackHighlight.height,
              pointerEvents: "none",
              zIndex: 1,
            }}
            draggable="false"
          />
        )}

        {organ.isPlaced && organ.placedErrors >= 2 && (
          <img
            src="./assets/project_photos/wrong_highlight.svg"
            alt="wrong"
            style={{
              position: "absolute",
              top: organConfig.feedbackHighlight.top,
              left: organConfig.feedbackHighlight.left,
              width: organConfig.feedbackHighlight.width,
              height: organConfig.feedbackHighlight.height,
              pointerEvents: "none",
              zIndex: 1,
            }}
            draggable="false"
          />
        )}

        {/* The background slot at startPos showing dimmed image */}
        <div
          className="organ-slot"
          style={{
            top: organConfig.startPos.top,
            left: organConfig.startPos.left,
            width: organConfig.draggable.width,
            height: organConfig.draggable.height,
          }}
        >
          <img
            src={`./assets/project_photos/${organConfig.id}_dimmed.svg`}
            alt="dimmed"
            className="slot-dimmed"
            draggable="false"
          />
        </div>
      </div>

      {/* The moving draggable organ */}
      <div
        ref={elRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="draggable-organ"
        style={{
          top: organ.isPlaced
            ? organConfig.draggable.placedTop
            : organConfig.screenStartPos.top,
          left: organ.isPlaced
            ? organConfig.draggable.placedLeft
            : organConfig.screenStartPos.left,
          transform: `translate(${position.current.x}px, ${position.current.y}px) scale(${organ.isPlaced ? organConfig.draggable.placedScale : 1}) rotate(${organ.isPlaced ? organConfig.draggable.placedRotate : "0deg"})`,
          width: organConfig.screenSize.width,
          height: organConfig.screenSize.height,
          cursor: organ.isPlaced ? "default" : "grab",
          touchAction: "none",
          zIndex: isDragging
            ? 100
            : organ.isPlaced
              ? organConfig.highlight.zIndex
              : 20,
        }}
      >
        <img
          src={`./assets/project_photos/${organConfig.id}_draggable.svg`}
          alt={organ.names[0]}
          style={{
            position: organConfig.id === "intestine" ? "absolute" : "static",
            opacity: organConfig.id === "intestine" && organ.isPlaced ? 0 : 1,
            transition: "opacity 0.5s ease-in-out",
          }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
          draggable="false"
        />
        {organConfig.id === "intestine" && (
          <img
            src={`./assets/project_photos/intestine_halfed.svg`}
            alt={`${organ.names[0]} halfed`}
            style={{
              position: "absolute",
              opacity: organ.isPlaced ? 1 : 0,
              transition: "opacity 0.5s ease-in-out",
            }}
            draggable="false"
          />
        )}
      </div>
    </>
  );
};

const PhaseOne = () => {
  const containerRef = useRef(null);
  const { state, dispatch } = useGame();

  useEffect(() => {
    const allPlaced = Object.values(state.organs).every((o) => o.isPlaced);
    if (allPlaced) {
      const timer = setTimeout(() => {
        dispatch({ type: "ADVANCE_PHASE_TWO_HINT" });
      }, 1500); // 1.5 seconds delay before next scene
      return () => clearTimeout(timer);
    }
  }, [state.organs, dispatch]);

  const orderedOrgans = [
    "brain",
    "heart",
    "lungs",
    "kidneys",
    "stomach",
    "intestine",
  ];
  const currentTargetId = orderedOrgans.find(
    (id) => !state.organs[id].isPlaced,
  );
  const currentQuestion = currentTargetId
    ? textData.phase1Questions.find((q) => q.id === currentTargetId)?.text
    : "";

  return (
    <div className="phase-container" ref={containerRef}>
      {currentQuestion && (
        <div key={currentTargetId} className="phase1-question-container">
          {currentQuestion}
        </div>
      )}

      <img
        src="./assets/project_photos/scene1.svg"
        alt="Background"
        className="bg-image-contain"
        draggable="false"
      />

      <img
        src="./assets/project_photos/human_body.svg"
        alt="Human Body"
        className="human-body"
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
          onClick={() => dispatch({ type: "TOGGLE_HINT" })}
          draggable="false"
        />
      </div>

      {/* Drop Zones and Highlights */}
      {Object.values(ORGANS_CONFIG).map((organ) => (
        <React.Fragment key={`group-${organ.id}`}>
          {/* Hit Area (Black Box) */}
          <div
            className="drop-zone"
            data-id={organ.id}
            style={{
              position: "absolute",
              top: organ.hitArea.top,
              left: organ.hitArea.left,
              width: organ.hitArea.width,
              height: organ.hitArea.height,
              zIndex: organ.hitArea.zIndex,
              backgroundColor: "rgba(0, 0, 0, 0.0005)", // Black semi-transparent
            }}
          ></div>

          {/* Visual Highlight */}
          <img
            src={`./assets/project_photos/${organ.id}_highlight.svg`}
            alt="highlight"
            className="organ-highlight-img"
            draggable="false"
            style={{
              position: "absolute",
              top: organ.highlight.top,
              left: organ.highlight.left,
              width: organ.highlight.width,
              height: organ.highlight.height,
              zIndex: organ.highlight.zIndex,
              pointerEvents: "none",
              display: state.organs[organ.id].isPlaced ? "none" : "block",
              opacity:
                organ.id === "intestine" && state.organs["kidneys"].isPlaced
                  ? 0.6
                  : 1,
            }}
          />
        </React.Fragment>
      ))}

      {/* Draggable Organs */}
      {Object.values(ORGANS_CONFIG).map((organConfig) => (
        <DraggableOrgan
          key={`drag-${organConfig.id}`}
          organConfig={organConfig}
          containerRef={containerRef}
          currentTargetId={currentTargetId}
        />
      ))}
    </div>
  );
};

export default PhaseOne;
