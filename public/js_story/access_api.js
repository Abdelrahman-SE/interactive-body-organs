// =========================================================================
// الحارس المبكر جداً (يجب أن يكون في السطر الأول ليسبق ملفات ستوري لاين)
// الغرض منه حل مشكلة التحذيرات الخاصة بـ "passive event listeners" في المتصفح الحديث
// =========================================================================
(function () { // دالة ذاتية الاستدعاء لتنفيذ الكود فور تحميل الملف
    // الاحتفاظ بنسخة من دالة إضافة الأحداث الأصلية الخاصة بالمتصفح
    var originalAddEventListener = EventTarget.prototype.addEventListener;
    // إعادة تعريف دالة إضافة الأحداث لإضافة خصائص معينة للأحداث
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        // التحقق مما إذا كان الحدث يخص اللمس أو تحريك عجلة الماوس
        if (type === 'touchstart' || type === 'touchmove' || type === 'wheel' || type === 'mousewheel') {
            // إجبار المتصفح على اعتبار الحدث غير سلبي (passive: false) صراحة لإسكات التحذير ومنع المشاكل
            if (options === undefined) { // إذا لم يتم تمرير خيارات
                options = { passive: false }; // إنشاء خيار جديد
            } else if (typeof options === 'boolean') { // إذا كانت الخيارات عبارة عن قيمة منطقية
                options = { capture: options, passive: false }; // تحويلها لكائن
            } else if (typeof options === 'object') { // إذا كانت الخيارات كائنًا أصلاً
                options.passive = false; // تعيين الخاصية بداخله
            }
        }
        // استدعاء الدالة الأصلية مع تمرير المعاملات المعدلة
        return originalAddEventListener.call(this, type, listener, options);
    };
})();

 

// Data initialization - تهيئة البيانات الأساسية
var Data = ''; // Placeholder for loaded data - متغير فارغ لحفظ بيانات النشاط لاحقاً
var token = undefined; // Variable to hold the current token - متغير سيحمل توكن المصادقة الخاص بالمستخدم
var succeed = true; // Flag to track the success state of API calls - مؤشر لمعرفة ما إذا كانت طلبات السيرفر ناجحة أم لا
var newUrl = new URL(window.location); // Retrieves the current URL of the window - جلب رابط الصفحة الحالية للمتصفح
var start_Time = new Date().getTime(); // Records the start time for duration calculations - حفظ وقت بدء النشاط بالمللي ثانية لحساب الوقت المستغرق لاحقاً


// قراءة المتغيرات من رابط المتصفح
const params_ = new URLSearchParams(window.location.search); // استخراج العوامل (Parameters) الموجودة في الرابط
var isNext = params_.get('isNext'); // التحقق مما إذا كان هناك نشاط تالي
var platform = params_.get('platform'); // معرفة المنصة التي تعمل عليها اللعبة

//---------------------------------------------------------

class Game { // إنشاء فئة (Class) تمثل اللعبة أو النشاط لإدارة كل الوظائف
    constructor() { // دالة البناء: تعمل عند إنشاء كائن جديد من هذه الفئة
        // Debug token - توكن مصادقة وهمي يستخدم لأغراض الاختبار والتطوير فقط
        this._debug_token = "eyJhbGciOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGRzaWctbW9yZSNobWFjLXNoYTI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkN2IzZmUyOS1kNGJkLTQxM2MtYjc5Ny0wNGIzOTg5MjEzN2QiLCJzZXNzaW9uSWQiOiJjYWU3ZjQzZi1kNjk1LTQ5OTctYmEwMC1kZDk3YjNlNDI3MzAiLCJqdGkiOiJmOTNlZWYzZi1kZmQ5LTQ1NTgtOWE1YS1kNmQ0NzlkMDQ5YjQiLCJuYmYiOjE3MzY0MjAwMjUsImV4cCI6MTczNjQ2MzIyNSwiaXNzIjoiU1RJZGVudGl0eVNlcnZpY2VQcm92aWRlciIsImF1ZCI6IlNUSWRlbnRpdHlDb25zdW1lciJ9.L0CQUYqeBHpiXnXPGMC6L3W1URXCochHeznGKt95vNg";
        this.baseUrl = null; // سيتم تحديد الرابط الأساسي لاحقاً
        this._baseUrl_debug = "https://devgateway.selaheltelmeez.com/"; // Debug mode base URL - رابط السيرفر الخاص ببيئة التطوير (للاختبار)
        this._baseUrl_release = "https://gateway.selaheltelmeez.com/"; // Release mode base URL - رابط السيرفر الخاص ببيئة الإنتاج (الفعلي)
        this.localData = {}; // كائن لحفظ البيانات محلياً
        this.token = null; // متغير لحفظ التوكن
        this.clipId = null; // متغير لحفظ معرف المقطع
        this.subjectId = null; // متغير لحفظ معرف المادة
        this.lessonId = null; // متغير لحفظ معرف الدرس
        this.direction = null; // يحدد اتجاه السيرفر (محلي أم متصل بالسيرفر)
        this.endpoint1 = null; // لحفظ حالة الاتصال بنقطة النهاية (السيرفر)
        this.vodafoneMode = false; // وضع خاص بشبكة فودافون (يرسل البيانات بطريقة محددة)
        this.isNext = null; // النشاط التالي
        this.platform = null; // منصة التشغيل

    }

