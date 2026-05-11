import {
  buildBlogIndexPath,
  buildBlogPostPath,
  DEFAULT_BLOG_LOCALE,
  getBlogLocaleConfig,
  getBlogLocaleFromPathname,
  type BlogLocale,
} from "@/lib/blog/locales";
import { EN_BLOG_POSTS_EXTRA } from "@/lib/blog/posts-en-extra";
import { EN_BLOG_POSTS_WORLD } from "@/lib/blog/posts-en-world";
import { EN_BLOG_POSTS_BASE } from "@/lib/blog/posts-en";
import { PT_BLOG_POSTS_EXTRA } from "@/lib/blog/posts-pt-extra";
import { PT_BLOG_POSTS_WORLD } from "@/lib/blog/posts-pt-world";

export type BlogLink = {
  label: string;
  href: string;
};

export type BlogMedia = {
  type: "image";
  src: string;
  alt: string;
  caption?: string;
};

export type BlogArticleSection = {
  title: string;
  meta: string;
  paragraphs: string[];
  media?: BlogMedia;
};

export type BlogAuthor = {
  name: string;
  role: string;
  avatar: string;
};

export type BlogConclusion = {
  title: string;
  body: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  tagline: string;
  excerpt: string;
  description: string;
  category: string;
  author: BlogAuthor;
  publishedAt: string;
  updatedAt?: string;
  readingMinutes: number;
  keywords: string[];
  coverImage: string;
  coverAlt: string;
  relatedLinks: BlogLink[];
  intro: string[];
  sections: BlogArticleSection[];
  conclusion?: BlogConclusion | null;
};

export type LocalizedBlogPost = BlogPost & {
  articleId: string;
  locale: BlogLocale;
};

const editorialAuthor: BlogAuthor = {
  name: "Equipe GANM OLS",
  role: "Redação GANM OLS",
  avatar: "/ganmols_blog_editor_avatar.svg",
};

