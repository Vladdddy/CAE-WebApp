# Documentazione Completa - Team Tech Manager

## Indice

1. [Panoramica del Progetto](#panoramica-del-progetto)
2. [Architettura del Sistema](#architettura-del-sistema)
3. [Stack Tecnologico](#stack-tecnologico)
4. [Struttura del Progetto](#struttura-del-progetto)
5. [API Documentation](#api-documentation)
6. [Configurazione e Setup](#configurazione-e-setup)
7. [Sistema di Autenticazione](#sistema-di-autenticazione)
8. [Funzionalità Principali](#funzionalità-principali)
9. [Database e Storage](#database-e-storage)
10. [Migrazioni Future verso Database](#migrazioni-future-verso-database)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

## Panoramica del Progetto

Il **Team Tech Manager** è un'applicazione web completa per la gestione tecnica di team operativi, sviluppata per gestire task, turni, logbook e note operative. Il sistema è progettato per ambienti tecnici/operativi dove è necessario tracciare attività, gestire turni e mantenere un registro dettagliato delle operazioni.

### Caratteristiche Principali:

-   ✅ Gestione completa dei task con stati multipli
-   ✅ Sistema di turni avanzato (giorno/notte)
-   ✅ Logbook integrato con categorizzazione
-   ✅ Sistema di note collegato a task e logbook
-   ✅ Dashboard operativa in tempo reale
-   ✅ Export PDF dei report
-   ✅ Sistema di autenticazione JWT
-   ✅ Upload e gestione immagini
-   ✅ Interfaccia responsive

## Architettura del Sistema

```
┌─────────────────────────────────────────┐
│              FRONTEND                   │
│         (React + Tailwind)              │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │  Dashboard  │  │   Components    │   │
│  │   Tasks     │  │   (Modals,      │   │
│  │  Logbook    │  │   Calendar,     │   │
│  │   Shifts    │  │   Tables)       │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
                     │
                     │ HTTP/REST API
                     │
┌─────────────────────────────────────────┐
│              BACKEND                    │
│         (Node.js + Express)             │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │   Routes    │  │  Controllers    │   │
│  │ (API Paths) │  │  (Business      │   │
│  │             │  │   Logic)        │   │
│  └─────────────┘  └─────────────────┘   │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Middleware  │  │   Data Layer    │   │
│  │ (Auth, CORS,│  │  (JSON Files)   │   │
│  │  Upload)    │  │                 │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
                     │
                     │ File System
                     │
┌─────────────────────────────────────────┐
│           DATA STORAGE                  │
│          (JSON Files)                   │
│                                         │
│  • tasks.json      • notes.json         │
│  • users.json      • patterns.json      │
│  • logbook.json    • shifts-YYYY-MM.json│
│  • YYYY-MM-DD.json (daily logbook)      │
│  • uploads/ (images)                    │
└─────────────────────────────────────────┘
```

## Stack Tecnologico

### Frontend (team-tech-manager/)

-   **React 18.2.0** - Framework principale
-   **React Router DOM 6.3.0** - Routing
-   **Tailwind CSS 3.0.0** - Styling e UI
-   **html2pdf.js 0.10.3** - Export PDF
-   **xlsx 0.18.5** - Export Excel
-   **@hugeicons/react 1.0.5** - Iconografia

### Backend (backend-team-manager/)

-   **Node.js** - Runtime JavaScript
-   **Express 4.18.2** - Web framework
-   **JWT (jsonwebtoken 9.0.2)** - Autenticazione
-   **Multer 2.0.2** - Upload file
-   **CORS 2.8.5** - Cross-origin requests
-   **dotenv 16.0.3** - Gestione variabili ambiente

### Strumenti di Sviluppo

-   **nodemon 2.0.22** - Auto-restart server
-   **PostCSS 8.4.0** - CSS processing
-   **Autoprefixer 10.4.0** - Compatibilità CSS

## Struttura del Progetto

```
Progetto Web App/
├── backend-team-manager/           # Server backend
│   ├── controllers/               # Logica business
│   │   ├── access.js             # Controllo accessi
│   │   ├── logbookController.js  # Gestione logbook
│   │   ├── notesController.js    # Gestione note
│   │   ├── shiftController.js    # Gestione turni
│   │   ├── taskController.js     # Gestione task
│   │   ├── userController.js     # Gestione utenti
│   │   └── backups/              # Controller di backup
│   ├── data/                     # Storage dati JSON
│   │   ├── tasks.json           # Database task
│   │   ├── users.json           # Database utenti
│   │   ├── notes.json           # Database note
│   │   ├── logbook.json         # Logbook generale
│   │   ├── patterns.json        # Pattern turni
│   │   ├── shifts-YYYY-MM.json  # Turni mensili
│   │   └── YYYY-MM-DD.json      # Logbook giornalieri
│   ├── middleware/              # Middleware Express
│   │   ├── auth.js             # Autenticazione JWT
│   │   └── upload.js           # Upload file
│   ├── routes/                 # Definizione route API
│   │   ├── auth.js            # Route autenticazione
│   │   ├── logbook.js         # Route logbook
│   │   ├── notes.js           # Route note
│   │   ├── patterns.js        # Route pattern
│   │   ├── shifts.js          # Route turni
│   │   ├── tasks.js           # Route task
│   │   └── users.js           # Route utenti
│   ├── uploads/               # File caricati
│   │   └── task-images/       # Immagini task
│   ├── package.json           # Dipendenze backend
│   ├── server.js              # Entry point server
│   └── README.md              # Documentazione backend
│
└── team-tech-manager/             # Applicazione frontend
    ├── public/                   # File pubblici
    │   ├── index.html           # Template HTML
    │   ├── manifest.json        # Configurazione PWA
    │   └── assets/              # Risorse statiche
    ├── src/                     # Codice sorgente React
    │   ├── components/          # Componenti riutilizzabili
    │   │   ├── Calendar.js      # Componente calendario
    │   │   ├── Modal.js         # Modali generici
    │   │   ├── Sidebar.js       # Barra laterale
    │   │   └── TaskDetailsModal.js # Modal dettagli task
    │   ├── pages/              # Pagine principali
    │   │   ├── Dashboard.js    # Dashboard principale
    │   │   ├── Login.js        # Pagina login
    │   │   ├── Tasks.js        # Gestione task
    │   │   ├── Logbook.js      # Gestione logbook
    │   │   └── Shifts.js       # Gestione turni
    │   ├── utils/              # Utilità
    │   │   └── notesService.js # Servizio gestione note
    │   ├── styles/             # Stili CSS
    │   ├── App.js              # Componente principale
    │   └── index.js            # Entry point React
    ├── package.json            # Dipendenze frontend
    ├── tailwind.config.js      # Configurazione Tailwind
    └── README.md               # Documentazione frontend
```

## API Documentation

### Base URL

-   **Development**: `http://localhost:5000/api`
-   **Production**: Configurabile tramite `REACT_APP_API_URL`

### Autenticazione

Tutte le API richiedono un JWT token nell'header:

```
Authorization: Bearer <jwt_token>
```

### Endpoints Principali

#### 🔐 Autenticazione (`/api/auth`)

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Nome Utente",
    "role": "employee|admin|manager|superuser",
    "department": "Operations"
  }
}
```

```http
GET /api/auth/check
Authorization: Bearer <token>

Response:
{
  "message": "Token is valid!",
  "email": "user@example.com",
  "tokenValid": true
}
```

#### 📋 Task Management (`/api/tasks`)

```http
GET /api/tasks
Authorization: Bearer <token>

Response:
[
  {
    "id": 1,
    "title": "Titolo Task",
    "description": "Descrizione dettagliata",
    "assignedTo": "Nome Operatore",
    "simulator": "FTD|109FFS|139#1|139#3|169|189|Others",
    "category": "routine task|troubleshooting|others",
    "subcategory": "PM|MR|Backup|QTG|HW|SW",
    "status": "completato|in corso|non completato|riassegnato|da definire",
    "date": "2025-08-01",
    "time": "10:30",
    "images": [...],
    "notes": [...]
  }
]
```

```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "title": "Nuovo Task",
  "description": "Descrizione",
  "assignedTo": "Nome Operatore",
  "simulator": "FTD",
  "category": "routine task",
  "subcategory": "PM",
  "date": "2025-08-01",
  "time": "10:30",
  "images": [File objects]
}
```

```http
PATCH /api/tasks/:id/toggle
Authorization: Bearer <token>

Response:
{
  "success": true,
  "task": { ...updated_task }
}
```

```http
GET /api/tasks/available-employees?date=2025-08-01&time=10:30
Authorization: Bearer <token>

Response:
{
  "availableEmployees": ["Nome1", "Nome2", ...]
}
```

#### 📖 Logbook Management (`/api/logbook`)

```http
GET /api/logbook/:date
Authorization: Bearer <token>

Response:
[
  {
    "id": "uuid",
    "title": "Nome Entry",
    "text": "Descrizione dettagliata",
    "category": "routine task|troubleshooting|others",
    "subcategory": "PM|MR|Backup|QTG|HW|SW",
    "simulator": "FTD|109FFS|139#1|139#3|169|189|Others",
    "time": "10:30",
    "author": "Nome Operatore",
    "images": [...]
  }
]
```

```http
POST /api/logbook/:date
Authorization: Bearer <token>
Content-Type: multipart/form-data

[
  {
    "title": "Nuova Entry",
    "text": "Descrizione",
    "category": "routine task",
    "subcategory": "PM",
    "simulator": "FTD",
    "time": "10:30",
    "author": "Nome Operatore"
  }
]
```

#### 👥 Users Management (`/api/users`)

```http
GET /api/users
Authorization: Bearer <token>

Response:
[
  {
    "id": 1,
    "name": "Nome Utente",
    "email": "user@example.com",
    "role": "employee|admin|manager|superuser",
    "department": "Operations",
    "active": true
  }
]
```

#### 📅 Shifts Management (`/api/shifts`)

```http
GET /api/shifts/:year/:month
Authorization: Bearer <token>

Response:
{
  "2025-08-01": {
    "day": ["Operatore1", "Operatore2"],
    "night": ["Operatore3", "Operatore4"]
  },
  "2025-08-02": {
    "day": ["Operatore2", "Operatore3"],
    "night": ["Operatore1", "Operatore4"]
  }
}
```

```http
POST /api/shifts/:year/:month
Authorization: Bearer <token>
Content-Type: application/json

{
  "2025-08-01": {
    "day": ["Operatore1", "Operatore2"],
    "night": ["Operatore3", "Operatore4"]
  }
}
```

#### 📝 Notes Management (`/api/notes`)

```http
GET /api/notes/tasks/:taskId
Authorization: Bearer <token>

Response:
[
  {
    "text": "Testo nota",
    "author": "Nome Autore",
    "timestamp": "2025-08-01T10:30:00.000Z",
    "type": "user|system"
  }
]
```

```http
POST /api/notes/tasks/:taskId
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Nuova nota",
  "author": "Nome Autore"
}
```

```http
GET /api/notes/logbook/:entryId
Authorization: Bearer <token>

Response:
[
  {
    "text": "Nota logbook",
    "author": "Nome Autore",
    "timestamp": "2025-08-01T10:30:00.000Z"
  }
]
```

#### 🔄 Patterns Management (`/api/patterns`)

```http
GET /api/patterns
Authorization: Bearer <token>

Response:
[
  {
    "name": "Pattern Name",
    "days": [
      {
        "date": "2025-08-01",
        "day": ["Operatore1"],
        "night": ["Operatore2"]
      }
    ]
  }
]
```

## Configurazione e Setup

### Prerequisiti

-   **Node.js** versione 16+
-   **npm** o **yarn**
-   Sistema operativo: Windows, macOS, Linux

### Installazione Backend

1. **Clona il repository e naviga nella cartella backend:**

```bash
cd backend-team-manager
```

2. **Installa le dipendenze:**

```bash
npm install
```

3. **Configura le variabili d'ambiente:**
   Crea un file `.env` nella root del backend:

```env
# Porta del server (default: 5000)
PORT=5000

# Chiave segreta per JWT (OBBLIGATORIA)
SECRET_KEY=your_super_secret_jwt_key_here_change_this_in_production

# URL frontend per CORS (default: http://localhost:3000)
REACT_APP_API_URL=http://localhost:3000
```

4. **Avvia il server:**

```bash
# Modalità sviluppo (con auto-restart)
npm run dev

# Modalità produzione
npm start
```

Il server sarà disponibile su `http://localhost:5000`

### Installazione Frontend

1. **Naviga nella cartella frontend:**

```bash
cd team-tech-manager
```

2. **Installa le dipendenze:**

```bash
npm install
```

3. **Configura le variabili d'ambiente:**
   Crea un file `.env` nella root del frontend:

```env
# URL del backend API
REACT_APP_API_URL=http://localhost:5000
```

4. **Avvia l'applicazione:**

```bash
# Modalità sviluppo
npm start

# Build per produzione
npm run build
```

L'applicazione sarà disponibile su `http://localhost:3000`

## Sistema di Autenticazione

### Architettura Auth

Il sistema utilizza **JWT (JSON Web Tokens)** per l'autenticazione stateless:

1. **Login**: L'utente invia email/password
2. **Verifica**: Il server controlla le credenziali in `users.json`
3. **Token**: Se valide, viene generato un JWT con durata 20h
4. **Storage**: Il token viene salvato in `localStorage` del browser
5. **Autorizzazione**: Ogni richiesta API include il token nell'header

### Ruoli Utente

```javascript
// Struttura ruoli in users.json
{
  "id": 1,
  "name": "Nome Utente",
  "email": "user@example.com",
  "password": "password_in_plain_text", // TODO: hash in produzione
  "role": "employee|admin|manager|superuser",
  "department": "Operations",
  "active": true
}
```

#### Permessi per Ruolo:

-   **employee**: Può visualizzare e modificare i propri task, aggiungere note
-   **admin**: Può gestire tutti i task, utenti, turni
-   **manager**: Permessi estesi, gestione team
-   **superuser**: Accesso completo, configurazioni sistema

### Middleware di Autenticazione

```javascript
// backend-team-manager/middleware/auth.js
const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        return res.status(401).json({ message: "Missing token" });
    }

    const token = authHeader.split(" ")[1];
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid token" });
        }
        req.user = user; // Informazioni utente disponibili nei controller
        next();
    });
};
```

### Frontend Auth Service

```javascript
// Esempio utilizzo nel frontend
const token = localStorage.getItem("authToken");

// Headers per richieste autenticate
const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
};

// Controllo validità token
const getCurrentUser = () => {
    const token = localStorage.getItem("authToken");
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload; // { name, role, email, department, id }
    } catch (error) {
        return null;
    }
};
```

## Funzionalità Principali

### 1. Dashboard Operativa

-   **Panoramica task attivi** con filtri per stato
-   **Calendario turni** integrato
-   **Statistiche tempo reale** (task completati, in corso, etc.)
-   **Quick actions** per operazioni frequenti

### 2. Gestione Task

```javascript
// Struttura task completa
{
  "id": 1,
  "title": "Manutenzione FTD",
  "description": "Controllo sistemi e calibrazione",
  "assignedTo": "Marco Rossi",
  "simulator": "FTD",
  "category": "routine task",
  "subcategory": "PM",
  "extraDetail": "VISUAL", // per troubleshooting
  "status": "in corso",
  "date": "2025-08-01",
  "time": "10:30",
  "images": [
    {
      "filename": "task_image_1722518400000.jpg",
      "originalname": "foto_problema.jpg",
      "path": "uploads/task-images/task_image_1722518400000.jpg",
      "size": 1024000,
      "uploadDate": "2025-08-01T10:30:00.000Z"
    }
  ],
  "createdAt": "2025-08-01T08:00:00.000Z",
  "updatedAt": "2025-08-01T10:30:00.000Z"
}
```

#### Stati Task:

-   **da definire**: Task creato ma non ancora assegnato
-   **in corso**: Task assegnato e in esecuzione
-   **completato**: Task terminato con successo
-   **non completato**: Task non portato a termine
-   **riassegnato**: Task trasferito ad altro operatore

#### Categorie e Sottocategorie:

```javascript
const categories = {
    "routine task": ["PM", "MR", "Backup", "QTG"],
    troubleshooting: ["HW", "SW"],
    others: [
        "Part test",
        "Remote connection with support",
        "Remote connection without support",
    ],
};

// Dettagli extra per troubleshooting
const troubleshootingDetails = [
    "VISUAL",
    "IOS",
    "CIRCUIT BREAKER",
    "SCREEN",
    "AUDIO",
    "MOTION",
    "SEATS",
    "OTHERS",
];
```

### 3. Sistema Logbook

Il logbook mantiene un registro cronologico di tutte le attività operative:

```javascript
// Struttura entry logbook
{
  "id": "uuid-string",
  "title": "Nome operazione",
  "text": "Descrizione dettagliata dell'attività svolta",
  "category": "routine task",
  "subcategory": "PM",
  "simulator": "FTD",
  "time": "14:30",
  "author": "Nome Operatore",
  "images": [...],
  "type": "logbook-entry" // distingue da task
}
```

#### Caratteristiche Logbook:

-   **Storage giornaliero**: Ogni giorno ha il suo file `YYYY-MM-DD.json`
-   **Categorizzazione**: Stesse categorie dei task per coerenza
-   **Integrazione task**: I task completati appaiono automaticamente nel logbook
-   **Ricerca avanzata**: Filtraggio per categoria, data, operatore, simulatore
-   **Export PDF**: Generazione report per turno (giorno/notte) o completo

### 4. Gestione Turni

Sistema complesso per la pianificazione operatori:

```javascript
// Struttura file turni (shifts-YYYY-MM.json)
{
  "2025-08-01": {
    "day": ["Marco Rossi", "Luigi Bianchi"],
    "night": ["Paolo Verdi", "Anna Neri"]
  },
  "2025-08-02": {
    "day": ["Anna Neri", "Paolo Verdi"],
    "night": ["Marco Rossi", "Luigi Bianchi"]
  }
}
```

#### Funzionalità Turni:

-   **Pianificazione mensile**: Vista calendario con assegnazioni
-   **Pattern predefiniti**: Rotazioni automatiche salvabili
-   **Validazione conflitti**: Controllo sovrapposizioni e disponibilità
-   **Integrazione task**: Assignment automatico basato sui turni

### 5. Sistema Note

Sistema di annotazioni collegato a task e logbook:

```javascript
// Struttura nota
{
  "text": "Testo della nota",
  "author": "Nome Autore",
  "timestamp": "2025-08-01T10:30:00.000Z",
  "type": "user|system" // user: manuale, system: automatica
}

// Note di sistema automatiche
"Assegnato a Mario Rossi da Luigi Bianchi"
"Stato cambiato da 'in corso' a 'completato'"
"Task modificato da Paolo Verdi"
```

#### Storage Note:

```javascript
// Struttura notes.json
{
  "taskNotes": {
    "123": [
      {
        "text": "Nota collegata al task ID 123",
        "author": "Marco Rossi",
        "timestamp": "2025-08-01T10:30:00.000Z"
      }
    ]
  },
  "logbookNotes": {
    "logbook_entry_key": [
      {
        "text": "Nota collegata all'entry logbook",
        "author": "Luigi Bianchi",
        "timestamp": "2025-08-01T11:00:00.000Z"
      }
    ]
  }
}
```

### 6. Upload e Gestione Immagini

Sistema integrato per allegare immagini a task e logbook:

#### Configurazione Upload:

```javascript
// backend-team-manager/middleware/upload.js
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/task-images/");
    },
    filename: (req, file, cb) => {
        const uniqueName = `task_image_${Date.now()}_${Math.round(
            Math.random() * 1e9
        )}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(
            path.extname(file.originalname).toLowerCase()
        );
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error("Solo immagini sono permesse"));
        }
    },
});
```

## Database e Storage

### Architettura Attuale (JSON Files)

Il sistema utilizza attualmente file JSON per lo storage dei dati:

#### Vantaggi dell'Approccio JSON:

-   ✅ **Zero Setup**: Nessuna configurazione database
-   ✅ **Portabilità**: File facilmente trasferibili
-   ✅ **Backup Semplice**: Copia diretta dei file
-   ✅ **Debug Facile**: Lettura diretta dei dati
-   ✅ **Versioning**: Git tracking delle modifiche

#### Limitazioni Attuali:

-   ❌ **Concorrenza**: Problemi con accessi simultanei
-   ❌ **Scalabilità**: Prestazioni degradate con molti dati
-   ❌ **Query Complesse**: Filtraggi limitati
-   ❌ **Transazioni**: Nessuna garanzia ACID
-   ❌ **Relazioni**: Difficile gestire relazioni complesse

### Struttura File Dati

#### 1. Task Database (`data/tasks.json`)

```javascript
[
  {
    "id": 1,
    "title": "Task Title",
    "description": "Detailed description",
    "assignedTo": "Operator Name",
    "simulator": "FTD",
    "category": "routine task",
    "subcategory": "PM",
    "status": "in corso",
    "date": "2025-08-01",
    "time": "10:30",
    "images": [...],
    "createdAt": "2025-08-01T08:00:00.000Z",
    "updatedAt": "2025-08-01T10:30:00.000Z"
  }
]
```

#### 2. Users Database (`data/users.json`)

```javascript
[
    {
        id: 1,
        name: "Marco Rossi",
        email: "marco.rossi@company.com",
        password: "password123", // TODO: hash
        role: "employee",
        department: "Operations",
        active: true,
    },
];
```

#### 3. Logbook Files (`data/YYYY-MM-DD.json`)

```javascript
[
  {
    "id": "uuid-string",
    "title": "Operation Name",
    "text": "Detailed description",
    "category": "routine task",
    "subcategory": "PM",
    "simulator": "FTD",
    "time": "14:30",
    "author": "Operator Name",
    "images": [...]
  }
]
```

#### 4. Shifts Database (`data/shifts-YYYY-MM.json`)

```javascript
{
  "2025-08-01": {
    "day": ["Marco Rossi", "Luigi Bianchi"],
    "night": ["Paolo Verdi", "Anna Neri"]
  }
}
```

#### 5. Notes Database (`data/notes.json`)

```javascript
{
  "taskNotes": {
    "123": [
      {
        "text": "Note text",
        "author": "Author Name",
        "timestamp": "2025-08-01T10:30:00.000Z",
        "type": "user"
      }
    ]
  },
  "logbookNotes": {
    "entry_key": [...]
  }
}
```

#### 6. Patterns Database (`data/patterns.json`)

```javascript
[
    {
        name: "Rotazione Standard",
        days: [
            {
                date: "2025-08-01",
                day: ["Operatore1", "Operatore2"],
                night: ["Operatore3", "Operatore4"],
            },
        ],
    },
];
```

## Migrazioni Future verso Database

### Raccomandazioni Database

#### Opzione 1: PostgreSQL (Raccomandato per Produzione)

```sql
-- Schema PostgreSQL suggerito

-- Tabella utenti
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hash
    role VARCHAR(50) NOT NULL CHECK (role IN ('employee', 'admin', 'manager', 'superuser')),
    department VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella task
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to_id INTEGER REFERENCES users(id),
    simulator VARCHAR(50),
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    extra_detail VARCHAR(100),
    status VARCHAR(50) NOT NULL CHECK (status IN ('da definire', 'in corso', 'completato', 'non completato', 'riassegnato')),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella immagini task
CREATE TABLE task_images (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella logbook entries
CREATE TABLE logbook_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    simulator VARCHAR(50),
    entry_date DATE NOT NULL,
    entry_time TIME NOT NULL,
    author_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella immagini logbook
CREATE TABLE logbook_images (
    id SERIAL PRIMARY KEY,
    logbook_entry_id UUID REFERENCES logbook_entries(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella turni
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    shift_date DATE NOT NULL,
    shift_type VARCHAR(10) NOT NULL CHECK (shift_type IN ('day', 'night')),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(shift_date, shift_type, user_id)
);

-- Tabella note
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    author_id INTEGER REFERENCES users(id),
    note_type VARCHAR(20) NOT NULL CHECK (note_type IN ('user', 'system')),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('task', 'logbook')),
    entity_id VARCHAR(100) NOT NULL, -- ID del task o UUID logbook entry
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella pattern turni
CREATE TABLE shift_patterns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    pattern_data JSONB NOT NULL, -- Store pattern structure
    created_by_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici per performance
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to_id);
CREATE INDEX idx_tasks_date ON tasks(scheduled_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_logbook_date ON logbook_entries(entry_date);
CREATE INDEX idx_logbook_author ON logbook_entries(author_id);
CREATE INDEX idx_shifts_date ON shifts(shift_date);
CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);
```

#### Opzione 2: MySQL/MariaDB

Schema simile a PostgreSQL con sintassi MySQL.

#### Opzione 3: SQLite (per Setup Semplici)

Ideale per mantenere la semplicità del file-based approach.

### Piano di Migrazione

#### Fase 1: Preparazione

1. **Backup completo** dei dati JSON esistenti
2. **Setup database** scelto (PostgreSQL raccomandato)
3. **Installazione ORM**: Sequelize, Prisma, o TypeORM
4. **Configurazione ambiente** con variabili database

#### Fase 2: Schema e Migrazione Dati

```javascript
// Esempio script migrazione con Sequelize
const { Sequelize, DataTypes } = require("sequelize");
const fs = require("fs");

const sequelize = new Sequelize({
    dialect: "postgresql",
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
});

// Definizione modelli
const User = sequelize.define("User", {
    name: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    passwordHash: DataTypes.STRING,
    role: DataTypes.ENUM("employee", "admin", "manager", "superuser"),
    department: DataTypes.STRING,
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
});

const Task = sequelize.define("Task", {
    title: DataTypes.STRING,
    description: DataTypes.TEXT,
    simulator: DataTypes.STRING,
    category: DataTypes.STRING,
    subcategory: DataTypes.STRING,
    status: DataTypes.ENUM(
        "da definire",
        "in corso",
        "completato",
        "non completato",
        "riassegnato"
    ),
    scheduledDate: DataTypes.DATEONLY,
    scheduledTime: DataTypes.TIME,
});

// Relazioni
User.hasMany(Task, { foreignKey: "assignedToId" });
Task.belongsTo(User, { foreignKey: "assignedToId" });

// Script migrazione dati
async function migrateFromJSON() {
    await sequelize.sync({ force: true });

    // Migra utenti
    const usersData = JSON.parse(fs.readFileSync("./data/users.json"));
    for (const userData of usersData) {
        await User.create({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            passwordHash: userData.password, // TODO: hash with bcrypt
            role: userData.role,
            department: userData.department,
            active: userData.active,
        });
    }

    // Migra task
    const tasksData = JSON.parse(fs.readFileSync("./data/tasks.json"));
    for (const taskData of tasksData) {
        const assignedUser = await User.findOne({
            where: { name: taskData.assignedTo },
        });
        await Task.create({
            id: taskData.id,
            title: taskData.title,
            description: taskData.description,
            assignedToId: assignedUser?.id,
            simulator: taskData.simulator,
            category: taskData.category,
            subcategory: taskData.subcategory,
            status: taskData.status,
            scheduledDate: taskData.date,
            scheduledTime: taskData.time,
        });
    }

    console.log("Migrazione completata!");
}
```

#### Fase 3: Aggiornamento Controller

```javascript
// Esempio conversione controller da JSON a database
// Prima (JSON):
exports.getTasks = (req, res) => {
    res.json(tasks); // tasks = JSON.parse(fs.readFileSync('tasks.json'))
};

// Dopo (Database):
exports.getTasks = async (req, res) => {
    try {
        const tasks = await Task.findAll({
            include: [
                { model: User, as: "assignedTo" },
                { model: TaskImage },
                { model: Note },
            ],
            order: [
                ["scheduledDate", "DESC"],
                ["scheduledTime", "DESC"],
            ],
        });
        res.json(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ error: "Database error" });
    }
};
```

#### Fase 4: Ottimizzazioni Database

1. **Connection Pooling**: Configurazione pool connessioni
2. **Query Optimization**: Utilizzo indici e query efficienti
3. **Caching**: Redis per dati frequentemente acceduti
4. **Backup Automatici**: Script di backup schedulati

### Configurazione Database Environment

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=team_tech_manager
DB_USER=app_user
DB_PASS=secure_password

# Redis Cache (opzionale)
REDIS_URL=redis://localhost:6379

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760  # 10MB
```

