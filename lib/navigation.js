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
    
    // Handler de scroll para controlar reveals
    // MUDANÇA: Ouvimos o container de scroll, não a janela
    this.container.addEventListener('scroll', () => this._onScroll());

    // MUDANÇA 2: Restaurar posição ao iniciar
    this._restorePosition();
  }

  // --- CONFIGURAÇÃO DE SCROLL STEPS (Reveals + Overflow) ---
  _setupScrollSteps() {
    this.slides.forEach(slide => {
      const revealItems = slide.querySelectorAll('.reveal-block, .reveal-item');
      let totalSteps = revealItems.length;

      // --- OVERFLOW DETECTION ---
      // Find all flex children that might overflow
      const flexChildren = slide.querySelectorAll('.layout-row > *, .layout-col > *, .md-content');
      const overflowElements = [];

      flexChildren.forEach(el => {
        // Force layout calculation
        const scrollH = el.scrollHeight;
        const clientH = el.clientHeight;
        
        if (scrollH > clientH + 10) { // 10px tolerance
          const overflowAmount = scrollH - clientH;
          const stepSize = window.innerHeight * 0.4; // 40vh per step
          const steps = Math.ceil(overflowAmount / stepSize);
          
          el.classList.add('has-overflow');
          el.dataset.overflowSteps = steps;
          el.dataset.overflowHeight = overflowAmount;
          el.dataset.stepSize = stepSize;
          
          overflowElements.push(el);
          totalSteps += steps;
          
          console.log(`[Overflow] Detected: ${steps} steps for element`, el);
        }
      });

      // --- SLIDE-LEVEL OVERFLOW DETECTION ---
      // Check if the slide itself overflows (content taller than viewport)
      // This handles slides without explicit row/col blocks
      if (overflowElements.length === 0) {
        const slideContentHeight = slide.scrollHeight;
        const slideVisibleHeight = slide.clientHeight;
        
        if (slideContentHeight > slideVisibleHeight + 10) {
          const overflowAmount = slideContentHeight - slideVisibleHeight;
          const stepSize = window.innerHeight * 0.4; // 40vh per step
          const steps = Math.ceil(overflowAmount / stepSize);
          
          // Mark the slide itself as having overflow
          // We'll create a wrapper for consistent handling
          slide._slideOverflow = {
            steps: steps,
            overflowAmount: overflowAmount,
            stepSize: stepSize
          };
          
          totalSteps += steps;
          
          console.log(`[Overflow] Slide-level detected: ${steps} steps for slide`, slide);
        }
      }

      // Store overflow elements reference on slide
      slide._overflowElements = overflowElements;

      // --- SLIDE HEIGHT EXPANSION ---
      if (totalSteps > 0) {
        // Each step adds 50vh of scroll
        const scrollHeight = 100 + (totalSteps * 50);
        slide.style.height = `${scrollHeight}vh`;
        slide.classList.add('has-reveal'); // Reuse existing CSS structural changes
        
        // Wrap content in sticky container
        const content = document.createElement('div');
        content.className = 'slide-content';
        while (slide.firstChild) {
            content.appendChild(slide.firstChild);
        }
        slide.appendChild(content);

        // For slide-level overflow, mark the content wrapper
        if (slide._slideOverflow) {
          const { steps, overflowAmount, stepSize } = slide._slideOverflow;
          content.classList.add('has-overflow');
          content.dataset.overflowSteps = steps;
          content.dataset.overflowHeight = overflowAmount;
          content.dataset.stepSize = stepSize;
          overflowElements.push(content);
        }

        // Initialize reveal items as hidden
        revealItems.forEach(item => {
            item.classList.add('reveal-hidden');
            item.classList.remove('reveal-visible');
        });

        // Store metadata
        slide._revealCount = revealItems.length;
        slide._overflowCount = totalSteps - revealItems.length;
        slide._totalSteps = totalSteps;
      }
    });
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

  // --- NOVO MÉTODO: Restaurar Posição ---
  _restorePosition() {
    const savedIndex = localStorage.getItem(this.storageKey);
    
    if (savedIndex !== null) {
      const index = parseInt(savedIndex, 10);
      const targetSlide = this.slides[index];

      if (targetSlide) {
        console.log(`Restaurando para o slide ${index + 1}`);
        // Usa behavior: 'auto' para pular instantaneamente (sem animação suave)
        // Isso evita que o usuário veja a rolagem acontecendo ao dar F5
        targetSlide.scrollIntoView({ behavior: 'instant', block: 'start' });
        
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
        this._smoothScrollTo(slide.offsetTop);
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
        this._smoothScrollTo(this.slides[prevIndex].offsetTop);
      }
  }

  _scrollToNextSlide(currentIndex) {
      const nextIndex = currentIndex + 1;
      if (nextIndex < this.slides.length) {
          this._smoothScrollTo(this.slides[nextIndex].offsetTop);
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