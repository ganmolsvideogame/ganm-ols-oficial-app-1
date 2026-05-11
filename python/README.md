# GANM OLS AI

Camada Python para inteligencia interna da GANM OLS.

Esta pasta nao entra no runtime do Next.js/Vercel por enquanto. Ela serve como ferramenta local para melhorar importacao, auditoria e organizacao de produtos antes de publicar no site.

## O que ela faz agora

- Audita catalogos em JSON ou CSV.
- Detecta preco zerado, descricao fraca, copy generica, categoria/plataforma ausente e imagens repetidas.
- Gera uma primeira versao de copy baseada em fatos do anuncio, sem inventar caracteristicas.
- Sugere agrupamento de recomendacoes para cross-sell, upsell e downsell.
- Ajuda a separar produtos por plataforma, evitando misturar itens que nao conversam entre si.

## Como rodar

```powershell
cd "c:\ganm ols oficial app\python"
python -m ganm_ols_ai.cli catalog --input examples/products_sample.json
```

Para gerar um relatorio em arquivo:

```powershell
python -m ganm_ols_ai.cli catalog --input examples/products_sample.json --output .out/catalog-report.json
```

## Formato aceito

JSON pode ser uma lista de produtos ou um objeto com a chave `products`.

Campos reconhecidos:

- `title` ou `titulo`
- `description` ou `descricao`
- `price` ou `preco`
- `platform` ou `plataforma`
- `category` ou `categoria`
- `source_url`
- `affiliate_url`
- `images` ou `imagens`
- `seller_rating`

CSV usa os mesmos nomes de coluna.

## Proximo passo

Conectar esta camada ao painel admin da GANM OLS para revisar importacoes em massa antes de salvar no banco.