### Benefici Post-Migrazione

-   ✅ **Performance**: Query ottimizzate e indicizzate
-   ✅ **Concorrenza**: Gestione transazioni ACID
-   ✅ **Scalabilità**: Supporto migliaia di utenti
-   ✅ **Relazioni**: Foreign keys e join efficienti
-   ✅ **Backup**: Strategie professionali di backup
-   ✅ **Security**: Hash password, SQL injection protection

## Deployment

### Deployment Produzione

#### Opzione 1: VPS/Server Dedicato

```bash
# Setup server Ubuntu/CentOS
sudo apt update && sudo apt upgrade -y

# Installa Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installa PM2 per process management
sudo npm install -g pm2

# Setup applicazione
git clone <repository>
cd Progetto-Web-App

# Setup backend
cd backend-team-manager
npm install --production
cp .env.example .env
# Configura variabili produzione in .env

# Setup frontend
cd ../team-tech-manager
npm install
npm run build

# Configurazione PM2
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'team-tech-backend',
    script: './backend-team-manager/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 'max',
    exec_mode: 'cluster'
  }]
};

# Start con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/team-tech-manager
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (serve build folder)
    location / {
        root /path/to/team-tech-manager/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploaded files
    location /uploads {
        alias /path/to/backend-team-manager/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/team-tech-manager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### SSL con Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### Opzione 2: Docker Deployment

```dockerfile
# Dockerfile.backend
FROM node:18-alpine
WORKDIR /app
COPY backend-team-manager/package*.json ./
RUN npm ci --only=production
COPY backend-team-manager/ ./
EXPOSE 5000
CMD ["npm", "start"]

