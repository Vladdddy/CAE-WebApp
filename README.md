## CAE-WebApp è una web app per la gestione dei turni, dei task e del logbook di un team tecnico. Il progetto è suddiviso in due parti principali:

- **backend-team-manager/**: backend Node.js/Express per la gestione di API, autenticazione, dati e file.
- **team-tech-manager/**: frontend React per l'interfaccia utente.

## Dipendenze principali

- **Backend**: Express, dotenv, cors, JWT, multer (upload immagini)
- **Frontend**: React, react-router-dom, html2pdf.js, xlsx, Tailwind CSS

## Note

- Per la gestione delle immagini, i file vengono salvati nella cartella `uploads/` del backend.
- I dati dei task, logbook e turni sono salvati in file JSON nella cartella `data/`.
- Per la produzione, assicurati di configurare correttamente le variabili d'ambiente e la sicurezza.
