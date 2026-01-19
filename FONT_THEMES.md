# Font Theme System

SlideDown now supports 4 independent font themes that can be cycled during presentations!

## Available Font Themes

1. **Modern Sans** (Default)
   - Distinctive, wide sans-serif
   - Best for: Clear, readable presentations
   - Fonts: Trebuchet MS, Verdana, Segoe UI

2. **Classic Serif**
   - Traditional serif fonts
   - Best for: Academic content, literature
   - Fonts: Georgia, Times New Roman, Palatino

3. **Tech Modern**
   - Contemporary web fonts (requires internet)
   - Best for: Tech talks, startup pitches
   - Fonts: Inter, JetBrains Mono

4. **Elegant Serif**
   - Sophisticated serif web fonts (requires internet)
   - Best for: Formal presentations, conferences
   - Fonts: Crimson Pro, Source Code Pro

## Usage

### Keyboard Shortcut
Press **`F`** during your presentation to cycle through font themes.

### Persistence
Your font theme preference is saved in localStorage and will be remembered across sessions.

## Theme Independence

Font themes work independently from color themes:
- Press **`T`** to cycle color themes (dark/light)
- Press **`F`** to cycle font themes

You can mix and match any color theme with any font theme!

## Technical Details

Font themes are loaded as separate CSS files from `lib/fonts/`:
- `modern-sans.css` - System fonts
- `classic-serif.css` - Classic serif fonts
- `tech-modern.css` - Inter + JetBrains Mono (Google Fonts)
- `elegant-serif.css` - Crimson Pro + Source Code Pro (Google Fonts)

**Note**: Themes using Google Fonts (tech-modern, elegant-serif) require an internet connection to load properly.
