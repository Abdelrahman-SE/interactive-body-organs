/**
 * @file scorm-tracking-logic.js
 * @description يحتوي على الدوال المسؤولة عن تتبع تقدم الطالب داخل اللعبة.
 * يشمل ذلك: درجات الأسئلة، مشاهدات الفيديوهات، قراءة الشرائح، وتحديد حالة النجاح والرسوب.
 * يتم دمج هذه الدوال مع الكلاس الأساسي باستخدام Object.assign
 */

Object.assign(window.GameSCORMWrapper.prototype, {

    /**
     * @function setupCourse
     * @description دالة الإعداد المبدئي للدرس، تحدد هل يوجد أسئلة وكم عدد الميديا.
     * @param {boolean} hasQuestions - هل يحتوي الدرس على أسئلة؟
     * @param {number} totalVideos - إجمالي عدد الفيديوهات
     * @param {number} totalInfoSlides - إجمالي عدد الشرائح المعلوماتية
     */
    setupCourse(hasQuestions, totalVideos = 0, totalInfoSlides = 0) {
        if (!this.gameData.courseConfig) this.gameData.courseConfig = {};
        this.gameData.courseConfig.hasQuestions = hasQuestions;
        this.gameData.courseConfig.totalVideos = totalVideos;
        this.gameData.courseConfig.totalInfoSlides = totalInfoSlides;

        // تشغيل نظام الـ SCORM
        this.initializeWrapper();

        // دعم مخصص لشبكة Vodafone (تصفير إجباري عند كل دخول)
        if (typeof myGame !== 'undefined' && myGame.vodafoneMode === true) {
            const qCount = hasQuestions ? (typeof window.mydata !== 'undefined' ? window.mydata.numberOfquestion : 0) : 0;
            this.initializeQuestions(qCount);
            return;
        }

        /**
         * @function waitForLmsAndCheckReset
         * @description مراقب داخلي ينتظر حتى يكتمل الاتصال بالـ LMS وجلب البيانات
         * للتحقق مما إذا كان الكورس مكتمل مسبقاً وتصفيره إذا لزم الأمر.
         */
        const waitForLmsAndCheckReset = () => {
            if (this.api === null) {
                setTimeout(waitForLmsAndCheckReset, 500); // الانتظار وإعادة المحاولة
                return;
            }
            if (this.gameData.completion_status === "completed") {
                const qCount = hasQuestions ? (typeof window.mydata !== 'undefined' ? window.mydata.numberOfquestion : 0) : 0;
                this.initializeQuestions(qCount); // تصفير شامل
            } else {
                // بناء هيكلة الشرائح إذا كان الكورس جديداً أو غير مكتمل
                const ensureInfoDetails = () => {
                    if (!this.gameData.studentProgress) {
                        this.gameData.studentProgress = { videos: {}, viewedInfoSlides: [], infoDetails: {} };
                    }
                    if (!this.gameData.studentProgress.infoDetails) {
                        this.gameData.studentProgress.infoDetails = {};
                    }
                    for (let i = 1; i <= totalInfoSlides; i++) {
                        if (!this.gameData.studentProgress.infoDetails[`info_${i}`]) {
                            this.gameData.studentProgress.infoDetails[`info_${i}`] = { id: `info_${i}`, status: "unviewed", timestamp: null };
                        }
                    }
                };
                ensureInfoDetails();
            }
        };
        setTimeout(waitForLmsAndCheckReset, 1000); // إعطاء النظام فرصة للتحميل المبدئي
    },

    /**
     * @function initializeQuestions
     * @description تصفير شامل لجميع السجلات والأسئلة لتبدأ اللعبة من نقطة الصفر
     * @param {number} totalQuestions - عدد الأسئلة المطلوب تهيئتها
     */
    initializeQuestions(totalQuestions) {
        const config = this.gameData.courseConfig || {};
        const totalInfoSlides = config.totalInfoSlides || 0;

        // استخراج أعلى درجة وحالة قبل التصفير (للحماية من ضياع التقييم عند إعادة الدرس)
        let prevHighestScore = this.gameData.highestScore || 0;
        let prevScore = (this.gameData.score && this.gameData.score.raw) ? Number(this.gameData.score.raw) : 0;
        let newHighestScore = Math.max(prevHighestScore, prevScore);

        let prevHighestStatus = this.gameData.highestStatus || "incomplete";
        if (this.gameData.success_status === "passed") prevHighestStatus = "passed";
        else if (this.gameData.success_status === "failed" && prevHighestStatus !== "passed") prevHighestStatus = "failed";

        // تصفير الأسئلة
        this.gameData.questions = {};
        if (typeof totalQuestions === 'number' && totalQuestions > 0) {
            for (let i = 1; i <= totalQuestions; i++) {
                const qId = `interactions${i}`;
                this.gameData.questions[qId] = { id: `question_${i}`, type: "", result: null, learner_response: null, weighting: "1" };
            }
        }

        // تصفير الشرائح والفيديوهات
        let initialInfoDetails = {};
        if (totalInfoSlides > 0) {
            for (let i = 1; i <= totalInfoSlides; i++) {
                initialInfoDetails[`info_${i}`] = { id: `info_${i}`, status: "unviewed", timestamp: null };
            }
        }

        this.gameData.studentProgress = { videos: {}, viewedInfoSlides: [], infoDetails: initialInfoDetails };
        
        // تصفير الدرجات وحالة النجاح مع الحفاظ على أعلى إنجاز
        this.gameData.score = { raw: 0, scaled: 0, min: 0, max: 100 };
        this.gameData.completion_status = "incomplete";
        this.gameData.success_status = "unknown";
        this.gameData.highestScore = newHighestScore;
        this.gameData.highestStatus = prevHighestStatus;
        
        this.gameData.Result = { totalQuestions: totalQuestions || 0, correctAnswers: 0, totalScore: 0, lessonStatus: "incomplete" };

        this.persist(); // حفظ عملية التصفير في المنصة
    },

    /**
     * @function recordVideoTime
     * @description تتبع نسبة مشاهدة الطالب للفيديو 
     * @param {number} videoIndex - رقم أو مؤشر الفيديو
     * @param {number} currentTime - الثانية الحالية التي وصل لها الطالب
     * @param {number} totalDuration - المدة الإجمالية للفيديو بالثواني
     */
    recordVideoTime(videoIndex, currentTime, totalDuration) {
        if (!this.gameData.courseConfig) return;
        const vidId = `video_${videoIndex}`;
        const progress = this.gameData.studentProgress;

        // إذا اكتمل مسبقاً، تجاهل
        if (progress.videos[vidId] && progress.videos[vidId].status === "completed") return;

        // تهيئة الفيديو إذا لم يكن مسجلاً
        if (!progress.videos[vidId]) {
            progress.videos[vidId] = { time: 0, duration: totalDuration, percent: 0, status: "incomplete" };
        }

        // حساب النسبة
        let percent = 0;
        if (totalDuration > 0) {
            percent = Math.round((currentTime / totalDuration) * 100);
        }

        // التحديث فقط إذا كان هناك تقدم حقيقي
        if (percent > progress.videos[vidId].percent || totalDuration !== progress.videos[vidId].duration) {
            progress.videos[vidId].time = currentTime;
            progress.videos[vidId].duration = totalDuration;
            progress.videos[vidId].percent = percent;
            
            // اعتبار الفيديو مكتملاً إذا وصل 95%
            if (percent >= 95) progress.videos[vidId].status = "completed";
            
            this.checkOverallStatus(false);
        }
    },

    /**
     * @function recordVideoComplete
     * @description وضع حالة "مكتمل" للفيديو بشكل قسري (يستخدم عند الضغط على زر تخطي مثلاً)
     * @param {number} videoIndex - رقم الفيديو
     */
    recordVideoComplete(videoIndex) {
        const vidId = `video_${videoIndex}`;
        const videos = this.gameData.studentProgress.videos;
        if (videos[vidId] && videos[vidId].status === "completed") return;

        if (videos[vidId]) {
            videos[vidId].percent = 100;
            videos[vidId].status = "completed";
        } else {
            videos[vidId] = { time: 0, duration: 0, percent: 100, status: "completed" };
        }
        this.checkOverallStatus(false);
    },

    /**
     * @function recordInfoSlide
     * @description تسجيل دخول الطالب وقراءته لشريحة معلوماتية
     * @param {number} slideNumber - رقم الشريحة
     */
    recordInfoSlide(slideNumber) {
        if (this.api === null) {
            setTimeout(() => this.recordInfoSlide(slideNumber), 500);
            return;
        }
        const totalInfoSlides = this.gameData.courseConfig?.totalInfoSlides || 0;
        
        // تسجيل هذه الحركة كآخر حركة (لتفعيل التقرير لفودافون)
        this.gameData.lastAction = { type: 'info', id: slideNumber };

        // ضمان وجود الهيكلة
        if (!this.gameData.studentProgress) this.gameData.studentProgress = { videos: {}, viewedInfoSlides: [], infoDetails: {} };
        if (!this.gameData.studentProgress.infoDetails) this.gameData.studentProgress.infoDetails = {};
        for (let i = 1; i <= totalInfoSlides; i++) {
            if (!this.gameData.studentProgress.infoDetails[`info_${i}`]) {
                this.gameData.studentProgress.infoDetails[`info_${i}`] = { id: `info_${i}`, status: "unviewed", timestamp: null };
            }
        }

        const progress = this.gameData.studentProgress;
        const infoId = `info_${slideNumber}`;
        const isVodafoneLastSlide = (typeof myGame !== 'undefined' && myGame.vodafoneMode === true && slideNumber === totalInfoSlides);

        // تجاهل التكرار إلا إذا كانت الشريحة الأخيرة في وضع فودافون
        if (progress.infoDetails[infoId] && progress.infoDetails[infoId].status === "viewed" && !isVodafoneLastSlide) return;

        // تسجيل القراءة
        progress.infoDetails[infoId].status = "viewed";
        progress.infoDetails[infoId].timestamp = new Date().toISOString();

        if (!progress.viewedInfoSlides.includes(slideNumber)) {
            progress.viewedInfoSlides.push(slideNumber);
        }
        this.checkOverallStatus(false); // تحديث التقييم العام
    },

    /**
     * @function startQuestion
     * @description تُستدعى لحظة فتح الطالب للسؤال للبدء في حساب وقت التفكير
     * @param {string} questionId - معرف السؤال
     * @param {string} type - نوع السؤال (اختياري)
     */
    startQuestion(questionId, type) {
        if (!this.gameData.questions[questionId]) return;
        this.currentQuestion = { id: questionId, startTime: new Date() };
        this.gameData.questions[questionId].startTime = ScormUtils.formatTimeOnly(new Date());
    },

    /**
     * @function endQuestion
     * @description تُستدعى عند تسليم الإجابة لتقييمها وتسجيل تفاصيلها (صح/خطأ، المدة، المحاولات)
     * @param {boolean} isCorrect - هل الإجابة صحيحة؟
     * @param {string} learnerResponse - إجابة الطالب
     * @param {string} correctResponsePattern - الإجابة النموذجية
     */
    endQuestion(isCorrect, learnerResponse = "", correctResponsePattern = "") {
        if (!this.currentQuestion) return;

        const now = new Date();
        const start = this.currentQuestion.startTime;
        const qId = this.currentQuestion.id;

        if (!this.gameData.questions[qId]) return;

        this.gameData.lastAction = { type: 'question', id: qId };

        const latencyMs = now - start;
        const latencyFormatted = ScormUtils.formatScormLatency(latencyMs);
        const duration = ScormUtils.formatDuration(start, now);

        // دمج وتسجيل البيانات
        this.gameData.questions[qId] = {
            ...this.gameData.questions[qId],
            endTime: ScormUtils.formatTimeOnly(now),
            duration: duration,
            latency: latencyFormatted,
            learner_response: String(learnerResponse || ""),
            correct_responses: String(correctResponsePattern || ""),
            result: isCorrect ? "correct" : "wrong",
            timestamp: now.toISOString(),
            attempts: (this.gameData.questions[qId].attempts || 0) + (isCorrect ? 0 : 1) // زيادة عدد المحاولات لو أخطأ
        };

        this.currentQuestion = null;
        this.checkOverallStatus();
    },

    /**
     * @function checkVideoAndInfoStatus
     * @description يفحص بشكل سريع ما إذا كان الطالب أنهى كل شرائح المعلومات والفيديوهات
     * @returns {boolean} هل أكمل الميديا؟
     */
    checkVideoAndInfoStatus() {
        let isComplete = true;
        const config = this.gameData.courseConfig || { totalVideos: 0, totalInfoSlides: 0 };
        const progress = this.gameData.studentProgress;

        if (config.totalInfoSlides > 0) {
            if (progress.viewedInfoSlides.length < config.totalInfoSlides) isComplete = false;
        }

        if (config.totalVideos > 0) {
            for (let i = 1; i <= config.totalVideos; i++) {
                const vidId = `video_${i}`;
                const vidData = progress.videos[vidId];
                const p = vidData ? vidData.percent : 0;
                if (p < 95) isComplete = false;
            }
        }
        return isComplete;
    },

    /**
     * @function checkOverallStatus
     * @description العقل المدبر لتقييم الكورس، يقوم بوزن الفيديوهات مع درجات الأسئلة لتحديد النتيجة النهائية
     * @param {boolean} updateScore - تحديث الدرجات (مفعل افتراضياً)
     */
     checkOverallStatus(updateScore = true) {
        const config = this.gameData.courseConfig || { hasQuestions: true, totalVideos: 0, totalInfoSlides: 0 };
        const progress = this.gameData.studentProgress;

        let isQuizFullyCompleted = true;
        let isMediaComplete = true;

        // 1. حساب اكتمال الميديا
        let infoPercent = 100;
        if (config.totalInfoSlides > 0) {
            const viewed = (progress.viewedInfoSlides || []).length;
            infoPercent = (viewed / config.totalInfoSlides) * 100;
            if (viewed < config.totalInfoSlides) isMediaComplete = false;
        }

        let videoAvgPercent = 100;
        if (config.totalVideos > 0) {
            let totalVideoPercent = 0;
            for (let i = 1; i <= config.totalVideos; i++) {
                const vidId = `video_${i}`;
                const p = progress.videos[vidId] ? progress.videos[vidId].percent : 0;
                totalVideoPercent += p;
                if (p < 95) isMediaComplete = false;
            }
            videoAvgPercent = totalVideoPercent / config.totalVideos;
        }

        // إزالة اختراق الاكتمال المبكر تطبيقاً للقواعد الصارمة

        // 2. إذا كان الدرس يحتوي على أسئلة
        if (config.hasQuestions) {
            const allQuestions = Object.values(this.gameData.questions);
            let totalQuestions = allQuestions.length;

            if (totalQuestions === 0) {
                totalQuestions = (typeof window !== 'undefined' && window.mydata && window.mydata.numberOfquestion)
                    ? window.mydata.numberOfquestion
                    : (this.gameData.Result ? this.gameData.Result.totalQuestions : 0);
            }

            if (totalQuestions > 0) {
                const answeredCount = allQuestions.filter(q => q.result !== null).length;
                const correctCount = allQuestions.filter(q => q.result === "correct").length;

                isQuizFullyCompleted = answeredCount >= totalQuestions;
                const quizScorePercentage = Math.round((correctCount / totalQuestions) * 100);

                this.gameData.score.raw = quizScorePercentage;
                this.gameData.score.scaled = quizScorePercentage / 100;

                this.gameData.Result.totalQuestions = totalQuestions;
                this.gameData.Result.correctAnswers = correctCount;
                this.gameData.Result.totalScore = quizScorePercentage;

                // 🔥 التعديل الجذري: تطبيق القواعد الصارمة (Strict SCORM Rules)
                if (isQuizFullyCompleted) {
                    if (quizScorePercentage >= 50) {
                        this.gameData.success_status = "passed";
                    } else {
                        this.gameData.success_status = "failed";
                    }
                } else {
                    this.gameData.success_status = "unknown";
                }

            } else {
                isQuizFullyCompleted = false;
            }
        } 
        // 3. إذا كان الدرس ميديا فقط (بدون أسئلة)
        else {
            isQuizFullyCompleted = true;
            let totalElements = config.totalVideos + config.totalInfoSlides;
            let totalEarned = 0;

            if (config.totalVideos > 0) {
                for (let i = 1; i <= config.totalVideos; i++) {
                    const vidId = `video_${i}`;
                    totalEarned += progress.videos[vidId] ? progress.videos[vidId].percent : 0;
                }
            }

            if (config.totalInfoSlides > 0) {
                let viewedCount = (progress.viewedInfoSlides || []).length;
                totalEarned += (viewedCount * 100);
            }

            let finalMediaScore = 0;
            if (totalElements > 0) {
                finalMediaScore = Math.round((totalEarned / (totalElements * 100)) * 100);
            } else {
                finalMediaScore = 100;
            }

            this.gameData.score.raw = finalMediaScore;
            this.gameData.score.scaled = finalMediaScore / 100;

            this.gameData.Result.totalQuestions = 0;
            this.gameData.Result.correctAnswers = 0;
            this.gameData.Result.totalScore = finalMediaScore;

            if (isMediaComplete) {
                this.gameData.success_status = "passed";
            } else {
                this.gameData.success_status = "unknown";
            }
        }

        // 4. التقييم الشامل للـ Completion
        if (isQuizFullyCompleted && isMediaComplete) {
            if (config.hasQuestions) {
                if (this.gameData.success_status === "passed") {
                    this.gameData.completion_status = "completed";
                    this.gameData.Result.lessonStatus = "passed";
                } else {
                    this.gameData.completion_status = "incomplete";
                    this.gameData.Result.lessonStatus = "failed";
                }
            } else {
                this.gameData.completion_status = "completed";
                this.gameData.Result.lessonStatus = "completed";
            }
        } else {
            this.gameData.completion_status = "incomplete";
            this.gameData.Result.lessonStatus = "incomplete";
        }

        const d = new Date();
        this.gameData.endTimeId = [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('/') + ' ' +
            [d.getHours(), d.getMinutes(), d.getSeconds()].join(':');

        this.gameData.total_time = ScormUtils.calculateTotalTime();
        this.gameData.lastUpdate = d.toISOString();

        this.persist();
        this.submitToEndpoint();
    }
});
