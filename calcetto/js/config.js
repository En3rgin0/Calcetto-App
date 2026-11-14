/* Configurazione: Firebase, informativa privacy, link Ko-fi.
   Con FIREBASE_CONFIG = null l'app gira in modalità demo, con i dati nel browser. */

/* ============================================================
   CONFIGURAZIONE FIREBASE (null = modalità demo locale)
   ============================================================ */
/* Questi valori non sono segreti: nelle app web Firebase sono sempre pubblici, la protezione la danno le regole (firestore.rules). */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCtWrH1rPpPWrl6gJIS_uovYI2zbMob0WU",
  authDomain: "calcetti-d4581.firebaseapp.com",
  projectId: "calcetti-d4581",
  storageBucket: "calcetti-d4581.firebasestorage.app",
  messagingSenderId: "128704237585",
  appId: "1:128704237585:web:332e37de8602fbfd7a61b0"
};

/* Versione dell'informativa privacy: se la cambi, al prossimo accesso agli utenti viene richiesto di riaccettarla */
export const PRIVACY_V = '2026-11-09', PRIVACY_URL = 'privacy.html';
/* Ko-fi: incolla qui il tuo link, es. 'https://ko-fi.com/tuonome'. Finché è vuoto i pulsanti Ko-fi non vengono mostrati. */
export const KOFI_URL = 'https://ko-fi.com/en3rgin0';
