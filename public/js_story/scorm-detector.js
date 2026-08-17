/**
 * @file scorm-detector.js (النسخة المدمجة - All-in-One)
 * تم تجميع كافة الملفات هنا لضمان عمل اللوجيك 100% بدون الاعتماد على تحميل خارجي لتفادي أخطاء 404.
 */

// =========================================================================
// 1. أدوات الوقت (scorm-time-utils.js)
// =========================================================================
window.ScormUtils = {
    formatTimeOnly: function(date) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    },
    formatDuration: function(start, end) {
        const diffMs = end - start;
        if (diffMs < 0) return "00:00";
        const totalSec = Math.floor(diffMs / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },
    formatScormLatency: function(ms) {
        if (!ms || ms < 0) return "00:00:00";
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },
    calculateTotalTime: function() {
        if (typeof start_Time !== 'undefined') {
            const now = new Date().getTime();
            const diffMs = now - start_Time;
            return ScormUtils.formatScormLatency(diffMs);
        }
        return "00:00:00";
    }
};

// =========================================================================
// 2. الكلاس الأساسي وتهيئة الذاكرة (scorm-detector.js)
// =========================================================================
class GameSCORMWrapper {
    constructor() {
        this.api = null;              
        this.isLMS = false;           
        this.currentQuestion = null;  
        this.finalobjects = null;     
        this.loData = null;           
        this.submitTimer = null;
        this._dataLoaded = false;     // 🔒 حماية: لا يتم إرسال أي بيانات للمنصة قبل قراءة البيانات القديمة
        this._initWrapperCalled = false; // منع استدعاء initializeWrapper أكثر من مرة

        this.gameData = {
            studentProgress: {
                videos: {},             
                viewedInfoSlides: [],   
                infoDetails: {},        
            },
            questions: {},            
            score: { scaled: 0, raw: 0, min: 0, max: 100 }, 
            success_status: "unknown",       
            completion_status: "incomplete", 
            total_time: "0000:00:00.00",     
            SCORM_version: "1.2",            
            lastUpdate: null,                
            metadata: {},                    
            Result: {                        
                totalQuestions: 0,           
                correctAnswers: 0,           
                totalScore: 0,               
                lessonStatus: "incomplete"   
            }
        };
    }
}
window.GameSCORMWrapper = GameSCORMWrapper;