# Dockerfile.frontend
FROM node:18-alpine as build
WORKDIR /app
COPY team-tech-manager/package*.json ./
RUN npm ci
COPY team-tech-manager/ ./
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

```yaml
# docker-compose.yml
version: "3.8"
services:
    backend:
        build:
            context: .
            dockerfile: Dockerfile.backend
        ports:
            - "5000:5000"
        environment:
            - NODE_ENV=production
            - SECRET_KEY=${SECRET_KEY}
        volumes:
            - ./backend-team-manager/data:/app/data
            - ./backend-team-manager/uploads:/app/uploads
        restart: unless-stopped

    frontend:
        build:
            context: .
            dockerfile: Dockerfile.frontend
        ports:
            - "80:80"
        depends_on:
            - backend
        restart: unless-stopped

    # Opzionale: database per future migrazioni
    postgres:
        image: postgres:15-alpine
        environment:
            POSTGRES_DB: team_tech_manager
            POSTGRES_USER: ${DB_USER}
            POSTGRES_PASSWORD: ${DB_PASS}
        volumes:
            - postgres_data:/var/lib/postgresql/data
        restart: unless-stopped

volumes:
    postgres_data:
```

#### Opzione 3: Cloud Deployment (AWS/Azure/GCP)

**AWS Setup:**

