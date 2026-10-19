// --- IMPORTACIONES DE FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// NUEVO: Importamos el sistema de Autenticación
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// --- TU CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyA5sD6UUn7LeNs2ki2qFlNYq8S8eJaI0gA",
    authDomain: "pujllay-planificador.firebaseapp.com",
    projectId: "pujllay-planificador",
    storageBucket: "pujllay-planificador.firebasestorage.app",
    messagingSenderId: "466755189437",
    appId: "1:466755189437:web:6403ce84b9a5d3249d15d4"
};

// Inicializamos Firebase, Base de Datos y Autenticación
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const coleccionFormacion = collection(db, "formacion_pujllay");
const auth = getAuth(app); // NUEVO: Iniciamos el candado de seguridad

// --- CONFIGURACIÓN BÁSICA ---
const COLUMNAS = 4;
let filasActuales = 10;
let esAdmin = false; 
let puestoActual = null; 
let contadorId = 0; 

// Diccionario de roles
const rolesData = {
    nusta_diario: { icono: '<img src="img/nusta_diario.png" alt="Ñusta Diario" class="icono-img">', clase: 'rol-nusta-diario' },
    nusta_fiesta: { icono: '<img src="img/nusta_fiesta.png" alt="Ñusta de Fiesta" class="icono-img">', clase: 'rol-nusta-fiesta' },
    bailarin: { icono: '<img src="img/bailarin.png" alt="Bailarín" class="icono-img">', clase: 'rol-bailarin' },
    guerrero: { icono: '<img src="img/guerrero.png" alt="Guerrero" class="icono-img">', clase: 'rol-guerrero' },
    tata: { icono: '<img src="img/tata.png" alt="Tata" class="icono-img">', clase: 'rol-tata' },
    tarka: { icono: '<img src="img/tarka.png" alt="Tarka" class="icono-img">', clase: 'rol-tarka' },
    tambor: { icono: '<img src="img/tambor.png" alt="Tambor" class="icono-img">', clase: 'rol-tambor' },
    bombo: { icono: '<img src="img/bombo.png" alt="Bombo" class="icono-img">', clase: 'rol-bombo' },
    figura: { icono: '<img src="img/figura.png" alt="Figura" class="icono-img">', clase: 'rol-figura' }
};

// --- REFERENCIAS AL HTML ---
const contenedorCuadricula = document.getElementById('cuadricula-formacion');
const btnLogin = document.getElementById('btn-login');
const estadoModo = document.getElementById('estado-modo');
const modal = document.getElementById('modal-edicion');
const btnCancelar = document.getElementById('btn-cancelar');
const btnGuardar = document.getElementById('btn-guardar');
const btnLimpiar = document.getElementById('btn-limpiar');
const selectRol = document.getElementById('select-rol');
const inputNombre = document.getElementById('input-nombre');
const selectPago = document.getElementById('select-pago');
const modalLogin = document.getElementById('modal-login');
const inputCorreo = document.getElementById('input-correo');
const inputPassword = document.getElementById('input-password');
const btnIngresar = document.getElementById('btn-ingresar');
const btnCancelarLogin = document.getElementById('btn-cancelar-login');

// --- 1. GENERAR LA CUADRÍCULA Y ESCUCHAR A FIREBASE ---

function crearPuesto(idPuesto) {
    const divPuesto = document.createElement('div');
    divPuesto.classList.add('puesto', 'puesto-vacio');
    divPuesto.id = `puesto-${idPuesto}`; // ID único para buscarlo fácilmente
    divPuesto.dataset.id = idPuesto; 
    
    if (esAdmin) divPuesto.classList.add('editable');
    
    divPuesto.addEventListener('click', () => {
        if (esAdmin) abrirModal(divPuesto);
    });
    return divPuesto;
}

function inicializarCuadricula() {
    contenedorCuadricula.innerHTML = ''; 
    contadorId = 0;
    const totalInicial = COLUMNAS * filasActuales;
    
    for (let i = 0; i < totalInicial; i++) {
        contenedorCuadricula.appendChild(crearPuesto(contadorId++));
    }
    crearBotonAñadirFila();
    
    // UNA VEZ CREADA LA CUADRÍCULA, ESCUCHAMOS LOS DATOS DE LA NUBE
    escucharBaseDeDatos();
}

