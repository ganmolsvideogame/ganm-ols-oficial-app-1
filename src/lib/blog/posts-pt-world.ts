import type { BlogAuthor, BlogPostTranslation } from "@/lib/blog/posts-types";

const editorialAuthorPt: BlogAuthor = {
  name: "Equipe GANM OLS",
  role: "Redação GANM OLS",
  avatar: "/ganmols_blog_editor_avatar.svg",
};

export const PT_BLOG_POSTS_WORLD: BlogPostTranslation[] = [
  {
    slug: "super-mario-world-o-lancamento-que-redefiniu-a-era-16-bit-do-super-nintendo",
    title:
      "Super Mario World: o lançamento que redefiniu a era 16‑bit do Super Nintendo",
    tagline:
      "O carro-chefe do SNES expandiu o mapa, apresentou Yoshi e virou referência permanente para jogos de plataforma.",
    excerpt:
      "O carro-chefe do SNES expandiu o mapa, apresentou Yoshi e virou referência permanente para jogos de plataforma.",
    description:
      "Relembre o lançamento de Super Mario World, suas mecânicas, mundos secretos, legado e as formas oficiais de jogar hoje.",
    category: "Nintendo",
    author: editorialAuthorPt,
    publishedAt: "2026-03-23T21:15:00.000-03:00",
    updatedAt: "2026-03-23T21:15:00.000-03:00",
    readingMinutes: 9,
    keywords: [
      "super mario world",
      "super nintendo",
      "snes",
      "yoshi",
      "dinosaur land",
      "ganm ols blog",
    ],
    coverImage: "/blog/super-mario-world/capa-super-mario-world.png",
    coverAlt: "Capa do artigo da GANM OLS sobre Super Mario World no Super Nintendo.",
    relatedLinks: [
      {
        label: "Ler o artigo de Super Mario Kart",
        href: "/blog/super-mario-kart-uma-volta-no-classico-do-super-nintendo",
      },
      {
        label: "Ler o artigo de Mini Super Nintendo",
        href: "/blog/mini-super-nintendo-nostalgia-hardware-e-maneiras-legais-de-reviver-classicos",
      },
      {
        label: "Ver todas as leituras do blog",
        href: "/blog",
      },
    ],
    intro: [
      "Nos anos 1990, a transição para a era 16‑bit oferecia aos jogadores mundos mais amplos e coloridos. Super Mario World foi o carro‑chefe dessa revolução. Lançado originalmente para o Super Famicom em 21 de novembro de 1990 no Japão e chegando aos Estados Unidos em 23 de agosto de 1991, à Europa em 11 de abril de 1992 e ao Brasil em 30 de agosto de 1993, o jogo trouxe um mapa expansivo e novas mecânicas que influenciaram os plataformas por décadas. O título foi desenvolvido pela Nintendo EAD como sequência direta de Super Mario Bros. 3 e estreou o icônico dinossauro Yoshi, que se tornou estrela de sua própria franquia.",
    ],
    sections: [
      {
        title: "Enredo em Dinosaur Land",
        meta: "",
        paragraphs: [
          "Após salvarem o Reino do Cogumelo, Mario e Luigi vão relaxar na Terra dos Dinossauros. A tranquilidade acaba quando a princesa Toadstool é sequestrada. Explorando uma floresta, os irmãos encontram um gigantesco ovo de onde nasce Yoshi, que revela que Bowser e seus Koopalings aprisionaram os dinossauros em ovos. Empunhando uma capa mágica, Mario parte em busca da princesa, libertando os Yoshi e enfrentando os castelos dos Koopalings pelo caminho. A aventura culmina no Vale de Bowser, onde Mario enfrenta Bowser em seu Koopa Clown Car; derrotado, Bowser libera Toadstool e o grupo retorna à Casa do Yoshi para testemunhar o nascimento dos bebês Yoshi.",
        ],
      },
      {
        title: "Mecânicas e jogabilidade",
        meta: "",
        paragraphs: [
          "Super Mario World manteve a estrutura de mapas de Super Mario Bros. 3, mas a expandiu: em vez de mundos segmentados, o mapa agora apresenta caminhos interconectados, permitindo rotas alternativas e segredos. Cada fase é um desafio de plataforma 2D em que Mario (ou Luigi) deve alcançar o Giant Gate antes que o tempo acabe. Além do pulo clássico, o jogo introduziu vários movimentos e sistemas:",
          "Spin‑jump (salto giratório): destrói certos blocos e inimigos.",
          "Corrida e transporte: ao segurar X ou Y, Mario corre e pode carregar itens. Ele também pode carregar objetos debaixo d’água e nadar rapidamente.",
          "Bonus Stars e minijogos: ao tocar a fita móvel no Giant Gate, Mario ganha estrelas; 100 delas permitem jogar um minijogo para vidas extras.",
          "Midway Gate: funciona como checkpoint e transforma Mario em Super Mario ao ser tocado.",
          "Item Stock: permite armazenar um item reserva que cai automaticamente quando Mario sofre dano.",
        ],
      },
      {
        title: "Power‑ups",
        meta: "",
        media: {
          type: "image",
          src: "/blog/super-mario-world/super-mario-world-power-ups-e-yoshi.jpg",
          alt: "Power-ups e Yoshi em Super Mario World.",
        },
        paragraphs: [
          "Além do Super Cogumelo e Flor de Fogo, o jogo introduziu o Cape Feather, que dá a Mario uma capa com a qual pode planar, voar e realizar investidas aéreas. Também foi introduzido o Yoshi como montaria: ao montar um Yoshi, Mario ganha habilidades como engolir inimigos e cuspir projéteis. Existem diferentes cores de Yoshi que conferem poderes variados; por exemplo, Red Yoshi cospe bolas de fogo ao segurar qualquer casco, Blue Yoshi voa independentemente da cor do casco e Yellow Yoshi cria nuvens de areia ao aterrissar.",
        ],
      },
      {
        title: "Estrutura de mundos",
        meta: "",
        media: {
          type: "image",
          src: "/blog/super-mario-world/super-mario-world-estrutura-de-mundos.jpg",
          alt: "Estrutura de mundos e areas secretas de Super Mario World.",
        },
        paragraphs: [
          "A aventura se desenrola em sete áreas principais e duas zonas secretas. Os mundos vão de Yoshi’s Island, um ambiente de campos e colinas, até a Forest of Illusion, um labirinto de árvores em que muitas saídas levam de volta ao início. Cada mundo possui um Switch Palace, um nível que transforma blocos tracejados em blocos sólidos de determinada cor, criando plataformas essenciais. Destaques:",
          "Donut Plains: apresenta as primeiras Casas Assombradas e fases com múltiplas saídas; utiliza bastante a Cape Feather.",
          "Vanilla Dome: um labirinto subterrâneo com lagos e o Red Switch Palace.",
          "Twin Bridges: região semi‑aérea com pontes e níveis de céu e terra.",
          "Forest of Illusion: mundo onde os caminhos se repetem até o jogador encontrar saídas secretas.",
          "Além dos mundos principais, há duas áreas secretas:",
          "Star World: acessada via Star Roads, exige que o jogador encontre chaves e fechaduras secretas para avançar. É aqui que se encontram os Mini‑Yoshi de diferentes cores.",
          "Special Zone: desbloqueada ao completar todas as saídas secretas da Star World; possui fases extremamente difíceis sem checkpoints. Concluir essa zona altera a paleta do mapa e modifica sprites de inimigos (modo Fall).",
        ],
      },
      {
        title: "Modos de jogo",
        meta: "",
        paragraphs: [
          "O jogo permite modo de dois jogadores alternado: Player 1 controla Mario e Player 2 controla Luigi, revezando a cada derrota ou ao completar uma fase. Os jogadores podem compartilhar vidas no mapa. Yoshi não pode entrar em castelos, fortalezas ou Casas Assombradas; ele espera do lado de fora.",
        ],
      },
      {
        title: "Legado, relançamentos e formas legais de jogar hoje",
        meta: "",
        paragraphs: [
          "Super Mario World é considerado um dos melhores jogos da Nintendo, tendo vendido milhões de cópias e inspirado uma série de spin‑offs. A popularidade de Yoshi levou ao lançamento de Super Mario World 2: Yoshi’s Island em 1995. O jogo foi relançado várias vezes: integrado na compilação Super Mario All‑Stars + Super Mario World em 1994; como Super Mario Advance 2 para Game Boy Advance em 2001; e nas lojas virtuais do Wii (2006), Wii U (2013) e New Nintendo 3DS (2016). Ele está incluído no SNES Classic Edition e na biblioteca Super Nintendo Entertainment System – Nintendo Classics; esta última ganhou uma versão alternativa chamada “Give the world a whole new look!” em 2022 que inicia no modo Fall com 99 vidas e uma Cape Feather.",
          "Para jogar de forma legítima hoje, os fãs podem adquirir o SNES Classic Edition (ou o Super Nintendo Mini), assinar o serviço Nintendo Switch Online (que inclui Super Mario World), ou comprar os relançamentos digitais oficiais. Estas opções oferecem experiência autêntica e evitam violar direitos autorais.",
        ],
      },
      {
        title: "Conclusão",
        meta: "",
        paragraphs: [
          "Mais de três décadas após seu lançamento, Super Mario World continua sendo um marco dos videogames. Seu mapa expansivo, a introdução de Yoshi e as inúmeras saídas secretas estabelecem um padrão para jogos de plataforma até hoje. A aventura em Dinosaur Land oferece desafio e exploração que ainda conquistam novos jogadores e alimentam a nostalgia dos veteranos.",
        ],
      },
    ],
    conclusion: null,
  },
];
