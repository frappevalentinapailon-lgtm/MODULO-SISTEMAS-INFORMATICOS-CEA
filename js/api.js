// js/api.js - MOCK API para funcionar sin backend

const API_URL = "https://modulos-cea-backend.up.railway.app";
window.API_URL = API_URL;

// Inicializar base de datos en localStorage
function initDB() {
    const defaultUsers = [
        { id: 1, nombre: 'EduConnectRuben', apellido: '', email: 'admin@sistemas.com', password: '74420831', rol: 'administrador', estado: 'activo' },
        { id: 2, nombre: 'Ruben', apellido: '', email: 'profesor@sistemas.com', password: '74420832', rol: 'profesor', estado: 'activo', nivel_asignado: 'Todos' },
        { id: 3, nombre: 'Maritza', apellido: '', email: 'estudiante@sistemas.com', password: '74420833', rol: 'estudiante', estado: 'activo', nivel_asignado: 'Todos' }
    ];

    if (!localStorage.getItem('db_users')) {
        localStorage.setItem('db_users', JSON.stringify(defaultUsers));
    } else {
        let users = JSON.parse(localStorage.getItem('db_users'));
        defaultUsers.forEach(defU => {
            const idx = users.findIndex(u => u.id === defU.id);
            if(idx !== -1) {
                users[idx].email = defU.email;
                users[idx].password = defU.password;
                users[idx].nombre = defU.nombre;
                users[idx].apellido = defU.apellido;
                users[idx].nivel_asignado = defU.nivel_asignado;
            } else {
                users.push(defU);
            }
        });
        localStorage.setItem('db_users', JSON.stringify(users));
    }
    if (!localStorage.getItem('db_modulos') || JSON.parse(localStorage.getItem('db_modulos')).length < 20) {
        const modulos = [];
        let modId = 1;
        const MALLA_NOMBRES = [
            "TALLER DE SISTEMAS OPERATIVOS I", "MATEMÁTICA PARA LA INFORMÁTICA", "PROGRAMACIÓN I-A", "HARDWARE DE COMPUTADORAS I", "EMERGENTE I (INTELIGENCIA ARTIFICIAL BÁSICA)",
            "TALLER DE SISTEMAS OPERATIVOS II", "OFIMÁTICA Y TECNOLOGÍA MULTIMEDIA I", "PROGRAMACIÓN I-B", "HARDWARE DE COMPUTADORAS II", "EMERGENTE II (PROMPTS BÁSICOS)",
            "INGLÉS TÉCNICO", "DISEÑO Y PROGRAMACIÓN WEB I-A", "PROGRAMACIÓN I-C", "OFIMÁTICA Y TECNOLOGÍA MULTIMEDIA II", "EMPRENDIMIENTO PRODUCTIVO E IA APLICADA",
            "REDES DE COMPUTADORAS I", "DISEÑO Y PROGRAMACIÓN WEB I-B", "BASE DE DATOS I", "PROGRAMACIÓN MÓVIL I", "MODALIDADES DE GRADUACIÓN Y PROYECTO FINAL"
        ];
        
        MALLA_NOMBRES.forEach((nombre) => {
            modulos.push({
                id: modId++,
                nombre: nombre,
                profesor_id: 2, 
                descripcion: 'Módulo de ' + nombre,
                fecha_creacion: new Date().toISOString()
            });
        });
        localStorage.setItem('db_modulos', JSON.stringify(modulos));
    }
}
initDB();

