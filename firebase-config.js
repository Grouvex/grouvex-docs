// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAgoQ_Px3hHVrevUsyct_FBeXWMDKXpPSw",
  authDomain: "grouvex-studios.firebaseapp.com",
  databaseURL: "https://grouvex-studios-default-rtdb.firebaseio.com",
  projectId: "grouvex-studios",
  storageBucket: "grouvex-studios.appspot.com",
  messagingSenderId: "1070842606062",
  appId: "1:1070842606062:web:5d887863048fd100b49eff",
  measurementId: "G-75BR8D2CR3"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar servicios
const auth = firebase.auth();
const db = firebase.firestore();

// Configurar persistencia de autenticación
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Lista de emails autorizados (ajusta según necesites)
const authorizedEmails = [
    'admin@grouvex.com',
    'legal@grouvex.com',
    'grouvex.phoenix@grouvex.com',
    'director@grouvex.com'
];

// Función para verificar si un email está autorizado
function isAuthorized(email) {
    return authorizedEmails.includes(email) || email.endsWith('@grouvex.com');
}