// =========================================================================
// 3. نواة الاتصال (scorm-api-core.js)
// =========================================================================
Object.assign(window.GameSCORMWrapper.prototype, {
    async initializeWrapper(enableSCORM = true) {
        if (!enableSCORM) {
            this.setupFallbackAPI();
            this._dataLoaded = true;
            return;
        }
        // 🔒 منع الاستدعاء المتكرر (setupCourse + access_api يستدعيان هذه الدالة)
        if (this._initWrapperCalled) return;
        this._initWrapperCalled = true;

        let attempts = 0;
        const maxAttempts = 30; 

        const findActiveAPI = () => {
            let api = this.findSCORMAPI();
            if (!api && window.opener && window.opener.parent && window.opener.parent.API) {
                api = window.opener.parent.API;
            }
            if (api) {
                this.api = api;
                this.isLMS = true;
                return true;
            }
            return false;
        };

        const retry = setInterval(() => {
            attempts++;
            if (findActiveAPI() || attempts >= maxAttempts) {
                clearInterval(retry);
                if (this.api) {
                    setTimeout(() => {
                        // Call LMSInitialize before any GetValue/SetValue calls
                        if (typeof this.api.LMSInitialize === "function") this.api.LMSInitialize("");
                        else if (typeof this.api.Initialize === "function") this.api.Initialize("");
                        this.loadGameData();
                        this.applySCORMInitRule();
                        
                        // 🔒 Session Management: حفظ آمن عند إغلاق النافذة
                        window.addEventListener("beforeunload", () => {
                            if (this.api && this.isLMS) {
                                this.callCommit();
                                if (typeof this.api.LMSFinish === "function") this.api.LMSFinish("");
                                else if (typeof this.api.Terminate === "function") this.api.Terminate("");
                            }
                        });
                    }, 500);
                } else {
                    this.setupFallbackAPI();
                    this._dataLoaded = true;
                }
            }
        }, 250);
    },

    findSCORMAPI() {
        const locations = [
            () => window.opener?.parent?.API, () => window.opener?.parent?.API_1484_11,
            () => window.opener?.API, () => window.parent?.API,
            () => window.top?.API, () => window.API
        ];
        for (let loc of locations) {
            try {
                const api = loc();
                if (api && (api.GetValue || api.LMSGetValue)) return api;
            } catch (e) { }
        }
        return null;
    },

    setupFallbackAPI() {
        this.api = {
            GetValue: (n) => (n === "cmi.suspend_data") ? localStorage.getItem("game_scorm_data") || "" : "",
            SetValue: () => "true", Commit: () => "true", LMSSetValue: () => "true", LMSCommit: () => "true",
            LMSGetValue: () => "", LMSFinish: () => "true", Terminate: () => "true",
            GetMetadataValue: (key) => this.gameData.metadata[key] ?? null
        };
    },

    /**
     * @function callGetValue
     * @description دالة مساعدة لجلب أي قيمة من المنصة بأمان
     */
    callGetValue(name) {
        if (!this.api) return "";
        if (typeof this.api.LMSGetValue === "function") return this.api.LMSGetValue(name);
        if (typeof this.api.GetValue === "function") return this.api.GetValue(name);
        return "";
    },

    /**
     * @function applySCORMInitRule
     * @description SCORM 1.2 Initialization Rule: تعيين الحالة إلى incomplete إذا لم يختبر الطالب بعد
     * CRITICAL: لا تكتب فوق passed أو failed أبداً
     */
    applySCORMInitRule() {
        if (!this.api || !this.isLMS) return;
        const currentStatus = this.callGetValue("cmi.core.lesson_status");
        if (!currentStatus || currentStatus === "" || currentStatus === "not attempted" || currentStatus === "unknown") {
            this.callSetValue("cmi.core.lesson_status", "incomplete");
            this.callCommit();
        }
    },

    callSetValue(name, value) {
        if (!this.api) return "false";
        const strValue = String(value);
        if (typeof this.api.LMSSetValue === "function") return this.api.LMSSetValue(name, strValue);
        if (typeof this.api.SetValue === "function") return this.api.SetValue(name, strValue);
        return "false";
    },

    callCommit() {
        if (!this.api) return "false";
        if (typeof this.api.LMSCommit === "function") return this.api.LMSCommit("");
        if (typeof this.api.Commit === "function") return this.api.Commit("");
        return "false";
    },

    syncInteractionsToLMS() {
        Object.keys(this.gameData.questions).forEach((qKey, index) => {
            const qData = this.gameData.questions[qKey];
            const prefix = `cmi.interactions.${index}.`;
            
            // تسجيل معرف السؤال ونوعه
            this.callSetValue(prefix + "id", qKey);
            this.callSetValue(prefix + "type", "choice");
            
            // تسجيل إجابة الطالب
            if (qData.learner_response) {
                this.callSetValue(prefix + "learner_response", qData.learner_response);
            }
            
            // 🔥 تصحيح منطق النتيجة لتتوافق مع معيار 1.2 الصارم (استخدام wrong بدلاً من incorrect)
            if (qData.result) {
                const scormResult = (qData.result === "wrong" || qData.result === "incorrect") ? "wrong" : "correct";
                this.callSetValue(prefix + "result", scormResult);
            }
        });
    },

    persist() {
        if (!this.api || !this.isLMS) return;

        // 🔒 CRITICAL: لا ترسل أي بيانات للمنصة قبل قراءة البيانات القديمة
        // هذا يمنع initializeQuestions من مسح الدرجة القديمة (Race Condition Protection)
        if (!this._dataLoaded) {
            console.log("⏳ [SCORM] persist() skipped - waiting for loadGameData");
            return;
        }

        const cleanData = JSON.parse(JSON.stringify(this.gameData));
        delete cleanData.metadata;
        const dataString = JSON.stringify(cleanData);
        
        try {
            // 1. حفظ بيانات الاستكمال (Resume Data) - دائماً
            this.callSetValue("cmi.suspend_data", dataString);
            
            // 2. 🔒 Score Anti-Downgrade Protection
            // قراءة الدرجة الموجودة في المنصة أولاً، ولا تقبل أي درجة أقل
            if (this.gameData.courseConfig && this.gameData.courseConfig.hasQuestions) {
                const newScoreNum = Number(this.gameData.score.raw || 0);
                const existingScoreStr = this.callGetValue("cmi.core.score.raw");
                const existingScoreNum = (existingScoreStr && existingScoreStr !== "") ? Number(existingScoreStr) : -1;
                
                if (newScoreNum > existingScoreNum) {
                    this.callSetValue("cmi.core.score.raw", String(newScoreNum));
                    this.callSetValue("cmi.score.scaled", String(newScoreNum / 100));
                }
                this.callSetValue("cmi.core.score.max", "100");
                this.callSetValue("cmi.core.score.min", "0");
            }
            
            // 3. 🔒 Status Anti-Downgrade Protection
            // الترتيب: passed > failed > incomplete > unknown
            // لا تسمح أبداً بتراجع الحالة
            let newStatus = this.gameData.completion_status || "incomplete";
            if (this.gameData.completion_status === "completed") {
                if (this.gameData.courseConfig && this.gameData.courseConfig.hasQuestions) {
                    // لو فيه أسئلة: passed / failed
                    newStatus = this.gameData.success_status === "passed" ? "passed" : "failed";
                } else {
                    // لو ميديا بس (بدون أسئلة): completed (N/A للـ success)
                    newStatus = "completed";
                }
            }
            
            const existingStatus = this.callGetValue("cmi.core.lesson_status");
            let finalStatus = newStatus;
            
            // حماية: لو المنصة عندها passed، اتركها passed
            if (existingStatus === "passed") {
                finalStatus = "passed";
            }
            
            this.callSetValue("cmi.core.lesson_status", finalStatus);
            
            // Explicitly send SCORM 2004 keys if LMS supports them
            this.callSetValue("cmi.completion_status", this.gameData.completion_status);
            this.callSetValue("cmi.success_status", this.gameData.success_status);
            
            this.callSetValue("cmi.core.exit", "suspend");
            this.callSetValue("cmi.core.session_time", this.gameData.total_time || "00:00:00");
            
            // 4. مزامنة الأسئلة وإتمام الحفظ
            this.syncInteractionsToLMS();
            this.callCommit();
            
            console.log(`Score: ${this.gameData.score.raw}% | Completion: ${this.gameData.completion_status} | Success: ${this.gameData.success_status}`);
        } catch (e) { 
            console.error(e); 
        }
    },

   /**
     * @function updateLegacyPayload
     * @description بناء الأوبجكت بالشكل الجديد المطلوب حصرياً بدون أي إضافات
     */
    updateLegacyPayload() {
        const globalObj = typeof object !== 'undefined' ? object : {};
        const myGameObj = typeof myGame !== 'undefined' ? myGame : {};
        
        const qList = Object.values(this.gameData.questions || {});
        const config = this.gameData.courseConfig || { hasQuestions: false, totalVideos: 0, totalInfoSlides: 0 };
        const progress = this.gameData.studentProgress || { videos: {}, viewedInfoSlides: [], infoDetails: {} };
        const result = this.gameData.Result || { totalQuestions: 0, correctAnswers: 0 };

        let calculatedTotalDegree = 0;
        let calculatedCorrectAnswer = 0;

        // حساب الأسئلة المنجزة
        if (config.hasQuestions) {
            calculatedTotalDegree += (result.totalQuestions > 0 ? result.totalQuestions : qList.length);
            calculatedCorrectAnswer += (result.correctAnswers || 0);
        }

        let totalQuestions = 0;
        let totalQuestionsInJson = 0;

        if (config.hasQuestions) {
            totalQuestions = calculatedTotalDegree;
            if (totalQuestions === 0) totalQuestions = globalObj.numberOfquestion || globalObj.TotalDegree || 1;
            
            totalQuestionsInJson = totalQuestions;
            if (typeof window !== 'undefined' && window.mydata && window.mydata.numberOfquestion) {
                totalQuestionsInJson = window.mydata.numberOfquestion;
            }
        }

        // تنسيق الأسئلة ليتطابق مع المطلوب
        let formattedQuestions = [];
        if (config.hasQuestions) {
            formattedQuestions = qList.map(q => {
                return {
                    "numberOfTrial": q.attempts || 0,
                    "questionlevel": q.questionlevel || "",
                    "questionType": q.questionType || q.type || "",
                    "answersType": q.answersType || "",
                    "startTime": q.startTime || "",
                    "endTime": q.endTime || ""
                };
            });
        }

        // تنسيق الوقت
        const d = new Date();
        const formattedEndTime = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
        
        let formattedStartTime = formattedEndTime; 
        if (typeof start_Time !== 'undefined') {
            const sd = new Date(start_Time);
            formattedStartTime = `${sd.getFullYear()}/${sd.getMonth() + 1}/${sd.getDate()} ${sd.getHours()}:${sd.getMinutes()}:${sd.getSeconds()}`;
        }

        // بناء الأوبجكت النهائي المطلوب وضمان هيكل cmi
        // 🔒 حماية الـ CMI: مقارنة القيم الحالية مع آخر قيم محفوظة من الـ Insert (Anti-Downgrade)
        const currentRaw = this.gameData.score.raw || 0;
        const savedRaw = (window.savedCmi && window.savedCmi.score && window.savedCmi.score.raw !== undefined) ? Number(window.savedCmi.score.raw) : 0;
        const bestRaw = Math.max(currentRaw, savedRaw);

        let bestCompletion = this.gameData.completion_status || "";
        if (window.savedCmi && window.savedCmi.completion_status === "completed") {
            bestCompletion = "completed";
        }

        let bestSuccess = this.gameData.success_status || "";
        if (window.savedCmi && window.savedCmi.success_status === "passed") {
            bestSuccess = "passed";
        } else if (window.savedCmi && window.savedCmi.success_status === "failed" && bestSuccess === "unknown") {
            bestSuccess = "failed";
        }

        this.gameData.object = {
            "NumberOfAttempt": window.globalNumberOfAttempt || 1,
            "loDegree": globalObj.loDegree || 0,
            "numberOfquestion": totalQuestions,
            "numberOfTotalQuestion": totalQuestionsInJson,
            "counterCorrect": calculatedCorrectAnswer,
            "studentPoint": 0,
            "startTime": formattedStartTime,
            "endTime": formattedEndTime,
            "subjectId": globalObj.subjectId || myGameObj.subjectId || "",
            "cmi": {
                "completion_status": bestCompletion,
                "success_status": bestSuccess,
                "total_time": this.gameData.total_time || "",
                "score": {
                    "raw": bestRaw,
                    "min": this.gameData.score.min || 0,
                    "max": this.gameData.score.max || 100,
                    "scaled": bestRaw / 100
                }
            },
            "questions": formattedQuestions,
            "studentProgress": progress
        };
    

        // دمج المتغيرات الديناميكية
        for (let key in globalObj) {
            if (key.startsWith('_openLevel_') || key === 'level1_Degree') {
                this.gameData.object[key] = globalObj[key]; 
            }
        }
    }

        
     ,

    /**
     * @function preparePayloadForEndpoint
     * @description إرسال gameData لو في LMS، وإرسال object لو مفيش LMS
     */
    preparePayloadForEndpoint() {
        this.updateLegacyPayload(); 
        
        if (this.isLMS) {
            // لو في LMS: نبعت gameData كاملة بس نحذف منها الـ object والميتاداتا عشان منكررش البيانات
            const payload = { ...this.gameData };
            delete payload.object; 
            delete payload.metadata; 
            return JSON.stringify(payload);
        } else {
            // لو مفيش LMS: نبعت الـ object القديم الصافي
            return JSON.stringify(this.gameData.object); 
        }
    },

    /**
     * @function preparePayloadForEndpoint
     * @description نرسل الأوبجيكت المنسق "فقط" للـ API
     */
    preparePayloadForEndpoint() {
        this.updateLegacyPayload(); 
        return JSON.stringify(this.gameData.object); // 🔥 تم التعديل هنا
    },

    submitToEndpoint() {
        if (typeof object !== 'undefined' && typeof myGame !== 'undefined' && (myGame.endpoint1 === true || myGame.vodafoneMode === true)) {
            if (this.submitTimer) clearTimeout(this.submitTimer);
            this.submitTimer = setTimeout(() => {
                const payload = this.preparePayloadForEndpoint();
                this.finalobjects = payload;
                const correctCount = Object.values(this.gameData.questions).filter(q => q.result === "correct").length;
                if (typeof finalResponse !== 'undefined' && typeof finalResponse.submitData === 'function') {
                    finalResponse.submitData(payload, correctCount);
                }
                this.submitTimer = null;
            });
        }
    },

    loadGameData(lo, attempt = 1) {
        let data = ""; 
        if (this.api) {
            try {
                if (typeof this.api.LMSGetValue === 'function') data = this.api.LMSGetValue("cmi.suspend_data");
                else if (typeof this.api.GetValue === 'function') data = this.api.GetValue("cmi.suspend_data");
            } catch (e) { } 
        }

        if ((!data || data === "") && window.opener?.parent?.API) {
            try { data = window.opener.parent.API.LMSGetValue("cmi.suspend_data"); } catch (e) { }
        }
        
        if ((!data || data === "") && attempt < 5) {
            setTimeout(() => { this.loadGameData(lo, attempt + 1); }, 1000);
            return; 
        }
        
        if (data && data !== "") {
            try {
                this.gameData = JSON.parse(data);
                
                if (!this.gameData.studentProgress) {
                    this.gameData.studentProgress = { videos: {}, viewedInfoSlides: [], infoDetails: {} };
                }
                if (!this.gameData.studentProgress.infoDetails) {
                    this.gameData.studentProgress.infoDetails = {};
                }
                if (!this.gameData.courseConfig) {
                    this.gameData.courseConfig = { hasQuestions: true, totalVideos: 0, totalInfoSlides: 0, passingScore: 50 };
                }
            } catch (jsonErr) { }
        }

        // 🔒 تفعيل العلم: البيانات تم تحميلها، يمكن لـ persist() الآن إرسال البيانات للمنصة
        this._dataLoaded = true;

        this.loData = lo;
    },

    setMetadataFromLO(lo) {
        if (!lo || typeof lo !== 'object') return;

        const md = this.gameData.metadata || {};
        md.activityId = lo.activityId ?? md.activityId;
        md.title = lo.title ?? md.title;
        md.assetName = lo.assetName ?? md.assetName;
        md.bloomLevels = lo.bloomLevels ?? md.bloomLevels;
        md.keywords = lo.keywords ?? md.keywords;
        md.learningObjectives = lo.learningObjectives ?? md.learningObjectives;
        md.lessonId = lo.lessonId ?? md.lessonId;
        md.loDegree = lo.loDegree ?? md.loDegree;
        md.subjectId = lo.subjectId ?? md.subjectId;
        md.type = lo.type ?? md.type;
        md.unitId = lo.unitId ?? md.unitId;

        try {
            const parsedLO = JSON.parse(lo.learningObjectAsJson);
            
            // ---------- NumberOfAttempt ---------- (تتبع عدد المحاولات)
            if (typeof parsedLO === 'object' && parsedLO !== null && parsedLO.NumberOfAttempt) {
                window.globalNumberOfAttempt = Number(parsedLO.NumberOfAttempt) + 1;
            } else {
                window.globalNumberOfAttempt = 1;
            }
            
            // ---------- Saved CMI ---------- (حفظ الـ CMI القديمة من الـ Insert عشان نقارن بيها)
            if (typeof parsedLO === 'object' && parsedLO !== null && parsedLO.cmi) {
                window.savedCmi = parsedLO.cmi;
                if (parsedLO.cmi.score && parsedLO.cmi.score.raw !== undefined) {
                    window.globalMaxScore = Number(parsedLO.cmi.score.raw);
                }
                if (parsedLO.cmi.completion_status) {
                    window.globalCompletion = parsedLO.cmi.completion_status;
                }
                if (parsedLO.cmi.success_status) {
                    window.globalSuccess = parsedLO.cmi.success_status;
                }
            }

            if (parsedLO.suspend_data) {
                const incomingData = typeof parsedLO.suspend_data === 'string'
                    ? JSON.parse(parsedLO.suspend_data) : parsedLO.suspend_data;

                if (incomingData.completion_status === "completed") {
                    console.log("🔄 السيرفر أرسل بيانات قديمة (مكتملة).. جاري مسحها محلياً للبدء من الصفر!");
                    
                    const config = incomingData.courseConfig || this.gameData.courseConfig || { totalInfoSlides: 0 };
                    this.gameData.courseConfig = config;
                    
                    let initialInfoDetails = {};
                    const totalSlides = config.totalInfoSlides || 0;
                    for (let i = 1; i <= totalSlides; i++) {
                        initialInfoDetails[`info_${i}`] = { id: `info_${i}`, status: "unviewed", timestamp: null };
                    }
                    this.gameData.studentProgress = { videos: {}, viewedInfoSlides: [], infoDetails: initialInfoDetails };
                    
                    this.gameData.questions = {};
                    const totalQ = incomingData.Result?.totalQuestions || 0;
                    if (totalQ > 0) {
                        for (let i = 1; i <= totalQ; i++) {
                            const qId = `interactions${i}`;
                            this.gameData.questions[qId] = { id: `question_${i}`, type: "", result: null, learner_response: null, weighting: "1" };
                        }
                    }
                    
                    this.gameData.score = { raw: 0, scaled: 0, min: 0, max: 100 };
                    this.gameData.completion_status = "incomplete";
                    this.gameData.success_status = "unknown";
                    this.gameData.Result = { totalQuestions: totalQ, correctAnswers: 0, totalScore: 0, lessonStatus: "incomplete" };
                
                } else {
                    const oldProgress = this.gameData.studentProgress;
                    const oldConfig = this.gameData.courseConfig;
                    this.gameData = incomingData;
                    
                    if (!this.gameData.studentProgress && oldProgress) this.gameData.studentProgress = oldProgress;
                    if (!this.gameData.courseConfig && oldConfig) this.gameData.courseConfig = oldConfig;
                }
            }
            
            this.gameData.metadata = md;
            if (this.api) this.api.debug_gameData = this.gameData; 
        } catch (parseErr) { }
        
        this.persist();
    }
});

