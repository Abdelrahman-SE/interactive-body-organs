// -----------------------------------------------------------------------------------------
// هذا الملف: event_message_reciver.js
// الغرض: الاستماع إلى رسائل البث (Messages) المتبادلة بين الإطار المحتضن (IFrame)
// وبين النافذة الأب (الموقع الرئيسي)، واستلام الأوامر بناءً عليها للتحكم في اللعبة
// مثل كتم/تشغيل الصوت عند إخفاء المتصفح وتحديد نقطة بداية معينة للنشاط.
// -----------------------------------------------------------------------------------------

/**
 * دالة مساعدة لربط الأحداث بالعناصر بشكل متوافق مع كافة المتصفحات (القديمة والحديثة)
 * @param {Object} element - العنصر المراد ربط الحدث به (مثل window)
 * @param {String} eventName - اسم الحدث (مثل 'message')
 * @param {Function} eventHandler - الدالة التي ستتنفذ عند وقوع الحدث
 */
function bindEvent(element, eventName, eventHandler) {
    // التحقق مما إذا كان المتصفح يدعم الطريقة الحديثة `addEventListener` (Chrome, Firefox, Safari)
    if (element.addEventListener) {
        // إضافة مستمع للحدث بالشكل القياسي، وfalse تعني (Bubbling) وليس (Capturing)
        element.addEventListener(eventName, eventHandler, false);
    } 
    // إذا لم يدعم الحديثة، التحقق من الطريقة القديمة `attachEvent` (مخصصة لمتصفحات Internet Explorer القديمة 8 وما قبلها)
    else if (element.attachEvent) {
        // ربط الحدث بإضافة كلمة 'on' قبل اسمه (مثل onmessage)
        element.attachEvent('on' + eventName, eventHandler);
    }
}


// دالة ذاتية الاستدعاء (IIFE) لتغليف الكود ومنع المتغيرات من التداخل مع الملفات الأخرى
(function () {

    // هنا الكود الذي ينفذ عند تهيئة الصفحة
    // في هذه اللحظة يكون كائن הـ DOM (محتويات الصفحة) متاحاً
    
    // ربط حدث استلام الرسائل (message) بالنافذة الحالية (window)
    bindEvent(window, 'message', function (e) {
        
        // فحص محتوى الرسالة الواردة، لو كانت الرسالة تحتوي على حدث اسمه "foreground" 
        // (بمعنى أن الطالب عاد إلى نافذة المتصفح التي تحتوي اللعبة بعد أن كان يتصفح نافذة أخرى)
        if (e.data.event_name == "foreground") {
            console.log("foreground"); // طباعة الحدث في الكونسول للتأكد
            
            // handel play sound at pure javascript only (For Ahmed fares LOs)
            // معالجة تشغيل الصوت في الأنشطة المصممة بالجافاسكربت النقي (Pure JS)
            // إذا كان كائن `exportRoot` (وهو الكائن الخاص ببرنامج Adobe Animate) غير موجود أو فارغاً
            if (exportRoot === undefined || exportRoot === null) {
                this.play(); // استدعاء دالة التشغيل الافتراضية
                return; // إنهاء التنفيذ هنا
            }
            
            // handel play sound at edge animate only (For all others LOs)
            // معالجة استئناف العرض والصوت للأنشطة المبنية ببرنامج Adobe Animate
            // تفعيل (tickOnUpdate) في مسرح العمل (Stage) لجعل الأنيميشن يستكمل التحديث
            exportRoot.getStage().tickOnUpdate = true;
            
            // إعادة حجم الصوت لـ 1 (أعلى مستوى) من خلال مكتبة CreateJS الصوتية
            createjs.Sound.volume = 1;
        }
        
        // فحص إذا كانت الرسالة الواردة تطلب تحديد نقطة بداية جديدة للعبة (setStartPoint)
        if (e.data.event_name === 'setStartPoint') {
            console.log(e.data.data); // طباعة البيانات الواردة مع الرسالة
            console.log(e.data.data.p1); // طباعة المتغير p1 (نقطة البداية المطلوبة)
            
            // التأكد من أن هناك دالة معرفة مسبقاً في اللعبة باسم `setStartPoint` لاستقبال الطلب
            if (typeof startPoint !== 'undefined') {
                console.log('undefined'); // طباعة غريبة لأنها تعني أنه غير معرّف، ولكن ربما كُتبت بغرض التأكد!
                
                // تأخير تنفيذ الدالة لمدة 3 ثواني (3000 ملي ثانية) لضمان اكتمال تحميل اللعبة 
                // ومن ثم تمرير قيمة p1 كمتغير لتحديد النقطة التي ستبدأ منها اللعبة
                setTimeout(function () { setStartPoint(e.data.data.p1); }, 3000);
            }
        }
        
        
    });
})();