// Helpers DB
const getDB = (key) => JSON.parse(localStorage.getItem(key)) || [];
const saveDB = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// Interceptar fetch
const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    
    // Check if resource is a Request object
    let urlStr = '';
    if (typeof resource === 'string') {
        urlStr = resource;
    } else if (resource instanceof Request) {
        urlStr = resource.url;
        if (!config) config = { method: resource.method, body: resource.body, headers: resource.headers };
    }

    if (!urlStr.startsWith(API_URL)) {
        return originalFetch.apply(this, arguments);
    }

    const url = new URL(urlStr);
    const path = url.pathname;
    const method = config?.method || 'GET';
    const bodyStr = config?.body;

    console.log(`[MOCK API] ${method} ${path}`);

    const createResponse = (status, data) => {
        return new Response(JSON.stringify(data), {
            status,
            headers: { 'Content-Type': 'application/json' }
        });
    };

    // Simular latencia
    await new Promise(r => setTimeout(r, 400));

    try {
        // --- AUTH ---
        if (path === '/auth/login' && method === 'POST') {
            const params = new URLSearchParams(bodyStr);
            const username = params.get('username');
            const password = params.get('password');
            const users = getDB('db_users');
            const user = users.find(u => u.email === username && u.password === password);
            if (user) {
                if (user.estado === 'pausado') return createResponse(400, {detail: "Usuario pausado"});
                return createResponse(200, {
                    access_token: 'mock-token-' + user.id,
                    nombre: user.nombre + ' ' + (user.apellido || ''),
                    rol: user.rol,
                    nivel_asignado: user.nivel_asignado
                });
            }
            return createResponse(401, {detail: "Credenciales incorrectas"});
        }

        if (path === '/auth/profesores' && method === 'GET') {
            const users = getDB('db_users').filter(u => u.rol === 'profesor');
            return createResponse(200, {profesores: users});
        }

        if (path === '/auth/estudiantes' && method === 'GET') {
            const users = getDB('db_users').filter(u => u.rol === 'estudiante');
            return createResponse(200, {estudiantes: users});
        }

        if (path === '/auth/register-profesor' && method === 'POST') {
            const nombre = url.searchParams.get('nombre');
            const apellido = url.searchParams.get('apellido');
            const carnet = url.searchParams.get('carnet');
            const nivel_asignado = url.searchParams.get('nivel_asignado');
            
            const users = getDB('db_users');
            if (users.find(u => u.email === carnet)) return createResponse(400, {detail: "Carnet ya existe"});
            
            const newU = {
                id: Date.now(), nombre, apellido, email: carnet, password: carnet,
                rol: 'profesor', estado: 'activo', nivel_asignado, carnet
            };
            users.push(newU);
            saveDB('db_users', users);
            return createResponse(200, {email: carnet});
        }

        if (path === '/auth/register-estudiante' && method === 'POST') {
            const data = JSON.parse(bodyStr);
            const users = getDB('db_users');
            if (users.find(u => u.email === data.carnet)) return createResponse(400, {detail: "Carnet ya existe"});
            
            const newU = {
                id: Date.now(), nombre: data.nombre, apellido: data.apellido, email: data.carnet, password: data.carnet,
                rol: 'estudiante', estado: 'activo', nivel_asignado: data.nivel_asignado, carnet: data.carnet
            };
            users.push(newU);
            saveDB('db_users', users);
            return createResponse(200, {email: data.carnet});
        }

        // --- UPDATE / DELETE USERS ---
        if (path.match(/^\/auth\/usuarios\/\d+\/estado$/) && method === 'PUT') {
            const id = parseInt(path.split('/')[3]);
            const data = JSON.parse(bodyStr);
            const users = getDB('db_users');
            const u = users.find(u => u.id === id);
            if (u) { u.estado = data.estado; saveDB('db_users', users); return createResponse(200, {}); }
            return createResponse(404, {detail: "Not found"});
        }

        if (path.match(/^\/auth\/usuarios\/\d+$/) && method === 'DELETE') {
            const id = parseInt(path.split('/')[3]);
            let users = getDB('db_users');
            users = users.filter(u => u.id !== id);
            saveDB('db_users', users);
            return createResponse(200, {});
        }

        if (path.match(/^\/auth\/usuarios\/\d+\/password$/) && method === 'PUT') {
            const id = parseInt(path.split('/')[3]);
            const data = JSON.parse(bodyStr);
            const users = getDB('db_users');
            const u = users.find(u => u.id === id);
            if (u) { u.password = data.new_password; saveDB('db_users', users); return createResponse(200, {}); }
            return createResponse(404, {detail: "Not found"});
        }

        if (path === '/auth/update-password' && method === 'PUT') {
            const data = JSON.parse(bodyStr);
            let token = '';
            if (config.headers && typeof config.headers.get === 'function') token = config.headers.get('Authorization');
            else if (config.headers) token = config.headers['Authorization'];
            
            if (token) {
                const id = parseInt(token.replace('Bearer mock-token-', ''));
                const users = getDB('db_users');
                const u = users.find(u => u.id === id);
                if (u) { u.password = data.new_password; saveDB('db_users', users); return createResponse(200, {}); }
            }
            return createResponse(404, {detail: "Not found"});
        }

        if (path === '/auth/bulk-register' && method === 'POST') {
            return createResponse(200, {registrados: 1, errores: []});
        }

        // --- MODULOS ---
        if (path === '/modulos/' && method === 'GET') {
            return createResponse(200, {modulos: getDB('db_modulos')});
        }

        if (path.match(/^\/modulos\/\d+\/contenidos$/) && method === 'GET') {
            const modId = parseInt(path.split('/')[2]);
            const conts = getDB('db_contenidos').filter(c => c.modulo_id === modId);
            return createResponse(200, {contenidos: conts});
        }

        if (path === '/modulos/contenido' && method === 'POST') {
            const data = JSON.parse(bodyStr);
            let conts = getDB('db_contenidos');
            // Check if exists to update
            const idx = conts.findIndex(c => c.modulo_id === data.modulo_id && c.tema_num === data.tema_num && c.tipo === data.tipo);
            if (idx >= 0) {
                conts[idx].url = data.url;
                conts[idx].titulo = data.titulo;
            } else {
                conts.push({id: Date.now(), ...data});
            }
            saveDB('db_contenidos', conts);
            return createResponse(200, {});
        }

        if (path === '/modulos/stats' && method === 'GET') {
            return createResponse(200, {
                modulos: getDB('db_modulos').length,
                materiales_publicados: getDB('db_contenidos').length
            });
        }

        return createResponse(404, {detail: "Endpoint mock no encontrado"});
    } catch (e) {
        console.error(e);
        return createResponse(500, {detail: "Mock error: " + e.message});
    }
};