// =========================================================================
// 4. لوجيك التتبع والدرجات (scorm-tracking-logic.js)
// =========================================================================
Object.assign(window.GameSCORMWrapper.prototype, {
    setupCourse(hasQuestions, totalVideos = 0, totalInfoSlides = 0) {
        if (!this.gameData.courseConfig) this.gameData.courseConfig = {};
        this.gameData.courseConfig.hasQuestions = hasQuestions;
        this.gameData.courseConfig.totalVideos = totalVideos;
        this.gameData.courseConfig.totalInfoSlides = totalInfoSlides;

        this.initializeWrapper();

        if (typeof myGame !== 'undefined' && myGame.vodafoneMode === true) {
            const qCount = hasQuestions ? (typeof window.mydata !== 'undefined' ? window.mydata.numberOfquestion : 0) : 0;
            this.initializeQuestions(qCount);
            return;
        }

        const waitForLmsAndCheckReset = () => {
            if (this.api === null) {
                setTimeout(waitForLmsAndCheckReset, 500); 
                return;
            }
            if (this.gameData.completion_status === "completed") {
                const qCount = hasQuestions ? (typeof window.mydata !== 'undefined' ? window.mydata.numberOfquestion : 0) : 0;
                this.initializeQuestions(qCount); 
            } else {
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
        setTimeout(waitForLmsAndCheckReset, 1000); 
    },

    initializeQuestions(totalQuestions) {
        const config = this.gameData.courseConfig || {};
        const totalInfoSlides = config.totalInfoSlides || 0;

        this.gameData.questions = {};
        if (typeof totalQuestions === 'number' && totalQuestions > 0) {
            for (let i = 1; i <= totalQuestions; i++) {
                const qId = `interactions${i}`;
                this.gameData.questions[qId] = { id: `question_${i}`, type: "", result: null, learner_response: null, weighting: "1" };
            }
        }

        let initialInfoDetails = {};
        if (totalInfoSlides > 0) {
            for (let i = 1; i <= totalInfoSlides; i++) {
                initialInfoDetails[`info_${i}`] = { id: `info_${i}`, status: "unviewed", timestamp: null };
            }
        }

        this.gameData.studentProgress = { videos: {}, viewedInfoSlides: [], infoDetails: initialInfoDetails };
        
        this.gameData.score = { raw: 0, scaled: 0, min: 0, max: 100 };
        this.gameData.completion_status = "incomplete";
        this.gameData.success_status = "unknown";
        this.gameData.Result = { totalQuestions: totalQuestions || 0, correctAnswers: 0, totalScore: 0, lessonStatus: "incomplete" };

        this.persist(); 
    },

    recordVideoTime(videoIndex, currentTime, totalDuration) {
        if (!this.gameData.courseConfig) return;
        const vidId = `video_${videoIndex}`;
        const progress = this.gameData.studentProgress;

        if (progress.videos[vidId] && progress.videos[vidId].status === "completed") return;

        if (!progress.videos[vidId]) {
            progress.videos[vidId] = { time: 0, duration: totalDuration, percent: 0, status: "incomplete" };
        }

        let percent = 0;
        if (totalDuration > 0) {
            percent = Math.round((currentTime / totalDuration) * 100);
        }

        if (percent > progress.videos[vidId].percent || totalDuration !== progress.videos[vidId].duration) {
            progress.videos[vidId].time = currentTime;
            progress.videos[vidId].duration = totalDuration;
            progress.videos[vidId].percent = percent;
            
            if (percent >= 95) progress.videos[vidId].status = "completed";
            
            this.checkOverallStatus(false);
        }
    },

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

    recordInfoSlide(slideNumber) {
        if (this.api === null) {
            setTimeout(() => this.recordInfoSlide(slideNumber), 500);
            return;
        }
        const totalInfoSlides = this.gameData.courseConfig?.totalInfoSlides || 0;
        
        this.gameData.lastAction = { type: 'info', id: slideNumber };

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

        if (progress.infoDetails[infoId] && progress.infoDetails[infoId].status === "viewed" && !isVodafoneLastSlide) return;

        progress.infoDetails[infoId].status = "viewed";
        progress.infoDetails[infoId].timestamp = new Date().toISOString();

        if (!progress.viewedInfoSlides.includes(slideNumber)) {
            progress.viewedInfoSlides.push(slideNumber);
        }
        this.checkOverallStatus(false); 
    },

    startQuestion(questionId, type) {
        if (!this.gameData.questions[questionId]) return;
        this.currentQuestion = { id: questionId, startTime: new Date() };
        this.gameData.questions[questionId].startTime = ScormUtils.formatTimeOnly(new Date());
    },

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

        this.gameData.questions[qId] = {
            ...this.gameData.questions[qId],
            endTime: ScormUtils.formatTimeOnly(now),
            duration: duration,
            latency: latencyFormatted,
            learner_response: String(learnerResponse || ""),
            correct_responses: String(correctResponsePattern || ""),
            result: isCorrect ? "correct" : "wrong",
            timestamp: now.toISOString(),
            attempts: (this.gameData.questions[qId].attempts || 0) + (isCorrect ? 0 : 1) 
        };

        this.currentQuestion = null;
        this.checkOverallStatus();
    },

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

    checkOverallStatus(updateScore = true) {
        const config = this.gameData.courseConfig || { hasQuestions: true, totalVideos: 0, totalInfoSlides: 0 };
        const progress = this.gameData.studentProgress;
        const passingScore = 50; // 🔒 SCORM 1.2 Strict Rule: درجة النجاح 50%

        let isQuizFullyCompleted = true;
        let isMediaComplete = true;

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

                if (isQuizFullyCompleted) {
                    this.gameData.success_status = quizScorePercentage >= passingScore ? "passed" : "failed";
                } else {
                    this.gameData.success_status = "unknown";
                }
            } else {
                isQuizFullyCompleted = false;
            }
        } 
        // 3. إذا كان الدرس لا يحتوي على أسئلة (يعتمد على مشاهدة الميديا فقط)
        else {
            isQuizFullyCompleted = true;
            
            // تصفير الدرجة الداخلي لأن النشاط مجرد ميديا
            this.gameData.score.raw = 0;
            this.gameData.score.scaled = 0;
            this.gameData.Result.totalQuestions = 0;
            this.gameData.Result.correctAnswers = 0;
            this.gameData.Result.totalScore = 0;

            // 🔥 التعديل هنا: نترك حالة النجاح Unknown دائماً للميديا (بدلاً من passed)
            this.gameData.success_status = "unknown";
        }

        // 4. التقييم الشامل للدرس بأكمله
        if (config.hasQuestions) {
            // 🔒 لو فيه أسئلة: الـ Completion يعتمد على الأسئلة فقط (بغض النظر عن الميديا)
            if (isQuizFullyCompleted) {
                if (this.gameData.success_status === "passed") {
                    this.gameData.completion_status = "completed";
                    this.gameData.Result.lessonStatus = "passed";
                } else {
                    this.gameData.completion_status = "incomplete";
                    this.gameData.Result.lessonStatus = "failed";
                }
            } else {
                this.gameData.completion_status = "incomplete";
                this.gameData.Result.lessonStatus = "incomplete";
            }
        } else {
            // 🔒 لو ميديا بس (بدون أسئلة): الـ Completion يعتمد على الميديا فقط
            if (isMediaComplete) {
                this.gameData.completion_status = "completed";
                this.gameData.Result.lessonStatus = "completed";
            } else {
                this.gameData.completion_status = "incomplete";
                this.gameData.Result.lessonStatus = "incomplete";
            }
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