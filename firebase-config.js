/* ========================================
   Firebase Config — ONE FILE for all devices
   এই ফাইলে Key বসিয়ে GitHub-এ আপলোড করুন।
   মোবাইল/কম্পিউটার দুই জায়গায় অটো Cloud চালু হবে।
   ======================================== */

window.FIREBASE_CONFIG = {
    enabled: true,   // true = cloud on for every visitor of this site
    autoPull: true,

    // Firebase Console → Project settings → Your apps → Config থেকে কপি করুন:
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};
