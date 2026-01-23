
// --- 1. LÓGICA DE ZOOM (Restaurada) ---
function enableImageZoom(selector) {
  const wrappers = Array.from(document.querySelectorAll(selector));

  wrappers.forEach(wrapper => {
    const img = wrapper.querySelector("img");
    if (!img) return;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    let active = false;
    let isDragging = false;
    let justDragged = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    function apply(img, tx, ty, scale) {
      img.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
    }

    function reset() {
      if (!active) return;
      scale = 1;
      offsetX = 0;
      offsetY = 0;
      active = false;
      apply(img, 0, 0, 1);
      img.style.cursor = "zoom-in";
    }

    img.addEventListener("click", ev => {
      ev.stopPropagation();

      if (justDragged) {
        justDragged = false;
        return;
      }

      const rect = wrapper.getBoundingClientRect();
      const cx = ev.clientX - rect.left;
      const cy = ev.clientY - rect.top;

      const newScale = scale * 1.4;
      const factor = newScale / scale;

      offsetX = cx - (cx - offsetX) * factor;
      offsetY = cy - (cy - offsetY) * factor;

      scale = newScale;
      active = true;

      apply(img, offsetX, offsetY, scale);
      img.style.cursor = "zoom-out";
    });

    img.addEventListener("mousedown", ev => {
      if (scale <= 1) return;

      ev.preventDefault();
      isDragging = false;
      justDragged = false;

      lastMouseX = ev.clientX;
      lastMouseY = ev.clientY;

      img.style.cursor = "grabbing";

      const onMove = (moveEv) => {
        const dx = moveEv.clientX - lastMouseX;
        const dy = moveEv.clientY - lastMouseY;

        if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          isDragging = true;
        }

        if (isDragging) {
          offsetX += dx;
          offsetY += dy;
          apply(img, offsetX, offsetY, scale);
        }

        lastMouseX = moveEv.clientX;
        lastMouseY = moveEv.clientY;
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);

        img.style.cursor = scale > 1 ? "zoom-out" : "zoom-in";

        if (isDragging) {
          justDragged = true;
        }
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

    document.addEventListener("click", () => reset());
    window.addEventListener("scroll", () => reset(), { passive: true });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") reset();
    });
  });
}