function crearBotonAñadirFila() {
    const contenedorBoton = document.createElement('div');
    contenedorBoton.style.textAlign = 'center';
    contenedorBoton.style.marginTop = '20px';
    
    const btnAgregar = document.createElement('button');
    btnAgregar.textContent = "+ Añadir nueva fila (4 puestos)";
    btnAgregar.className = 'btn-secundario oculto'; 
    btnAgregar.id = 'btn-agregar-fila';

    btnAgregar.addEventListener('click', () => {
        for (let i = 0; i < COLUMNAS; i++) {
            contenedorCuadricula.appendChild(crearPuesto(contadorId++));
        }
        filasActuales++;
    });

    contenedorBoton.appendChild(btnAgregar);
    contenedorCuadricula.parentNode.insertBefore(contenedorBoton, contenedorCuadricula.nextSibling);
}

// --- NUEVO: FUNCIÓN PARA SINCRONIZAR CON LA NUBE EN TIEMPO REAL ---
function escucharBaseDeDatos() {
    // onSnapshot es la magia de Firebase: avisa al instante si hay cambios
    onSnapshot(coleccionFormacion, (snapshot) => {
        snapshot.forEach((documentoFirebase) => {
            const datos = documentoFirebase.data();
            const idPuesto = documentoFirebase.id; // Ej. "puesto-5"
            
            // Buscamos si el cuadradito existe en nuestra pantalla
            const divPuesto = document.getElementById(idPuesto);
            
            // Si existe y tiene datos de alguien, lo pintamos
            if (divPuesto && datos.rol && datos.rol !== "") {
                pintarPuesto(divPuesto, datos.rol, datos.nombre, datos.pago);
            } else if (divPuesto) {
                // Si el dato en la nube está vacío, limpiamos el cuadradito
                limpiarPuestoVisualmente(divPuesto);
            }
        });
    });
}

// Función auxiliar para pintar el cuadradito (reutilizable)
function pintarPuesto(div, rol, nombre, pago) {
    div.className = 'puesto puesto-ocupado';
    if (esAdmin) div.classList.add('editable');
    div.classList.add(rolesData[rol].clase);
    
    div.dataset.rol = rol;
    div.dataset.nombre = nombre;
    div.dataset.pago = pago;

    let htmlPago = '';
    if (pago === 'pagado') {
        htmlPago = '<div class="badge-pago pago-pagado">💰 Pagado</div>';
    } else if (pago === 'acuenta') {
        htmlPago = '<div class="badge-pago pago-acuenta">🪙 A cuenta</div>';
    } else {
        htmlPago = '<div class="badge-pago pago-debe">⚠️ Debe</div>';
    }

    // Buscamos el nombre visible del rol en el <select>
    const opcionSeleccionada = Array.from(selectRol.options).find(opt => opt.value === rol);
    const nombreRolTexto = opcionSeleccionada ? opcionSeleccionada.text : rol;

    div.innerHTML = `
        ${htmlPago}
        <div class="puesto-icono">${rolesData[rol].icono}</div>
        <div class="puesto-rol">${nombreRolTexto}</div>
        <div class="puesto-nombre">${nombre}</div>
    `;
}

// Función auxiliar para vaciar un cuadradito
function limpiarPuestoVisualmente(div) {
    div.className = 'puesto puesto-vacio';
    if (esAdmin) div.classList.add('editable');
    div.dataset.rol = "";
    div.dataset.nombre = "";
    div.dataset.pago = "";
    div.innerHTML = ""; 
}

// --- 2. SISTEMA DE SEGURIDAD Y LOGIN REAL ---

// A. Escuchar si alguien inició sesión o se salió
onAuthStateChanged(auth, (usuario) => {
    const btnAgregarFila = document.getElementById('btn-agregar-fila');

    if (usuario) {
        // Hay un usuario logueado
        esAdmin = true;
        estadoModo.textContent = "Modo: " + usuario.email; // Mostramos el correo del admin
        estadoModo.classList.remove('modo-vista');
        estadoModo.classList.add('modo-admin');
        btnLogin.textContent = "Cerrar Sesión";
        
        document.querySelectorAll('.puesto').forEach(p => p.classList.add('editable'));
        if (btnAgregarFila) btnAgregarFila.classList.remove('oculto');
    } else {
        // Nadie está logueado (Modo Vista)
        esAdmin = false;
        estadoModo.textContent = "Modo: Solo Lectura";
        estadoModo.classList.remove('modo-admin');
        estadoModo.classList.add('modo-vista');
        btnLogin.textContent = "Acceso Admin";
        
        document.querySelectorAll('.puesto').forEach(p => p.classList.remove('editable'));
        if (btnAgregarFila) btnAgregarFila.classList.add('oculto');
    }
});

