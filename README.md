# ⚽ Calcetto Club

Il registro dei vostri calcetti: partite, statistiche, voti e una carta personale con overall da **64 a 99**.

È una web app per il telefono (PWA): si apre dal browser, si aggiunge alla schermata Home e funziona come un'app.
Non serve nessuna compilazione: HTML, CSS e moduli JavaScript nativi del browser. Login e dati condivisi passano da Firebase.

## Funzionalità

**Giocatore**
- **Carta del giocatore**: soprannome, ruolo, numero, colore, icona o foto, con l'overall che si aggiorna da solo.
- **Profilo**: statistiche totali, stato di forma con le ultime 5 partite tra tutte le leghe (esito, voto, gol, assist, MVP), esportazione dei propri dati.
- **Le mie stats** in ogni lega: carta, posizione in classifica, ultime 5 partite, tutte le proprie partite.
- **Presenze**: su ogni partita programmata si risponde Ci sono / Forse / No.

**Lega**
- Si crea una lega e si invitano gli amici con un codice di 6 caratteri; l'admin può caricare un'immagine della lega.
- **Bacheca**: partite programmate con presenze e schede dei resoconti (data, squadre, risultato, MVP); toccandole si apre il dettaglio con tabellino, racconto e pagelle, e si può copiare il testo per WhatsApp.
- **Classifica** con i record della lega (capocannoniere, re degli assist, più MVP, miglior media voto, serie di vittorie, più presenze, partita con più gol).
- **Storico** filtrabile per campo, con riepilogo e caricamento a pagine.
- **Calendario dei voti** di ogni giocatore.

**Admin e co-admin**
- **Partite**: formazioni, gol e assist; nomi e colori delle squadre (palette con colori distinguibili sul fondo scuro); squadre bilanciate in base all'overall, anche partendo dai presenti di una partita programmata.
- **Resoconto**: racconto, voti in stile pagella (6-, 6, 6+, 6,5…), commenti e MVP scelto dall'admin (altrimenti vince il voto più alto). Nelle pagelle si vede l'overall prima → dopo la partita.
- **Giocatori**: soprannome di lega, statistiche e overall correggibili, giocatori senza account che poi si collegano al proprio profilo, co-admin.
- **Lega**: nome, immagine, nuovo codice invito, cancellazione.

**Sempre**
- Funziona su telefono, tablet e computer; si installa come app e si apre anche senza rete (service worker).
- Privacy: accettazione dell'informativa (con versione) ed esportazione dei propri dati in JSON.

## Struttura del repository

```
calcetto/                 l'app pubblicata (è la cartella da caricare sull'hosting)
├── index.html            pagina principale: solo intestazione, stili e avvio
├── privacy.html          informativa sulla privacy
├── manifest.webmanifest  nome, colori e icone per l'installazione sul telefono
├── sw.js                 service worker (installazione e uso offline)
├── assets/               icone dell'app, immagine per i social e icons.svg (tutte le icone dell'interfaccia)
├── css/
│   ├── base.css          colori, tipografia, moduli, bottoni
│   ├── layout.css        navigazione, pagine, login, profilo
│   ├── components.css    carta, statistiche, liste, partite, finestre, calendario
│   └── responsive.css    adattamento a tablet (≥ 768px) e desktop (≥ 1024px)
└── js/
    ├── main.js           punto di ingresso
    ├── config.js         configurazione Firebase, informativa, Ko-fi
    ├── state.js          stato dell'app
    ├── db.js             accesso ai dati (demo locale o Firestore)
    ├── data.js           caricamento delle leghe e statistiche derivate
    ├── stats.js          calcolo di statistiche e overall
    ├── model.js          carte e giocatori
    ├── teams.js          colori delle squadre
    ├── auth.js           accesso, uscita, informativa
    ├── utils.js          funzioni di supporto
    ├── ui/               struttura della pagina, componenti riusati, finestre
    └── views/            una schermata per file: profilo, leghe, lega, giocatori, partite,
                          dettaglio partita e testo WhatsApp, resoconti, calendario,
                          partite in programma e presenze
firestore.rules           regole di sicurezza del database
firebase.json             configurazione Firebase CLI ed emulatore
tests/                    test di calcoli e colori (npm test) e delle regole Firestore (npm run test:rules)
```

## Provarla in locale

L'app non ha bisogno di build: basta servire la cartella `calcetto/` con un qualsiasi server statico, per esempio

```bash
npm start
```

e aprire `http://localhost:8000`. Va aperta da un server e non con doppio clic sul file, perché i moduli JavaScript non funzionano da `file://`.

