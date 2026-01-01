::: center
# Introdução à Programação com Python
## Aula 01: Fundamentos e Ambiente

:::

---

# O que é Programação de Computadores?

::: row
::: col
**Programar** é construir ou modificar programas.

**Programa** é um conjunto de instruções que o computador executa para resolver um problema ou realizar uma tarefa. É um *algoritmo* codificado.

**Algoritmo** é uma sequência de passos bem definidos para resolver um problema especificado sobre *dados*.

**Dados** são informações codificadas.

:::

::: col
:: image { "src": "https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=800", "alt": "Código na tela" }
:::
:::

---
# O que é Linguagem de Programação?

É uma linguagem **formal** usada para escrever programas.

Diferente das linguagens **naturais**, que permitem ambiguidade e variações.

::: row
::: col
### Níveis de Linguagem
* **Baixo Nível (Máquina/Assembly):** Próxima da linguagem da máquina, controla o hardware.
* **Alto Nível (ex.: Python):** Próxima da linguagem humana (inglês), alta *abstração*.
:::

::: col
### Exemplo (Alto Nível)
```python
nome = input("Qual seu nome? ")
print(f"Olá, {nome}!")
```
:::
:::

---

# Programação na Era da IA

**"Por que aprender a programar se a IA faz isso tão bem?"** 

::: row
::: col
### Saber escrever código ainda é importante
Conhecer a linguagem é essencial para expressar a lógica de forma clara e eficiente.

### Pensamento Computacional
*  Capacidade de quebrar problemas grandes em partes menores. 
* **A "Caixa Preta":** Se você não entende a base, não sabe julgar se a IA acertou ou errou. 
:::

::: col
:: image { "src": "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=800", "alt": "Robô e Humano xadrez" }
:::
:::

---

# O Novo Papel do Programador

A IA não matou a programação, ela elevou o nível de exigência

::: row
::: col
### Antes (Escritor)
* Foco na Sintaxe.
* Escrever código do zero.
* O programador é um artesão.
:::
::: col
### Agora (Editor)
* Especificar requisitos.
* Revisar, corrigir e integrar código. 
* Estruturar sistemas. 
* O programador é o "Arquiteto" ou "Gerente". 
:::
:::

---

# Cuidado com Alucinações!
LLMs criam bibliotecas inexistentes e lógicas que "parecem" certas, mas falham. 

- Não confie na IA para resolver problemas complexos.
- Teste exaustivamente código que a IA gera.
- Para revisar criticamente, você precisa _entender_ a estrutura profundamente. 

---

# Programação com IA

A IA é ótima em gerar trechos soltos, mas falha no **Contexto Macro**. 

::: row
::: col
### Integração
- Ex.: Fazer o código Python conversar com um Banco de Dados já existente

### Restrições Reais
- Ex. Código vai rodar num sensor com pouca bateria ou internet lenta. 
:::

::: col
### Debugging Complexo
- Ex. Isolar a causa raiz quando o sistema inteiro para (a IA costuma entrar em loops de erro). 

### Segurança e Ética
- Ex. Evitar vulnerabilidades (ex: Injeção de SQL) que a IA aprendeu em dados antigos. 
:::
:::

---

# Como estudar com IA?

Não use a IA para pular a parte difícil. Isso atrofia o aprendizado. 

::: col 
### ❌ O Jeito Errado
* *"ChatGPT, resolva este exercício."* 
* Copiar e Colar sem ler (sempre digite o código para entender). 
* Aceitar a primeira sugestão sem questionar a qualidade da resposta. 
:::
::: col reveal
### ✅ O Jeito Certo
* **Regra dos 15 min:** Tente sozinho antes de pedir ajuda. 
* **Tutor Socrático:** Peça explicações de conceitos ("Explique como se eu tivesse 10 anos"), não a solução final. 
* **Verificação Cruzada:** Assuma que a IA está mentindo. Teste exaustivamente. 
:::

---
# Exemplo
::: row
::: col
>Como escrever uma função que recebe uma lista com números inteiros e retorna a mediana? Me guie na solução do problema, mas não me dê a resposta.
:::

::: col reveal
### 1. Preparando o Terreno (Ordenação)

