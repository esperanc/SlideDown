class ScrollyParser {
  constructor() {
    this.patterns = {
      slideSeparator: /^---[ \t]*$/gm, // Aceita espaços após '---'
      blockStart: /^:::\s*([^\s]+)(.*)/, // Alterado para aceitar caracteres como *
      blockEnd: /^:::\s*$/,
      component: /^::\s*(\w+)(.*)/
    };

    // --- NOVO: Listas de Comandos Suportados para Validação ---
    this.allowedBlocks = ['row', 'col', 'center', 'section', 'reveal', 'reveal*'];
    this.allowedComponents = ['image', 'youtube', 'iframe'];
  }

  parse(fullText) {
    const rawSlides = fullText.split(this.patterns.slideSeparator);
    return rawSlides.map((slideText, index) => {
      return this._parseSlide(slideText.trim(), index);
    });
  }

  _parseSlide(text, index) {
    const root = { type: 'slide', id: index, children: [] };
    const stack = [root];
    let textBuffer = [];

    const flushBuffer = () => {
      if (textBuffer.length > 0) {
        // --- NORMALIZAÇÃO DE INDENTAÇÃO (DEDENT) ---
        // 1. Encontra a menor indentação comum (ignorando linhas vazias)
        let minIndent = Infinity;
        textBuffer.forEach(line => {
            if (line.trim().length > 0) {
                const indent = line.match(/^\s*/)[0].length;
                if (indent < minIndent) minIndent = indent;
            }
        });

        // 2. Remove essa indentação de todas as linhas
        if (minIndent !== Infinity && minIndent > 0) {
            textBuffer = textBuffer.map(line => {
                if (line.trim().length === 0) return "";
                return line.substring(minIndent);
            });
        }
        // -------------------------------------------

        const content = textBuffer.join('\n').trim();
        if (content) {
          stack[stack.length - 1].children.push({
            type: 'markdown',
            content: content
          });
        }
        textBuffer = [];
      }
    };

    // 1. Parsing Linha a Linha (Lógica Original)
    const lines = text.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();

      if (this.patterns.blockEnd.test(trimmed)) {
        flushBuffer();
        if (stack.length > 1) stack.pop();
        return;
      }

      const blockStartMatch = trimmed.match(this.patterns.blockStart);
      if (blockStartMatch) {
        flushBuffer();
        let [_, type, args] = blockStartMatch;
        args = args || ""; // Garante que é string

        // --- LÓGICA DE BLOCOS ENCADEADOS (JOINED BLOCKS) ---
        // Verifica se os argumentos começam com outros nomes de blocos permitidos
        // Ex: "::: col reveal" -> type="col", args=" reveal ..."
        // Loop para consumir palavras iniciais de 'args' que sejam blocos válidos
        
        let possibleNextBlockStart = true;
        while (possibleNextBlockStart) {
            const trimmedArgs = args.trim();
            // Pega a primeira palavra de args
            const firstWordMatch = trimmedArgs.match(/^([^\s\{]+)/);
            
            if (firstWordMatch) {
                const word = firstWordMatch[1];
                if (this.allowedBlocks.includes(word)) {
                    // É um bloco válido! Adiciona ao type e remove de args
                    type += " " + word;
                    // Remove a palavra do começo de 'args'
                    // Precisamos tomar cuidado para remover do args original (com espaços)
                    const splitIndex = args.indexOf(word) + word.length;
                    args = args.substring(splitIndex);
                } else {
                    possibleNextBlockStart = false;     
                }
            } else {
                possibleNextBlockStart = false;
            }
        }

        // --- VALIDAÇÃO DE SINTAXE DE BLOCO ---
        // Agora 'type' pode ser "col reveal", então validamos cada parte
        const types = type.split(/\s+/);
        const invalidTypes = types.filter(t => !this.allowedBlocks.includes(t));
        
        if (invalidTypes.length > 0) {
          console.warn(`[Parser Warning] Slide ${index + 1}: Unknown block(s) '::: ${invalidTypes.join(', ')}'. Expected: ${this.allowedBlocks.join(', ')}`);
        }
        // -------------------------------------

        const newBlock = {
          type: 'container',
          variant: type, // Passamos a string composta "col reveal"
          params: this._parseParams(args),
          children: []
        };
        stack[stack.length - 1].children.push(newBlock);
        stack.push(newBlock);
        return;
      }

      const componentMatch = trimmed.match(this.patterns.component);
      if (componentMatch) {
        flushBuffer();
        const [_, name, args] = componentMatch;

        // --- VALIDAÇÃO DE SINTAXE DE COMPONENTE ---
        if (!this.allowedComponents.includes(name)) {
             console.warn(`[Parser Warning] Slide ${index + 1}: Unknown component ':: ${name}'. Expected: ${this.allowedComponents.join(', ')}`);
        }
        // ------------------------------------------

        stack[stack.length - 1].children.push({
          type: 'component',
          name: name,
          params: this._parseParams(args)
        });
        return;
      }

      textBuffer.push(line);
    });

    flushBuffer();

    // --- NOVO: PÓS-PROCESSAMENTO (AUTO-ROW) ---
    // Agrupa colunas órfãs adjacentes em uma 'row' implícita
    const groupedChildren = [];
    let implicitRow = null;

    root.children.forEach(child => {
      // Verifica se o filho é uma coluna direta do slide
      // ATUALIZADO: Checa se 'col' está entre as variantes (ex: "col reveal")
      const variants = (child.type === 'container' && child.variant) ? child.variant.split(/\s+/) : [];
      const isColumn = variants.includes('col');

      if (isColumn) {
        // Se ainda não temos uma linha temporária, cria uma
        if (!implicitRow) {
          implicitRow = {
            type: 'container',
            variant: 'row', // ATUALIZADO: Cria uma 'row'
            params: {},       
            children: []
          };
          groupedChildren.push(implicitRow);
        }
        // Move a coluna para dentro da linha implícita
        implicitRow.children.push(child);
      } else {
        // Se encontramos algo que NÃO é coluna...
        implicitRow = null;
        groupedChildren.push(child);
      }
    });

    // Substitui os filhos originais pelos agrupados
    root.children = groupedChildren;
    // ------------------------------------------

    return root;
  }

  _parseParams(argString) {
    if (!argString || !argString.trim()) return {};
    
    const trimmed = argString.trim();

    // 1. Se começar com '{', assume que é JSON estrito
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed); 
      } catch (e) {
        return { error: "Invalid JSON params", raw: trimmed };
      }
    }

    // 2. Parseamento Relaxado (key=value)
    // Suporta: key="val", key='val', key=val
    const params = {};
    const regex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
    
    let match;
    while ((match = regex.exec(trimmed)) !== null) {
        const key = match[1];
        // O valor pode estar no grupo 2 (aspas duplas), 3 (simples) ou 4 (sem aspas)
        const value = match[2] !== undefined ? match[2] : 
                      match[3] !== undefined ? match[3] : 
                      match[4];
        params[key] = value;
    }

    // Se nenhum match for encontrado, retorna raw (compatibilidade)
    if (Object.keys(params).length === 0 && trimmed.length > 0) {
        return { raw: trimmed };
    }

    return params;
  }
}