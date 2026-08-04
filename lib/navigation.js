class ScrollyNavigation {
  constructor(containerId, presentationId) {
    this.containerId = containerId;
    this.presentationId = presentationId; // Identificador único (ex: 'aula-01')
    this.container = document.getElementById(containerId);
    this.slides = [];
    this.navContainer = null;
    
    this.storageKey = `scrolly_idx_${this.presentationId || 'default'}`;
    
    // Smooth scroll animation state
    this._scrollAnimation = null;
    
    // Zoom detection state
    this._currentZoom = window.devicePixelRatio;
    this._lastScrollPosition = 0;
    this._lastActiveIndex = 0;
  }

  // Custom smooth scroll implementation for consistent behavior
  _smoothScrollTo(targetY, duration = 300) {
    // Cancel any ongoing animation
    if (this._scrollAnimation) {
      cancelAnimationFrame(this._scrollAnimation);
    }

    const startY = this.container.scrollTop;
    const distance = targetY - startY;
    const startTime = performance.now();

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      this.container.scrollTop = startY + distance * easeOutCubic(progress);
      
      if (progress < 1) {
        this._scrollAnimation = requestAnimationFrame(animate);
      } else {
        this._scrollAnimation = null;
      }
    };

    this._scrollAnimation = requestAnimationFrame(animate);
  }

  init() {
    if (!this.container) {
      console.error(`ScrollyNavigation: Elemento "${this.containerId}" não encontrado.`);
      return;
    }

    this.slides = Array.from(this.container.querySelectorAll('.slide'));
    
    if (this.slides.length === 0) return;

    this._setupScrollSteps();
    this._createNavIndicator();
    this._initObserver();
    this._initWheel();
    this._initKeyboard();
    this._initResizeObserver();
    this._initZoomObserver();
    
    // Handler de scroll para controlar reveals
    // MUDANÇA: Ouvimos o container de scroll, não a janela
    this.container.addEventListener('scroll', () => this._onScroll());

    // MUDANÇA 2: Restaurar posição ao iniciar
    this._restorePosition();
  }

  // --- ALTURAS EM PERCENTAGEM (::: row height=XX%) ---
  // XX% significa XX% do espaço vertical disponível na janela, contado desde o
  // ponto onde o primeiro bloco ':::row' do slide começa até à borda inferior
  // do cartão. Duas linhas com height=100% ocupam, por isso, dois ecrãs — o
  // slide passa a ser mais alto que a janela e rola em bloco.
  _applyBlockHeights(slide) {
    const card = slide.querySelector('.slide-content') || slide;

    const targets = Array.from(card.querySelectorAll('[data-sd-height]'))
      .filter(el => /^\d+(?:\.\d+)?%$/.test(el.dataset.sdHeight));

    // Repõe as alturas antes de medir, para que a base seja calculada sobre o
    // layout natural (e não sobre o resultado de uma passagem anterior).
    targets.forEach(el => {
      el.style.height = '';
      el.style.minHeight = '';
    });
    if (targets.length === 0) return;

    // O ponto de partida é o primeiro bloco de linha do slide (uma coluna
    // órfã já foi embrulhada numa 'row' implícita pelo parser).
    const firstRow = card.querySelector(':scope > .layout-row') || targets[0];

    const cardRect = card.getBoundingClientRect();
    const padBottom = parseFloat(getComputedStyle(card).paddingBottom) || 0;
    // O cartão pode já estar rolado internamente: somar scrollTop devolve a
    // posição do topo da linha no layout não rolado.
    const rowTop = firstRow.getBoundingClientRect().top + card.scrollTop;
    const base = (cardRect.bottom - padBottom) - rowTop;

    if (!(base > 0)) return;

    // Document order garante que um pai é dimensionado antes dos seus filhos.
    const resolved = targets.map(el => {
      const parent = el.parentElement;
      // Dentro de um bloco que já tem altura resolvida, a percentagem é
      // relativa a esse bloco; caso contrário, à base do slide.
      const reference = (parent && parent.style.height) ? parseFloat(parent.style.height) : base;
      const height = (parseFloat(el.dataset.sdHeight) / 100) * reference;

      // Altura definida: o conteúdo (nomeadamente imagens) encolhe para caber.
      el.style.height = `${height}px`;
      el.style.minHeight = '0';
      // Só se congela o flex quando a altura é o eixo principal do pai. Dentro
      // de uma linha a altura é o eixo cruzado e mexer no flex estragaria a
      // largura da coluna.
      if (!(el.parentElement && el.parentElement.classList.contains('layout-row'))) {
        el.style.flexGrow = '0';
        el.style.flexShrink = '0';
      }

      return { el, height };
    });

    // Segunda passagem: o que não couber mesmo assim (tipicamente texto) faz o
    // bloco crescer, em vez de ser recortado ou de ganhar uma barra de rolagem
    // própria. A altura pedida passa a ser um mínimo e é o slide inteiro que
    // fica mais alto que a janela — e rola em bloco.
    resolved.forEach(({ el, height }) => {
      if (el.scrollHeight > el.clientHeight + 2) {
        el.style.height = '';
        el.style.minHeight = `${height}px`;
      }
    });
  }

  // --- CONFIGURAÇÃO DE SCROLL STEPS (Reveals + Overflow) ---
  _setupScrollSteps(specificSlide = null) {
    const slidesToProcess = specificSlide ? [specificSlide] : this.slides;

    slidesToProcess.forEach(slide => {
      // Se já foi processado e tem content wrapper, usamos ele
      const contentWrapper = slide.querySelector('.slide-content');
      const targetForQuery = contentWrapper || slide;

      // Limpa as restrições deixadas por passagens anteriores, para que tudo o
      // que se segue meça o layout natural.
      const colsInSlide = targetForQuery.querySelectorAll('.layout-col');
      colsInSlide.forEach(col => {
        col.style.maxHeight = '';
        col.classList.remove('has-overflow');
        delete col.dataset.overflowSteps;
        delete col.dataset.overflowHeight;
      });

      // Resolve as alturas em percentagem antes de qualquer medição.
      this._applyBlockHeights(slide);

      const revealItems = targetForQuery.querySelectorAll('.reveal-block, .reveal-item');
      let totalSteps = revealItems.length;

      // --- OVERFLOW DETECTION ---
      // Look for content elements that overflow - but NOT layout columns
      // Columns should always expand naturally to fit their content
      const layoutContainers = targetForQuery.querySelectorAll('.md-content:not(.layout-col .md-content)');
      const overflowElements = [];
      
      const viewportHeight = window.innerHeight;
      const constrainedHeight = viewportHeight * 0.8; // max-height from CSS
      const stepSize = viewportHeight * 0.4; // 40vh per step
      
      let maxOverflowSteps = 0; // Track the maximum steps needed

      layoutContainers.forEach(el => {
        // Skip if already processed as part of a parent
        if (el.closest('.has-overflow') && el.closest('.has-overflow') !== el) return;
        
        // Calculate overflow based on content vs CONSTRAINED height
        const scrollH = el.scrollHeight;
        const targetHeight = Math.min(el.clientHeight || constrainedHeight, constrainedHeight);
        
        // Se a altura alvo for 0 (ex: oculto), ignora
        if (targetHeight === 0) return;

        const expectedOverflow = scrollH - targetHeight;
        
        if (expectedOverflow > 10) { // 10px tolerance
          const steps = Math.ceil(expectedOverflow / stepSize);
          
          el.classList.add('has-overflow');
          el.dataset.overflowSteps = steps;
          el.dataset.overflowHeight = expectedOverflow;
          el.dataset.stepSize = stepSize;
          
          overflowElements.push(el);
          // Use MAX instead of SUM - parallel columns share steps
          maxOverflowSteps = Math.max(maxOverflowSteps, steps);
          
          // console.log(`[Overflow] Detected: ${steps} steps`, el);
        } else {
             // Caso o conteúdo tenha diminuído (ex: imagem falhou), remove overflow
             el.classList.remove('has-overflow');
             delete el.dataset.overflowSteps;
        }
      });

      // --- COLUMN OVERFLOW DETECTION ---
      // Columns sit inside a flex row with flex-shrink:0, so they expand to their natural
      // height and are clipped by the slide's overflow:hidden.  The md-content detection
      // above never fires for them (clientHeight ≈ scrollHeight inside an unconstrained col).
      // Instead, compare each column's content against the slide's clipping edge.
      // Colunas dentro de um bloco com altura explícita (::: row height=XX%)
      // ficam de fora: esse bloco cresce quando o conteúdo não cabe e quem rola
      // é o cartão inteiro, em bloco.
      const scrollableCols = Array.from(colsInSlide)
        .filter(col => !col.closest('[data-sd-height]'));

      // READ phase: measure everything after a single layout flush (reading clipBox triggers it).
      // O limite é a borda onde o cartão realmente corta: uma coluna que apenas
      // entra na margem inferior ainda se vê por inteiro e não precisa de rolar.
      // (Já a base das alturas em percentagem desconta essa margem — ver
      // _applyBlockHeights.)
      const clipBox = (contentWrapper || slide).getBoundingClientRect();
      const clipBottom = clipBox.bottom;
      const colMeasurements = scrollableCols.map(col => ({
        col,
        colBox: col.getBoundingClientRect()
      }));

      // WRITE phase: apply constraints based on the measurements.
      colMeasurements.forEach(({ col, colBox }) => {
        const overflowAmount = colBox.bottom - clipBottom;

        if (overflowAmount > 10) {
          const visibleHeight = colBox.height - overflowAmount;
          const steps = Math.ceil(overflowAmount / stepSize);

          col.style.maxHeight = `${visibleHeight}px`;
          col.classList.add('has-overflow');
          col.dataset.overflowSteps = steps;
          col.dataset.overflowHeight = overflowAmount;
          col.dataset.stepSize = stepSize;
          col.dataset.revealScrollTop = '0';

          overflowElements.push(col);
          maxOverflowSteps = Math.max(maxOverflowSteps, steps);
        }
      });

      // --- SLIDE-LEVEL OVERFLOW DETECTION ---
      // Caso 1: Slide normal (sem wrapper ainda) -> detecta overflow direto
      // Caso 2: Slide já com wrapper -> detecta overflow no wrapper
      let slideOverflowSteps = 0;
      let slideOverflowAmount = 0;

      const containerH = contentWrapper ? contentWrapper.scrollHeight : slide.scrollHeight;
      const visibleH = contentWrapper ? contentWrapper.clientHeight : slide.clientHeight;

      // Slide card is always 100vh - 40px (container padding), with or without a wrapper
      const referenceH = visibleH || (window.innerHeight - 40);
      // scrollHeight inclui o padding inferior do cartão. Descontá-lo mantém o
      // mesmo limite usado para as colunas: conteúdo que apenas entra na margem
      // de baixo continua todo visível e não conta como excesso.
      const cardPadBottom = parseFloat(getComputedStyle(contentWrapper || slide).paddingBottom) || 0;

      // Num slide com blocos de altura pedida pelo autor, esses blocos são
      // medidos contra a janela: o slide é suposto ficar mais alto que ela e
      // rolar em bloco, mesmo que algum elemento também role por dentro.
      // Sem esses blocos mantém-se o critério antigo: quem rola por dentro
      // dispensa a rolagem do cartão.
      const hasSizedBlocks = targetForQuery.querySelector('[data-sd-height]') !== null;

      if (containerH - cardPadBottom > referenceH + 10 && (hasSizedBlocks || overflowElements.length === 0)) {
          slideOverflowAmount = containerH - cardPadBottom - referenceH;
          slideOverflowSteps = Math.ceil(slideOverflowAmount / stepSize);

          // console.log(`[Overflow] Slide-level: ${slideOverflowSteps} steps`);
      }

      // Colunas e cartão rolam em paralelo: o número de passos é o maior dos
      // dois, não a soma.
      totalSteps += Math.max(maxOverflowSteps, slideOverflowSteps);

      // Store overflow elements reference on slide
      slide._overflowElements = overflowElements;
      
      // Se detectou overflow no nível do slide, adiciona o wrapper à lista de elementos que rolam
      if (slideOverflowSteps > 0) {
          // Se ainda não tem wrapper, será criado abaixo. Marcamos para depois.
          slide._slideOverflow = {
            steps: slideOverflowSteps,
            overflowAmount: slideOverflowAmount,
            stepSize: stepSize
          };
      } else {
          delete slide._slideOverflow;
      }

      // Inicializa dataset state
      overflowElements.forEach(el => {
          el.dataset.revealScrollTop = "0";
      });

      // Atualiza metadados originais sem o buffer
      slide._revealCount = revealItems.length;
      slide._overflowCount = totalSteps - revealItems.length;

      // Add a buffer step to keep the final state clearly visible 
      // without the next slide intruding into the viewport
      if (totalSteps > 0) {
          totalSteps += 1;
      }
      
      slide._totalSteps = totalSteps;

      // --- SLIDE HEIGHT EXPANSION & WRAPPING ---
      
      // Se tem steps (seja reveal ou overflow)
      if (totalSteps > 0) {
        
        // 1. Cria Wrapper se não existir
        if (!contentWrapper) {
            const content = document.createElement('div');
            content.className = 'slide-content';
            while (slide.firstChild) {
                content.appendChild(slide.firstChild);
            }
            slide.appendChild(content);
            slide.classList.add('has-reveal');
            
            // Re-seleciona para uso abaixo
            // contentWrapper = content; // (const assignment error prevention)
        }

        // 2. Atualiza Altura do Slide (Scroll Track)
        const scrollHeight = 100 + (totalSteps * 50);
        slide.style.height = `${scrollHeight}vh`;

        // 3. Atualiza Meta-dados (Slide Level Overflow)
        const currentWrapper = slide.querySelector('.slide-content');
        if (slide._slideOverflow && currentWrapper) {
            currentWrapper.classList.add('has-overflow');
            currentWrapper.dataset.overflowSteps = slide._slideOverflow.steps;
            currentWrapper.dataset.stepSize = slide._slideOverflow.stepSize;
            
            // Adiciona aos elementos que serão animados no scroll
            if (!overflowElements.includes(currentWrapper)) {
                overflowElements.push(currentWrapper);
            }
        }

        // 4. Inicializa Reveal Items (se necessário)
        // Só esconde se ainda não estiver visível (evita piscar se for re-run)
        revealItems.forEach(item => {
            if (!item.classList.contains('reveal-visible')) {
                item.classList.add('reveal-hidden');
            }
        });

      } else {
          // Se não tem steps, mas tinha altura expandida antes -> Resetar?
          // Situação complexa: remover wrapper é destrutivo.
          // Vamos apenas resetar a altura do slide para 100vh se não tiver steps.
          if (slide.style.height && slide.style.height !== '100vh') {
             // slide.style.height = '100vh'; 
             // Comentado pois pode causar pulos indesejados se a detecção falhar momentaneamente
          }
      }
    });
  }

  _initResizeObserver() {
      // Observa mudanças de tamanho nos conteudos dos slides
      // Isso captura carregamento de imagens ou injeções dinâmicas
      const observer = new ResizeObserver(entries => {
          entries.forEach(entry => {
              // Encontra o slide pai
              const slide = entry.target.closest('.slide');
              if (slide) {
                  // Re-calcula steps para este slide
                  // Debounce simples para evitar cálculos excessivos
                  if (slide._resizeTimeout) clearTimeout(slide._resizeTimeout);
                  slide._resizeTimeout = setTimeout(() => {
                      // console.log('Resize detected in slide', slide.id);
                      this._setupScrollSteps(slide);
                  }, 100);
              }
          });
      });

      this.slides.forEach(slide => {
          // Observa o slide e, se existir, seu conteúdo
          observer.observe(slide);
          // Se já tiver wrapper, observa ele também (pois o tamanho muda lá)
          const content = slide.querySelector('.slide-content');
          if (content) observer.observe(content);
          
          // Melhor: observar todos os filhos diretos do slide/content para pegar mudanças internas?
          // Por enquanto, observar o container deve bastar pois scrollHeight muda.
      });
  }

  _initZoomObserver() {
    // Detect browser zoom changes and adjust scroll position
    // Browser zoom changes devicePixelRatio and triggers resize events
    
    let resizeTimeout = null;
    let targetIndex = null;
    
    const handleZoomChange = () => {
      const newZoom = window.devicePixelRatio;
      
      // Check if zoom actually changed (not just window resize)
      if (Math.abs(newZoom - this._currentZoom) > 0.01) {
        
        if (!resizeTimeout) {
          targetIndex = this._lastActiveIndex !== undefined ? this._lastActiveIndex : 
             (localStorage.getItem(this.storageKey) !== null ? parseInt(localStorage.getItem(this.storageKey), 10) : 0);
        }

        // Clear any pending timeout
        if (resizeTimeout) clearTimeout(resizeTimeout);
        
        // Debounce to avoid excessive calculations during continuous zoom
        resizeTimeout = setTimeout(() => {
          // Update stored zoom level
          this._currentZoom = newZoom;
          
          // Recalculate scroll steps as content dimensions have changed
          this._setupScrollSteps();
          
          // After a brief delay to allow layout recalculation, adjust scroll position
          requestAnimationFrame(() => {
            // Get the new target position for the current slide
            const finalIndex = targetIndex !== null ? targetIndex : this._getCurrentSlideInfo().index;
            const targetPosition = this._getScrollPositionForSlide(finalIndex);
            
            // Smoothly scroll to maintain the current slide in view
            // Use instant scroll for better responsiveness during zoom
            this.container.scrollTop = targetPosition;
            
            // Forcefully update state to block any stale IntersectionObserver events from layout chaos
            this._savePosition(finalIndex);
            this._updateIndicatorUI(finalIndex);
            this._ignoreObserverUntil = Date.now() + 300;
            
            console.log(`Zoom changed: ${this._currentZoom.toFixed(2)}x - Adjusted to slide ${finalIndex + 1}`);
            
            targetIndex = null;
            resizeTimeout = null;
          });
        }, 150); // 150ms debounce for smooth experience
      }
    };
    
    // Listen for resize events which include zoom changes
    window.addEventListener('resize', handleZoomChange);
    
    // Also listen for visualViewport changes for more accurate zoom detection
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleZoomChange);
    }
  }


  // --- SCROLL HANDLER (Reveals + Overflow) ---
  _onScroll() {
    this.slides.forEach((slide, index) => {
      const rect = slide.getBoundingClientRect();
      
      // Skip if slide has no steps
      if (!slide._totalSteps || slide._totalSteps === 0) return;

      // Check if slide is active (covers viewport top area)
      // We use a more generous threshold to catch slides that are at their natural position
      if (rect.top <= 25 && rect.bottom >= 0) {
        // Calculate scroll distance: how far the slide has moved from its natural top position
        // The natural top position is 20px (container padding) for slides when they first appear
        // As we scroll down, rect.top becomes negative, indicating we've scrolled into the slide
        const naturalStartPosition = 20;
        
        // scrollDistance represents how much we've scrolled past the natural start
        // When rect.top = 20 (at start), scrollDistance = 0
        // When rect.top = 0, scrollDistance = 20
        // When rect.top = -100, scrollDistance = 120
        const scrollDistance = Math.max(0, naturalStartPosition - rect.top);
        
        const stepSize = window.innerHeight * 0.5;
        
        // Calculate current step (0-indexed, -1 means none active)
        // Step -1: scrollDistance < stepSize (nothing revealed yet)
        // Step 0: stepSize <= scrollDistance < 2*stepSize (first item revealed)
        // Step 1: 2*stepSize <= scrollDistance < 3*stepSize (second item revealed)
        // etc.
        let currentStep = Math.floor(scrollDistance / stepSize) - 1;
        if (currentStep < -1) currentStep = -1;
        if (currentStep >= slide._totalSteps) currentStep = slide._totalSteps - 1;

        // --- PHASE 1: REVEALS ---
        const revealItems = slide.querySelectorAll('.reveal-block, .reveal-item');
        const revealCount = slide._revealCount || 0;
        
        revealItems.forEach((item, i) => {
          if (i <= currentStep) {
            item.classList.remove('reveal-hidden');
            item.classList.add('reveal-visible');
          } else {
            item.classList.add('reveal-hidden');
            item.classList.remove('reveal-visible');
          }
        });

        // --- PHASE 2: OVERFLOW SCROLLING ---
        // We sync scrolling dynamically to ensure reveals are visible,
        // and finish the remaining overflow afterwards.
        const overflowElements = slide._overflowElements || [];
        
        overflowElements.forEach(el => {
          const elSteps = parseInt(el.dataset.overflowSteps) || 0;
          const maxScrollTop = el.scrollHeight - el.clientHeight;
          
          if (currentStep < revealCount) {
             // We are in reveal phase.
             // Find the latest visible reveal item in this container
             const activeIndex = Math.max(0, currentStep);
             const activeItem = revealItems[activeIndex];
             
             if (currentStep === -1) {
                 el.scrollTop = 0;
                 el.dataset.revealScrollTop = "0";
             } else if (activeItem && el.contains(activeItem)) {
                 // Robustly calculate internal offset regardless of CSS positioning
                 const elRect = el.getBoundingClientRect();
                 const activeRect = activeItem.getBoundingClientRect();
                 
                 // Distance from the top of the virtual scrollable area to the item
                 const relativeTop = (activeRect.top - elRect.top) + el.scrollTop;
                 
                 const itemBottom = relativeTop + activeRect.height + 40; // 40px padding bottom
                 const itemTop = relativeTop - 40; // 40px padding top
                 
                 let targetScroll = el.scrollTop;
                 
                 if (itemTop < targetScroll) {
                     targetScroll = itemTop;
                 }
                 
                 if (itemBottom > targetScroll + el.clientHeight) {
                     targetScroll = itemBottom - el.clientHeight;
                 }
                 
                 if (el.scrollTop !== targetScroll) {
                     el.scrollTop = targetScroll;
                 }
                 
                 // Keep track of where the reveal sequence natively left off
                 el.dataset.revealScrollTop = el.scrollTop;
             }
          } else {
             // Past reveals, smoothly scale the remaining scroll over the overflow steps
             const overflowStep = currentStep - revealCount;
             const baseScrollTop = parseFloat(el.dataset.revealScrollTop) || 0;
             
             if (elSteps > 0 && overflowStep >= 0 && overflowStep < elSteps) {
                // Determine how much is left to scroll
                const stepAmount = (maxScrollTop - baseScrollTop) / elSteps;
                el.scrollTop = baseScrollTop + (overflowStep + 1) * stepAmount;
             } else if (overflowStep >= elSteps) {
                el.scrollTop = maxScrollTop;
             } else {
                el.scrollTop = baseScrollTop;
             }
          }
        });
      }
    });
  }

  // --- Helper: Get correct scroll position for a slide ---
  _getScrollPositionForSlide(index) {
    // For the first slide (index 0), scroll to position 0 to preserve top margin
    if (index === 0) {
      return 0;
    }
    
    // For other slides, we need to account for the container's top padding
    // The container has padding-top: 20px, so we subtract it to maintain
    // consistent top border positioning (y=20) for all slides
    const containerPadding = 20;
    return this.slides[index].offsetTop - containerPadding;
  }

  // --- NOVO MÉTODO: Restaurar Posição ---
  _restorePosition() {
    const savedIndex = localStorage.getItem(this.storageKey);
    
    if (savedIndex !== null) {
      const index = parseInt(savedIndex, 10);
      this._lastActiveIndex = index;
      const targetSlide = this.slides[index];

      if (targetSlide) {
        console.log(`Restaurando para o slide ${index + 1}`);
        
        // Use helper method to get correct scroll position
        this.container.scrollTop = this._getScrollPositionForSlide(index);
        
        // Update indicator visually
        this._updateIndicatorUI(index);
      }
    }
  }

  _createNavIndicator() {
    let nav = document.getElementById('slide-nav');
    if (!nav) {
      nav = document.createElement('div');
      nav.id = 'slide-nav';
      document.body.appendChild(nav);
    }
    nav.innerHTML = '';
    this.navContainer = nav;

    // Create numeric indicator
    const indicator = document.createElement('div');
    indicator.className = 'slide-indicator';
    indicator.innerHTML = `
      <span class="current">1</span>
      <span class="separator">/</span>
      <span class="total">${this.slides.length}</span>
    `;
    
    // Create slider container
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slide-slider';
    sliderContainer.innerHTML = `
      <label>Jump to slide:</label>
      <input type="range" min="1" max="${this.slides.length}" value="1" step="1">
      <div class="slider-value">Slide 1</div>
    `;
    
    const slider = sliderContainer.querySelector('input[type="range"]');
    const sliderValue = sliderContainer.querySelector('.slider-value');
    
    // Toggle slider on indicator click
    let sliderVisible = false;
    indicator.addEventListener('click', (e) => {
      e.stopPropagation();
      sliderVisible = !sliderVisible;
      if (sliderVisible) {
        sliderContainer.classList.add('active');
        // Update slider to current position
        const { index } = this._getCurrentSlideInfo();
        slider.value = index + 1;
        sliderValue.textContent = `Slide ${index + 1}`;
      } else {
        sliderContainer.classList.remove('active');
      }
    });
    
    // Update slider value display as user drags
    slider.addEventListener('input', (e) => {
      sliderValue.textContent = `Slide ${e.target.value}`;
    });
    
    // Navigate to slide on slider change
    slider.addEventListener('change', (e) => {
      const targetIndex = parseInt(e.target.value) - 1;
      this._savePosition(targetIndex);
      this._smoothScrollTo(this._getScrollPositionForSlide(targetIndex));
      // Hide slider after navigation
      setTimeout(() => {
        sliderContainer.classList.remove('active');
        sliderVisible = false;
      }, 300);
    });
    
    // Close slider when clicking outside
    document.addEventListener('click', (e) => {
      if (sliderVisible && !nav.contains(e.target)) {
        sliderContainer.classList.remove('active');
        sliderVisible = false;
      }
    });
    
    nav.appendChild(indicator);
    nav.appendChild(sliderContainer);
    
    // Store references for updates
    this.indicator = indicator;
    this.slider = slider;
  }

  _initObserver() {
    const observerOptions = {
      root: null, // viewport
      threshold: 0.1 // Detecta quando 10% do slide está visível
    };

    const observer = new IntersectionObserver((entries) => {
      // Skip updates if we are recovering from a zoom layout shift
      if (this._ignoreObserverUntil && Date.now() < this._ignoreObserverUntil) {
          return;
      }

      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Encontra qual slide está ocupando a maior parte da tela?
          // Simplificação: se intersectar, consideramos candidato.
          // Melhor: verificar qual está mais próximo do centro.
          const index = this.slides.indexOf(entry.target);
          if (index !== -1) {
             // Só atualiza UI se estiver realmente "focado".
             // Aqui, vamos confiar que o scroll snap ou o usuário parou nele.
             // Para garantir, podemos checar se o top está proximo de 0?
             // Deixa simples por enquanto.
            this._updateIndicatorUI(index);
            this._savePosition(index);
          }
        }
      });
    }, observerOptions);

    this.slides.forEach(slide => observer.observe(slide));
  }

  // Update the numeric indicator to show current slide
  _updateIndicatorUI(activeIndex) {
    if (!this.indicator) return;
    
    const currentSpan = this.indicator.querySelector('.current');
    if (currentSpan) {
      currentSpan.textContent = activeIndex + 1;
    }
    
    // Also update slider if it exists
    if (this.slider) {
      this.slider.value = activeIndex + 1;
    }
  }

  // --- NOVO MÉTODO: Salvar Posição ---
  _savePosition(index) {
    this._lastActiveIndex = index;
    localStorage.setItem(this.storageKey, index);
  }

  // --- NAVEGAÇÃO CENTRALIZADA (Helpers) ---

  _getCurrentSlideInfo() {
      // Robust detection: Find the slide that contains the vertical center of the screen
      const middleY = window.innerHeight / 2;
      
      let currentIndex = this.slides.findIndex(slide => {
          const rect = slide.getBoundingClientRect();
          // Slide covers the middle line?
          return rect.top <= middleY && rect.bottom >= middleY;
      });

      // Fallback strategies if logic above fails (unlikely but possible during fast scrolls)
      if (currentIndex === -1) {
          // Try finding closest to top 0
          currentIndex = this.slides.findIndex(slide => {
              const rect = slide.getBoundingClientRect();
              return Math.abs(rect.top) < window.innerHeight; 
          });
      }

      if (currentIndex === -1) currentIndex = 0;
      
      // Note: UI update is handled by IntersectionObserver, no need to call here

      return { 
          index: currentIndex, 
          slide: this.slides[currentIndex] 
      };
  }

  _navigateNext() {
      const { index, slide } = this._getCurrentSlideInfo();
      const scrollStep = window.innerHeight * 0.5;

      // Check if slide has scroll steps (reveals OR overflow)
      if (slide._totalSteps && slide._totalSteps > 0) {
          const rect = slide.getBoundingClientRect();
          
          // Calculate current step to see if we've completed all reveals/overflows
          const naturalStartPosition = 20;
          const scrollDistance = Math.max(0, naturalStartPosition - rect.top);
          const stepSize = window.innerHeight * 0.5;
          let currentStep = Math.floor(scrollDistance / stepSize) - 1;
          
          // If we haven't completed all steps AND there's still room to scroll
          if (currentStep < slide._totalSteps - 1 && rect.bottom > window.innerHeight + 10) {
              this._smoothScrollTo(this.container.scrollTop + scrollStep);
              return;
          }
      }

      // Go to next slide
      this._scrollToNextSlide(index);
  }

  _navigatePrev() {
      const { index, slide } = this._getCurrentSlideInfo();
      const scrollStep = window.innerHeight * 0.5;

      // Check if slide has scroll steps (reveals OR overflow)
      if (slide._totalSteps && slide._totalSteps > 0) {
           const rect = slide.getBoundingClientRect();
           
           // Calculate current step to see if we're past the initial state
           const naturalStartPosition = 20;
           const scrollDistance = Math.max(0, naturalStartPosition - rect.top);
           const stepSize = window.innerHeight * 0.5;
           let currentStep = Math.floor(scrollDistance / stepSize) - 1;
           
           // If we're past step -1 (initial state) AND we've scrolled into the slide
           if (currentStep >= 0 && rect.top < 10) {
               this._smoothScrollTo(this.container.scrollTop - scrollStep);
               return;
           }
      }

      // Go to previous slide
      const prevIndex = index - 1;
      if (prevIndex >= 0) {
        this._smoothScrollTo(this._getScrollPositionForSlide(prevIndex));
      }
  }

  _scrollToNextSlide(currentIndex) {
      const nextIndex = currentIndex + 1;
      if (nextIndex < this.slides.length) {
          this._smoothScrollTo(this._getScrollPositionForSlide(nextIndex));
      }
  }

  _initKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Ignora se estiver focado em iframe
      if (document.activeElement.tagName === 'IFRAME') return;

      if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this._navigateNext();
      } 
      else if (e.key === 'PageDown') {
        e.preventDefault();
        // PageDown agora força ir para o próximo slide
        const { index } = this._getCurrentSlideInfo();
        this._scrollToNextSlide(index);
      }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        this._navigatePrev();
      }
    });

    // Ajuste no click para usar a mesma lógica
    this.slides.forEach(slide => {
        slide.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
            this._navigateNext();
        });
    });
  }

  _initWheel() {
      // Debounce simples
      let isProcessing = false;
      
      this.container.addEventListener('wheel', (e) => {
          e.preventDefault(); // Impede scroll nativo para ter controle total

          if (isProcessing) return;

          // Limiar para considerar um "tick" de roda
          if (Math.abs(e.deltaY) > 10) {
              isProcessing = true;
              
              if (e.deltaY > 0) {
                  this._navigateNext();
              } else {
                  this._navigatePrev();
              }

              // Cooldown de 100ms
              setTimeout(() => {
                  isProcessing = false;
              }, 100);
          }
      }, { passive: false }); // passive: false é necessário para preventDefault funcionar
  }
}