const BLOG_POSTS: BlogPost[] = [
  {
    slug: "top-gear-no-super-nintendo-o-classico-de-corrida-que-marcou-uma-geracao",
    title: "Top Gear no Super Nintendo: o clássico de corrida que marcou uma geração",
    tagline:
      "A recente busca por Top Gear no contexto de jogos retrô se explica pelo interesse renovado na franquia de corridas da era 16‑bits.",
    excerpt:
      "A recente busca por Top Gear no contexto de jogos retrô se explica pelo interesse renovado na franquia de corridas da era 16‑bits.",
    description:
      "Relembre a origem, jogabilidade, legado e formas oficiais de jogar Top Gear no Super Nintendo hoje.",
    category: "Retro",
    author: editorialAuthor,
    publishedAt: "2026-03-21T13:10:00.000-03:00",
    updatedAt: "2026-03-21T13:10:00.000-03:00",
    readingMinutes: 8,
    keywords: [
      "top gear super nintendo",
      "top racer",
      "snes",
      "jogo de corrida retro",
      "top racer collection",
      "ganm ols blog",
    ],
    coverImage: "/blog/top-gear/capa-top-gear-super-nintendo.png",
    coverAlt: "Capa do artigo da GANM OLS sobre Top Gear no Super Nintendo.",
    relatedLinks: [
      {
        label: "Explorar categoria Retro",
        href: "/marca/sega",
      },
      {
        label: "Ler o artigo de Super Mario Kart",
        href: "/blog/super-mario-kart-uma-volta-no-classico-do-super-nintendo",
      },
      {
        label: "Ver todas as leituras do blog",
        href: "/blog",
      },
    ],
    intro: [
      "A recente busca por Top Gear no contexto de jogos retrô se explica pelo interesse renovado na franquia de corridas da era 16‑bits. Lançado originalmente para o Super Nintendo Entertainment System (SNES) em 1992, o título desenvolvido pelo estúdio britânico Gremlin Graphics e publicado pela japonesa Kemco foi um dos primeiros simuladores de velocidade no console. Conhecido como Top Racer no Japão, o jogo combinava competição arcade com elementos estratégicos e serviu de base para uma série de sequências e coletâneas. A seguir, revisitamos sua origem, mecânicas e legado, além de indicar formas legais de experimentar a aventura hoje.",
    ],
    sections: [
      {
        title: "Origem e lançamento",
        meta: "",
        media: {
          type: "image",
          src: "/blog/top-gear/top-gear-origem-e-lancamento.jpg",
          alt: "Origem e lançamento de Top Gear no Super Nintendo.",
        },
        paragraphs: [
          "Top Gear chegou ao mercado em um período em que o SNES ainda engatinhava no gênero de corrida. A produção foi anunciada e desenvolvida na Inglaterra pela Gremlin Graphics e teve distribuição mundial pela Kemco. As datas de lançamento variaram conforme a região: 27 de março de 1992 no Japão, 16 de abril de 1992 na América do Norte e 19 de novembro de 1992 na Europa. Esses lançamentos fazem dele um dos pioneiros do gênero no Super Nintendo e o título inaugural da série Top Gear/Top Racer. O objetivo central é simples: tornar‑se o piloto mais rápido do mundo, competindo contra oponentes em pistas situadas em vários países.",
        ],
      },
      {
        title: "Jogabilidade: corridas cheias de estratégia",
        meta: "",
        media: {
          type: "image",
          src: "/blog/top-gear/top-gear-jogabilidade-estrategia.jpg",
          alt: "Jogabilidade e estratégia de Top Gear no Super Nintendo.",
        },
        paragraphs: [
          "Apesar da estética arcade, Top Gear se destaca por misturar velocidade com escolhas táticas. O jogo oferece modo single‑player e modo multiplayer em tela dividida, permitindo competir em corridas simultâneas. Antes de entrar na pista, o jogador registra seu nome e define se prefere câmbio manual ou automático: na transmissão manual, é preciso trocar de marcha utilizando os botões do ombro do controle; na automática, o carro faz as trocas sozinho. Também é possível escolher entre quatro configurações de controle, realocando botões para acelerar, frear, trocar de marcha e ativar o turbo.",
          "Há quatro carros disponíveis, cada um com características distintas de aceleração, velocidade máxima, consumo de combustível e aderência. Por exemplo, o Cannibal prioriza alta velocidade, mas consome mais combustível e tem pouca aderência; já o Sidewinder é mais lento na reta, porém curva melhor e economiza combustível. Para dar um gás extra, o jogo disponibiliza três nitros por corrida, que produzem curtos disparos de velocidade.",
          "A progressão se dá por regiões compostas por quatro etapas. É necessário terminar cada corrida entre os cinco primeiros para avançar; ao final das quatro etapas, a pontuação acumulada define se o piloto progride para a próxima região. O combustível é um recurso crítico: cada carro tem seu tanque e, ao ficar sem gasolina, a corrida termina. Para evitar isso, o jogador pode entrar nos pit stops durante as provas para reabastecer, perdendo tempo precioso. Top Gear também alterna corridas diurnas e noturnas e inclui obstáculos na pista, como placas e veículos, que exigem reflexos rápidos e penalizam batidas.",
        ],
      },
      {
        title: "Legado, popularidade e trilha sonora",
        meta: "",
        paragraphs: [
          "Ao contrário de muitos jogos de corrida de sua época, Top Gear conquistou um público fiel, especialmente na América do Sul. O título “ganhou notável popularidade no Brasil durante o início dos anos 1990, tornando‑se um dos jogos de corrida mais reconhecidos do país”. A ampla presença de locadoras de jogos e a circulação de consoles no mercado local ampliaram sua difusão, e o game concorreu diretamente com outros lançamentos importantes como F‑Zero, Super Mario Kart e Lamborghini American Challenge. Além de sua jogabilidade acessível, a trilha sonora composta por Barry Leitch se tornou icônica; faixas como “Vegas” ganharam status de culto e inspiraram milhares de versões de fãs. Décadas depois, o compositor escocês foi convidado a trabalhar em Horizon Chase, jogo brasileiro considerado sucessor espiritual de Top Gear, evidenciando o legado sonoro do clássico.",
        ],
      },
      {
        title: "Como jogar hoje de forma oficial",
        meta: "",
        paragraphs: [
          "Para quem deseja reviver as corridas sem recorrer a meios ilícitos, existem opções modernas e legais:",
          "Top Racer Collection – Em março de 2024, a QUByte Interactive lançou o pacote Top Racer Collection para Nintendo Switch, PlayStation, Xbox e PC. A coletânea traz os jogos originais Top Racer (Top Gear), Top Racer 2 e Top Racer 3000, além de conteúdo exclusivo. De acordo com a descrição oficial, a coleção oferece filtros que recriam a aparência dos anos 90, modo online para disputar corridas com outras pessoas, desafios de ranking e um modo Time Attack para testar suas habilidades contra o relógio. É uma maneira prática de experimentar a série com melhorias e recursos de conectividade.",
          "Evercade e multigames – O jogo foi relançado em 2020 em um cartucho múltiplo para o console retrô Evercade, possibilitando jogá‑lo em hardware dedicado. Esta é outra forma oficial de acesso, com licenciamento e sem necessidade de emulação pirata.",
          "Colecionismo – Cartuchos originais de Top Gear ainda circulam no mercado de usados. Embora sejam itens de colecionador, muitos apreciadores de consoles clássicos optam por jogar no hardware original para sentir a experiência autêntica.",
        ],
      },
      {
        title: "Conclusão",
        meta: "",
        paragraphs: [
          "Top Gear permanece, mais de três décadas depois, um marco do catálogo do Super Nintendo. Sua mistura de velocidade arcade com estratégia, seleção de veículos e gerenciamento de combustível criou um modelo que influenciaria gerações de jogos de corrida. O sucesso no Brasil e a popularidade da trilha sonora demonstram o alcance cultural do título. Com relançamentos recentes como o Top Racer Collection, novos jogadores podem conhecer esse clássico de maneira oficial, enquanto veteranos revivem a nostalgia de correr pelas pistas virtuais dos anos 1990.",
        ],
      },
    ],
    conclusion: null,
  },
  {
    slug: "super-mario-bros-wonder-o-retorno-triunfal-do-mario-em-2d",
    title: "Super Mario Bros. Wonder: o retorno triunfal do Mario em 2D",
    tagline:
      "A procura por Super Mario Bros. Wonder voltou a disparar após o anúncio da edição Nintendo Switch 2 + Meetup in Bellabel Park.",
    excerpt:
      "A procura por Super Mario Bros. Wonder voltou a disparar após o anúncio da edição Nintendo Switch 2 + Meetup in Bellabel Park.",
    description:
      "Conheça enredo, Wonder Flowers, badges, a edição de Switch 2 e as formas oficiais de jogar Super Mario Bros. Wonder.",
    category: "Nintendo",
    author: editorialAuthor,
    publishedAt: "2026-03-21T12:20:00.000-03:00",
    updatedAt: "2026-03-21T12:20:00.000-03:00",
    readingMinutes: 9,
    keywords: [
      "super mario bros wonder",
      "nintendo switch 2",
      "mario 2d",
      "flower kingdom",
      "meetup in bellabel park",
      "ganm ols blog",
    ],
    coverImage: "/blog/super-mario-bros-wonder/capa-super-mario-bros-wonder.png",
    coverAlt: "Capa do artigo da GANM OLS sobre Super Mario Bros. Wonder.",
    relatedLinks: [
      {
        label: "Explorar categoria Nintendo",
        href: "/marca/nintendo",
      },
      {
        label: "Ler o artigo de Super Mario Kart",
        href: "/blog/super-mario-kart-uma-volta-no-classico-do-super-nintendo",
      },
      {
        label: "Ver todas as leituras do blog",
        href: "/blog",
      },
    ],
    intro: [
      "A procura por Super Mario Bros. Wonder voltou a disparar após o anúncio da edição Nintendo Switch 2 + Meetup in Bellabel Park. Para quem ainda não conhece, trata‑se do primeiro grande jogo 2D do encanador em mais de uma década, lançado originalmente em outubro de 2023 para Nintendo Switch. O título levou Mario e seus amigos para a Flower Kingdom, um reino vizinho governado por Prince Florian. Nesta matéria, apresentamos o contexto histórico, as novidades de jogabilidade, o que vem por aí na nova edição e como jogar de forma oficial.",
    ],
    sections: [
      {
        title: "Enredo e ambientação",
        meta: "",
        media: {
          type: "image",
          src: "/blog/super-mario-bros-wonder/super-mario-bros-wonder-enredo-e-ambientacao.jpg",
          alt: "Enredo e ambientação de Super Mario Bros. Wonder no Flower Kingdom.",
        },
        paragraphs: [
          "No início do jogo, Mario, Luigi, Peach, Daisy, Toads, Yoshi e Nabbit são convidados por Prince Florian para visitar o Flower Kingdom. Durante a apresentação de uma misteriosa Wonder Flower, Bowser aparece, toca a flor e se funde ao castelo de Florian, transformando‑se em Castle Bowser. O vilão usa o poder da flor para espalhar caos, aprisionar os habitantes Poplin e dominar o reino. Cabe aos heróis atravessar seis mundos principais Pipe‑Rock Plateau, Fluff‑Puff Peaks, Shining Falls, Sunbaked Desert, Fungi Mines e Deep Magma Bog coletando Royal Seeds e derrotando Bowser Jr. e seus servos para recuperar a paz.",
        ],
      },
      {
        title: "Cooperativo e acessível",
        meta: "",
        paragraphs: [
          "Super Mario Bros. Wonder é um plataformer 2,5D que permite jogar sozinho ou em equipe com até quatro jogadores simultaneamente. Além de Mario e Luigi, o elenco inclui Princess Peach, Princess Daisy, Yellow e Blue Toad, Toadette, quatro Yoshis e Nabbit. Nabbit e Yoshi são personagens ideais para iniciantes: eles não sofrem dano ao encostar em inimigos e podem carregar outros jogadores nas costas.",
        ],
      },
      {
        title: "Wonder Flowers e efeitos imprevisíveis",
        meta: "",
        media: {
          type: "image",
          src: "/blog/super-mario-bros-wonder/super-mario-bros-wonder-wonder-flowers.jpg",
          alt: "Wonder Flowers e os efeitos imprevisíveis de Super Mario Bros. Wonder.",
        },
        paragraphs: [
          "O elemento mais marcante do jogo é a Wonder Flower. Ao tocá‑la, “o chão pode começar a se mover ou você pode se transformar em algo completamente diferente”. Cada nível possui uma Wonder Flower, e ativá‑la desencadeia um Wonder Effect que altera a mecânica da fase e, ao final, conduz a uma Wonder Seed. Esses efeitos podem fazer canos ganharem vida, Piranha Plants começarem a cantar ou transformar os personagens em objetos inesperados. Depois de coletar a Wonder Seed, a flor torna‑se cinza e transparente.",
        ],
      },
      {
        title: "Sistema de badges",
        meta: "",
        media: {
          type: "image",
          src: "/blog/super-mario-bros-wonder/super-mario-bros-wonder-sistema-de-badges.jpg",
          alt: "Sistema de badges de Super Mario Bros. Wonder.",
        },
        paragraphs: [
          "Outra novidade é o sistema de badges, inspirado nas séries Paper Mario e Mario & Luigi. As badges são adquiridas em desafios específicos ou compradas com flower coins, e podem ser equipadas antes de iniciar uma fase ou após uma vida perdida. Há 24 badges, divididas em nove Action Badges, onze Boost Badges e quatro Expert Badges, que oferecem habilidades avançadas.",
        ],
      },
      {
        title: "Poderes frescos: Elephant, Bubble, Drill e Fire",
        meta: "",
        media: {
          type: "image",
          src: "/blog/super-mario-bros-wonder/super-mario-bros-wonder-poderes-elephant-bubble-drill-fire.jpg",
          alt: "Poderes Elephant, Bubble, Drill e Fire em Super Mario Bros. Wonder.",
        },
        paragraphs: [
          "Além dos itens clássicos, Mario e seus amigos podem se transformar em formas inéditas:",
          "Elephant Form – aumenta a força do personagem, permitindo quebrar blocos e empurrar obstáculos. A tromba serve para atingir inimigos e armazenar água; ao balançá‑la, é possível regar flores ressequidas ou esfriar objetos.",
          "Bubble Form – cria bolhas que perseguem inimigos e os derrotam rapidamente. As bolhas também funcionam como plataformas temporárias; elas seguem uma linha reta e estouram ao serem pisadas. Fazer um spin jump enquanto sopra bolhas libera projéteis para ambos os lados.",
          "Drill Form – permite perfurar o chão e tetos para acessar áreas escondidas ou derrotar inimigos de surpresa. A broca na cabeça também protege o personagem de ataques vindos de cima.",
          "Fire Form – o tradicional Fire Flower está de volta. Lança bolas de fogo que quicam pelo cenário e podem derreter blocos de gelo; é possível disparar enquanto se agacha ou em um spin jump.",
          "Essas transformações ajudam a variar o ritmo do jogo e estimulam a exploração.",
        ],
      },
      {
        title: "Novidades da edição Nintendo Switch 2 + Meetup in Bellabel Park",
        meta: "",
        media: {
          type: "image",
          src: "/blog/super-mario-bros-wonder/super-mario-bros-wonder-bellabel-park.jpg",
          alt: "Novidades da edição Nintendo Switch 2 + Meetup in Bellabel Park de Super Mario Bros. Wonder.",
        },
        paragraphs: [
          "Com a chegada do Nintendo Switch 2, Super Mario Bros. Wonder receberá em 26 de março de 2026 uma edição expandida chamada Nintendo Switch 2 Edition + Meetup in Bellabel Park. Além do jogo base, esta versão traz um novo ambiente de multiplayer localizado no parque Bellabel Park.",
          "Local Multiplayer Plaza – reúne 17 atrações cooperativas e competitivas, onde até quatro pessoas podem jogar juntas no mesmo console ou usando o recurso GameShare.",
          "Game Room Plaza – permite partidas via multiplayer online ou local sem fio; oferece seis atrações que suportam até 12 jogadores, seja cooperando ou competindo.",
          "Outros recursos dessa edição incluem:",
          "Toad Brigade Training Camp – um modo de desafios em que os jogadores treinam movimentos e técnicas de fases do jogo; é possível jogar sozinho ou com até três amigos para subir na hierarquia dos Toad Brigade.",
          "Assist Mode – fornece proteção adicional para iniciantes, permitindo recuperar‑se de quedas sem perder uma vida e evitando dano de inimigos. Pode ser ativado a qualquer momento.",
          "Novos personagens – a princesa Rosalina se torna jogável pela primeira vez, acompanhada de Luma, que aparece quando há dois ou mais jogadores. Luma não recebe dano e pode auxiliar outros jogadores derrotando inimigos e coletando moedas.",
          "Koopalings e desafios – Bowser Jr. e os Koopalings roubam tesouros do parque e fogem para diferentes mundos do Flower Kingdom. Ao encontrá‑los, será preciso enfrentá‑los em novas fases.",
          "Amiibo e idiomas – o patch de atualização versão 1.1.0 adicionou compatibilidade com amiibo de Elephant Mario, Poplin & Prince Florian e Captain Toad & Talking Flower; também incluiu suporte ao idioma polonês, uma tela para selecionar usuário ao iniciar o jogo e correções gerais. No Nintendo Switch 2, a atualização adiciona um atalho para a Nintendo eShop no menu inicial e suporte à nova edição.",
        ],
      },
      {
        title: "Recepção e vendas",
        meta: "",
        paragraphs: [
          "Super Mario Bros. Wonder foi recebido de forma extremamente positiva, com destaque para sua criatividade e para a nova estética animada. Em fevereiro de 2024, a Nintendo anunciou que o título havia vendido 11,96 milhões de cópias em todo o mundo, tornando‑se um dos jogos 2D do Mario de venda mais rápida da história. É provável que esse número aumente significativamente com a chegada da edição para Nintendo Switch 2.",
        ],
      },
      {
        title: "Como jogar hoje de forma oficial",
        meta: "",
        paragraphs: [
          "Nintendo Switch – A versão original de Super Mario Bros. Wonder está disponível em formato físico e digital para Nintendo Switch. O jogo pode ser jogado sozinho ou em cooperação local/online, e oferece suporte a vários idiomas, incluindo português.",
          "Nintendo Switch 2 – A edição Nintendo Switch 2 Edition + Meetup in Bellabel Park chega em março de 2026 e poderá ser adquirida como upgrade para quem já possui a versão de Switch ou como jogo completo. O upgrade adiciona as atrações de Bellabel Park e novos modos.",
          "Amiibo compatíveis – Os novos amiibo de Elephant Mario, Poplin & Prince Florian e Captain Toad & Talking Flower, lançados em conjunto com a edição Switch 2, desbloqueiam itens e bônus especiais.",
        ],
      },
      {
        title: "Por que o jogo está em alta novamente?",
        meta: "",
        paragraphs: [
          "A retomada do interesse por Super Mario Bros. Wonder se deve, em parte, ao sucesso inicial do jogo e à promessa de novidades na edição para Nintendo Switch 2. As redes sociais têm compartilhado vídeos dos efeitos peculiares das Wonder Flowers, clipes das transformações em Elephant Mario e discussões sobre os modos competitivos de Bellabel Park. A inclusão de Rosalina como personagem jogável e a perspectiva de atrair até 12 jogadores em um mesmo modo também estão gerando expectativa. Com uma abordagem acessível para iniciantes e profundidade para jogadores mais experientes, Super Mario Bros. Wonder se posiciona como um dos títulos mais versáteis da série.",
        ],
      },
    ],
    conclusion: null,
  },
  {
    slug: "super-mario-kart-uma-volta-no-classico-do-super-nintendo",
    title: "Super Mario Kart: uma volta no clássico do Super Nintendo",
    tagline: "Revisitamos a história, a jogabilidade e as formas oficiais de jogar o clássico de 1992.",
    excerpt:
      "Com a onda retro que domina as redes sociais, Super Mario Kart, lançado para o Super Nintendo em 1992, voltou a despertar curiosidade.",
    description:
      "Relembre a origem, jogabilidade, pistas, personagens e formas oficiais de jogar Super Mario Kart hoje.",
    category: "Retro",
    author: editorialAuthor,
    publishedAt: "2026-03-20T16:20:00.000-03:00",
    updatedAt: "2026-03-20T16:20:00.000-03:00",
    readingMinutes: 8,
    keywords: [
      "super mario kart",
      "super nintendo",
      "snes",
      "mario kart retro",
      "nintendo classics",
      "ganm ols blog",
    ],
    coverImage: "/blog/super-mario-kart/capa-super-mario-kart.png",
    coverAlt: "Capa do artigo da GANM OLS sobre Super Mario Kart.",
    relatedLinks: [
      {
        label: "Explorar categoria Nintendo",
        href: "/marca/nintendo",
      },
      {
        label: "Ler o artigo do Mini Super Nintendo",
        href: "/blog/mini-super-nintendo-nostalgia-hardware-e-maneiras-legais-de-reviver-classicos",
      },
      {
        label: "Explorar categorias da GANM OLS",
        href: "/categorias",
      },
    ],
    intro: [
      "Com a onda retro que domina as redes sociais, Super Mario Kart, lançado para o Super Nintendo em 1992, voltou a despertar curiosidade. O jogo foi pioneiro no sub‑gênero de “corrida de kart” e ainda hoje serve como referência para títulos modernos. Nas linhas a seguir, revisitamos a história desse clássico, explicamos como ele funciona, relembramos personagens e pistas memoráveis e indicamos formas legais de jogá‑lo atualmente.",
    ],
    sections: [
      {
        title: "Do protótipo ao ícone: origens e desenvolvimento",
        meta: "",
        media: {
          type: "image",
          src: "/blog/super-mario-kart/super-mario-kart-desenvolvimento-mode-7.jpg",
          alt: "Super Mario Kart e o uso do Mode 7 no Super Nintendo.",
        },
        paragraphs: [
          "Super Mario Kart nasceu de uma ideia simples: adaptar a engine de F‑Zero para um jogo que suportasse dois jogadores simultâneos. O projeto, liderado pelos diretores Tadashi Sugiyama e Hideki Konno sob a produção de Shigeru Miyamoto, começou como um protótipo com personagens genéricos. A equipe decidiu incluir personagens do universo Mario após testes com o visual de Mario em um kart, e isso tornou o jogo imediatamente mais carismático.",
          "O desenvolvimento aproveitou o recurso gráfico Mode 7 do Super Nintendo, que permitia rotacionar e redimensionar planos para simular profundidade. Esse efeito, usado anteriormente em F‑Zero, deu a Super Mario Kart uma sensação pseudo‑3D que foi considerada revolucionária na época. Para lidar com os cálculos de perspectiva, o cartucho trazia um chip DSP‑1, o mais popular entre os chips DSP do console.",
          "O jogo foi lançado originalmente no Japão em 27 de agosto de 1992; poucos dias depois, em 1º de setembro de 1992, chegou aos Estados Unidos. A Europa recebeu o título em 21 de janeiro de 1993, e o lançamento no Brasil ocorreu em 30 de agosto de 1993. Esse cronograma internacional ajudou a espalhar a fama de Super Mario Kart em diversas regiões.",
        ],
      },
      {
        title: "Jogabilidade: habilidades, itens e modos",
        meta: "",
        media: {
          type: "image",
          src: "/blog/super-mario-kart/super-mario-kart-jogabilidade-itens.jpg",
          alt: "Jogabilidade e itens clássicos de Super Mario Kart.",
        },
        paragraphs: [
          "Em essência, Super Mario Kart é um jogo de corrida de kart com foco em diversão e interação entre jogadores. O título oferece vários modos de jogo, incluindo o Mario Kart GP (Grand Prix), com corridas contra o computador, e o Time Trial, em que o objetivo é registrar o melhor tempo. No modo Grand Prix, o jogador precisa completar uma série de copas (Mushroom, Flower, Star e a secreta Special Cup) em diferentes níveis de cilindrada (50 cc, 100 cc e 150 cc), acumulando pontos ao terminar as provas em boas posições.",
          "Para dar variedade às corridas, as pistas contêm paineis de velocidade, rampas e, sobretudo, os blocos de interrogação que fornecem power‑ups. Esses itens dão ao jogador vantagens temporárias: carapaças e bananas servem para atrapalhar adversários; o Super Estrela torna o kart invencível por alguns segundos; moedas aumentam a velocidade máxima e ajudam a manter o controle ao ser atingido. Além disso, existe um sistema de drift (derrapagem) e hopping (saltos rápidos) que permite fazer curvas fechadas sem perder velocidade.",
          "O modo Battle, por sua vez, coloca dois jogadores em arenas exclusivas. Cada competidor começa com três balões, e o objetivo é estourar os balões do adversário usando os power‑ups disponíveis. Essa modalidade tornou‑se tão popular que inspirou versões aprimoradas em jogos posteriores.",
        ],
      },
      {
        title: "Elenco de personagens",
        meta: "",
        media: {
          type: "image",
          src: "/blog/super-mario-kart/super-mario-kart-personagens.jpg",
          alt: "Personagens jogáveis de Super Mario Kart.",
        },
        paragraphs: [
          "Super Mario Kart apresenta oito pilotos, todos oriundos do universo Mario: Mario, Luigi, Princess Peach, Yoshi, Bowser, Donkey Kong Jr., Koopa Troopa e Toad. Cada piloto possui atributos diferentes de aceleração, velocidade e controle, oferecendo estilos de jogo variados. Os personagens controlados pelo computador possuem habilidades especiais: Yoshi pode deixar ovos que fazem rivais perderem moedas, enquanto Donkey Kong Jr. atira bananas. O equilíbrio desse elenco foi apontado pela imprensa da época como um dos pontos fortes do título.",
        ],
      },
      {
        title: "Pistas e copas",
        meta: "",
        media: {
          type: "image",
          src: "/blog/super-mario-kart/super-mario-kart-pistas-e-copas.jpg",
          alt: "Pistas e copas clássicas de Super Mario Kart.",
        },
        paragraphs: [
          "As vinte pistas de Super Mario Kart foram inspiradas em locais de Super Mario World, como Donut Plains. Cada uma das quatro copas contém cinco circuitos distintos, e há ainda quatro arenas exclusivas para o modo Battle. As pistas apresentam curvas de diferentes intensidades, saltos e obstáculos temáticos, como Thwomps em Bowser’s Castle, peixes Cheep‑Cheep em Koopa Beach e barreiras de canos nas pistas Mario Circuit. Algumas trilhas têm trechos de lama que reduzem a velocidade e exigem boa habilidade no controle. O design das pistas foi amplamente elogiado; vários reviewers citaram as curvas e o uso criativo de obstáculos como fatores que mantêm o jogo divertido.",
        ],
      },
      {
        title: "Impacto, recepção e legado",
        meta: "",
        paragraphs: [
          "Super Mario Kart foi recebido com entusiasmo pela crítica especializada. O game vendeu mais de 8,76 milhões de unidades, tornando‑se o quarto jogo mais vendido do Super Nintendo. Em sua estreia no Japão, foi o título mais vendido de setembro de 1992 e se tornou um sucesso durante o ano. Na Europa, liderou as vendas do primeiro trimestre de 1993, superando concorrentes como Sonic the Hedgehog 2. A imprensa destacou a jogabilidade profunda e viciante, com elogios para o modo Battle e para a tecnologia Mode 7.",
          "O título não apenas influenciou a criação de outras séries de kart como Sonic Drift, Street Racer e Wacky Wheels como também consolidou a ideia de colocar personagens carismáticos em corridas divertidas. Diversas listas de melhores jogos de todos os tempos incluíram Super Mario Kart; a revista Guinness World Records chegou a classificá‑lo como o jogo de console mais impactante da história. Em 2019, o jogo foi incluído no World Video Game Hall of Fame, prova de sua importância duradoura.",
        ],
      },
      {
        title: "Como jogar hoje de forma oficial",
        meta: "",
        paragraphs: [
          "Apesar de existirem emuladores e ROMs na internet, baixar jogos não licenciados fere direitos autorais. Felizmente, existem formas legais de reviver Super Mario Kart sem recorrer a pirataria:",
          "Super NES Classic Edition (2017) – A “mini‑Super Nintendo” é uma réplica oficial do console com 21 jogos na memória. Entre os títulos inclusos estão Super Mario Kart, Super Mario World, The Legend of Zelda: A Link to the Past e a inédita versão de Star Fox 2. O aparelho chegou às lojas em setembro de 2017 por US$ 79,99 e vem com dois controles para jogatinas locais.",
          "Nintendo Switch Online / Nintendo Classics – Assinantes do serviço podem acessar aplicativos com jogos retrô. A seção de Super Nintendo do Nintendo Classics oferece mais de 80 títulos, incluindo Super Mario Kart. Os jogos contam com multijogador local e online e permitem salvar a qualquer momento ou retroceder o gameplay.",
          "Cartucho original e consoles retrô – Para colecionadores, é possível adquirir cartuchos originais e consoles Super Nintendo usados. Embora esse mercado de colecionismo varie bastante de preço, é a forma mais autêntica de jogar. Lojas especializadas e sites de leilão costumam vender consoles por valores que dependem do estado de conservação.",
          "Relançamentos virtuais – Em gerações anteriores, Super Mario Kart também foi relançado em serviços como o Virtual Console do Wii e do Wii U e em catálogos digitais de edições comemorativas. Esses relançamentos tornaram o jogo acessível em sistemas modernos.",
        ],
      },
      {
        title: "O encanto atemporal de Super Mario Kart",
        meta: "",
        paragraphs: [
          "Três décadas após seu lançamento, Super Mario Kart continua encantando jogadores. A combinação de pistas bem desenhadas, personagens carismáticos e itens imprevisíveis faz com que cada corrida seja diferente. Para novos fãs que desejam conhecer as origens da série e veteranos em busca de nostalgia, revisitar o clássico de 1992 é um exercício prazeroso. Mais do que um jogo, Super Mario Kart é uma peça de história que ajudou a definir o que conhecemos hoje como jogos de corrida divertidos e acessíveis.",
        ],
      },
    ],
    conclusion: null,
  },
  {
    slug: "mini-super-nintendo-nostalgia-hardware-e-maneiras-legais-de-reviver-classicos",
    title: "Mini Super Nintendo: nostalgia, hardware e maneiras legais de reviver clássicos",
    tagline: "A popularização dos consoles “mini” reacendeu a nostalgia por jogos das décadas de 1990 e 2000.",
    excerpt:
      "A popularização dos consoles “mini” reacendeu a nostalgia por jogos das décadas de 1990 e 2000.",
    description:
      "O Mini Super Nintendo é um produto legítimo da Nintendo, ideal para quem deseja revisitar clássicos de maneira legal e sem complicações.",
    category: "Retro",
    author: editorialAuthor,
    publishedAt: "2026-03-20T10:27:00.000-03:00",
    updatedAt: "2026-03-20T10:27:00.000-03:00",
    readingMinutes: 8,
    keywords: [
      "mini super nintendo",
      "snes classic edition",
      "super nintendo mini",
      "nintendo classics",
      "retro gaming",
      "ganm ols blog",
    ],
    coverImage: "/blog/mini-super-nintendo/capaartigominisupernintendo.png",
    coverAlt: "Capa do artigo da GANM OLS sobre o Mini Super Nintendo.",
    relatedLinks: [
      {
        label: "Explorar categoria Nintendo",
        href: "/marca/nintendo",
      },
      {
        label: "Ver todas as leituras do blog",
        href: "/blog",
      },
      {
        label: "Explorar categorias da GANM OLS",
        href: "/categorias",
      },
    ],
    intro: [],
    sections: [
      {
        title: "Introdução",
        meta: "",
        media: {
          type: "image",
          src: "/blog/mini-super-nintendo/mini-super-nintendo-console.jpg",
          alt: "Mini Super Nintendo em destaque.",
        },
        paragraphs: [
          "A popularização dos consoles “mini” reacendeu a nostalgia por jogos das décadas de 1990 e 2000. Entre os mais procurados está o Mini Super Nintendo, versão compacta e moderna do clássico Super Nintendo Entertainment System (SNES). Nas últimas 24 horas, termos relacionados ao mini console ficaram entre as pesquisas que mais crescem no Brasil, mostrando como a curiosidade por esse aparelho ainda é alta. Diferentemente de emuladores ou downloads irregulares, o SNES Classic Edition (nome oficial nos Estados Unidos) é um produto legítimo da Nintendo, ideal para quem deseja revisitar clássicos de maneira legal e sem complicações.",
        ],
      },
      {
        title: "O que é o Mini Super Nintendo?",
        meta: "",
        paragraphs: [
          "Lançado originalmente em setembro de 2017, o Super NES Classic Edition é uma versão dedicada do SNES, fabricada pela própria Nintendo. O aparelho emula o hardware do console de 16 bits e vem com 21 jogos pré‑instalados, incluindo a primeira versão oficial de Star Fox 2. Seu lançamento ocorreu em diferentes datas: 29 de setembro de 2017 na América do Norte e Europa, 30 de setembro na Austrália e 5 de outubro no Japão.",
        ],
      },
      {
        title: "Design e componentes",
        meta: "",
        media: {
          type: "image",
          src: "/blog/mini-super-nintendo/mini-super-nintendo-design-e-componentes.jpg",
          alt: "Detalhes de design e componentes do Mini Super Nintendo.",
        },
        paragraphs: [
          "O design do Mini varia conforme a região. A edição norte‑americana lembra o SNES clássico de tons cinza e roxo, enquanto as versões europeia e japonesa seguem o formato arredondado do Super Famicom. Internamente, o console utiliza um system‑on‑a‑chip Allwinner R16 com quatro núcleos ARM Cortex‑A7, 512 MB de armazenamento flash e 256 MB de memória DDR3. O aparelho possui saída HDMI em 720p a 60 Hz e traz duas portas para controles; os controles oficiais têm cabo de 1,4 m e são compatíveis com o Wii e Wii U. Assim como no original, os dois controles acompanham o console, mas agora são conectados por um conector oculto atrás de uma tampa frontal decorativa.",
        ],
      },
      {
        title: "Preço de lançamento e unidades vendidas",
        meta: "",
        paragraphs: [
          "O SNES Classic foi comercializado por US$ 79,99 nos Estados Unidos e equivalentes em outras regiões. A Nintendo vendeu cerca de 5,28 milhões de unidades até janeiro de 2018. A produção oficial foi encerrada em dezembro de 2018, o que explica a escassez atual em revendedores.",
        ],
      },
      {
        title: "Jogos inclusos",
        meta: "",
        media: {
          type: "image",
          src: "/blog/mini-super-nintendo/mini-super-nintendo-jogos-inclusos.jpg",
          alt: "Seleção de jogos do Mini Super Nintendo.",
        },
        paragraphs: [
          "Uma das vantagens do Mini Super Nintendo é o catálogo cuidadosamente selecionado. A Nintendo afirma que a lista foi escolhida para oferecer “uma mistura diversificada de jogos populares e reconhecíveis”. Entre os 21 títulos estão clássicos como Contra III: The Alien Wars, Donkey Kong Country, Kirby Super Star e Super Mario World. A coleção inclui também The Legend of Zelda: A Link to the Past, Final Fantasy III (VI), Secret of Mana, Super Metroid e Yoshi’s Island. Na versão ocidental há ainda a estreia oficial de Star Fox 2, jogo cancelado nos anos 1990 e liberado ao completar a primeira fase de Star Fox.",
        ],
      },
      {
        title: "Comparação com o Super Nintendo original",
        meta: "",
        paragraphs: [
          "O SNES de 1990 marcou a geração 16 bits com som estéreo verdadeiro e múltiplos planos de rolagem, além de duas vezes mais memória interna que o NES. Seu processador e o chip DSP permitiram efeitos como o famoso “Mode 7”, que torce e gira elementos 2D para criar pistas pseudo‑3D em jogos como Super Mario Kart. O controle original estabeleceu um padrão ao adicionar quatro botões frontais e dois botões de ombro. O console usava cartuchos físicos e acumulou mais de 500 títulos licenciados.",
          "Já o Mini Super Nintendo elimina a necessidade de cartuchos: ele roda emuladores desenvolvidos pela própria Nintendo e armazena todos os jogos internamente. Com saída HDMI, ele exibe os jogos em resolução moderna e oferece 21 jogos pré‑instalados, mas não permite adicionar títulos extras oficialmente. Enquanto o SNES original continua interessante para colecionadores e entusiastas do hardware, o Mini é uma solução prática e legal para quem só deseja reviver alguns clássicos sem a complexidade de cartuchos, cabos de vídeo analógico e manutenção de hardware antigo.",
        ],
      },
      {
        title: "Formas oficiais de jogar títulos do Super Nintendo hoje",
        meta: "",
        paragraphs: [
          "Além do SNES Classic, a Nintendo disponibiliza jogos do Super Nintendo por meio do serviço Nintendo Classics, incluído na assinatura Nintendo Switch Online. Segundo a Wikipédia, o Nintendo Classics foi lançado em 2018 e permite que assinantes joguem títulos de NES, Super NES, Game Boy e Game Boy Color no Nintendo Switch. Uma expansão lançada em 2021 adicionou também jogos de Nintendo 64, Sega Genesis, Game Boy Advance e Virtual Boy. Os jogos ficam acessíveis enquanto a assinatura estiver ativa; o usuário precisa se conectar à internet pelo menos uma vez por semana para manter o acesso. O serviço oferece recursos modernos, como multijogador online, remapeamento de controles, save states e opção de rebobinar o gameplay.",
          "Para consumidores brasileiros, atualmente há três opções principais para jogar legalmente:",
          "Adquirir um SNES Classic – em lojas de importação ou com colecionadores, lembrando que a produção oficial foi encerrada em 2018. Verifique a procedência para evitar falsificações.",
          "Comprar um Nintendo Switch ou Switch 2 – assinando o serviço Nintendo Switch Online para acessar os aplicativos Nintendo Classics com jogos do Super Nintendo.",
          "Procurar relançamentos oficiais – versões digitais de jogos clássicos em plataformas como a eShop ou coletâneas para consoles modernos. Alguns títulos da biblioteca do SNES são vendidos individualmente em remasters ou remakes.",
        ],
      },
      {
        title: "Por que o termo “Mini Super Nintendo” está em alta?",
        meta: "",
        paragraphs: [
          "O pico de buscas recente por “Mini Super Nintendo” se deve a diferentes fatores: nostalgia pelos jogos da infância, colecionismo e a curiosidade gerada por novidades no ecossistema Nintendo, como a expansão do Nintendo Classics para consoles mais novos. Além disso, a escassez de unidades oficiais do SNES Classic e a popularidade de conteúdos retro em redes sociais impulsionam a procura. É importante, porém, ficar atento a sites que oferecem downloads de ROMs ou emuladores, pois isso pode violar direitos autorais e comprometer a qualidade da sua experiência. Sempre dê preferência a opções legais e seguras.",
        ],
      },
      {
        title: "Dicas para colecionadores e cuidados",
        meta: "",
        media: {
          type: "image",
          src: "/blog/mini-super-nintendo/mini-super-nintendo-colecionismo-e-cuidados.jpg",
          alt: "Mini Super Nintendo para colecionismo e cuidados de conservação.",
        },
        paragraphs: [
          "Se você pretende adquirir um Mini Super Nintendo ou um SNES original:",
          "Verifique a autenticidade: compre de vendedores confiáveis e peça fotos detalhadas. Unidades originais trazem logotipos da Nintendo e certificações. Falsificações podem ter qualidade inferior e, em alguns casos, infringir leis.",
          "Cuidados com conservação: mantenha os consoles em locais secos, limpos e afastados de luz solar direta. Limpe conectores com produtos adequados e evite abrir o aparelho se não tiver conhecimento técnico.",
          "Valor de mercado: modelos lacrados ou em estado de conservação excepcional tendem a valorizar com o tempo. Entretanto, lembre‑se de que consoles são peças de entretenimento; compre para jogar e apreciar, não apenas como investimento.",
        ],
      },
      {
        title: "Conclusão",
        meta: "",
        paragraphs: [
          "O Mini Super Nintendo é uma celebração acessível da era 16 bits. Com design inspirado no console original, hardware moderno e um catálogo seleto de 21 jogos clássicos, ele atende tanto aos fãs antigos quanto a novos jogadores que desejam entender por que títulos como Super Mario World e The Legend of Zelda: A Link to the Past são cultuados até hoje. Para além do SNES Classic, o serviço Nintendo Classics amplia a oferta de jogos do Super Nintendo com recursos modernos, reforçando que é possível reviver a nostalgia de forma legal e responsável",
        ],
      },
    ],
    conclusion: null,
  },
];