Imagine que eu te dê a seguinte lista de números: `[50, 10, 2, 100, 5]`.
Se você olhar para o número que está "no meio" da lista como ela está agora, seria o `2`. Mas essa é a mediana? **Não.** A mediana exige ordem.

* **Pergunta 1:** O que precisamos fazer com os números antes de qualquer coisa para que a posição do meio realmente represente o valor central?
    > **Dica Python:** Existe um método de listas chamado `.sort()` e uma função chamada `sorted()`.

----
### 2. A Lógica do "Meio" (Tamanho Par vs. Ímpar)

A regra da mediana muda dependendo da quantidade de elementos na lista. Vamos usar `n` como o tamanho da lista (que você consegue usando `len(lista)`).

#### Caso A: Quantidade Ímpar
Imagine a lista ordenada: `[2, 5, 10, 50, 100]`.
* O tamanho `n` é 5.
* O elemento do meio é o `10`.
* O índice (posição) do `10` é **2** (lembre-se que em Python a contagem começa no 0: `0, 1, 2, 3, 4`).

* **Pergunta 2:** Qual operação matemática simples usando o tamanho `5` resulta no índice `2`? Lembre-se que precisamos de um número inteiro para acessar um índice.
    * *Dica:* Pense na **divisão inteira** (`//` no Python).

#### Caso B: Quantidade Par
Imagine a lista ordenada: `[2, 5, 10, 50]`.
* O tamanho `n` é 4.
* Não existe um único número no meio. Temos o `5` (índice 1) e o `10` (índice 2).
* A mediana é a média aritmética desses dois: $(5 + 10) / 2 = 7.5$.

* **Pergunta 3:** Como encontrar os índices **1** e **2** usando apenas o tamanho total **4**?

-----

### 3. Estruturando o Algoritmo

Agora, vamos montar o esqueleto da sua função em "pseudocódigo" (português estruturado):

1.  Definir a função (ela recebe a lista como argumento).
2.  **Ordenar** a lista.
3.  Calcular o tamanho da lista.
4.  Verificar: O tamanho é **Par** ou **Ímpar**? (Use o operador `%` "módulo").
    * **Se for Ímpar:** Retorne o elemento que está no índice central (calculado na Pergunta 2).
    * **Se for Par:** Pegue os dois elementos centrais (calculados na Pergunta 3), some-os e divida por 2. Retorne esse resultado.

-----

**Sua vez:** Tente escrever o código seguindo esses passos. Se tiver dúvida na sintaxe de alguma parte (como o `if/else` ou como pegar o índice), pode perguntar!
:::

---

::: center
## Resumo: O Programador em 2026 (e além?)

| Foco Tradicional | Foco Moderno (Com IA) |
| :--- | :--- |
| Memorizar Sintaxe | Entender Lógica e Arquitetura |
| Escrever do Zero | Revisar, Refatorar e Integrar |
| "Fazer Rodar" | Verificar Solução e Segurança |

:::

---

# Python como primeira linguagem

Por que escolhemos Python para começar?

::: row
::: col
* **Legibilidade:** O código parece inglês simples.
* **Produtividade:** Menos linhas de código para fazer a mesma coisa que em C ou Java.
* **Comunidade:** Vasta documentação e suporte acadêmico.
:::

::: col
:: image { "src": "https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg", "alt": "Logo Python" }
:::
:::
:::

---

# Características do Python

::: row
::: col
### Interpretada
O código é executado linha por linha por um intérprete, sem necessidade de compilação prévia complexa.

### Tipagem Dinâmica
O Python identifica automaticamente os tipos de dados (números, texto) sem declaração explícita.
:::

::: col
### Multiparadigma
Suporta programação Procedural, Orientada a Objetos e Funcional.

### Batteries Included
A biblioteca padrão já vem com ferramentas para quase tudo (matemática, internet, arquivos).
:::
:::

---

# Python no Windows

Diferente de outros sistemas, o Windows não costuma trazer o Python pré-instalado.

::: col
### Instalação
  1. Acesse o site oficial: **python.org**
  2. Vá em Downloads > Windows.
  3. Baixe o instalador mais recente.

