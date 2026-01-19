# Zoom Position Adjustment Feature

## Overview
When the browser zoom is manually adjusted (Cmd+/Cmd- or Ctrl+/Ctrl-), SlideDown now automatically adjusts the scroll position to keep the current slide properly aligned in the viewport.

## How It Works

### Detection
- Monitors `window.devicePixelRatio` for changes (browser zoom changes this value)
- Listens to `resize` events from both `window` and `visualViewport`
- Uses debouncing (150ms) to avoid excessive recalculations during continuous zooming

### Adjustment Process
1. **Detects zoom change**: Compares current `devicePixelRatio` with stored value
2. **Gets current slide**: Identifies which slide is currently in view
3. **Recalculates layout**: Runs `_setupScrollSteps()` to recalculate overflow and reveal steps based on new dimensions
4. **Adjusts scroll position**: Sets `scrollTop` to maintain the current slide at its proper position

### Benefits
- **Smooth experience**: Users can zoom in/out without losing their place
- **Accessibility**: Makes zooming more usable for users who need larger text
- **Consistent navigation**: Maintains the expected scrolling behavior after zoom

## Technical Implementation

### State Tracking
```javascript
// In constructor
this._currentZoom = window.devicePixelRatio;
```

### Zoom Detection
```javascript
_initZoomObserver() {
  const handleZoomChange = () => {
    if (Math.abs(newZoom - this._currentZoom) > 0.01) {
      const { index } = this._getCurrentSlideInfo();
      this._currentZoom = newZoom;
      this._setupScrollSteps();
      requestAnimationFrame(() => {
        this.container.scrollTop = this._getScrollPositionForSlide(index);
      });
    }
  };
  window.addEventListener('resize', handleZoomChange);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleZoomChange);
  }
}
```

## Testing
You can test this feature by:
1. Opening a presentation
2. Navigating to any slide (e.g., slide 2 or 3)
3. Using browser zoom controls:
   - **macOS**: Cmd + (+/-) or Cmd + scroll
   - **Windows/Linux**: Ctrl + (+/-) or Ctrl + scroll
4. Observe that the current slide remains properly positioned

The console will log zoom changes: `"Zoom changed: 1.50x - Adjusted to slide N"`
