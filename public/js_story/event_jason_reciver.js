// -----------------------------------------------------------------------------------------
// هذا الملف: event_jason_reciver.js
// الغرض: قراءة البيانات المبدئية عند تشغيل النشاط واستقبال ملفات (JSON) والبيانات المرجعة
// من الـ API لتهيئة الكائنات (Objects) التي سيعتمد عليها النظام لاحقاً في الحسابات.
// -----------------------------------------------------------------------------------------

// قراءة المسار الحالي للصفحة في المتصفح وتخزينه في المتغير urlPathname
urlPathname = window.location.pathname; 

// تنظيف المسار بإزالة كلمة "mymovie.html" للحصول على مسار المجلد الأساسي فقط للنشاط
urlData = urlPathname.replace("mymovie.html" , "");

// ----------------- حساب وقت البداية للنشاط -----------------
var d = new Date, // إنشاء كائن يحمل تاريخ ووقت اللحظة الحالية (لحظة فتح النشاط)
    // استخراج السنة والشهر (نضيف 1 لأن الأشهر تبدأ من 0) واليوم ودمجهم بعلامة '/'
    startTimeId = [d.getFullYear(),
    d.getMonth() + 1,
    d.getDate()].join('/') + ' ' +
        // استخراج الساعات والدقائق والثواني ودمجهم بعلامة ':'
        [d.getHours(),
        d.getMinutes(),
        d.getSeconds()].join(':');

// كائن عام فارغ سيتم استخدامه لتجميع كل البيانات الميتاداتا التي سيتم إرسالها للسيرفر لاحقاً
object = {}; 

/**
 * دالة تهيئة بيانات النشاط (LO Data Object)
 * تُستدعى من ملف `access_api.js` بعد أن يوافق السيرفر على الدخول وتجلب معها البيانات.
 * 
 * @param {string|object} Data - بيانات النشاط المحفوظة مسبقاً (Progress) وتأتي غالباً كنص JSON.
 * @param {string} token - توكن مصادقة الطالب الحالي.
 * @param {string|number} lo_Id - معرف النشاط (Learning Object ID).
 * @param {string} lo_Subject - معرف أو اسم المادة.
 * @param {string|number} lesson_Id - معرف الدرس المفتوح.
 * @param {string|number} activityId - المعرف الخاص بهذه الجلسة في قاعدة البيانات (Activity ID).
 * @param {object} result - كائن كامل يحتوي على تفاصيل أكثر من السيرفر كالأهداف ومستويات بلوم.
 */
function intiateLODataObject(Data, token, lo_Id, lo_Subject, lesson_Id, activityId, result) {
    // طباعة النتيجة الواردة من السيرفر في كونسول اللعبة لغرض التتبع والتطوير
    myGame.log(result);
    
    // إنشاء كائن مؤقت داخلي لمعالجة البيانات المحفوظة (التقدم السابق)
     _data = {};

    // ---------- Parse Data ---------- (تحليل البيانات)
    // التأكد من أن البيانات (Data) ليست فارغة وليست مجرد كلمة "string" عشوائية
    if (Data && Data !== "" && Data !== "string") {
        try {
            // محاولة تحويل البيانات: إذا كانت نصاً (String) نحولها لـ (JSON Object)، وإذا كانت كائناً جاهزاً نستخدمها كما هي
            _data = typeof Data === "string" ? JSON.parse(Data) : Data;
        } catch (e) {
            // إذا فشل التحويل (نص غير صالح كـ JSON) نطبع تحذيراً
            console.warn("Invalid JSON Data");
            // ونجعل المتغير فارغاً لتفادي توقف النظام
            _data = {};
        }
    }

    // ---------- NumberOfAttempt ---------- (تتبع عدد المحاولات)
    // قراءة عدد المحاولات السابقة من البيانات المحفوظة وزيادته بواحد
    if (typeof _data === 'object' && _data !== null && _data.NumberOfAttempt) {
        window.globalNumberOfAttempt = Number(_data.NumberOfAttempt) + 1;
    } else {
        window.globalNumberOfAttempt = 1;
    }
    
    // ---------- Saved CMI ---------- (حفظ الـ CMI القديمة من الـ Insert عشان نقارن بيها)
    if (typeof _data === 'object' && _data !== null && _data.cmi) {
        window.savedCmi = _data.cmi;
        // تهيئة الجلوبال بأعلى سكور محفوظ من آخر مرة
        if (_data.cmi.score && _data.cmi.score.raw !== undefined) {
            window.globalMaxScore = Number(_data.cmi.score.raw);
        }
        // تهيئة حالة الاكتمال والنجاح المحفوظة
        if (_data.cmi.completion_status) {
            window.globalCompletion = _data.cmi.completion_status;
        }
        if (_data.cmi.success_status) {
            window.globalSuccess = _data.cmi.success_status;
        }
    }

    // ---------- Scorm ---------- (تعبئة بيانات SCORM)
    // محاولة جلب بيانات التقدم المعيارية "suspend_data" من الكائن المعالج، إذا لم تتوفر نعطيها قيمة (null)
    object.suspend_data = _data.suspend_data ?? null;

    // ---------- Static ---------- (تعبئة البيانات الثابتة)
    // نقل التوكن (أو null لو كان فارغاً)
    object.token        = token        ?? null;
    // نقل معرف النشاط
    object.lo_Id        = lo_Id        ?? null;
    // نقل معرف المادة
    object.lo_Subject   = lo_Subject   ?? null;
    // نقل معرف الحركة أو الجلسة (Activity)
    object.activityId   = activityId   ?? null;

    // ---------- Dynamic (Result) ---------- (تعبئة البيانات الديناميكية أو الوصفية من السيرفر)
    // استخدام المشغل الاختياري (?.) لتجنب الأخطاء لو كان الكائن result غير موجود
    object.subjectId            = result?.subjectId            ?? null; // رقم المادة
    object.unitId               = result?.unitId               ?? null; // رقم الوحدة
    object.lessonId             = result?.lessonId             ?? null; // رقم الدرس
    object.title                = result?.title                ?? null; // عنوان النشاط
    object.keyWords             = result?.keyWords             ?? null; // الكلمات الدالة
    object.learningObjectives   = result?.learningObjectives   ?? null; // أهداف التعلم
    object.BloomLevels          = result?.bloomLevels          ?? null; // مستويات بلوم (تذكر، فهم..)
    object.type                 = result?.type                 ?? null; // نوع النشاط (فيديو، تفاعلي، إلخ)
    
    // درجة النشاط (افتراضياً نعطيها 10 إذا لم يرسل السيرفر درجة مخصصة)
    object.loDegree              = result?.loDegree              ?? 10;

    //----------------------------------------------------------
    object.lang = null;
    object.feedBackTxt = null;
    object.feedBackDes = null;

} 
    