### ⚠️ Importante
Na tela de instalação, marque a opção:
**"Add Python to PATH"**
Isso permite usar o Python direto no terminal.
:::

::: col
:: image { "src": "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800", "alt": "Tela Windows" }
:::

---

# Python no macOS

O macOS (Unix) geralmente já possui ferramentas Python, mas há uma pegadinha importante.

::: row
::: col
Antigamente, usava-se o comando `python` (versão 2.x, obsoleta).

Nas versões modernas do macOS, você deve usar explicitamente o comando `python3`

### Verificação
Abra o Terminal e digite:
```bash
python3 --version
```
:::

::: col
:: image { "src": "images/mac python.png", "alt": "Macbook Terminal" }
:::
:::

---

# Python no Linux

A grande maioria das distribuições Linux (Ubuntu, Fedora, Debian) já vem com Python 3 instalado nativamente.

::: row
::: col
### Uso no Terminal
Assim como no Mac, o padrão seguro é chamar a versão 3:

```bash
python3 script.py
```

Se precisar instalar pacotes adicionais, usamos o gerenciador do sistema (ex: `apt install python3-pip`).
:::

::: col
:: image { "src": "https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800", "alt": "Terminal Linux" }
:::
:::

---


# O Ambiente Jupyter

O **Jupyter Notebook** é o padrão para Ciência de Dados e ensino.

::: col
Ele une três elementos em um único documento:
* **Código Executável:** Células que rodam Python.
* **Texto Rico (Markdown):** Explicações, fórmulas e links.
* **Visualização:** Gráficos e tabelas gerados no momento.

Você pode instalar no seu computador ou usar o JupyterLite que é uma versão que roda no navegador.

Há também instalações no Google Colab e no GitHub.
:::

::: col
:: image { "src": "https://upload.wikimedia.org/wikipedia/commons/3/38/Jupyter_logo.svg", "alt": "Logo Jupyter" }
:::


---

# JupyterLite

O **JupyterLite** é uma implementação do Jupyter Notebook que permite rodar Python direto no navegador, sem instalação.

Há várias instalações disponíveis do JupyterLite, por exemplo
- **JupyterLab** (https://jupyter.org/try-jupyter/lab/)
- Demo do JupyterLite (https://jupyterlite.github.io/demo/lab/index.html 

---

:: iframe { "src": "https://jupyter.org/try-jupyter/lab/" }

---
# Vamos resolver o problema da mediana?

Pseudocódigo sugerido pela IA:

1.  Definir a função (ela recebe a lista como argumento).
2.  **Ordenar** a lista.
3.  Calcular o tamanho da lista.
4.  Verificar: O tamanho é **Par** ou **Ímpar**? (Use o operador `%` "módulo").
    * **Se for Ímpar:** Retorne o elemento que está no índice central.
    * **Se for Par:** Pegue os dois elementos centrais, some-os e divida por 2. Retorne esse resultado.

---
# Uma solução

::: col
```python
def mediana (lista):
    lista.sort()
    i = len(lista)//2
    if len(lista)%2 == 1:
        return lista[i]
    else:
        return (lista[i]+lista[i-1])/2
```
:::
::: col
1. `def` define uma função
2. `lista` é o nome da lista que recebemos como argumento
3. `lista.sort()` ordena a lista em ordem crescente
4. `len(lista)` retorna o tamanho da lista
5. `len(lista)//2` retorna o índice do meio da lista
6. `len(lista)%2` retorna 1 se o tamanho da lista for ímpar e 0 se for par
7. `if len(lista)%2 == 1` verifica se o tamanho da lista é ímpar
8. `return lista[i]` retorna o elemento que está no índice central
9. `else` se o tamanho da lista for par
10. `return (lista[i]+lista[i-1])/2` retorna a média aritmética dos dois elementos centrais

::: 

---
# É uma boa solução?

O que é uma boa solução?
::: reveal*
  - Uma solução simples e compreensível 
  - Uma solução que funciona para todas as entradas 
  - Uma solução que é eficiente
  - Uma solução que é segura
  - Uma solução que é escalável
  - Uma solução que é manutenível
:::
::: reveal
Nem sempre todos os requisitos podem ser atendidos ao mesmo tempo!
:::
---
::: center
# Obrigado!
::: 