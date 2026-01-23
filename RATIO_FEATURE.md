# Ratio Parameter Feature

## Overview
The `ratio` parameter has been added to `:::col` and `:::row` directives in SlideDown, allowing you to control the proportional size allocation of layout elements.

## Syntax

### Explicit syntax:
```markdown
::: col ratio=70%
Content here
:::
```

### Shorthand syntax:
```markdown
::: col 70%
Content here
:::
```

### Combined with reveal (order-independent):
```markdown
::: col ratio=70% reveal
Content here
:::
```

or

```markdown
::: col reveal ratio=70%
Content here
:::
```

## How It Works

- **For columns in vertical layouts**: The ratio controls the **height** distribution
- **For columns in horizontal layouts** (within `:::row`): The ratio controls the **width** distribution
- The ratio is applied as `flex-basis: XX%` with `flex-grow: 0` and `flex-shrink: 0`
- Works seamlessly with the existing `reveal` parameter

## Examples

### Vertical Split (70/30)
```markdown
::: col ratio=70%
## Main content
Takes 70% of the vertical space
:::

::: col ratio=30%
## Footer
Takes 30% of the vertical space
:::
```

### Horizontal Split in a Row
```markdown
::: row

::: col ratio=40%
## Sidebar
40% width
:::

::: col ratio=60%
## Main
60% width
:::

:::
```

### With Progressive Reveal
```markdown
::: col ratio=60% reveal
## First Section
Appears first, takes 60%
:::

::: col ratio=40% reveal
## Second Section
Appears after, takes 40%
:::
```

## Implementation Details

### Parser Changes (`lib/parser.js`)
- Enhanced `_parseParams()` to recognize standalone percentage values (e.g., `70%`)
- Extracts ratio from both `ratio=70%` format and shorthand `70%` format
- Stores ratio in the params object for the renderer to use

### Renderer Changes (`lib/renderer.js`)
- Applies ratio parameter as inline CSS styles on the outermost container element
- Sets `flex-basis`, `flex-grow`, and `flex-shrink` to enforce the specified ratio
- **Gap-Aware Adjustment**: Automatically scales down flex-basis values to account for CSS gaps
  - CSS has `gap: 2%` on layout containers
  - When ratios are specified, they're proportionally scaled to fit: `scaleFactor = (100% - totalGap) / sumOfRatios`
  - Example: For 40% + 60% with 2% gap: `scaleFactor = 98% / 100% = 0.98`
    - Column 1: `40% × 0.98 = 39.2%`
    - Column 2: `60% × 0.98 = 58.8%`
    - Total: `39.2% + 2% + 58.8% = 100%`
- Works correctly with nested structures (e.g., `:::col reveal` creates two nested divs, ratio is applied to the outer one)

### Gap Handling
The 2% gap between elements is **preserved for legibility** but **automatically accounted for** in calculations. You don't need to manually adjust your ratios - just specify the proportions you want (e.g., 40% + 60%) and the system will handle the gap math for you.

## Testing
A comprehensive test file `test-ratio.md` has been created demonstrating:
- Default equal splits
- Asymmetric 70/30 and 60/40 splits
- Shorthand syntax (e.g., `75%`)
- Combination with reveal in both orders
- Row layouts with ratio
- Vertical layouts with ratio and reveal
