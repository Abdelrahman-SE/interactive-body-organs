 // Data initialization - تهيئة المتغيرات الأساسية للملف
var Data = '';  // Placeholder for loaded data - متغير فارغ مخصص لتخزين بيانات النشاط لاحقاً
var token = undefined;  // Variable to hold the current token - متغير سيحمل توكن المستخدم للتحقق من الصلاحيات
var newUrl = new URL(window.location);  // Retrieves the current URL of the window - جلب مسار الرابط الحالي للنافذة
var start_Time = new Date().getTime();  // Records the start time for duration calculations - حفظ وقت بدء تشغيل الملف بالمللي ثانية لكي نحسب الزمن المنقضي للمستخدم
 
// Variables and Configuration - متغيرات التحكم
var updateCode = 0; // Code to represent the progress update status - كود يمثل حالة التقدم (مثلاً 1 لـ 25% و 4 تعني الانتهاء 100%)

// دالة تنسيق الوقت: تحول الثواني إلى صيغة مفهومة (ساعات.دقائق.ثواني)
function formatTime(seconds) { // تستقبل عدد الثواني
    const h = Math.floor(seconds / 3600); // Hours - حساب الساعات (القسمة على 3600 ثانية)
    const m = Math.floor((seconds % 3600) / 60); // Minutes - حساب الدقائق المتبقية
    const s = Math.round(seconds % 60); // Seconds - حساب الثواني المتبقية وتقريبها
    return [ // ترجع مصفوفة مقسمة بنقاط كالتالي:
        h, // الساعات
        m > 9 ? m : (h ? '0' + m : m || '0'), // الدقائق مع تنسيق وضع صفر قبل الرقم لو كان أقل من 10
        s > 9 ? s : '0' + s // الثواني مع تنسيق الصفر الإضافي
    ].filter(Boolean).join('.'); // دمج المصفوفة وإرجاع السلسلة
}

