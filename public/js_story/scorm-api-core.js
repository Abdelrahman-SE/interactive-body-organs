/**
 * @file scorm-api-core.js
 * @description يمثل هذا الملف النواة (Core) الخاصة بالاتصال بمنصة إدارة التعلم (LMS).
 * يحتوي على جميع الدوال المسؤولة عن البحث عن الواجهة، إرسال الدرجات، حفظ واسترجاع البيانات.
 * يتم دمج هذه الدوال مع الكلاس الأساسي باستخدام Object.assign
 */

Object.assign(window.GameSCORMWrapper.prototype, {
    /**
     * @function initializeWrapper
     * @description دالة تهيئة نظام SCORM وتبدأ عملية البحث المستمر عن الـ API
     * @param {boolean} enableSCORM - إذا كانت false سيتم استخدام نظام وهمي أوفلاين
     */
    async initializeWrapper(enableSCORM = true) {
        if (!enableSCORM) {
            this.setupFallbackAPI();
            return;
        }
        let attempts = 0;
        const maxAttempts = 30; // الحد الأقصى لمحاولات البحث

        // دالة فرعية للبحث وإيقاف العداد
        const findActiveAPI = () => {
            let api = this.findSCORMAPI();
            // دعم خاص لمنصة SCORM Cloud
            if (!api && window.opener && window.opener.parent && window.opener.parent.API) {
                api = window.opener.parent.API;
            }
            if (api) {
                this.api = api;
                this.isLMS = true;
                console.log("✅ [SCORM] Connected to Active Session");
                return true;
            }
            return false;
        };

        // محاولة البحث كل 250 مللي ثانية (لتفادي تأخر المنصة في التحميل)
        const retry = setInterval(() => {
            attempts++;
            if (findActiveAPI() || attempts >= maxAttempts) {
                clearInterval(retry);
                if (this.api) {
                    setTimeout(() => {
                        // Call LMSInitialize before any GetValue/SetValue calls
                        if (typeof this.api.LMSInitialize === "function") this.api.LMSInitialize("");
                        else if (typeof this.api.Initialize === "function") this.api.Initialize("");
                        
                        this.loadGameData(); // جلب البيانات القديمة إذا وُجدت
                        this.applySCORMInitRule(); // تطبيق قاعدة بدء الدرس
                        
                        // تطبيق قاعدة الإغلاق الآمن للجلسة (Session Management)
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
                }
            }
        }, 250);
    },

    /**
     * @function findSCORMAPI
     * @description يبحث في جميع نوافذ المتصفح المحتملة لإيجاد كائن الـ API القياسي
     * @returns {object|null} كائن الـ API أو null
     */
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

    /**
     * @function setupFallbackAPI
     * @description يبني كائناً وهمياً (Mock API) لتعمل اللعبة بدون أخطاء إذا فُتحت محلياً (بدون منصة)
     */
    setupFallbackAPI() {
        this.api = {
            GetValue: (n) => (n === "cmi.suspend_data") ? localStorage.getItem("game_scorm_data") || "" : "",
            SetValue: () => "true", Commit: () => "true", LMSSetValue: () => "true", LMSCommit: () => "true", LMSGetValue: () => "", LMSFinish: () => "true", Terminate: () => "true",
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
     * @description تطبيق قاعدة التهيئة: تعيين الحالة إلى incomplete إذا لم يختبر الطالب بعد، دون الكتابة فوق passed أو failed
     */
    applySCORMInitRule() {
        if (!this.api || !this.isLMS) return;
        const currentStatus = this.callGetValue("cmi.core.lesson_status");
        if (!currentStatus || currentStatus === "not attempted" || currentStatus === "unknown") {
            this.callSetValue("cmi.core.lesson_status", "incomplete");
            this.callCommit();
        }
    },

    /**
     * @function callSetValue
     * @description دالة مساعدة وآمنة لتسجيل أي قيمة في المنصة 
     * @param {string} name - اسم المتغير في السكرم (مثل cmi.core.score.raw)
     * @param {any} value - القيمة المراد إرسالها
     */
    callSetValue(name, value) {
        if (!this.api) return "false";
        const strValue = String(value);
        if (typeof this.api.LMSSetValue === "function") return this.api.LMSSetValue(name, strValue);
        if (typeof this.api.SetValue === "function") return this.api.SetValue(name, strValue);
        return "false";
    },

    /**
     * @function callCommit
     * @description أمر للمنصة بحفظ التغييرات النهائية في قاعدة البيانات (لتجنب ضياعها)
     */
    callCommit() {
        if (!this.api) return "false";
        if (typeof this.api.LMSCommit === "function") return this.api.LMSCommit("");
        if (typeof this.api.Commit === "function") return this.api.Commit("");
        return "false";
    },

    /**
     * @function syncInteractionsToLMS
     * @description يزامن إجابات الطالب الفردية لكل سؤال (التي أجابها وما هي الإجابة الصحيحة) مع نظام الـ LMS
     */
    syncInteractionsToLMS() {
        Object.keys(this.gameData.questions).forEach((qKey, index) => {
            const qData = this.gameData.questions[qKey];
            const prefix = `cmi.interactions.${index}.`;
            this.callSetValue(prefix + "id", qKey);
            this.callSetValue(prefix + "type", "choice");
            if (qData.learner_response) this.callSetValue(prefix + "learner_response", qData.learner_response);
            if (qData.result) this.callSetValue(prefix + "result", qData.result === "wrong" ? "incorrect" : qData.result);
        });
    },

    /**
     * @function persist
     * @description الدالة الأهم: تقوم بجمع الدرجات، حالة النجاح، والبيانات وتغليفها لإرسالها وحفظها في الـ LMS
     */
    persist() {
        if (!this.api || !this.isLMS) return;
        
        // إزالة الميتاداتا لتخفيف حجم البيانات
        const cleanData = JSON.parse(JSON.stringify(this.gameData));
        delete cleanData.metadata;
        const dataString = JSON.stringify(cleanData);
        
        try {
            // حفظ الداتا المشفرة
            this.callSetValue("cmi.suspend_data", dataString);
            
            // حفظ الدرجات (Anti-Downgrade Score Protection)
            const rawScoreNum = Number(this.gameData.score.raw || 0);
            const highestScoreNum = Number(this.gameData.highestScore || 0);
            const trueMaxScore = Math.max(rawScoreNum, highestScoreNum);
            
            const existingScoreStr = this.callGetValue("cmi.core.score.raw");
            const existingScoreNum = existingScoreStr ? Number(existingScoreStr) : -1;
            
            // Only update LMS if our known true max is greater than what LMS reports
            if (trueMaxScore > existingScoreNum && trueMaxScore >= 0) {
                const rawScore = String(trueMaxScore);
                const scaledScore = String(trueMaxScore / 100);
                this.callSetValue("cmi.core.score.raw", rawScore);
                this.callSetValue("cmi.score.scaled", scaledScore);
                this.gameData.highestScore = trueMaxScore;
            }
            this.callSetValue("cmi.core.score.max", "100");
            this.callSetValue("cmi.core.score.min", "0");
            
            // حفظ حالة النجاح والاكتمال (Status Protection - Anti-Downgrade)
            let currentSessionStatus = "incomplete";
            if (this.gameData.success_status === "failed") {
                currentSessionStatus = "failed";
            } else if (this.gameData.completion_status === "completed") {
                currentSessionStatus = this.gameData.success_status === "passed" ? "passed" : "completed";
            }
            
            let savedHighestStatus = this.gameData.highestStatus || "incomplete";
            let bestKnownStatus = "incomplete";
            if (savedHighestStatus === "passed" || currentSessionStatus === "passed") bestKnownStatus = "passed";
            else if (savedHighestStatus === "failed" || currentSessionStatus === "failed") bestKnownStatus = "failed";

            const existingStatus = this.callGetValue("cmi.core.lesson_status");
            let finalStatus = bestKnownStatus;
            
            if (existingStatus === "passed") {
                finalStatus = "passed";
            }
            
            this.callSetValue("cmi.core.lesson_status", finalStatus);
            
            // Also explicitly send SCORM 2004 keys if LMS supports them
            this.callSetValue("cmi.completion_status", this.gameData.completion_status);
            this.callSetValue("cmi.success_status", this.gameData.success_status);
            
            this.callSetValue("cmi.core.exit", "suspend");
            this.callSetValue("cmi.core.session_time", this.gameData.total_time || "00:00:00");
            
            // مزامنة الأسئلة وإتمام الحفظ
            this.syncInteractionsToLMS();
            this.callCommit(); // Session Management Rule: Commit immediately after update
            
            const allQuestions = Object.values(this.gameData.questions || {});
            const totalQuestions = this.gameData.Result?.totalQuestions || 0;
            const answeredCount = allQuestions.filter(q => q.result !== null).length;
            
            if (totalQuestions > 0 && answeredCount >= totalQuestions) {
                console.log(`Score: ${trueMaxScore}% | Completion: ${this.gameData.completion_status} | Success: ${this.gameData.success_status}`);
            }
        } catch (e) { console.error(e); }
    },

    /**
     * @function preparePayloadForEndpoint
     * @description يجهز حزمة البيانات بصيغة JSON بدون الميتاداتا لإرسالها لسيرفرات مخصصة
     */
    preparePayloadForEndpoint() {
        const cleanData = { ...this.gameData };
        delete cleanData.metadata;
        return JSON.stringify(cleanData);
    },

    /**
     * @function submitToEndpoint
     * @description إرسال التقارير لسيرفر مخصص (مثل وضع شبكة Vodafone) باستخدام مؤقت لمنع التكرار (Debounce)
     */
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

    /**
     * @function loadGameData
     * @description تقوم هذه الدالة باسترجاع البيانات المحفوظة (Resume Data) من سيرفر الـ LMS.
     * هذا يسمح للطالب بإغلاق المتصفح والعودة لاحقاً لإكمال تقدمه (الأسئلة، الفيديوهات) من حيث توقف.
     * @param {object} lo - الكائن الوصفي (Learning Object) الذي يحتوي على بيانات النشاط
     * @param {number} attempt - رقم المحاولة الحالية لجلب البيانات (الدالة تحاول 5 مرات متتالية)
     */
    loadGameData(lo, attempt = 1) {
        let data = ""; // المتغير الذي سيحفظ البيانات المسترجعة (تكون مشفرة كنص داخل cmi.suspend_data)

        // 1. محاولة القراءة الأولى عبر الـ API القياسي للـ SCORM
        if (this.api) {
            try {
                // السكرم 1.2 يستخدم LMSGetValue بينما الإصدارات الأحدث قد تستخدم GetValue
                if (typeof this.api.LMSGetValue === 'function') data = this.api.LMSGetValue("cmi.suspend_data");
                else if (typeof this.api.GetValue === 'function') data = this.api.GetValue("cmi.suspend_data");
            } catch (e) { } // في حالة الخطأ يتم المتابعة بسلاسة
        }

        // 2. محاولة القراءة الثانية (البديلة): لبعض بيئات Iframe الصارمة التي تمنع الوصول المباشر
        if ((!data || data === "") && window.opener?.parent?.API) {
            try { data = window.opener.parent.API.LMSGetValue("cmi.suspend_data"); } catch (e) { }
        }
        
        // 3. نظام إعادة المحاولة (Retry Mechanism):
        // في بعض السيرفرات البطيئة، قد لا تكون البيانات جاهزة فوراً.
        // لذلك، إذا لم نجد بيانات، ننتظر ثانية ونعيد المحاولة (حتى 5 مرات كحد أقصى).
        if ((!data || data === "") && attempt < 5) {
            setTimeout(() => { this.loadGameData(lo, attempt + 1); }, 1000);
            return; // توقف هنا، وسيتم استدعاء الدالة من جديد بواسطة الـ setTimeout
        }
        
        // 4. معالجة البيانات: إذا تم استرجاع البيانات بنجاح (سواء في المحاولة الأولى أو الأخيرة)
        if (data && data !== "") {
            try {
                // تحويل البيانات من نص (String) إلى كائن برمجي (Object) ليتم استخدامه في اللعبة
                this.gameData = JSON.parse(data);
                
                // 5. المراجعة الأمنية للهيكلة (Fallback & Integrity Check):
                // تأمين المتغيرات والتأكد من عدم ضياع أي أجزاء مهمة من الكائن المحفوظ.
                // إذا كان هناك أي جزء مفقود، نقوم بإنشائه فارغاً لمنع توقف اللعبة (Crash).
                if (!this.gameData.studentProgress) {
                    this.gameData.studentProgress = { videos: {}, viewedInfoSlides: [], infoDetails: {} };
                }
                if (!this.gameData.studentProgress.infoDetails) {
                    this.gameData.studentProgress.infoDetails = {};
                }
                if (!this.gameData.courseConfig) {
                    this.gameData.courseConfig = { hasQuestions: true, totalVideos: 0, totalInfoSlides: 0, passingScore: 51 };
                }
            } catch (jsonErr) { 
                // يتم تجاهل الخطأ في حالة فشل التحويل (مثلاً إذا كانت البيانات تالفة)
            }
        }

        // 6. حفظ البيانات الوصفية الخاصة بالنشاط
        this.loData = lo;
    },

    /**
     * @function setMetadataFromLO
     * @description هذه الدالة تُستخدم بشكل أساسي عند ربط النشاط (اللعبة) مع نظام أو سيرفر داخلي (مثل منصة فودافون).
     * وظيفتها استقبال بيانات النشاط (Learning Object) ونسخ الخصائص المهمة منها (مثل اسم الدرس، رقم الوحدة، الخ)
     * لتخزينها داخل الـ Metadata الخاص باللعبة. كما تقوم بتهيئة حالة اللعبة إذا كانت مكتملة مسبقاً.
     * @param {object} lo - كائن التعلم (Learning Object) القادم من السيرفر.
     */
    setMetadataFromLO(lo) {
        // 1. حماية الدالة من المدخلات الخاطئة
        if (!lo || typeof lo !== 'object') {
            console.warn("[setMetadataFromLO] الكائن الممرر (lo) غير صالح أو فارغ");
            return;
        }

        // 2. تحديث البيانات الوصفية (Metadata):
        // نستخرج الخصائص من كائن الـ lo، وإذا لم تكن موجودة نحتفظ بالقيمة القديمة الموجودة في اللعبة.
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
            // 3. تحليل بيانات الـ JSON المعقدة المرفقة داخل كائن الـ lo
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

            // 4. استخراج تقدم الطالب السابق (إن وُجد)
            if (parsedLO.suspend_data) {
                // التأكد مما إذا كانت البيانات سلسلة نصية أم كائن جاهز
                const incomingData = typeof parsedLO.suspend_data === 'string'
                    ? JSON.parse(parsedLO.suspend_data) : parsedLO.suspend_data;

                // 5. هندسة الإعادة (Reset Logic):
                // إذا وجدنا أن السيرفر أرسل بيانات تشير إلى أن الطالب قد أنهى اللعبة (completed) بنجاح مسبقاً،
                // نقوم بمسح هذا التقدم وتصفير اللعبة حتى يتمكن من إعادتها ولعبها من جديد.
                if (incomingData.completion_status === "completed") {
                    console.log("🔄 السيرفر أرسل بيانات قديمة (مكتملة).. جاري مسحها محلياً للبدء من الصفر!");
                    
                    let prevHighestScore = incomingData.highestScore || (incomingData.score ? Number(incomingData.score.raw) : 0);
                    let prevHighestStatus = incomingData.highestStatus || "incomplete";
                    if (incomingData.success_status === "passed") prevHighestStatus = "passed";
                    else if (incomingData.success_status === "failed" && prevHighestStatus !== "passed") prevHighestStatus = "failed";

                    // الاحتفاظ بإعدادات الكورس الأساسية فقط (مثل عدد الأسئلة والشرائح)
                    const config = incomingData.courseConfig || this.gameData.courseConfig || { totalInfoSlides: 0 };
                    this.gameData.courseConfig = config;
                    
                    // تصفير الشرائح المعلوماتية وتحديد حالتها بـ unviewed (غير مقروءة)
                    let initialInfoDetails = {};
                    const totalSlides = config.totalInfoSlides || 0;
                    for (let i = 1; i <= totalSlides; i++) {
                        initialInfoDetails[`info_${i}`] = { id: `info_${i}`, status: "unviewed", timestamp: null };
                    }
                    this.gameData.studentProgress = { videos: {}, viewedInfoSlides: [], infoDetails: initialInfoDetails };
                    
                    // تصفير سجل الأسئلة والمحاولات
                    this.gameData.questions = {};
                    const totalQ = incomingData.Result?.totalQuestions || 0;
                    if (totalQ > 0) {
                        for (let i = 1; i <= totalQ; i++) {
                            const qId = `interactions${i}`;
                            this.gameData.questions[qId] = { id: `question_${i}`, type: "", result: null, learner_response: null, weighting: "1" };
                        }
                    }
                    
                    // تصفير الدرجات وحالة النجاح مع حفظ أعلى إنجاز
                    this.gameData.score = { raw: 0, scaled: 0, min: 0, max: 100 };
                    this.gameData.completion_status = "incomplete";
                    this.gameData.success_status = "unknown";
                    this.gameData.highestScore = prevHighestScore;
                    this.gameData.highestStatus = prevHighestStatus;
                    this.gameData.Result = { totalQuestions: totalQ, correctAnswers: 0, totalScore: 0, lessonStatus: "incomplete" };
                
                } else {
                    // 6. استكمال التقدم (Resume Logic):
                    // إذا لم يكن الكورس مكتملاً، نستبدل الذاكرة الحالية ببيانات السيرفر ليتمكن الطالب من إكمال ما بدأه.
                    const oldProgress = this.gameData.studentProgress;
                    const oldConfig = this.gameData.courseConfig;
                    this.gameData = incomingData;
                    
                    // ضمان عدم ضياع التكوينات القديمة في حال كان السيرفر ينقصه بعضها
                    if (!this.gameData.studentProgress && oldProgress) this.gameData.studentProgress = oldProgress;
                    if (!this.gameData.courseConfig && oldConfig) this.gameData.courseConfig = oldConfig;
                }
            }
            
            // 7. ربط وتأكيد الميتاداتا
            this.gameData.metadata = md;
            if (this.api) this.api.debug_gameData = this.gameData; // مفيدة للمطورين لفحص البيانات (Debugging)
        } catch (parseErr) { 
            // تجاهل أخطاء تحليل الـ JSON إن وجدت
        }
        
        // 8. حفظ كل هذه الإعدادات رسمياً في الـ LMS
        this.persist();
    }
});