**Modalità demo**: impostando `FIREBASE_CONFIG = null` in `calcetto/js/config.js`, l'app non usa Firebase.
Il login viene simulato e i dati restano nel browser (`localStorage`). È comoda per provare modifiche senza toccare i dati veri.

## Configurare Firebase (gratuito)

1. Su [console.firebase.google.com](https://console.firebase.google.com) crea un progetto.
2. **Authentication → Inizia → Google → Abilita**.
3. **Firestore Database → Crea database** (modalità produzione).
4. **Impostazioni progetto → Le tue app → Web (`</>`)**: copia l'oggetto `firebaseConfig` in `FIREBASE_CONFIG`, in `calcetto/js/config.js`.
   Questi valori non sono segreti: nelle app web Firebase sono sempre pubblici, la protezione la danno le regole.
5. **Authentication → Impostazioni → Domini autorizzati**: aggiungi il dominio dove pubblichi l'app.
6. Pubblica le regole di sicurezza:
   ```bash
   npm run deploy:rules
   ```
   oppure copia il contenuto di `firestore.rules` in **Firestore → Regole**.

### Cosa garantiscono le regole

- Una lega e i suoi dati (giocatori, partite, partite in programma) li vedono solo i membri.
- Si entra in una lega solo con il codice giusto: i codici stanno nella collezione `codes`, e chi entra scrive in `leagues/{id}/joins/{uid}` il codice usato, che le regole confrontano con quello della lega.
- Il profilo (`users/{uid}`, che contiene l'email) lo legge solo il proprietario.
- Solo gli admin creano giocatori, partite, partite programmate e resoconti, modificano statistiche, overall, soprannomi di lega e immagine della lega; un giocatore può cambiare solo nome e carta del proprio giocatore.
- Sulle presenze ognuno può scrivere solo la propria risposta.
- Foto, icona e soprannome delle carte e l'immagine della lega vengono controllati prima del salvataggio.

## Test

Dopo `npm install`:

```bash
npm test
```

prova il calcolo di statistiche, overall, voti, squadre bilanciate e colori delle squadre, e

```bash
npm run test:rules
```

prova le regole Firestore sull'emulatore (serve Java installato).

## Pubblicare l'app

Carica tutta la cartella `calcetto/` su Firebase Hosting, Netlify o GitHub Pages (serve HTTPS per il service worker).
Dal telefono: apri il link → menu del browser → **Aggiungi a schermata Home**.

Se aggiungi, togli o rinomini file, aggiorna l'elenco `CORE` in `sw.js` e aumenta la costante `VERSION`, così i telefoni scaricano la versione nuova.

### Aggiornare da una versione precedente

Le versioni precedenti cercavano la lega leggendo direttamente il codice dentro il documento della lega. Per passare alla versione attuale:

1. Pubblica insieme la nuova app e le nuove regole.
2. Ogni admin apra l'app una volta: le leghe esistenti registrano da sole il proprio codice in `codes/`.
   Finché l'admin non l'ha aperta, il codice di quella lega non funziona.
3. Da **Impostazioni lega → Genera nuovo codice** l'admin può cambiare il codice quando vuole (per esempio dopo aver rimosso qualcuno che non deve rientrare).

## Voti

I voti vanno da 1 a 10 a passi di un quarto e si mostrano come in pagella: **6-** = 5,75 · **6** · **6+** = 6,25 · **6,5**. Nel database restano numeri.
L'MVP lo sceglie l'admin nel resoconto; se non lo sceglie, è chi ha preso il voto più alto.

## Come si calcola l'overall

- Si parte da **64** (nessuna partita giocata) e si arriva al massimo a **99**.
- **Rendimento** = 35% vittorie (il pareggio vale mezza vittoria) + 35% gol a partita (2 a partita = massimo) + 30% assist a partita (1,2 a partita = massimo).
- Il rendimento pesa sempre di più man mano che si gioca (affidabilità piena a 10 partite), e l'esperienza dà un bonus fino a 40 partite:
  `overall = 64 + 35 × (0,8 × rendimento × min(1, partite/10) + 0,2 × min(1, partite/40))`
- Si ricalcola a ogni partita salvata, modificata o eliminata. L'admin può correggere a mano statistiche e overall: la correzione resta e le partite successive si sommano.
- La formula è nella funzione `calcOverall()` di `calcetto/js/stats.js`.

## Altre impostazioni in `calcetto/js/config.js`

| Costante | Significato |
|---|---|
| `PRIVACY_V` | Versione dell'informativa: se la cambi, al prossimo accesso tutti devono riaccettarla |
| `PRIVACY_URL` | Indirizzo dell'informativa |
| `KOFI_URL` | Link Ko-fi per le donazioni; se è vuoto i pulsanti non compaiono |