// --- 2. CLASSE RENDERER (Atualizada com termos em Inglês e Validação Visual) ---
class ScrollyRenderer {

  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);

    this.basePath = options.basePath || ''; 

    this._fixUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http') || url.startsWith('//') || url.startsWith('/')) {
            return url;
        }
        return this.basePath + url;
    };

    if (typeof marked !== 'undefined') {
        marked.use({ 
          breaks: true, 
          gfm: true
        });
    }

    this.markdownConverter = options.markdownConverter || ((text) => {
      if (typeof marked === 'undefined') return text;
      
      // Protect math delimiters from marked processing
      const mathBlocks = [];
      let processedText = text;
      
      // Extract display math ($$...$$) first
      processedText = processedText.replace(/\$\$([\s\S]+?)\$\$/g, (match, content) => {
        const placeholder = `MATH_BLOCK_${mathBlocks.length}`;
        mathBlocks.push('$$' + content + '$$');
        return placeholder;
      });
      
      // Extract inline math ($...$)
      processedText = processedText.replace(/\$([^\$\n]+?)\$/g, (match, content) => {
        const placeholder = `MATH_INLINE_${mathBlocks.length}`;
        mathBlocks.push('$' + content + '$');
        return placeholder;
      });
      
      // Process markdown
      let html = marked.parse(processedText);
      
      // Restore math expressions
      mathBlocks.forEach((math, index) => {
        if (math.startsWith('$$')) {
          html = html.replace(`MATH_BLOCK_${index}`, math);
        } else {
          html = html.replace(`MATH_INLINE_${index}`, math);
        }
      });
      
      return html;
    });

    this.componentRegistry = {
      iframe: (params) => {
        const div = document.createElement('div');
        div.className = "responsive-embed";
        div.innerHTML = `
          <iframe
            src="${this._fixUrl(params.src)}"
            loading="lazy"
            frameborder="0"
            scrolling="no"
            allowfullscreen
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share">
          </iframe>`;
        return div;
      },
      youtube: (params) => {
        const div = document.createElement('div');
        div.className = "responsive-embed";
        div.style.background = "#000";
        div.innerHTML = `<iframe src="https://www.youtube.com/embed/${params.id}" frameborder="0" allowfullscreen></iframe>`;
        return div;
      },

      image: (params) => {
        const wrapper = document.createElement('div');
        wrapper.className = "zoom-wrapper";
        const img = document.createElement('img');
        img.src = this._fixUrl(params.src);
        img.alt = params.alt || "Imagem do slide";

        // --- Sizing Options ---
        if (params.width) img.style.width = params.width;
        if (params.height) img.style.height = params.height;
        if (params.style) img.style.cssText = params.style; // Generic style override

        wrapper.appendChild(img);
        return wrapper;
      }
    };
    this.componentRegistry.img = this.componentRegistry.image;
  }

  render(slidesTree) {
    this.container.innerHTML = '';
    slidesTree.forEach(slideNode => {
      const slideEl = this._createNode(slideNode);
      this.container.appendChild(slideEl);
    });

    // PÓS-PROCESSAMENTO: Syntax Highlighting
    if (typeof hljs !== 'undefined') {
        this.container.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }

    // Chama a função de zoom (agora ela existe neste escopo)
    setTimeout(() => {
        if (typeof enableImageZoom === 'function') {
            enableImageZoom(".zoom-wrapper");
        }
    }, 50);
  }

  _adjustRatiosForGap(containerEl, children) {
    // Check if any children have ratio parameters
    const childrenWithRatio = children.filter(child => 
      child.type === 'container' && child.params && child.params.ratio
    );
    
    if (childrenWithRatio.length === 0) return;
    
    // Use hardcoded gap value since getComputedStyle doesn't work on elements not in DOM yet
    // This matches the gap: 2% in .layout-row and .layout-col CSS
    const gapPercent = 2;
    
    // Calculate total gap space: (number of items with ratio - 1) * gap
    const totalGapPercent = (childrenWithRatio.length - 1) * gapPercent;
    
    // Calculate available space for flex items
    const availablePercent = 100 - totalGapPercent;
    
    // Calculate sum of all ratio percentages
    let totalRatioPercent = 0;
    childrenWithRatio.forEach(child => {
      const ratioMatch = child.params.ratio.match(/^(\d+(?:\.\d+)?)%/);
      if (ratioMatch) {
        totalRatioPercent += parseFloat(ratioMatch[1]);
      }
    });
    
    if (totalRatioPercent === 0) return;
    
    // Scale factor to fit ratios into available space
    const scaleFactor = availablePercent / totalRatioPercent;
    
    // Update flex-basis for each child in the DOM
    const domChildren = Array.from(containerEl.children);
    domChildren.forEach(domChild => {
      // Find the corresponding node to check if it has a ratio
      const matchingNode = childrenWithRatio.find(child => {
        // Match by checking if the element has the original ratio applied
        const currentFlexBasis = domChild.style.flexBasis;
        return currentFlexBasis && child.params.ratio === currentFlexBasis;
      });
      
      if (matchingNode) {
        const ratioMatch = matchingNode.params.ratio.match(/^(\d+(?:\.\d+)?)%/);
        if (ratioMatch) {
          const originalPercent = parseFloat(ratioMatch[1]);
          const adjustedPercent = originalPercent * scaleFactor;
          domChild.style.flexBasis = `${adjustedPercent}%`;
        }
      }
    });
  }

  _createNode(node) {
    let el;
    if (node.type === 'slide') {
      el = document.createElement('section'); el.className = 'slide'; el.id = `slide-${node.id}`;
      node.children.forEach(child => el.appendChild(this._createNode(child)));
      
      // POST-PROCESSING: Adjust flex-basis for children with ratio to account for gaps
      this._adjustRatiosForGap(el, node.children);
    } 
    else if (node.type === 'container') {
      // Divide variantes (ex: "col reveal" -> ["col", "reveal"])
      const variants = node.variant.split(/\s+/);
      
      // Cria o elemento raiz e uma referência para o 'innermost' onde os filhos entrarão
      let rootEl = null;
      let innerEl = null;

      variants.forEach((variant, index) => {
          let currentEl = document.createElement('div');
          
          // Mapeamento de classes (mesma lógica de antes, mas por variante)
          if (variant === 'row') currentEl.className = 'layout-row';
          else if (variant === 'col' || variant === 'column') currentEl.className = 'layout-col';
          else if (variant === 'center' || variant === 'section') {
            currentEl.className = 'layout-center';
          }
          // LÓGICA ESPECÍFICA PARA REVEAL (Restaurada)
          else if (variant === 'reveal') {
              currentEl.className = 'reveal-block reveal-hidden';
          }
          // Lógica genérica nova: se for outro nome, usa como classe
          else {
              currentEl.className = variant;
          }

      // Se for o primeiro (mais externo), aplica os parâmetros e estilos
          // OBS: Decisão de design -> Params do bloco aplicam-se ao wrapper externo
          if (index === 0) {
              // Apply ratio parameter as flex-basis if present
              if (node.params && node.params.ratio) {
                  currentEl.style.flexBasis = node.params.ratio;
                  // Also set flex-grow and flex-shrink to respect the ratio
                  currentEl.style.flexGrow = '0';
                  currentEl.style.flexShrink = '0';
                  // Override CSS min-width and min-height to allow ratio to work
                  currentEl.style.minWidth = '0';
                  currentEl.style.minHeight = '0';
              }
              
              if (node.params && node.params.style) {
                  currentEl.style.cssText += node.params.style;
              }
              // Se quiser passar outros atributos HTML, poderia ser aqui
          }

          // Monta a hierarquia
          if (!rootEl) {
              rootEl = currentEl;
          } else {
              innerEl.appendChild(currentEl);
          }
          innerEl = currentEl; // O próximo filho (ou o conteúdo) vai aqui dentro
      });

      // Se nenhum known block foi achado (fallback de segurança, embora o parser filtre)
      if (!rootEl) {
          rootEl = document.createElement('div');
          rootEl.className = 'layout-unknown';
          innerEl = rootEl;
      }

      // Renderiza os filhos do nó dentro do elemento mais interno
      node.children.forEach(child => innerEl.appendChild(this._createNode(child)));
      
      // POST-PROCESSING: Adjust flex-basis for children with ratio to account for gaps
      this._adjustRatiosForGap(innerEl, node.children);
      
      el = rootEl;

      // PÓS-PROCESSAMENTO para reveal*
      // A classe 'reveal-list-container' agora é aplicada diretamente se 'reveal*' for uma variante
      if (node.variant.includes('reveal*')) { // Check if 'reveal*' is among the variants
        const listItems = el.querySelectorAll('li');
        listItems.forEach(li => {
            li.classList.add('reveal-item', 'reveal-hidden');
        });
      }
    } 
    else if (node.type === 'component') {
      const renderer = this.componentRegistry[node.name];
      
      if (renderer) {
          el = renderer(node.params);
      } else {
          // Feedback de Erro Visual para componentes inválidos
          el = document.createElement('div');
          el.style.cssText = "background: rgba(255, 0, 0, 0.1); border: 1px dashed red; padding: 10px; color: red; border-radius: 8px; text-align: center;";
          el.innerHTML = `<strong>Erro de Sintaxe:</strong> Componente <code>:: ${node.name}</code> não suportado.`;
      }
    } 
    else if (node.type === 'markdown') {
      el = document.createElement('div');
      el.className = 'md-content';
      el.innerHTML = this.markdownConverter(node.content);
    }
    return el || document.createElement('div');
  }
}