// finalResponse: Object for handling activity initialization and data submission
// الكائن المسؤول عن العمليات الأساسية المتعلقة بالسيرفر (بدء النشاط وحفظ التقدم)
var finalResponse = {
    /**
     * Initialize Learning Object Activity.
     * دالة لبدء النشاط التعليمي على قاعدة البيانات
     * @param {string} _token - The authentication token. - التوكن
     * @param {string} clipId - The clip ID. - معرف المقطع
     * @param {string} subjectId - The subject ID. - معرف المادة
     * @param {string} lessonId - The lesson ID. - معرف الدرس
     */
    intalizeLOActivity: async function (_token, clipId, subjectId, lessonId) {
        clipId = Number(clipId); // تحويل المقطع لرقم احتياطياً
        lessonId = Number(lessonId); // تحويل الدرس لرقم
        // Parameters for API request - تجميع البيانات في كائن لإرسالها
        _prameter = {
            clipId, // المقطع
            subjectId, // المادة
            lessonId // الدرس
        }
        // API request options - إعدادات طلب الـ Fetch
        const options = {
            method: 'POST', // طريقة إرسال الطلب (رفع للبيانات)
            headers: { // الترويسة
                'Content-Type': 'application/json', // نوع البيانات المُرسلة JSON
                Authorization: `Bearer ${_token}` // وضع التوكن الخاص بالطالب
            },
            body: JSON.stringify(_prameter), // تحويل الكائن لنص JSON
        };
        myGame.log(_token); // طباعة التوكن للكونسول
          // Fetch request to initialize activity - تنفيذ الطلب لـ API لبدء النشاط
        await fetch(myGame.baseUrl + 'Student/InsertActivity', options)
            .then(data => { // معالجة الاستجابة
                // Handle different response statuses - فحص حالات كود الرد
                if (data && data.status == 401) { // 401: غير مصرح
                    myGame.log("401"); // Unauthorized
                    susuess = false; // تسجيل فشل
                    return result = undefined; // تفريغ النتيجة
                }
                if (data.status == 200) { // 200: نجاح تام
                    myGame.log("200"); // Success
                    susuess = true; // تسجيل نجاح
                }
                if (!data.ok) { // إذا كان هناك خطأ غير متوقع
                    throw Error(data.status); // If response not OK, throw error - رفع خطأ للتصيد لاحقاً
                }
                return data.json(); // تحويل نتيجة السيرفر إلى كائن جافاسكربت
            }).then(update => { // بعد تحويل الـ JSON
                return result = update.value; // سحب حقل value من النتيجة الذي يحتوي على بيانات النشاط
            }).catch(e => { // في حالة حدوث خطأ أو توقف السيرفر
                myGame.log(e); // Log error if request fails - طباعة الخطأ
                susuess = false;
                result = undefined;
            });
         myGame.log(result);   // طباعة النتيجة المحملة من السيرفر
        // تمرير البيانات المرجعة لدالة تهيئة الـ SCORM لتوزيع بيانات الأسئلة السابقة إن وجدت
         gameSCORM.loadGameData(result);

        // العودة إلى كائن اللعبة لفتح الواجهة وبدء التفاعل مع المستخدم
        return myGame.testOpen(result);
    },

    /**
     * Submit data and handle code updates.
     * دالة معالجة وارسال البيانات (أهم دالة للتقييم) يتم استدعاؤها مع كل حركة للمستخدم لحفظ درجاته
     * @param {object|string} _object - The data object to be submitted. - الكائن الحامل للبيانات والميتا داتا
     * @param {number} correctCount - Additional parameter for progress updates. - عدد الإجابات الصحيحة حالياً
     */
    submitData: function (_object, correctCount) {
        let incomingObj = JSON.parse(_object);
        let globalObj = typeof object !== 'undefined' ? object : {};
        
        // 1. تحديد الكائن الأساسي (الميتا داتا) لضمان عدم ضياع أي بيانات
        let payloadObj = {};
        if (incomingObj.courseConfig) {
            payloadObj = JSON.parse(JSON.stringify(globalObj));
        } else {
            payloadObj = incomingObj;
        }

    // 2. تحديث الإجابات الصحيحة
    let cmiData = {
        completion_status: "incomplete",
        success_status: "unknown",
        total_time: "",
        score: { raw: 0, min: 0, max: 0, scaled: 0 }
    };

    if (typeof gameSCORM !== 'undefined' && gameSCORM.gameData) {
        cmiData.completion_status = gameSCORM.gameData.completion_status || "incomplete";
        cmiData.success_status = gameSCORM.gameData.success_status || "unknown";
        cmiData.total_time = gameSCORM.gameData.total_time || "";
        if (gameSCORM.gameData.score) {
            cmiData.score.raw = gameSCORM.gameData.score.raw || 0;
            cmiData.score.min = gameSCORM.gameData.score.min || 0;
            cmiData.score.max = gameSCORM.gameData.score.max || 0;
            cmiData.score.scaled = gameSCORM.gameData.score.scaled || 0;
        }
    } else if (payloadObj && payloadObj.cmi) {
        cmiData = payloadObj.cmi;
    }

    // 🔒 حماية الـ CMI: مقارنة مع آخر قيم محفوظة من الـ Insert (Anti-Downgrade)
    if (window.savedCmi) {
        const savedRaw = (window.savedCmi.score && window.savedCmi.score.raw !== undefined) ? Number(window.savedCmi.score.raw) : 0;
        if (savedRaw > (cmiData.score.raw || 0)) {
            cmiData.score.raw = savedRaw;
            cmiData.score.scaled = savedRaw / 100;
        }
        if (window.savedCmi.success_status === "passed") {
            cmiData.success_status = "passed";
        }
        
        // لا نحتفظ بحالة completed إذا كان الطالب راسباً (لتطبيق القواعد الصارمة)
        if (window.savedCmi.completion_status === "completed" && cmiData.success_status !== "failed") {
            cmiData.completion_status = "completed";
        }
    }
    
    // فرض حالة incomplete دائماً إذا كان راسباً
    if (cmiData.success_status === "failed") {
        cmiData.completion_status = "incomplete";
    }

    if (myGame.direction == 2) {
        var d = new Date;
        end_Time = d.getTime(); 
        let learningDuration = Number(formatTime((end_Time - start_Time) / 1000) * 60);
        let learningDurationInSec = Number(learningDuration.toFixed());
        
        // =========================================================
        // جلب بيانات السكورم الحقيقية 
        // =========================================================
        let suspendData = {};
        let isGameData = false;
        
        if (typeof gameSCORM !== 'undefined' && gameSCORM.gameData && gameSCORM.gameData.courseConfig) {
            suspendData = JSON.parse(JSON.stringify(gameSCORM.gameData)); 
            isGameData = true;
        }

        const config = isGameData ? (suspendData.courseConfig || {}) : {};
        const progress = isGameData ? (suspendData.studentProgress || { videos: {}, viewedInfoSlides: [], infoDetails: {} }) : { videos: {}, viewedInfoSlides: [], infoDetails: {} };
        const resultData = isGameData ? (suspendData.Result || {}) : {};

        let hasQuestions = false;
        if (isGameData) {
            hasQuestions = !!config.hasQuestions;
        } else {
            hasQuestions = !!(payloadObj.numberOfquestion || payloadObj.TotalDegree);
        }

        let totalPossibleWeight = 0; 
        let totalEarnedWeight = 0;   
        let actualQuestionsCount = 0; 

        // متغيرات الميديا
        let tVideos = 0;
        let cVideos = 0;
        let tInfo = 0;
        let vInfo = 0;

        if (hasQuestions) {
            if (!isGameData) {
                actualQuestionsCount = payloadObj.TotalDegree || payloadObj.numberOfquestion || 1;
                totalPossibleWeight = actualQuestionsCount * 100;
                totalEarnedWeight = (payloadObj.correctAnswer || 0) * 100;
            } else {
                actualQuestionsCount = resultData.totalQuestions || 1;
                totalPossibleWeight = actualQuestionsCount * 100;
                totalEarnedWeight = (resultData.correctAnswers || 0) * 100;
            }
        } else {
            if (!isGameData) {
                tVideos = payloadObj.totalVideos || 0;
                cVideos = payloadObj.completedVideos || 0;
                tInfo = payloadObj.totalInfoSlides || 0;
                vInfo = payloadObj.viewedInfoSlides || 0;

                totalPossibleWeight = (tVideos * 100) + (tInfo * 100);
                totalEarnedWeight = (cVideos * 100) + (vInfo * 100);
            } else {
                if (config.totalVideos > 0) { 
                    tVideos = config.totalVideos;
                    totalPossibleWeight += (tVideos * 100); 
                    for (let i = 1; i <= tVideos; i++) { 
                        const p = progress.videos[`video_${i}`] ? progress.videos[`video_${i}`].percent : 0; 
                        totalEarnedWeight += p; 
                        if (p >= 95) cVideos++; 
                    }
                }

                if (config.totalInfoSlides > 0) { 
                    tInfo = config.totalInfoSlides;
                    totalPossibleWeight += (tInfo * 100); 
                    vInfo = Object.values(progress.infoDetails || {}).filter(item => item.status === "viewed").length; 
                    totalEarnedWeight += (vInfo * 100); 
                }
            }
        }

        // حقن كائن studentProgress بالكامل بدلاً من المتغيرات الفردية
        if (typeof gameSCORM !== 'undefined' && gameSCORM.gameData && gameSCORM.gameData.studentProgress) {
            payloadObj.studentProgress = gameSCORM.gameData.studentProgress;
        } else if (isGameData && suspendData.studentProgress) {
            payloadObj.studentProgress = suspendData.studentProgress;
        }

        let finalPercentage = 0;
        if (totalPossibleWeight > 0) { 
            finalPercentage = (totalEarnedWeight / totalPossibleWeight) * 100; 
        } else if (isGameData && suspendData.completion_status === "completed") {
            finalPercentage = 100; 
        }

        let loDegreeValue = parseFloat(payloadObj.LODegree || globalObj.loDegree) || 10.0; 
        let studentPoints = parseFloat(((finalPercentage / 100) * loDegreeValue).toFixed(2));
        if (studentPoints > loDegreeValue) studentPoints = loDegreeValue;

        // تحديث الدرجات النهائية
        payloadObj.StudentDegree = studentPoints;
        payloadObj.studentPoints = studentPoints;

        let p = Number(finalPercentage.toFixed(0)); 
        let updateCode = 0;
        if (p >= 0 && p <= 25) updateCode = 1; 
        else if (p >= 26 && p <= 50) updateCode = 2; 
        else if (p >= 51 && p <= 99) updateCode = 3; 
        else if (p == 100) updateCode = 4; 

        // حساب الإجابات الصحيحة الفعلي للتقرير
        let calculatedCorrectAnswer = 0;
        if (hasQuestions) {
            if (!isGameData) {
                calculatedCorrectAnswer = payloadObj.correctAnswer || 0;
            } else {
                calculatedCorrectAnswer = resultData.correctAnswers || 0;
            }
        }

        // =====================================================================
        // 🔥 Progress Feedback — حساب الـ lang و feedBackTxt و feedBackDes 🔥
        // =====================================================================
         let calculatedScoreRaw = 0;
        if (calculatedCorrectAnswer !== undefined && actualQuestionsCount > 0) {
            calculatedScoreRaw = (calculatedCorrectAnswer / actualQuestionsCount) * 100;
            if (calculatedScoreRaw > 100) calculatedScoreRaw = 100;
        } else if (!hasQuestions) {
            calculatedScoreRaw = finalPercentage;
        }
        
        // متغير جديد يحسب سكور البروجريس الحالي بدون ما يتثبت على أعلى قيمة
        let currentProgressScore = calculatedScoreRaw; 
        
      // =====================================================================
      // 🔥 Progress Feedback — حساب الـ lang و feedBackTxt و feedBackDes 🔥
      // =====================================================================
      if (typeof getProgressFeedback === 'function') {
          var eduStage = (globalObj.subjectId || globalObj.lo_Subject || "").replace(/^[a-zA-Z]+_/, "");
          var tempPost = { Educational_stage: eduStage };
          var progressResult = getProgressFeedback(currentProgressScore, tempPost);
          
          if (progressResult) {
              globalObj.lang = tempPost.lang || null;
              
              // feedBackTxt و feedBackDes يتحدثان دائماً مع كل محاولة ليعكسا النسبة الفعلية الحالية
              globalObj.feedBackTxt = progressResult.txt || null;
              globalObj.feedBackDes = progressResult.description || null;
          }
      }

        // =====================================================================
        // 🔥 تنظيف الأوبجكت (حذف الحقول غير المرغوب فيها) 🔥
        // =====================================================================
       let finalCleanObject = {
        NumberOfAttempt: window.globalNumberOfAttempt || 1,
        loDegree: payloadObj.loDegree || 0,
        numberOfquestion: hasQuestions ? actualQuestionsCount : 0,
        numberOfTotalQuestion: hasQuestions ? (payloadObj.numberOfTotalQuestion || actualQuestionsCount) : 0,
        counterCorrect: calculatedCorrectAnswer,
        studentPoint: studentPoints, 
        startTime: payloadObj.startTime || "",
        endTime: payloadObj.endTime || "",
        subjectId: payloadObj.subjectId || globalObj.subjectId || "",
        lang: globalObj.lang || null,
        feedBackTxt: globalObj.feedBackTxt || null,
        feedBackDes: globalObj.feedBackDes || null,
        cmi: {
            completion_status: cmiData.completion_status,
            success_status: cmiData.success_status,
            total_time: cmiData.total_time,
            score: {
                raw: cmiData.score.raw,
                min: cmiData.score.min,
                max: cmiData.score.max,
                scaled: cmiData.score.scaled
            }
        }, 
        questions: hasQuestions ? (payloadObj.questions || []) : [],
        studentProgress: payloadObj.studentProgress || { infoDetails: {}, videos: {} }
    };

        // ---------------- FINAL REQUEST ----------------
        _pramerat = {
            learningDurationInSec: learningDurationInSec, 
            studentPoints: studentPoints, 
            activityId: globalObj.activityId,
            learningObjectAsJson: JSON.stringify(finalCleanObject),
            //completionStatus: cmiData.completion_status,
            //successStatus: cmiData.success_status
        };
        
        if (myGame.vodafoneMode === false) {
            console.log(JSON.parse(_pramerat.learningObjectAsJson)); 
        }
 
        const options = {
            method: 'POST', 
            keepalive: true,
            headers: {
                accept: 'text/plain', 
                'Content-Type': 'application/json', 
                Authorization: `Bearer ${token || myGame.token || globalObj.token}` 
            },
            body: JSON.stringify(_pramerat) 
        };

        // =====================================================================
        // 🔥 نظام Vodafone 
        // =====================================================================
        if (myGame.vodafoneMode === true) { 
            let rawCount = 0; 
            let maxCount = 0; 
            let isLastStepTriggered = false; 

            // =========================================================
        // جلب بيانات السكورم الحقيقية وحساب الدرجات ديناميكياً
        // =========================================================
        let suspendData = {};
        let isGameData = false;
        
        if (typeof gameSCORM !== 'undefined' && gameSCORM.gameData && gameSCORM.gameData.courseConfig) {
            suspendData = JSON.parse(JSON.stringify(gameSCORM.gameData)); 
            isGameData = true;
        }

        let totalPossibleWeight = 0; 
        let totalEarnedWeight = 0;   
        let actualQuestionsCount = 0; 

        // متغيرات الميديا
        let tVideos = 0;
        let cVideos = 0;
        let tInfo = 0;
        let vInfo = 0;

        if (!isGameData) {
            // اللوجيك القديم للمشاريع السابقة
            actualQuestionsCount = payloadObj.TotalDegree || 1; 
            totalPossibleWeight += (actualQuestionsCount * 100);
            totalEarnedWeight += ((payloadObj.correctAnswer || 0) * 100);
            
            tVideos = payloadObj.totalVideos || 0;
            cVideos = payloadObj.completedVideos || 0;
            tInfo = payloadObj.totalInfoSlides || 0;
            vInfo = payloadObj.viewedInfoSlides || 0;
        } else {
            const config = suspendData.courseConfig || {};
            const progress = suspendData.studentProgress || { videos: {}, viewedInfoSlides: [] };
            
            // 🔥 الحسبة الديناميكية الجديدة لنظام المستويات من أوبجيكت الأسئلة مباشرة
            if (suspendData.questions && Object.keys(suspendData.questions).length > 0) {
                const qArray = Object.values(suspendData.questions);
                actualQuestionsCount = qArray.length; // إجمالي الأسئلة من الجيسون
                
                // عد الأسئلة الصحيحة اللي الطالب جاوبها فعلياً حتى الآن
                let correctAnswersCount = qArray.filter(q => q.result === "correct" || q.result === "correctAnswers").length;
                
                totalPossibleWeight += (actualQuestionsCount * 100);
                totalEarnedWeight += (correctAnswersCount * 100);
            } else {
                // الفالباك لو مفيش أسئلة في الأوبجيكت
                actualQuestionsCount = suspendData.Result?.totalQuestions || payloadObj.TotalDegree || 1;
                totalPossibleWeight += (actualQuestionsCount * 100);
                totalEarnedWeight += ((suspendData.Result?.correctAnswers || 0) * 100);
            }

            // حسابات الفيديوهات والمعلومات كما هي
            if (config.totalVideos > 0) { 
                tVideos = config.totalVideos;
                totalPossibleWeight += (tVideos * 100); 
                for (let i = 1; i <= tVideos; i++) { 
                    const p = progress.videos[`video_${i}`] ? progress.videos[`video_${i}`].percent : 0; 
                    totalEarnedWeight += p; 
                    if (p >= 95) cVideos++; 
                }
            }

            if (config.totalInfoSlides > 0) { 
                tInfo = config.totalInfoSlides;
                totalPossibleWeight += (tInfo * 100); 
                vInfo = (progress.viewedInfoSlides || []).length; 
                totalEarnedWeight += (vInfo * 100); 
            }
        }

            if (isLastStepTriggered) { 
                let minCount = Number((maxCount / 2).toFixed(0)); 
                let finalLessonStatus = "fail"; 
                if (maxCount > 0 && rawCount >= minCount) {
                    finalLessonStatus = "passed"; 
                } else if (maxCount === 0 && suspendData.completion_status === "completed") {
                    finalLessonStatus = "passed"; 
                }

                let customPostMessageData = {
                    "lesson_status": finalLessonStatus, 
                    "score": { "raw": rawCount, "min": minCount, "max": maxCount },
                    "total_time": suspendData.total_time || "00:00:00" 
                };
                window.parent.postMessage(customPostMessageData, '*');  
            }
        }
        
        // --- إرسال البيانات للسيرفر الأساسي ---
        if (myGame.endpoint1 == true) {
            const totalQForApi = actualQuestionsCount;
            fetch(myGame.baseUrl + 'Student/UpdateStudentActivity', options)
                .then(r => r.json()) 
                .then(update => {
                    myGame.postMessage({
                        code: updateCode, 
                        loDegree: loDegreeValue, 
                        totalDegree: totalQForApi, 
                        studentDegree: studentPoints, 
                        totalPoint: updateCode == 4 ? loDegreeValue : studentPoints, 
                        error_: update 
                    }, '*');
                })
                .catch(e => {
                    myGame.postMessage({
                        code: updateCode, 
                        loDegree: loDegreeValue,
                        totalDegree: totalQForApi,
                        studentDegree: studentPoints,
                        totalPoint: updateCode == 4 ? loDegreeValue : studentPoints,
                        error_: e.message 
                    }, '*');
                });
        }
    }
}

}