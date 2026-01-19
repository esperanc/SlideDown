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
    this._createNavDots();
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

  // --- CONFIGURAÇÃO DE SCROLL STEPS (Reveals + Overflow) ---
  _setupScrollSteps(specificSlide = null) {
    const slidesToProcess = specificSlide ? [specificSlide] : this.slides;

    slidesToProcess.forEach(slide => {
      // Se já foi processado e tem content wrapper, usamos ele
      const contentWrapper = slide.querySelector('.slide-content');
      const targetForQuery = contentWrapper || slide;

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
      
      // Add the maximum overflow steps
      totalSteps += maxOverflowSteps;

      // --- SLIDE-LEVEL OVERFLOW DETECTION ---
      // Caso 1: Slide normal (sem wrapper ainda) -> detecta overflow direto
      // Caso 2: Slide já com wrapper -> detecta overflow no wrapper
      let slideOverflowSteps = 0;
      let slideOverflowAmount = 0;

      const containerH = contentWrapper ? contentWrapper.scrollHeight : slide.scrollHeight;
      const visibleH = contentWrapper ? contentWrapper.clientHeight : slide.clientHeight;
      
      // Se tem wrapper, a altura visível deveria ser a do wrapper (que é sticky/fixa)
      // Se não tem, é a altura natural do slide que estamos checando se estourou a tela
      const referenceH = contentWrapper ? (window.innerHeight - 40) : window.innerHeight;

      if (containerH > referenceH + 10 && overflowElements.length === 0) {
          slideOverflowAmount = containerH - referenceH;
          slideOverflowSteps = Math.ceil(slideOverflowAmount / stepSize);
          totalSteps += slideOverflowSteps;
          
          // console.log(`[Overflow] Slide-level: ${slideOverflowSteps} steps`);
      }

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

      // Atualiza metadados finais
      slide._revealCount = revealItems.length;
      slide._overflowCount = totalSteps - revealItems.length;
      slide._totalSteps = totalSteps;
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
    
    let resizeTimeout;
    
    const handleZoomChange = () => {
      // Clear any pending timeout
      if (resizeTimeout) clearTimeout(resizeTimeout);
      
      // Debounce to avoid excessive calculations during continuous zoom
      resizeTimeout = setTimeout(() => {
        const newZoom = window.devicePixelRatio;
        
        // Check if zoom actually changed (not just window resize)
        if (Math.abs(newZoom - this._currentZoom) > 0.01) {
          // Get current slide before zoom changes affect calculations
          const { index } = this._getCurrentSlideInfo();
          
          // Store the zoom ratio for proportional adjustment
          const zoomRatio = newZoom / this._currentZoom;
          
          // Update stored zoom level
          this._currentZoom = newZoom;
          
          // Recalculate scroll steps as content dimensions have changed
          this._setupScrollSteps();
          
          // After a brief delay to allow layout recalculation, adjust scroll position
          requestAnimationFrame(() => {
            // Get the new target position for the current slide
            const targetPosition = this._getScrollPositionForSlide(index);
            
            // Smoothly scroll to maintain the current slide in view
            // Use instant scroll for better responsiveness during zoom
            this.container.scrollTop = targetPosition;
            
            console.log(`Zoom changed: ${this._currentZoom.toFixed(2)}x - Adjusted to slide ${index + 1}`);
          });
        }
      }, 150); // 150ms debounce for smooth experience
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

      // Check if slide is active (covers viewport)
      if (rect.top <= 1 && rect.bottom >= 0) {
        const scrollDistance = Math.abs(rect.top);
        const stepSize = window.innerHeight * 0.5;
        
        // Calculate current step (0-indexed, -1 means none active)
        let currentStep = Math.floor((scrollDistance + 5) / stepSize) - 1;
        if (currentStep < 0) currentStep = -1;
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
        // Steps beyond revealCount are for overflow
        const overflowStep = currentStep - revealCount;
        const overflowElements = slide._overflowElements || [];
        
        overflowElements.forEach(el => {
          const elSteps = parseInt(el.dataset.overflowSteps) || 0;
          const elStepSize = parseFloat(el.dataset.stepSize) || (window.innerHeight * 0.4);
          
          // Calculate how many steps are consumed by this element
          // For simplicity, distribute steps sequentially per element
          // TODO: Could be improved to handle parallel overflow elements
          
          if (overflowStep >= 0 && overflowStep < elSteps) {
            // Scroll this element
            el.scrollTop = (overflowStep + 1) * elStepSize;
          } else if (overflowStep >= elSteps) {
            // Element fully scrolled
            el.scrollTop = el.scrollHeight - el.clientHeight;
          } else {
            // Not yet reached
            el.scrollTop = 0;
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
      const targetSlide = this.slides[index];

      if (targetSlide) {
        console.log(`Restaurando para o slide ${index + 1}`);
        
        // Use helper method to get correct scroll position
        this.container.scrollTop = this._getScrollPositionForSlide(index);
        
        // Atualiza a bolinha ativa visualmente
        this._updateDotsUI(index);
      }
    }
  }

  _createNavDots() {
    let nav = document.getElementById('slide-nav');
    if (!nav) {
      nav = document.createElement('div');
      nav.id = 'slide-nav';
      document.body.appendChild(nav);
    }
    nav.innerHTML = '';
    this.navContainer = nav;

    this.slides.forEach((slide, index) => {
      const dot = document.createElement('div');
      dot.className = 'nav-dot';
      dot.dataset.index = index;
      dot.title = `Slide ${index + 1}`;
      
      dot.addEventListener('click', () => {
        // Ao clicar, salvamos manualmente também
        this._savePosition(index);
        this._smoothScrollTo(this._getScrollPositionForSlide(index));
      });

      nav.appendChild(dot);
    });
  }

  _initObserver() {
    const observerOptions = {
      root: null, // viewport
      threshold: 0.1 // Detecta quando 10% do slide está visível
    };

    const observer = new IntersectionObserver((entries) => {
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
            this._updateDotsUI(index);
            this._savePosition(index);
          }
        }
      });
    }, observerOptions);

    this.slides.forEach(slide => observer.observe(slide));
  }

  // Separei a lógica visual para reutilizar no restorePosition
  _updateDotsUI(activeIndex) {
    if (!this.navContainer) return;
    const dots = this.navContainer.querySelectorAll('.nav-dot');
    dots.forEach(dot => dot.classList.remove('active'));
    
    if (dots[activeIndex]) {
      dots[activeIndex].classList.add('active');
    }
  }

  // --- NOVO MÉTODO: Salvar Posição ---
  _savePosition(index) {
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
          // If there's still scroll room within the slide
          if (rect.bottom > window.innerHeight + 10) {
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
           // If we've scrolled down within the slide
           if (rect.top < -10) {
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