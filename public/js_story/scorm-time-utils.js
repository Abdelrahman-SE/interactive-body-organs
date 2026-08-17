/**
 * @file scorm-time-utils.js
 * @description يحتوي على الدوال المساعدة المستقلة (Pure Functions) الخاصة بحساب وتنسيق الوقت.
 * تم عزل هذه الدوال هنا لأنها لا تعتمد على متغيرات اللعبة الداخلية ويمكن إعادة استخدامها بحرية.
 */

window.ScormUtils = {
    /**
     * @function formatTimeOnly
     * @description يقوم بتحويل كائن التاريخ (Date) إلى نص مقروء بصيغة (HH:MM:SS)
     * @param {Date} date - كائن التاريخ الحالي
     * @returns {string} النص المنسق مثل "14:05:09"
     */
    formatTimeOnly: function(date) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    },

    /**
     * @function formatDuration
     * @description يحسب المدة الزمنية المستغرقة بين نقطة بداية ونقطة نهاية ويعيدها بصيغة (HH:MM:SS)
     * @param {number} start - وقت البداية بالمللي ثانية (Timestamp)
     * @param {number} end - وقت النهاية بالمللي ثانية
     * @returns {string} المدة المستغرقة
     */
    formatDuration: function(start, end) {
        const diffMs = end - start;
        if (diffMs < 0) return "00:00";
        const totalSec = Math.floor(diffMs / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    /**
     * @function formatScormLatency
     * @description ينسق وقت التفكير في السؤال (Latency) ليتوافق تماماً مع المعيار الرقمي الذي يقبله نظام SCORM
     * @param {number} ms - المدة بالمللي ثانية
     * @returns {string} الوقت بصيغة "00:00:00"
     */
    formatScormLatency: function(ms) {
        if (!ms || ms < 0) return "00:00:00";
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    /**
     * @function calculateTotalTime
     * @description يحسب الوقت الإجمالي الذي قضاه الطالب في الكورس منذ بداية فتحه للصفحة
     * @returns {string} الوقت الإجمالي بتنسيق SCORM
     */
    calculateTotalTime: function() {
        if (typeof start_Time !== 'undefined') {
            const now = new Date().getTime();
            const diffMs = now - start_Time;
            return ScormUtils.formatScormLatency(diffMs);
        }
        return "00:00:00";
    }
};
