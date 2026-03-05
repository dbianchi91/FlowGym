# Sistema di Gamification e Progression - FlowGym

Per trasformare FlowGym in un vero "motivatore personale", introdurremo un sistema RPG-lite (Level & XP) e una gestione gerarchica degli obiettivi.

## 1. Sistema Esperienza (XP) e Livelli
L'utente guadagna XP compiendo azioni salutari. Accumulando XP, sale di livello, sbloccando ipotetici "titoli" (es. Novizio, Adepto del Focus, Maestro del Flow).

**Fonti di XP:**
- **Daily Check-In:** +10 XP (premio costanza).
- **Completamento Micro-Skill:** +25 XP (premio azione, se suggerita dall'AI).
- **Avanzamento Obiettivi Manuale:** +5 XP per ogni "scatto di progresso".
- **Completamento Obiettivo (Breve termine):** +50 XP.
- **Completamento Obiettivo (Medio termine):** +150 XP.
- **Completamento Obiettivo (Lungo termine):** +500 XP.

**Curva di Livellamento:**
Matematica lineare o esponenziale morbida. Es: `Livello = floor(sqrt(XP / 50)) + 1` (Livello 1: 0XP, Livello 2: 150XP, Livello 3: 400XP, ecc.)

## 2. Obiettivi Gerarchici (Short, Mid, Long Term)
Sostituiremo i vecchi "micro-goals" booleani (Fatto/Non Fatto) con un sistema più profondo.
Ogni obiettivo avrà:
- `id`: intero.
- `title`: stringa (es. "Leggere 10 Libri").
- `type`: 'short' (giorni), 'mid' (settimane), 'long' (mesi/anni).
- `progress`: intero (es. 0).
- `target`: intero (es. 10). L'utente può incrementare il `progress` fino a raggiungere il `target`.
- `completed`: booleano.

**Funzionamento UI:**
Nella HomeScreen o in un tab dedicato "Obiettivi", l'utente vede l'obiettivo e preme un tasto `[ + ]`. Ad ogni pressione il `progress` sale di 1, dandogli +5 XP. Quando `progress == target`, l'obiettivo è completato e riceve il bonus XP enorme in base al `type`.

## 3. Modifiche Architetturali Richieste
1. **DB Schema (`database.ts`)**:
   - Creare tabella `UserProfile`: `id`, `current_xp`, `level`.
   - Modificare tabella `Goals`: aggiungere colonne `type`, `progress`, `target`. Mantenimento retrocompatibilità eliminando la vecchia tabella se necessario (tanto in dev possiamo svuotare).
2. **UI `HomeScreen.tsx`**:
   - Inserire una Progress Bar circolare o lineare in cima per mostrare Livello attuale e XP mancanti al prossimo livello.
3. **UI `GoalsScreen.tsx` o Modulo in Home**:
   - Permettere la selezione del TIPO e del TARGET durante la creazione dell'obiettivo (es. [X] Breve Termine [ ] Medio [ ] Lungo. Target Numerico: ___).
