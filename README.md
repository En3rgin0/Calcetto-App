# ⚽ Calcetto Club

Il registro dei vostri calcetti: partite, statistiche, voti e una carta personale con overall da **64 a 99**.

È una web app per il telefono (PWA): si apre dal browser, si aggiunge alla schermata Home e funziona come un'app.
Tutto il codice sta in un solo file HTML; login e dati condivisi passano da Firebase.

## Funzionalità

- **Carta del giocatore**: soprannome, ruolo, numero, colore, icona o foto, con l'overall che si aggiorna da solo.
- **Leghe**: si crea una lega e si invitano gli amici con un codice di 6 caratteri.
- **Giocatori senza account**: l'admin li registra subito; quando fanno il login possono collegarsi al proprio giocatore e tenersi statistiche e overall.
- **Partite**: formazioni, gol e assist per ogni giocatore; il risultato è la somma dei gol. Si possono inserire anche partite vecchie.
- **Bacheca**: dopo ogni partita l'admin pubblica il resoconto con voti (da 1 a 10, passo 0,5), commenti e MVP.
- **Classifica, storico e scheda giocatore**, con un calendario dei voti presi partita per partita.
- **Partite in programma**: data, ora, luogo e note, visibili a tutti i membri delle leghe.
- **Admin e co-admin**: modifica di giocatori e statistiche, nomina di co-admin, nuovo codice invito, cancellazione della lega.
- **Privacy**: accettazione dell'informativa (con versione), esportazione dei propri dati in JSON.
- **Offline**: grazie al service worker l'app si apre anche senza rete.

## Struttura del repository

| File | A cosa serve |
|---|---|
| `calcetto/index.html` | L'app intera: grafica, logica e accesso a Firebase |
| `calcetto/sw.js` | Service worker (installazione e uso offline) |
| `calcetto/manifest.webmanifest` | Nome, colori e icone per l'installazione sul telefono |
| `calcetto/privacy.html` | Informativa sulla privacy |
| `calcetto/*.png`, `og-cover.jpg` | Icone e immagine di anteprima per i social |
| `firestore.rules` | Regole di sicurezza del database |

## Provarla in locale

L'app non ha dipendenze né build: basta servire la cartella `calcetto/`, per esempio con

```bash
python -m http.server 8000 --directory calcetto
```

e aprire `http://localhost:8000`.

**Modalità demo**: impostando `FIREBASE_CONFIG = null` all'inizio dello script di `index.html`, l'app non usa Firebase.
Il login viene simulato e i dati restano nel browser (`localStorage`). È comoda per provare modifiche senza toccare i dati veri.

## Configurare Firebase (gratuito)

1. Su [console.firebase.google.com](https://console.firebase.google.com) crea un progetto.
2. **Authentication → Inizia → Google → Abilita**.
3. **Firestore Database → Crea database** (modalità produzione).
4. **Impostazioni progetto → Le tue app → Web (`</>`)**: copia l'oggetto `firebaseConfig` in `FIREBASE_CONFIG`, all'inizio dello script di `calcetto/index.html`.
   Questi valori non sono segreti: nelle app web Firebase sono sempre pubblici, la protezione la danno le regole.
5. **Authentication → Impostazioni → Domini autorizzati**: aggiungi il dominio dove pubblichi l'app.
6. Pubblica le regole di sicurezza:
   ```bash
   firebase deploy --only firestore:rules
   ```
   oppure copia il contenuto di `firestore.rules` in **Firestore → Regole**.

### Cosa garantiscono le regole

- Una lega e i suoi dati (giocatori, partite, partite in programma) li vedono solo i membri.
- Si entra in una lega solo con il codice giusto: i codici stanno nella collezione `codes`, e chi entra scrive in `leagues/{id}/joins/{uid}` il codice usato, che le regole confrontano con quello della lega.
- Il profilo (`users/{uid}`, che contiene l'email) lo legge solo il proprietario.
- Solo gli admin creano giocatori, partite e resoconti e modificano statistiche e overall; un giocatore può cambiare solo nome e carta del proprio giocatore.
- Foto, icona e soprannome delle carte vengono controllati prima del salvataggio.

Le regole si possono provare con l'emulatore Firestore e `@firebase/rules-unit-testing`.

## Pubblicare l'app

Carica tutta la cartella `calcetto/` su Firebase Hosting, Netlify o GitHub Pages (serve HTTPS per il service worker).
Dal telefono: apri il link → menu del browser → **Aggiungi a schermata Home**.

Se modifichi `sw.js`, aumenta la costante `VERSION`, così i telefoni scaricano la versione nuova.

### Aggiornare da una versione precedente

Le versioni precedenti cercavano la lega leggendo direttamente il codice dentro il documento della lega. Per passare alla versione attuale:

1. Pubblica insieme la nuova app e le nuove regole.
2. Ogni admin apra l'app una volta: le leghe esistenti registrano da sole il proprio codice in `codes/`.
   Finché l'admin non l'ha aperta, il codice di quella lega non funziona.
3. Da **Impostazioni lega → Genera nuovo codice** l'admin può cambiare il codice quando vuole (per esempio dopo aver rimosso qualcuno che non deve rientrare).

## Come si calcola l'overall

- Si parte da **64** (nessuna partita giocata) e si arriva al massimo a **99**.
- **Rendimento** = 35% vittorie (il pareggio vale mezza vittoria) + 35% gol a partita (2 a partita = massimo) + 30% assist a partita (1,2 a partita = massimo).
- Il rendimento pesa sempre di più man mano che si gioca (affidabilità piena a 10 partite), e l'esperienza dà un bonus fino a 40 partite:
  `overall = 64 + 35 × (0,8 × rendimento × min(1, partite/10) + 0,2 × min(1, partite/40))`
- Si ricalcola a ogni partita salvata, modificata o eliminata. L'admin può correggere a mano statistiche e overall: la correzione resta e le partite successive si sommano.
- La formula è nella funzione `calcOverall()` di `index.html`.

## Altre impostazioni in `index.html`

| Costante | Significato |
|---|---|
| `PRIVACY_V` | Versione dell'informativa: se la cambi, al prossimo accesso tutti devono riaccettarla |
| `PRIVACY_URL` | Indirizzo dell'informativa |
| `KOFI_URL` | Link Ko-fi per le donazioni; se è vuoto i pulsanti non compaiono |
