// electron-patch.cjs - Carregado via -r antes do main.cjs
// Faz monkey-patch do Module._load para interceptar 'electron' e retornar o módulo interno

const Module = require('module');
const originalLoad = Module._load;

Module._load = function(request, parent, isMain) {
  if (request === 'electron') {
    // Tenta carregar o módulo interno do Electron
    try {
      return originalLoad('electron', parent, isMain);
    } catch (e) {
      // Se falhar, cria um mock mínimo
      console.warn('[electron-patch] Falha ao carregar módulo interno electron:', e.message);
    }
  }
  return originalLoad(request, parent, isMain);
};

// Também patcha require global para capturar require('electron') direto
const originalRequire = module.constructor.prototype.require;
module.constructor.prototype.require = function(request) {
  if (request === 'electron') {
    try {
      return originalLoad('electron', this, false);
    } catch (e) {
      console.warn('[electron-patch] require(electron) falhou:', e.message);
    }
  }
  return originalRequire.apply(this, arguments);
};

console.log('[electron-patch] Module._load patch aplicado');