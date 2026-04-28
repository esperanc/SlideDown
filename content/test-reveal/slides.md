# Algoritmo $Trace(R)$
:::reveal*
- Determinar o ponto $P$ de interseção do objeto mais próximo $X$
- Se não houver interseção, retornar cor de fundo
- Se $X$ tem componente **especular**
  - $C_{e} \leftarrow Trace (R_{e})$, onde $R_e$ é o raio de reflexão ideal 
- Se $X$ tem componente **transparente**
  - $C_t \leftarrow Trace (R_t)$, onde $R_t$ é o raio de refração ideal 
- Se $X$ tem componente **difuso**, para cada fonte $L_i$
  - Lançar um raio na direção de $L_i$
  - Se o raio atinge $L_i$
    - $C_{d_i} \leftarrow $ Iluminação difusa devida a $L_i$
- Computar componente ambiente $C_a$
- Retornar $C_e + C_t + C_a + \sum C_{d_i}$
:::
---
# Two revealed images
:::reveal
:: image src="https://placehold.co/1600x600"
:::
:::reveal
:: image src="https://placehold.co/1600x600"
:::
