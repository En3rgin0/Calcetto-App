/* Accesso ai dati: Local (modalità demo, localStorage) e Firebase (Firestore).
   DB punta all'uno o all'altro: il resto dell'app usa solo DB. */
import { FIREBASE_CONFIG } from './config.js';
import { uid } from './utils.js';

/* ---------------- Storage: Locale (demo) e Firebase ---------------- */
export const Local = {
  load() { try { return JSON.parse(localStorage.getItem('cc_db')) || { users: {}, leagues: {}, members: {}, matches: {} } } catch { return { users: {}, leagues: {}, members: {}, matches: {} } } },
  save(d) { localStorage.setItem('cc_db', JSON.stringify(d)); },
  async getUser(id) { return this.load().users[id] || null },
  async setUser(id, u) { const d = this.load(); d.users[id] = { ...d.users[id], ...u }; this.save(d); },
  async leaguesOf(id) { return Object.values(this.load().leagues).filter(l => l.memberIds.includes(id)) },
  async saveLeague(l) { const d = this.load(); d.leagues[l.id] = l; this.save(d); },
  async findByCode(c) { return Object.values(this.load().leagues).find(l => l.code === c) || null },
  async members(l) { return Object.values(this.load().members[l] || {}) },
  async setMember(l, m) { const d = this.load(); (d.members[l] = d.members[l] || {})[m.id] = m; this.save(d); },
  async patchMember(l, id, f) { const d = this.load(); const m = (d.members[l] = d.members[l] || {})[id] || { id }; d.members[l][id] = Object.assign(m, f); this.save(d); },
  async delMember(l, id) { const d = this.load(); delete (d.members[l] || {})[id]; this.save(d); },
  async getLeague(id) { return this.load().leagues[id] || null },
  async patchLeague(id, f) { const d = this.load(); Object.assign(d.leagues[id], f); this.save(d); },
  async delLeague(l) { const d = this.load(); delete d.leagues[l]; delete d.members[l]; delete d.matches[l]; if (d.fixtures) delete d.fixtures[l]; this.save(d); },
  async matches(l) { return Object.values(this.load().matches[l] || {}) },
  async saveMatch(l, m) { const d = this.load(); (d.matches[l] = d.matches[l] || {})[m.id] = m; this.save(d); },
  async delMatch(l, id) { const d = this.load(); delete (d.matches[l] || {})[id]; this.save(d); },
  async fixtures(l) { return Object.values((this.load().fixtures || {})[l] || {}) },
  async saveFixture(l, f) { const d = this.load(); d.fixtures = d.fixtures || {}; (d.fixtures[l] = d.fixtures[l] || {})[f.id] = f; this.save(d); },
  async delFixture(l, id) { const d = this.load(); if (d.fixtures && d.fixtures[l]) delete d.fixtures[l][id]; this.save(d); },
  async setRsvp(l, id, key, val) { const d = this.load(), f = ((d.fixtures || {})[l] || {})[id]; if (!f) return; f.rsvp = { ...(f.rsvp || {}), [key]: val }; this.save(d); },
  async joinByCode(c, u) { const d = this.load(), l = Object.values(d.leagues).find(x => x.code === c); if (!l) return null; if (!l.memberIds.includes(u)) l.memberIds.push(u); this.save(d); return l; },
  async addAdmin(lid, u) { const d = this.load(), l = d.leagues[lid]; if (!l.admins.includes(u)) l.admins.push(u); this.save(d); },
  async removeAdmin(lid, u) { const d = this.load(), l = d.leagues[lid]; l.admins = l.admins.filter(x => x !== u); this.save(d); },
  async kick(lid, u) { const d = this.load(), l = d.leagues[lid]; l.memberIds = l.memberIds.filter(x => x !== u); l.admins = l.admins.filter(x => x !== u); this.save(d); },
  async codeFree(c) { return !Object.values(this.load().leagues).some(l => l.code === c) },
  async ensureCode() { return true },
  async setCode(lid, code) { await this.patchLeague(lid, { code }) },
};
export let DB = Local, fb = null;
export async function initFirebase() {
  const V = '10.12.2', base = `https://www.gstatic.com/firebasejs/${V}/`;
  const [app, auth, fs] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
  const a = app.initializeApp(FIREBASE_CONFIG), au = auth.getAuth(a);
  let db;   /* cache locale: avvio più veloce e meno letture; se il browser non la supporta si usa quella in memoria */
  try { db = fs.initializeFirestore(a, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) }); }
  catch (e) { console.warn(e); db = fs.getFirestore(a); }
  fb = { auth, au, fs };
  const { doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, deleteDoc, writeBatch, arrayUnion, arrayRemove } = fs;
  DB = {
    async getUser(id) { const s = await getDoc(doc(db, 'users', id)); return s.exists() ? s.data() : null },
    async setUser(id, u) { await setDoc(doc(db, 'users', id), u, { merge: true }) },
    async leaguesOf(id) { const s = await getDocs(query(collection(db, 'leagues'), where('memberIds', 'array-contains', id))); return s.docs.map(d => d.data()) },
    async saveLeague(l) { await setDoc(doc(db, 'leagues', l.id), l) },
    /* Ingresso con codice: codes/{CODICE} → id lega. Nello stesso batch si scrive la "prova" joins/{uid} con il codice,
       che le regole confrontano con quello della lega: senza codice giusto non si entra. */
    async joinByCode(c, u) {
      const s = await getDoc(doc(db, 'codes', c)); if (!s.exists()) return null;
      const lid = s.data().lid, b = writeBatch(db);
      b.set(doc(db, 'leagues', lid, 'joins', u), { code: c, ts: Date.now() });
      b.update(doc(db, 'leagues', lid), { memberIds: arrayUnion(u) });
      await b.commit(); return this.getLeague(lid);
    },
    async addAdmin(lid, u) { await updateDoc(doc(db, 'leagues', lid), { admins: arrayUnion(u) }) },
    async removeAdmin(lid, u) { await updateDoc(doc(db, 'leagues', lid), { admins: arrayRemove(u) }) },
    async kick(lid, u) { await updateDoc(doc(db, 'leagues', lid), { memberIds: arrayRemove(u), admins: arrayRemove(u) }) },
    async codeFree(c) { return !(await getDoc(doc(db, 'codes', c))).exists() },
    /* leghe create prima di questa versione: l'admin registra il codice in codes/ al primo accesso */
    async ensureCode(l) { const r = doc(db, 'codes', l.code), s = await getDoc(r); if (!s.exists()) { await setDoc(r, { lid: l.id }); return true; } return s.data().lid === l.id; },
    async setCode(lid, code, old) {
      await updateDoc(doc(db, 'leagues', lid), { code }); await setDoc(doc(db, 'codes', code), { lid });
      if (old) await deleteDoc(doc(db, 'codes', old)).catch(e => console.warn(e));
    },
    async members(l) { const s = await getDocs(collection(db, 'leagues', l, 'members')); return s.docs.map(d => d.data()) },
    async setMember(l, m) { await setDoc(doc(db, 'leagues', l, 'members', m.id), m) },
    async patchMember(l, id, f) { await setDoc(doc(db, 'leagues', l, 'members', id), f, { merge: true }) },
    async delMember(l, id) { await deleteDoc(doc(db, 'leagues', l, 'members', id)) },
    async getLeague(id) { const s = await getDoc(doc(db, 'leagues', id)); return s.exists() ? s.data() : null },
    async patchLeague(id, f) { await setDoc(doc(db, 'leagues', id), f, { merge: true }) },
    async delLeague(l) {
      const lg = await this.getLeague(l);
      for (const sub of ['matches', 'fixtures', 'members', 'joins']) { const s = await getDocs(collection(db, 'leagues', l, sub)).catch(() => ({ docs: [] })); await Promise.all(s.docs.map(d => deleteDoc(d.ref))); }
      if (lg && lg.code) await deleteDoc(doc(db, 'codes', lg.code)).catch(e => console.warn(e));
      await deleteDoc(doc(db, 'leagues', l));
    },
    async matches(l) { const s = await getDocs(collection(db, 'leagues', l, 'matches')); return s.docs.map(d => d.data()) },
    async saveMatch(l, m) { await setDoc(doc(db, 'leagues', l, 'matches', m.id), m) },
    async delMatch(l, id) { await deleteDoc(doc(db, 'leagues', l, 'matches', id)) },
    async fixtures(l) { const s = await getDocs(collection(db, 'leagues', l, 'fixtures')); return s.docs.map(d => d.data()) },
    async saveFixture(l, f) { await setDoc(doc(db, 'leagues', l, 'fixtures', f.id), f) },
    async delFixture(l, id) { await deleteDoc(doc(db, 'leagues', l, 'fixtures', id)) },
    /* presenza: si scrive solo la propria voce dentro rsvp (le regole controllano che sia la propria) */
    async setRsvp(l, id, key, val) { await setDoc(doc(db, 'leagues', l, 'fixtures', id), { rsvp: { [key]: val } }, { merge: true }) },
  };
}
