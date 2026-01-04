::: center
# Introdução à Programação com Python
## Aula 03: Estruturas de Repetição
:::
---
# Uma tartaruga!

Vamos introduzir a biblioteca `turtle` que nos permite desenhar figuras geométricas.

No ambiente Jupyterlite, esta biblioteca não vem por padrão, mas podemos instalar uma semelhante facilmente.

Num notebook Jupyterlite, basta digitar o seguinte comando:

```python
import piplite
await piplite.install('jupyturtle', deps=False)
await piplite.install('ipycanvas') 
from jupyturtle import *
```
---

# A ideia da coisa
A tartaruga é um ser que vive numa superfície plana e pode se mover e desenhar figuras geométricas. 

A superfície é criada pelo comando `make_turtle()`
 - É possível personalizar a superfície passando parâmetros para o comando
 - Por exemplo, `make_turtle(height=400, width=400)` cria uma superfície de 400x400 pixels

Uma vez criada a superfície, a tartaruga pode ser controlada com comandos como 
 - `forward(100)` move a tartaruga 100 pixels para frente
 - `left(90)` gira a tartaruga 90 graus para a esquerda

---
# Exemplo
:::row
:::col
```python
make_turtle(height=400, width=400) 
forward(100)
left(90)
forward(100)
```
:::
:::col
:: image { "src": "turtle01.svg" }
:::
:::

---

# Um quadrado!

::: row
::: col
```python
make_turtle(height=400, width=400) 
forward(100)
left(90)
forward(100)
left(90)
forward(100)
left(90)
forward(100)
left(90)
```
:::
::: col
:: image { "src": "turtle02.svg" }
:::
::: 