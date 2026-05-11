import type { BlogAuthor, BlogPostTranslation } from "@/lib/blog/posts-types";

const editorialAuthorPt: BlogAuthor = {
  name: "Equipe GANM OLS",
  role: "Redação GANM OLS",
  avatar: "/ganmols_blog_editor_avatar.svg",
};

export const PT_BLOG_POSTS_EXTRA: BlogPostTranslation[] = [
  {
    slug: "super-nintendo-baby-new-style-super-nes-historia-design-e-legado-de-uma-revisao-compacta",
    title:
      "Super Nintendo Baby / New-Style Super NES - história, design e legado de uma revisão compacta",
    tagline:
      "O redesenho compacto do SNES preservou a biblioteca clássica e virou objeto de desejo entre colecionadores.",
    excerpt:
      "O redesenho compacto do SNES preservou a biblioteca clássica e virou objeto de desejo entre colecionadores.",
    description:
      "Entenda a história, o design, as diferenças de hardware e o legado do Super Nintendo Baby, também conhecido como New-Style Super NES.",
    category: "Retro",
    author: editorialAuthorPt,
    publishedAt: "2026-03-23T18:20:00.000-03:00",
    updatedAt: "2026-03-23T18:20:00.000-03:00",
    readingMinutes: 9,
    keywords: [
      "super nintendo baby",
      "new-style super nes",
      "sns-101",
      "super famicom jr",
      "super nintendo compacto",
      "ganm ols blog",
    ],
    coverImage: "/blog/super-nintendo-baby/capa-super-nintendo-baby.png",
    coverAlt:
      "Capa do artigo da GANM OLS sobre o Super Nintendo Baby e o New-Style Super NES.",
    relatedLinks: [
      {
        label: "Ler o artigo de Mini Super Nintendo",
        href: "/blog/mini-super-nintendo-nostalgia-hardware-e-maneiras-legais-de-reviver-classicos",
      },
      {
        label: "Explorar categoria Nintendo",
        href: "/marca/nintendo",
      },
      {
        label: "Ver todas as leituras do blog",
        href: "/blog",
      },
    ],
    intro: [
      "O Super Nintendo Entertainment System (SNES) foi um fenômeno dos videogames de 16 bits, dominando a primeira metade da década de 1990 com uma biblioteca de mais de 1 700 títulos e clássicos consagrados como Super Mario World, The Legend of Zelda: A Link to the Past e Chrono Trigger. Com a chegada do Nintendo 64, do Sega Saturn e do PlayStation, a Nintendo procurou manter o SNES relevante oferecendo uma versão mais barata do hardware original. O resultado foi o New-Style Super NES, conhecido informalmente no Brasil como Super Nintendo Baby, lançado em 1997.",
      "A seguir exploraremos a história, o contexto de mercado, as diferenças de design e o impacto cultural dessa revisão. O objetivo é contextualizar o lançamento e ajudar o leitor a entender por que o “Baby” permanece tão querido.",
    ],
    sections: [
      {
        title: "Contexto e motivos para o redesenho",
        meta: "",
        media: {
          type: "image",
          src: "/blog/super-nintendo-baby/super-nintendo-baby-contexto-e-redesenho.jpg",
          alt: "Contexto de mercado e redesenho do Super Nintendo Baby.",
        },
        paragraphs: [
          "No início dos anos 1990, o SNES disputava a liderança do mercado com o Sega Genesis/Mega Drive, mas logo se tornou sinônimo de jogos de qualidade. Ao longo da década surgiram 1757 jogos oficiais, sendo 717 na América do Norte, 521 na Europa e 1 448 no Japão. Os avanços de hardware concorrentes e a transição para a era dos 32 bits diminuíram o ritmo de vendas do SNES, que já era um console caro para novos consumidores.",
          "Em 1997, a Nintendo decidiu lançar uma versão de baixo custo para prolongar a vida útil do sistema e atrair jogadores iniciantes ou nostálgicos. O objetivo era manter a base de fãs e escoar estoques de jogos enquanto o N64 ganhava força. Esse redesenho também respondia à proliferação de clones e falsificações no mercado asiático, especialmente no Japão.",
        ],
      },
      {
        title: "Desenvolvimento e lançamento",
        meta: "",
        media: {
          type: "image",
          src: "/blog/super-nintendo-baby/super-nintendo-baby-desenvolvimento-e-lancamento.jpg",
          alt: "Desenvolvimento e lançamento do New-Style Super NES.",
        },
        paragraphs: [
          "O New-Style Super NES (modelo SNS-101) foi projetado pelo designer Lance Barr, responsável pelos consoles da Nintendo para o mercado ocidental. O aparelho combinava elementos visuais das versões americana e japonesa do SNES em um chassi menor e arredondado. A produção visava reduzir custos: as placas foram consolidadas em um sistema-em-um-chip (SoC) e vários componentes foram eliminados.",
          "O console chegou às lojas norte-americanas em 20 de outubro de 1997 pelo preço sugerido de US$ 99,95 e era vendido sozinho ou em pacotes com jogos renomados, como Super Mario World 2: Yoshi's Island, The Legend of Zelda: A Link to the Past (exclusivo da rede Target) e Kirby Super Star. A Nintendo divulgou o lançamento como uma porta de entrada acessível, já que o Nintendo 64 custava bem mais caro.",
          "No Japão, a versão denominada Super Famicom Jr. (modelo SHVC-101) foi lançada em 27 de março de 1998 ao preço de ¥7 800. O aparelho era semelhante ao norte-americano, mas adotava botões cinzas e manteve a estética original do Super Famicom. Não houve lançamento oficial na Europa, deixando o mercado europeu apenas com o modelo clássico.",
        ],
      },
      {
        title: "Principais diferenças de design",
        meta: "",
        media: {
          type: "image",
          src: "/blog/super-nintendo-baby/super-nintendo-baby-diferencas-de-design.jpg",
          alt: "Diferenças de design entre o SNES original e o Super Nintendo Baby.",
        },
        paragraphs: [
          "O “Super Nintendo Baby” apresenta mudanças significativas em relação ao SNES original:",
          "Dimensões reduzidas: A carcaça é menor e mais leve, com linhas arredondadas que lembram o design japonês.",
          "Alavancas e botões realocados: O botão de ligar e reset foi deslocado para o lado esquerdo. O tradicional botão de ejetar cartucho foi removido, exigindo que os usuários puxem manualmente o cartucho.",
          "Eliminações para baixar custos: Não há luz indicadora de energia, a porta de expansão inferior foi eliminada (incompatibilizando acessórios como o Satellaview) e o modulador de RF interno foi retirado. O console oferece apenas saída de vídeo composto; os sinais S-Video e RGB estão fisicamente presentes no circuito, mas não conectados.",
          "Placa unificada: O uso de um SoC simplificou a placa-mãe. Apesar de mais simples, o console mantém compatibilidade total com a biblioteca de cartuchos e com os acessórios básicos, como o SNES Mouse ou o Super Multitap.",
          "Melhoria de imagem: A revisão adotou um novo encoder de vídeo que produz imagem mais nítida e vibrante do que as revisões anteriores, mesmo via saída composta. Por essa razão, muitos colecionadores buscam este modelo. O suporte a S-Video e RGB pode ser habilitado por técnicos especializados, mas essas modificações são extraoficiais e não recomendadas para leigos.",
          "Controle remodelado: O controle que acompanha o SNS-101 (modelo SNS-102) tem o logotipo “Super Nintendo Entertainment System” substituído por um logotipo em relevo da Nintendo. As cores dos botões diferem por região: púrpura e lavanda nos EUA, multicoloridos no Japão/Europa.",
        ],
      },
      {
        title: "Diferentes nomes e presença no Brasil",
        meta: "",
        paragraphs: [
          "Enquanto nos Estados Unidos a revisão foi chamada oficialmente de Super Nintendo Entertainment System (sem qualquer sufixo), no Japão ela recebeu o título Super Famicom Jr.. No Brasil, importadores e jogadores passaram a apelidar o console de “Super Nintendo Baby” ou “Super Nintendo Compacto”, em referência ao tamanho reduzido. Esse apelido popularizou-se em revistas de videogame e lojas de eletrônicos no final dos anos 1990.",
          "A distribuição oficial do SNES no Brasil era realizada pela Playtronic, joint-venture entre Gradiente e Estrela. Embora o SNS-101 não tenha sido lançado oficialmente pela Playtronic, unidades importadas eram vendidas no mercado cinza e em lojas especializadas. Devido à ausência de um lançamento oficial, muitos consumidores precisavam recorrer a importadores independentes, o que explica a raridade do modelo no país. Além disso, relatos de consoles piratas no Japão levaram a Nintendo a alertar consumidores sobre a necessidade de verificar autenticidade.",
        ],
      },
      {
        title: "Relação com outros produtos e legado",
        meta: "",
        paragraphs: [
          "Influência de design: O SNES original já havia estabelecido padrões importantes de ergonomia, como a disposição dos botões em formato de diamante e os botões de ombro, que inspiraram controladores de PlayStation, Dreamcast e Xbox. O SNS-101 manteve essa base, adaptando apenas detalhes visuais.",
          "Compatibilidade com jogos famosos: A biblioteca do SNES inclui títulos altamente aclamados como Final Fantasy VI, Donkey Kong Country, EarthBound, Super Metroid e Yoshi's Island. Todos esses jogos são totalmente compatíveis com o SNS-101, pois a revisão não altera o hardware de processamento.",
          "Competição com o SNES Classic Edition: Em 2017, a Nintendo lançou o Super NES Classic Edition, um mini-console moderno com 21 jogos pré-instalados e saída HDMI. Apesar de ambos serem compactos, o Classic Edition não lê cartuchos e utiliza emulação. O “Super Nintendo Baby” continua sendo uma opção para quem deseja jogar mídias físicas originais.",
          "Mercado de colecionadores: A procura por unidades SNS-101/Super Famicom Jr. aumentou nas últimas décadas devido à qualidade de imagem e ao valor nostálgico. A raridade e a possibilidade de modificações controladas tornaram o modelo valioso entre entusiastas, mas também elevaram o risco de falsificações. É recomendável pesquisar vendedores confiáveis e evitar versões clonadas.",
        ],
      },
      {
        title: "Conclusão",
        meta: "",
        paragraphs: [
          "O Super Nintendo Baby é mais do que uma curiosidade: é o último suspiro de um console que definiu a geração 16 bits. Projetado para ser acessível e compacto, ele preservou a compatibilidade com uma das bibliotecas de jogos mais celebradas de todos os tempos e ofereceu melhorias sutis de hardware. Apesar de suas limitações, como a ausência de saída RGB nativa e de indicadores luminosos, o modelo SNS-101 mantém o charme e a funcionalidade do SNES, conquistando colecionadores e novos jogadores em busca de experiências autênticas. Para quem deseja adquirir um exemplar, vale ficar atento à autenticidade e considerar que qualquer modificação (como habilitar RGB) deve ser feita por profissionais especializados.",
        ],
      },
    ],
    conclusion: null,
  },
];