// B. Botón Superior de "Acceso Admin" / "Cerrar Sesión"
btnLogin.addEventListener('click', () => {
    if (!esAdmin) {
        // Abrir la ventanita de login
        modalLogin.classList.remove('oculto');
        inputCorreo.value = "";
        inputPassword.value = "";
        inputCorreo.focus();
    } else {
        // Si ya está logueado, al hacer clic cierra la sesión en Firebase
        signOut(auth).then(() => {
        }).catch((error) => {
            console.error(error);
        });
    }
});

// C. Control del Modal de Login
btnCancelarLogin.addEventListener('click', () => {
    modalLogin.classList.add('oculto');
});

// D. Intentar Iniciar Sesión con Firebase
btnIngresar.addEventListener('click', () => {
    const correo = inputCorreo.value.trim();
    const password = inputPassword.value;

    if(correo === "" || password === "") {
        alert("Por favor, llena ambos campos.");
        return;
    }

    // Le pedimos a Firebase que verifique la cuenta
    signInWithEmailAndPassword(auth, correo, password)
        .then((userCredential) => {
            // Éxito: Firebase nos deja entrar
            modalLogin.classList.add('oculto');
        })
        .catch((error) => {
            // Error: Contraseña o correo equivocados
            const errorCode = error.code;
            if(errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') {
                alert("Correo o contraseña incorrectos.");
            } else {
                alert("Error al iniciar sesión: " + error.message);
            }
        });
});

// --- 3. CONTROL DE LA VENTANA MODAL Y GUARDADO EN FIREBASE ---
function abrirModal(puestoDiv) {
    puestoActual = puestoDiv; 
    if (puestoDiv.dataset.rol) {
        selectRol.value = puestoDiv.dataset.rol;
        inputNombre.value = puestoDiv.dataset.nombre;
        selectPago.value = puestoDiv.dataset.pago || "debe";
        btnLimpiar.classList.remove('oculto'); 
    } else {
        selectRol.value = "vacio";
        inputNombre.value = "";
        selectPago.value = "debe";
        btnLimpiar.classList.add('oculto'); 
    }
    modal.classList.remove('oculto');
    inputNombre.focus(); 
}

function cerrarModal() {
    modal.classList.add('oculto');
    puestoActual = null;
}

btnCancelar.addEventListener('click', cerrarModal);

// NUEVO: Al hacer clic en GUARDAR, pintamos en pantalla y enviamos a la NUBE
btnGuardar.addEventListener('click', async () => {
    const rolSeleccionado = selectRol.value;
    const nombreAsignado = inputNombre.value.trim();
    const estadoPago = selectPago.value;

    if (rolSeleccionado === "vacio") { alert("Selecciona un rol."); return; }
    if (nombreAsignado === "") { alert("Ingresa el nombre."); return; }

    const idDelPuesto = puestoActual.id; // Ej. "puesto-5"

    // 1. PINTAMOS INMEDIATAMENTE EN LA PANTALLA (Plan de respaldo)
    pintarPuesto(puestoActual, rolSeleccionado, nombreAsignado, estadoPago);

    // 2. CERRAMOS LA VENTANA
    cerrarModal();

    // 3. ENVIAMOS A FIREBASE EN SEGUNDO PLANO
    try {
        await setDoc(doc(coleccionFormacion, idDelPuesto), {
            rol: rolSeleccionado,
            nombre: nombreAsignado,
            pago: estadoPago
        });
    } catch (error) {
        console.error("Error al guardar en la nube:", error);
        alert("Atención: El danzarín se guardó en tu pantalla, pero hubo un error al enviarlo a la base de datos.");
    }
});

// NUEVO: Al hacer clic en VACIAR
btnLimpiar.addEventListener('click', async () => {
    const idDelPuesto = puestoActual.id;

    // 1. LIMPIAMOS INMEDIATAMENTE EN LA PANTALLA
    limpiarPuestoVisualmente(puestoActual);

    // 2. CERRAMOS LA VENTANA
    cerrarModal();

    // 3. BORRAMOS EN FIREBASE EN SEGUNDO PLANO
    try {
        await setDoc(doc(coleccionFormacion, idDelPuesto), {
            rol: "",
            nombre: "",
            pago: ""
        });
    } catch (error) {
        console.error("Error al borrar en la nube:", error);
    }
});

// NUEVO: Al hacer clic en VACIAR, borramos los datos en la NUBE
btnLimpiar.addEventListener('click', async () => {
    const idDelPuesto = puestoActual.id;

    try {
        await setDoc(doc(coleccionFormacion, idDelPuesto), {
            rol: "",
            nombre: "",
            pago: ""
        });
        cerrarModal();
    } catch (error) {
        console.error("Error al borrar:", error);
        alert("Hubo un error al borrar en la nube.");
    }
});

// --- INICIAR TODO ---
inicializarCuadricula();