# Test Ratio Parameter

This slide demonstrates the new ratio parameter for layout control.

---

# Equal Columns (Default)

::: col

## Column 1
This is the first column with default sizing.

:::

::: col

## Column 2
This is the second column with default sizing.

:::

---

# 70/30 Split (ratio=70%)

::: col ratio=70%

## Main Column (70%)
This column takes up 70% of the available width.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

:::

::: col ratio=30%

## Sidebar (30%)
This smaller column takes 30%.

:::

---

# With Reveal + Ratio

::: col ratio=60% reveal

## Content 1
This appears first

:::

::: col ratio=40% reveal

## Content 2
This appears second

:::

---

# Alternative Syntax (shorthand)

::: col 75%

## Main Content (75%)
You can also use the shorthand syntax without "ratio=".

:::

::: col 25%

## Aside (25%)
Shorter syntax!

:::

---

# Row with Ratio

::: row

::: col ratio=40%

## Left Narrow (40%)
This column is narrower

:::

::: col ratio=60%

## Right Wide (60%)
This column is wider

:::

:::

---

# Vertical Split with Reveal

::: col ratio=30% reveal

### Top Section (30%)
This takes 30% of the height

:::

::: col ratio=70% reveal

### Bottom Section (70%)
This takes 70% of the height

:::