```bash
# Install AWS CLI
pip install awscli

# Configure credentials
aws configure

# Deploy con Elastic Beanstalk
zip -r app.zip . -x "*.git*" "node_modules/*"
aws elasticbeanstalk create-application --application-name team-tech-manager
```

**Vercel (Frontend) + Railway (Backend):**

-   Frontend su Vercel (deploy automatico da Git)
-   Backend su Railway/Heroku per semplicità

### Configurazioni Produzione

#### Environment Variables

```env
# Backend Production (.env)
NODE_ENV=production
PORT=5000
SECRET_KEY=super_secure_jwt_secret_change_this
REACT_APP_API_URL=https://your-domain.com

# Database (future migration)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=team_tech_manager
DB_USER=app_user
DB_PASS=secure_database_password

# File Upload
UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=10485760

# Security
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://your-domain.com
```

#### Security Hardening

```javascript
// Helmet per security headers
const helmet = require("helmet");
app.use(helmet());

// Rate limiting
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// CORS produzione
app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);
```

### Backup e Monitoring

#### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Script backup dati
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/team-tech-manager"

# Crea directory backup
mkdir -p $BACKUP_DIR

# Backup dati JSON
tar -czf $BACKUP_DIR/data_backup_$DATE.tar.gz ./backend-team-manager/data/