const BLOG_ARTICLE_IDS = [
  "top-gear-snes",
  "super-mario-bros-wonder",
  "super-mario-kart",
  "mini-super-nintendo",
  "super-nintendo-baby",
  "super-mario-world",
] as const;

const PT_BLOG_POSTS: LocalizedBlogPost[] = [
  ...BLOG_POSTS,
  ...PT_BLOG_POSTS_EXTRA,
  ...PT_BLOG_POSTS_WORLD,
].map((post, index) => ({
  ...post,
  articleId: BLOG_ARTICLE_IDS[index] ?? `pt-article-${index + 1}`,
  locale: "pt",
}));

const EN_BLOG_POSTS: LocalizedBlogPost[] = [
  ...EN_BLOG_POSTS_BASE,
  ...EN_BLOG_POSTS_EXTRA,
  ...EN_BLOG_POSTS_WORLD,
].map((post, index) => ({
  ...post,
  articleId: BLOG_ARTICLE_IDS[index] ?? `en-article-${index + 1}`,
  locale: "en",
}));

const ALL_BLOG_POSTS: LocalizedBlogPost[] = [...PT_BLOG_POSTS, ...EN_BLOG_POSTS];

function sortPosts(posts: LocalizedBlogPost[]) {
  return [...posts].sort(
    (a, b) =>
      new Date(b.updatedAt ?? b.publishedAt).getTime() -
      new Date(a.updatedAt ?? a.publishedAt).getTime()
  );
}

