class ThemeManager {
    constructor() {
        // Color themes
        this.themes = ['default', 'light'];
        this.currentThemeIndex = 0;
        this.storageKey = 'slidedown_theme_pref';
        this.linkElement = null;
        
        // Font themes
        this.fontThemes = ['modern-sans', 'classic-serif', 'tech-modern', 'elegant-serif'];
        this.currentFontIndex = 0;
        this.fontStorageKey = 'slidedown_font_pref';
        this.fontLinkElement = null;
    }

    init() {
        // 1. Criar ou pegar os elementos link
        this._ensureLinkElement();
        this._ensureFontLinkElement();

        // 2. Carregar preferências salvas
        const savedTheme = localStorage.getItem(this.storageKey);
        if (savedTheme && this.themes.includes(savedTheme)) {
            this.currentThemeIndex = this.themes.indexOf(savedTheme);
        }
        
        const savedFont = localStorage.getItem(this.fontStorageKey);
        if (savedFont && this.fontThemes.includes(savedFont)) {
            this.currentFontIndex = this.fontThemes.indexOf(savedFont);
        }

        // 3. Aplicar temas iniciais
        this._applyTheme();
        this._applyFontTheme();

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

    _ensureFontLinkElement() {
        // Procura um link existente com id 'font-theme-style'
        this.fontLinkElement = document.getElementById('font-theme-style');
        if (!this.fontLinkElement) {
            this.fontLinkElement = document.createElement('link');
            this.fontLinkElement.id = 'font-theme-style';
            this.fontLinkElement.rel = 'stylesheet';
            
            // Insere após o theme-style mas antes do style.css principal
            const themeStyle = document.getElementById('theme-style');
            if (themeStyle && themeStyle.nextSibling) {
                themeStyle.parentNode.insertBefore(this.fontLinkElement, themeStyle.nextSibling);
            } else {
                document.head.appendChild(this.fontLinkElement);
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
    
    _applyFontTheme() {
        const fontName = this.fontThemes[this.currentFontIndex];
        this.fontLinkElement.href = `lib/fonts/${fontName}.css`;
        console.log(`Switched to font: ${fontName}`);
        
        // Salva preferência
        localStorage.setItem(this.fontStorageKey, fontName);
    }

    _handleKey(e) {
        // Ignorar se estiver digitando em input/textarea (futuro)
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        if (e.key.toLowerCase() === 't') {
            this.currentThemeIndex = (this.currentThemeIndex + 1) % this.themes.length;
            this._applyTheme();
        }
        
        if (e.key.toLowerCase() === 'f') {
            this.currentFontIndex = (this.currentFontIndex + 1) % this.fontThemes.length;
            this._applyFontTheme();
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