# Backup uploads
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz ./backend-team-manager/uploads/

# Cleanup vecchi backup (mantieni 30 giorni)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completato: $DATE"
```

#### Monitoring con PM2

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Setup log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# Monitor dashboard
pm2 web # http://localhost:9615
```

## Troubleshooting

### Problemi Comuni

#### 1. Errori di Autenticazione

```
Error: Invalid token / Missing token
```

**Soluzioni:**

-   Verificare che il token JWT sia presente in `localStorage`
-   Controllare scadenza token (20h default)
-   Verificare che `SECRET_KEY` sia identica tra frontend e backend
-   Clear browser cache e re-login

#### 2. Errori CORS

```
Error: Access to fetch blocked by CORS policy
```

**Soluzioni:**

-   Verificare configurazione CORS nel backend:

```javascript
app.use(
    cors({
        origin: "http://localhost:3000", // URL frontend
        credentials: true,
    })
);
```

-   Controllare variabile `REACT_APP_API_URL` nel frontend

#### 3. Upload Immagini Fallisce

```
Error: File upload failed / Image not found
```

**Soluzioni:**

-   Verificare permessi directory `uploads/`

```bash
chmod 755 uploads/
chmod 755 uploads/task-images/
```

-   Controllare spazio disco disponibile
-   Verificare limite file size in Multer config

