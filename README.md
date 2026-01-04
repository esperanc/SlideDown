# SlideDown

SlideDown is a minimalist, markdown-based presentation framework designed for developers and educators. It combines the simplicity of Markdown with powerful "scrollytelling" capabilities, allowing you to create immersive, scroll-driven presentations without writing a single line of JavaScript.

## Live Demo

Check out the demo presentations running live on GitHub Pages:
[Link to your GitHub Pages URL]

You can verify the source code for these demos in the `content/` folder of this repository:
- **General Features**: `content/demo-features`
- **Scrollytelling**: `content/demo-scrolly`

## Features

- **Markdown First**: Write your slides in standard Markdown (`.md`).
- **Scrollytelling**: Create progressive reveals and sticky layouts simply by scrolling.
- **Zero Build Step**: No webpack, no build process. Just serve `index.html`.
- **Syntax Highlighting**: Automatic highlighting for code blocks (Python, JS, etc.).
- **Flexible Layouts**: Easily create multi-column layouts.
- **Components**: Built-in support for Images (with zoom), YouTube embeds and Iframes.
- **Theming**: Built-in Dark and Light modes (Toggle with 'T').

## SlideDown Language Guide

SlideDown extends Markdown with a few simple directives to handle layout and interactivity.

### Basic Structure
Slides are separated by horizontal rules (`---`). The separator must be **exactly three dashes** on a new line, optionally followed by spaces. Using more dashes (e.g., `----`) is interpreted as a standard Markdown horizontal rule, not a slide separator.

```markdown
# Slide 1
Content...

---

# Slide 2
Content...
```

### Layouts
Use `:::` to create blocks. Common blocks include `row`, `col`, and `center`.

```markdown
::: row
::: col
# Left Column
Content here
:::
::: col
# Right Column
Content here
:::
:::
```

### Components
Use `::` to insert components. Attributes can be unquoted (if no spaces) or quoted.

**Images**:
```markdown
:: image src=my-image.png width=500
:: image src="image with spaces.png" alt="My Description"
```

**YouTube**:
```markdown
:: youtube id=dQw4w9WgXcQ
```

**Iframe**:
Embed external content.
```markdown
:: iframe src="https://example.com"
```

### Scrollytelling (Reveals)
To make items appear one by one as you scroll, use the `reveal` block or `reveal` variant.

**List Reveal**:
```markdown
::: reveal
- Item 1 appears first
- Then Item 2
- Then Item 3
:::
```

**Split Screen Reveal**:
Keep one column fixed while the other reveals content.

```markdown
::: row
::: col
# Fixed Content
 This stays visible.
:::
::: col reveal
- Step 1 explanation
- Step 2 explanation
:::
:::
```

### Syntax Highlighting
Just use standard markdown code fences.

\`\`\`python
def hello():
    print("Hello World!")
\`\`\`

## Advanced Usage

### URL Parameters
You can customize the presentation loading using URL parameters:

- `?p=folder_name`: Loads a specific presentation from the content folder.
    - Example: `index.html?p=demo-features`
- `?f=custom_content_root`: Sets a custom root folder for content content (default is `content`).
    - Example: `index.html?f=my_slides&p=presentation1`

## Running Locally

1.  Clone the repository.
2.  Serve the folder with any static file server.
    *   Python: `python3 -m http.server`
    *   Node: `npx serve`
    *   VS Code: "Live Server" extension
3.  Open `http://localhost:8000` (or your server's port).

## Project Structure

- `index.html`: The main entry point.
- `content/`: Folder containing your presentation subfolders.
- `content/index.json`: Registry of available presentations.
- `lib/`: Core logic (Parser, Renderer, Navigation, Themes).
