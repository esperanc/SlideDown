class ThemeManager {
    constructor() {
        this.themes = ['default', 'light'];
        this.currentThemeIndex = 0;
        this.storageKey = 'slidedown_theme_pref';
        this.linkElement = null;
    }

    init() {
        // 1. Criar ou pegar o elemento link do tema
        this._ensureLinkElement();

        // 2. Carregar preferência salva
        const savedTheme = localStorage.getItem(this.storageKey);
        if (savedTheme && this.themes.includes(savedTheme)) {
            this.currentThemeIndex = this.themes.indexOf(savedTheme);
        }

        // 3. Aplicar tema inicial
        this._applyTheme();

        // 4. Ouvir teclado
        document.addEventListener('keydown', (e) => this._handleKey(e));
    }

    _ensureLinkElement() {
        // Procura um link existente com id 'theme-style'
        this.linkElement = document.getElementById('theme-style');
        if (!this.linkElement) {
            // Se não existir, cria e insere ANTES do style.css principal
            // para garantir que as variáveis sejam carregadas, mas na verdade
            // em CSS variáveis, a ordem de importação importa para cascata, 
            // mas aqui estamos substituindo o valor.
            this.linkElement = document.createElement('link');
            this.linkElement.id = 'theme-style';
            this.linkElement.rel = 'stylesheet';
            
            const mainStyle = document.querySelector('link[href*="style.css"]');
            if (mainStyle) {
                mainStyle.parentNode.insertBefore(this.linkElement, mainStyle);
            } else {
                document.head.appendChild(this.linkElement);
            }
        }
    }

    _applyTheme() {
        const themeName = this.themes[this.currentThemeIndex];
        this.linkElement.href = `lib/themes/${themeName}.css`;
        console.log(`Switched to theme: ${themeName}`);
        
        // Salva preferência
        localStorage.setItem(this.storageKey, themeName);
    }

    _handleKey(e) {
        // Ignorar se estiver digitando em input/textarea (futuro)
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        if (e.key.toLowerCase() === 't') {
            this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
            this._applyTheme();
        }
    }
}

// Auto-inicializar
const themeManager = new ThemeManager();
// Espera o DOM estar pronto ou roda já se estiver no final do body, 
// mas como será incluído no head, melhor esperar ou usar defer.
// Vamos assumir load via script defer ou module, ou init explícito.
// Mas para facilitar, vamos exportar ou pendurar no window.
window.themeManager = themeManager;