#### 4. Dati Non Persistono

```
Changes not saved / Data lost after restart
```

**Soluzioni:**

-   Verificare permessi scrittura file JSON:

```bash
chmod 666 data/*.json
```

-   Controllare se processo ha accesso directory `data/`
-   Verificare che non ci siano errori nel salvataggio:

```javascript
// Aggiungere try-catch nei controller
try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
} catch (error) {
    console.error("Error saving data:", error);
    return res.status(500).json({ error: "Failed to save data" });
}
```

#### 5. Performance Lente

**Sintomi:**

-   Caricamento lento delle pagine
-   API response lente
-   Browser freeze

**Soluzioni:**

-   Ottimizzare file JSON (rimuovere dati vecchi)
-   Implementare pagination:

```javascript
// Esempio pagination tasks
exports.getTasks = (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedTasks = tasks.slice(startIndex, endIndex);
    res.json({
        tasks: paginatedTasks,
        total: tasks.length,
        page,
        totalPages: Math.ceil(tasks.length / limit),
    });
};
```

#### 6. Memory Leaks

**Sintomi:**

-   Uso RAM crescente nel tempo
-   Server crash per out of memory

**Soluzioni:**

-   Implementare cleanup intervals:

```javascript
// Cleanup cache periodicamente
setInterval(() => {
    // Clear old cached data
    console.log("Memory usage:", process.memoryUsage());
}, 60000);
```