    // دالة لتفعيل أو تعطيل وضع فودافون المخصص
    vodafone(status) { // تستقبل حالة (صواب أو خطأ)
        this.vodafoneMode = status; // تعيين الوضع بناءً على المدخلات
    }

    // دالة لقراءة المتغيرات من الرابط أو تعيين قيم يدوية
    queryParameter(queryParameter, isDebug) { // تستقبل خيارين: قراءة من الرابط، وهل نحن في وضع الاختبار
        const params = new URLSearchParams(window.location.search); // إنشاء كائن للبحث في الرابط

        if (queryParameter) { // إذا طُلب قراءة البيانات من الرابط
            // تحديد التوكن (استخدام توكن الاختبار لو لم يوجد وكان وضع الاختبار مفعلاً)
            this.token = isDebug ? params.get('token') || this._debug_token : params.get('token');
            // تحديد رابط السيرفر (بيئة تطوير أم بيئة حقيقية)
            this.baseUrl = isDebug ? this._baseUrl_debug : this._baseUrl_release;
            this.clipId = params.get('clipId'); // جلب معرف المقطع
            this.subjectId = params.get('subjectId'); // جلب معرف المادة
            this.lessonId = params.get('lessonId'); // جلب معرف الدرس
            this.direction = params.get('direction'); // جلب الاتجاه (إذا كان 2 يعني متصل بسيرفر المنصة)
            this.isNext = params.get('isNext'); // جلب التالي
            this.platform = params.get('platform'); // جلب المنصة
            myGame.log(this.baseUrl); // طباعة مسار السيرفر المستخدم للتأكد منه
        } else { // في حالة عدم القراءة من الرابط (Hardcoded Values) لتسهيل الاختبار اليدوي
            // دالة فرعية لتعيين القيم يدوياً
            const setData = (token, clipId, subjectId, lessonId, direction, isDebug) => {
                this.token = isDebug ? this._debug_token : token; // تحديد التوكن
                this.clipId = clipId; // تحديد المقطع
                this.subjectId = subjectId; // تحديد المادة
                this.lessonId = lessonId; // تحديد الدرس
                this.direction = direction; // تحديد الاتجاه
                this.baseUrl = isDebug ? this._baseUrl_debug : this._baseUrl_release; // تحديد السيرفر
            };

            // استدعاء الدالة الفرعية بقيم ثابتة بغرض التجربة
            setData(1, 34884, "Ara_5R_1A", 8996, 2, isDebug);
        }
    }