export function getAllBlogPosts(locale: BlogLocale = DEFAULT_BLOG_LOCALE) {
  return sortPosts(ALL_BLOG_POSTS.filter((post) => post.locale === locale));
}

export function getBlogPostBySlug(
  slug: string,
  locale: BlogLocale = DEFAULT_BLOG_LOCALE
) {
  return (
    ALL_BLOG_POSTS.find(
      (post) => post.locale === locale && post.slug === slug
    ) ?? null
  );
}

export function getBlogPostByAnySlug(slug: string) {
  return ALL_BLOG_POSTS.find((post) => post.slug === slug) ?? null;
}

export function getRelatedBlogPosts(
  slug: string,
  limit = 2,
  locale: BlogLocale = DEFAULT_BLOG_LOCALE
) {
  return getAllBlogPosts(locale)
    .filter((post) => post.slug !== slug)
    .slice(0, limit);
}

export function getBlogPostAlternates(articleId: string) {
  return ALL_BLOG_POSTS.filter((post) => post.articleId === articleId);
}

export function getLocalizedBlogPathFromPathname(
  pathname: string,
  targetLocale: BlogLocale
) {
  const currentLocale = getBlogLocaleFromPathname(pathname);

  if (
    pathname === buildBlogIndexPath(currentLocale) ||
    pathname === `${buildBlogIndexPath(currentLocale)}/`
  ) {
    return buildBlogIndexPath(targetLocale);
  }

  const normalizedPathname = pathname.replace(/\/+$/, "");
  const match =
    normalizedPathname.match(/^\/blog\/([^/]+)$/) ??
    normalizedPathname.match(/^\/en\/blog\/([^/]+)$/);

  if (!match) {
    return buildBlogIndexPath(targetLocale);
  }

  const post = getBlogPostByAnySlug(match[1]);
  if (!post) {
    return buildBlogIndexPath(targetLocale);
  }

  const alternate = getBlogPostAlternates(post.articleId).find(
    (entry) => entry.locale === targetLocale
  );

  return alternate
    ? buildBlogPostPath(targetLocale, alternate.slug)
    : buildBlogIndexPath(targetLocale);
}

export function formatBlogDate(
  value: string,
  locale: BlogLocale = DEFAULT_BLOG_LOCALE
) {
  return new Intl.DateTimeFormat(getBlogLocaleConfig(locale).languageTag, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function formatBlogDateTime(
  value: string,
  locale: BlogLocale = DEFAULT_BLOG_LOCALE
) {
  return new Intl.DateTimeFormat(getBlogLocaleConfig(locale).languageTag, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