### Debug Tools

#### Logging Avanzato

```javascript
// Logger con Winston
const winston = require("winston");

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: "error.log", level: "error" }),
        new winston.transports.File({ filename: "combined.log" }),
        new winston.transports.Console(),
    ],
});

// Uso nei controller
logger.info("Task created", { taskId: newTask.id, user: req.user.name });
logger.error("Database error", { error: error.message, stack: error.stack });
```

#### Health Check Endpoint

```javascript
// Route health check
app.get("/api/health", (req, res) => {
    const health = {
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development",
    };

    // Verifica connessioni (future database)
    try {
        // Test file system access
        fs.accessSync("./data", fs.constants.R_OK | fs.constants.W_OK);
        health.dataAccess = "OK";
    } catch (error) {
        health.dataAccess = "ERROR";
        health.status = "ERROR";
    }

    const statusCode = health.status === "OK" ? 200 : 503;
    res.status(statusCode).json(health);
});
```

### Support e Manutenzione

#### Aggiornamenti Sistema

```bash
# Update dependencies
npm audit
npm update

# Update Node.js
nvm install node --latest-npm
nvm use node

# Update PM2
pm2 update
```

#### Monitoraggio Logs

```bash
# PM2 logs
pm2 logs --lines 100

# System logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Application logs
tail -f combined.log
tail -f error.log
```

---

## Contatti e Supporto

Per supporto tecnico o domande:

-   **Repository**: [GitHub Repository URL]
-   **Documentazione**: Questo file
-   **Issues**: Utilizzare il sistema di issue di GitHub

---

_Documentazione aggiornata al: Agosto 2025_  
_Versione: 1.0.0_