    // دالة لمحاكاة جلب بيانات النشاط محلياً (بدون سيرفر) للتجربة السريعة
    fetchLocalData(LocalData) {
        if (LocalData) { // إذا كان الخيار مفعلاً
            const result = { // كائن بيانات وهمي يشبه ما يرجع من السيرفر
                activityId: 1, // رقم النشاط
                metadata: 0, // البيانات الوصفية
                learningObjectAsJson: '{"name":"Player1"}', // بيانات اللعبة كـ JSON
            };
            // التأكد من أن الكائن يحتوي على الحقول الأساسية
            if (typeof result.activityId != undefined && typeof result.metadata != undefined && typeof result.learningObjectAsJson != undefined) {
                // التأكد من توفر بيانات المصادقة للمستخدم
                if (this.token && this.clipId && this.subjectId && this.lessonId) {
                    myGame.log("Opening LO"); // طباعة أن النشاط سيُفتح
                    const Data = result.learningObjectAsJson || ''; // سحب بيانات اللعبة
                    // استدعاء دالة التهيئة (موجودة في سياق خارجي) لتمرير البيانات وبدء اللعبة
                    intiateLODataObject(Data, this.token, this.clipId, this.subjectId, this.lessonId, result.activityId, result);
                    init(); // استدعاء دالة بدء العرض الخاصة بالملف أو اللعبة
                } else {
                    myGame.log("Access denied from fetchLocalData"); // رفض الدخول إن لم تكتمل البيانات
                }
            }
        }
    }

    // دالة تمثل مسار العمل (Workflow) وهي العقل المدبر لقرار فتح النشاط
    loWorkFlow(endpoint) { // تستقبل حالة توفر الـ Endpoint (السيرفر)
        this.endpoint1 = endpoint; // حفظ الحالة لاستخدامها لاحقاً
        if (this.direction == 2 && endpoint) { // إذا كان اتجاه 2 (يتطلب سيرفر) والـ Endpoint مفعل
            // طلب إنشاء وبدء النشاط من الخادم عبر ملف submit_sender.js
            finalResponse.intalizeLOActivity(this.token, this.clipId, this.subjectId, this.lessonId);
        }

    }

    // دالة لتشغيل اللعبة فوراً بعد تهيئتها بنجاح
    testOpen(result) { // تستقبل نتيجة بدء النشاط من السيرفر
        myGame.log(result); // طباعة النتيجة
        if (this.direction == 2) { // التحقق من الاتجاه
            if (succeed) { // إذا كانت حالة السيرفر ناجحة
                // التأكد من سلامة الحقول المرجعة
                if (typeof result.activityId != undefined && typeof result.metadata != undefined && typeof result.learningObjectAsJson != undefined) {
                    // التأكد من بيانات الطالب
                    if (this.token && this.clipId && this.subjectId && this.lessonId) {
                        myGame.log("Opening LO"); // السماح بالفتح
                        const Data = result.learningObjectAsJson || ''; // تعيين بيانات اللعبة
                        // تجهيز النشاط وتشغيله
                        intiateLODataObject(Data, this.token, this.clipId, this.subjectId, this.lessonId, result.activityId, result);
                        init();

                    }
                }
            } else { // في حالة الفشل
                myGame.log("Access denied from direction 2 "); // رفض
            }
        }
    }

    // دالة للتحقق من أن النطاق (Domain) الذي يفتح اللعبة مصرح به لحماية اللعبة من السرقة
    domainList(checkList) { // تستقبل حالة الموافقة على فحص النطاقات
        if (checkList) { // إذا كان خيار فحص النطاقات مفعل
            var domainList = [ // مصفوفة بأسماء النطاقات المصرح بها
                '127.0.0.1:5500', // السيرفر المحلي
                'development.libertyeducationuk.com', // سيرفر شركة أخرى
                'stblobstrgeaccount.blob.core.windows.net', // سيرفر التخزين السحابي
                'app.cloud.scorm.com', // منصات سكرم क्लाउड
                'cloud.scorm.com'
            ];
            // إذا كان النطاق الحالي للنافذة موجود داخل المصفوفة
            if (domainList.includes(window.location.host)) {
                myGame.log("Opening LO"); // يُسمح بفتح اللعبة
                intiateLODataObject(Data);
                //init();
            }
        } else { // في حالة عدم التفعيل
            myGame.log("Access denied from domainList");
        }
    }

    // دالة لإعداد رسائل الكونسول (Console logs) بشكل مخصص يسهل تتبع الأخطاء
    initializeConsole(consoleMode) { // تستقبل خيار طباعة اللوجات
        this.log = function (message) { // إنشاء دالة تسجيل (log) خاصة باللعبة
            if (consoleMode) { // إذا كان الوضع مفعل
                console.log(message); // اطبع الرسالة
                const stackTrace = new Error().stack.split('\n'); // إنشاء خطأ وهمي فقط لاستخراج مسار الملف ورقم السطر
                console.log(stackTrace[2]); // طباعة السطر الذي حدث فيه الاستدعاء بدقة لسهولة الوصول إليه
            }
        };

        this.error = function (message) { // إنشاء دالة خطأ (error)
            if (consoleMode) { // إذا كان الوضع مفعل
                const stackTrace = new Error().stack.split('\n'); // نفس الآلية لاستخراج السطر
                console.log(stackTrace[2]);
                console.error(message); // طباعتها كرسالة خطأ باللون الأحمر
            }
        };
    }

