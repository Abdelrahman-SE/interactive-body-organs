const audioFiles = {
  hint_1: "./assets/audio/hint_1.mp3",
  hint_2: "./assets/audio/hint_2.mp3",
  feedbackStars_0: "./assets/audio/feedbackStars_0.mp3",
  feedbackStars_1: "./assets/audio/feedbackStars_1.mp3",
  feedbackStars_2: "./assets/audio/feedbackStars_2.mp3",
  feedbackStars_3: "./assets/audio/feedbackStars_3.mp3",
  click: "./assets/audio/click.mp3",
  drag: "./assets/audio/drag.mp3",
};

const activeAudios = {};

export const playSound = (soundType) => {
  if (audioFiles[soundType]) {
    // If this specific sound is already playing, stop it first (fixes React StrictMode double play)
    if (activeAudios[soundType]) {
      activeAudios[soundType].pause();
      activeAudios[soundType].currentTime = 0;
    }

    const audio = new Audio(audioFiles[soundType]);
    activeAudios[soundType] = audio;

    audio.play().catch((e) => console.log(`Audio play prevented: ${e}`));

    // Clean up when done
    audio.onended = () => {
      delete activeAudios[soundType];
    };
  } else {
    console.log(`[Audio]: No audio file found for -> ${soundType}`);
  }
};

export const stopAllSounds = () => {
  Object.values(activeAudios).forEach((audio) => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  });
  // Clear the activeAudios object
  for (const key in activeAudios) {
    delete activeAudios[key];
  }
};
