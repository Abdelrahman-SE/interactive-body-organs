const levels = [
  {
    min: 0,
    max: 50,
    txtAr: "مقبول",
    txtEn: "Fair",
    Feedback: [
      {
        descriptionAr: "نريدُ الأفضل!",
        descriptionEn: "Keep going!",
      },
      {
        descriptionAr: "محاولة مقبولة! راجع الدرس، ثم حاول مرة أخرى.",
        descriptionEn:
          "You tried well! Review the lesson and try again to improve your score.",
      },
      {
        descriptionAr:
          "تدرَّب أكثر! ستساعدك مراجعة الدرس على الإجابة بثقة أكبر.",
        descriptionEn:
          "Keep practicing! Reviewing the lesson will help you answer more confidently.",
      },
      {
        descriptionAr:
          "راجع النقاط الرئيسة في الدرس، ثم حاول مرة أخرى لتحقق نتيجة أفضل.",
        descriptionEn:
          "Review the key points of the lesson, then try again to achieve a better score.",
      },
    ],
  },
  {
    min: 50,
    max: 65,
    txtAr: "جيد",
    txtEn: "Good",
    Feedback: [
      {
        descriptionAr: "هيه، أحسنت!",
        descriptionEn: "Yay, good!",
      },
      {
        descriptionAr: "جيد! واصل التدريب لتحسِّن أداءك.",
        descriptionEn: "Good job! Keep practicing to improve your performance.",
      },
      {
        descriptionAr: "أداء جيد! استمر في حل التدريبات لزيادة فهمك.",
        descriptionEn:
          "Good work! Keep solving practice exercises to strengthen your understanding.",
      },
      {
        descriptionAr: "مستواك جيد. واصل التدريب لتنمية مهاراتك وتحسين أدائك.",
        descriptionEn:
          "Good progress. Continue practicing to develop your skills and performance.",
      },
    ],
  },
  {
    min: 65,
    max: 85,
    txtAr: "جيد جدًّا",
    txtEn: "Very Good",
    Feedback: [
      {
        descriptionAr: "واو، رائع!",
        descriptionEn: "Wow, great!",
      },
      {
        descriptionAr: "جيد جدًّا! أنت مستعد للاختبار.",
        descriptionEn:
          "Very good! You are ready to take the exam and test your knowledge.",
      },
      {
        descriptionAr: "جيد جدًّا! أنت مستعد لخوض الاختبار.",
        descriptionEn:
          "Very good! You are ready to take the exam and test your knowledge.",
      },
      {
        descriptionAr: "مستواك جيد جدًّا. يمكنك الآن خوض الاختبار بثقة.",
        descriptionEn:
          "Very good progress. You can now move on to the exam with confidence.",
      },
    ],
  },
  {
    min: 85,
    max: 101,
    txtAr: "ممتاز",
    txtEn: "Excellent",
    Feedback: [
      {
        descriptionAr: "أنت نَجْم!",
        descriptionEn: "Super star!",
      },
      {
        descriptionAr: "ممتاز! لقد فهمت الدرس.",
        descriptionEn: "Excellent! You understand the lesson very well.",
      },
      {
        descriptionAr: "ممتاز! أنت مستعد تمامًا للانتقال إلى الدرس التالي.",
        descriptionEn: "Excellent! You are fully ready for the next lesson.",
      },
      {
        descriptionAr:
          "إنجاز ممتاز. أنت مستعد تمامًا للانتقال إلى الدرس التالي.",
        descriptionEn:
          "Excellent achievement. You are fully prepared to continue to the next lesson.",
      },
    ],
  },
];

function parseEducationalStage(educationalStage) {
  const match = String(educationalStage || "").match(
    /^(\d+)([krp])_(\d+)([ae])$/i,
  );

  if (!match) {
    return null;
  }

  return {
    grade: Number(match[1]),
    stage: match[2].toLowerCase(),
    term: Number(match[3]),
    language: match[4].toLowerCase(),
  };
}

function getFeedbackIndexByEducationalStage(educationalStage) {
  const metadata = parseEducationalStage(educationalStage);

  if (!metadata) {
    return null;
  }

  if (metadata.stage === "k") {
    return 0;
  }

  if (metadata.stage === "r") {
    if (metadata.grade >= 1 && metadata.grade <= 3) {
      return 1;
    }

    if (metadata.grade >= 4 && metadata.grade <= 6) {
      return 2;
    }
  }

  if (metadata.stage === "p") {
    return 3;
  }

  return null;
}

function preparePostFeedbackMetadata(post) {
  if (!post) {
    return null;
  }

  const metadata = parseEducationalStage(post.Educational_stage);

  if (!metadata) {
    return post;
  }

  if (metadata.language === "a") {
    post.lang = "ara";
  } else if (metadata.language === "e") {
    post.lang = "eng";
  }

  const feedbackIndex = getFeedbackIndexByEducationalStage(
    post.Educational_stage,
  );

  if (feedbackIndex !== null) {
    post.feedbackIndex = feedbackIndex;
  }

  return post;
}

function getLevel(score) {
  return levels.find((level) => score >= level.min && score < level.max);
}

function getProgressFeedbackConfig(postOrEducationalStage) {
  const post =
    postOrEducationalStage && typeof postOrEducationalStage === "object"
      ? postOrEducationalStage
      : null;
  const educationalStage = post
    ? post.Educational_stage
    : postOrEducationalStage;
  const preparedPost = post ? preparePostFeedbackMetadata(post) : null;
  const metadata = parseEducationalStage(educationalStage);

  if (!metadata) {
    return null;
  }

  const isArabic =
    (preparedPost?.lang || "") === "ara" || metadata.language === "a";

  return {
    textKey: isArabic ? "txtAr" : "txtEn",
    descriptionKey: isArabic ? "descriptionAr" : "descriptionEn",
    feedbackIndex: Number.isInteger(preparedPost?.feedbackIndex)
      ? preparedPost.feedbackIndex
      : getFeedbackIndexByEducationalStage(educationalStage),
    metadata,
    post: preparedPost,
  };
}

function getProgressFeedback(score, postOrEducationalStage) {
  const feedbackConfig = getProgressFeedbackConfig(postOrEducationalStage);
  const level = getLevel(score);

  if (!feedbackConfig || feedbackConfig.feedbackIndex === null || !level) {
    return null;
  }

  // استخدام let عشان نقدر نبدل القيم لو احتجنا
  let txt = level[feedbackConfig.textKey];
  let description =
    level.Feedback[feedbackConfig.feedbackIndex]?.[
      feedbackConfig.descriptionKey
    ];

  // ---------------- إعدادات التبديل ----------------
  // 0 = رياض أطفال | 1 = ابتدائي صفوف أولى | 2 = ابتدائي صفوف عليا | 3 = إعدادي
  const stagesToSwap = []; 
  
  const shouldSwap = stagesToSwap.includes(feedbackConfig.feedbackIndex);

  if (shouldSwap) {
    // تبديل المتغيرات
    [txt, description] = [description, txt];
  }
  // -------------------------------------------------

  if (feedbackConfig.post) {
    feedbackConfig.post.feedBackTxt = txt;
    feedbackConfig.post.feedBackDes = description;
  }

  return {
    txt,
    description,
    level,
    feedbackIndex: feedbackConfig.feedbackIndex,
    metadata: feedbackConfig.metadata,
  };
}