    // دالة لإعداد وتمرير رسائل الاتصال (PostMessage) للإطار الأب (Parent iframe)
    initializepostMessage(postMessageMode) { // تستقبل خيار إرسال الرسائل
        this.postMessage = function (message, targetOrigin = '*') { // إنشاء الدالة للرسائل
            if (postMessageMode) { // إذا كان التفعيل صحيح
                window.parent.postMessage(message, targetOrigin); // إرسال الرسالة للنافذة الأب (الموقع المحتضن للنشاط)
            }
        };
    }

    // 1. الدالة الجديدة (نضعها قبل دالة start مباشرة) لتنظيف البيئة من إزعاج المتصفح
    cleanBrowserEnvironment() {
        const origErr = console.error; // حفظ دالة الكونسول خطأ الأصلية
        // استبدال دوال الكونسول بدوال صامتة ماعدا للخطأ، نقوم بفلترته
        Object.assign(console, {
            warn: () => { }, info: () => { }, debug: () => { }, // صمت تام
            // تمرير الخطأ إذا لم يكن يتعلق بـ 'aria-hidden' (وهو خطأ مزعج في ستوري لاين) وإلا إخفاؤه
            error: (...args) => (typeof args[0] === 'string' && args[0].includes('aria-hidden')) ? null : origErr.apply(console, args)
        });

        // دالة تنظف خاصية aria-hidden المسببة للأخطاء عند النقر على العناصر
        const cleanAriaHidden = (e) => {
            let el = e.target; // العنصر المضغوط
            while (el && el !== document) { // التدرج لأعلى الشجرة حتى نصل لنهاية المستند
                if (el.getAttribute('aria-hidden') === 'true') el.removeAttribute('aria-hidden'); // حذف الخاصية إن وجدت
                el = el.parentNode; // الانتقال للأب
            }
        };
        // إضافة حدث مراقبة للضغط لتنظيف العناصر قبل أن تصدر خطأ
        ['focusin', 'mousedown'].forEach(event => document.addEventListener(event, cleanAriaHidden, true));

        // تعديل ميتا تاج خاص بمتصفحات الموبايل لمنع بعض الأخطاء التقنية
        const meta = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
        if (meta) meta.name = "mobile-web-app-capable";
    }

    // الدالة الرئيسية (Start) التي تبدأ تشغيل دورة حياة النشاط بأكملها
    start() {
        // تشغيل دالة التنظيف أولاً لمنع الأخطاء الوهمية
        this.cleanBrowserEnvironment();
        this.initializeConsole(false) // تعطيل رسائل الكونسول في النسخة النهائية
        this.initializepostMessage(false) // تعطيل إرسال رسائل النافذة الأب في هذه المرحلة المبدئية
        this.queryParameter(true, true); // قراءة المعاملات من الرابط ووضع الديباج مفعل
        this.domainList(true); // تفعيل حماية النطاقات
        this.fetchLocalData(false); // تعطيل الـ LocalData
        this.loWorkFlow(false); // تعطيل نقطة النهاية (Endpoint) - لا نريد إرسال بيانات للسيرفر
        this.vodafone(false); // تعطيل وضع فودافون افتراضياً

        // تهيئة ملف SCORM الوهمي/الحقيقي
        window.gameSCORM = new GameSCORMWrapper(); // إنشاء غلاف إدارة SCORM
        window.gameSCORM.initializeWrapper(true); // تفعيله (false = تجاهل SCORM)

    }
}

const myGame = new Game(); // إنشاء الكائن الفعلي للعبة

// بعد اكتمال تحميل عناصر صفحة الويب
document.addEventListener('DOMContentLoaded', function () {
    // Your code here
    myGame.start(); // قم ببدء اللعبة واستدعاء دالة التشغيل

});