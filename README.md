# TechStart

TechStart é uma plataforma de duelos de programação onde os usuários podem treinar, disputar rounds, acompanhar o ranking e receber feedback automatizado sobre suas soluções.

## Funcionalidades

- **Autenticação:** Login de usuários, cadastro de novas contas, recuperação de senha e acesso como convidado.
- **Duelo em rounds:** Dispute com outros desenvolvedores.
- **Ranking:** Acompanhe a sua pontuação e posição na plataforma.
- **Feedback automatizado:** Receba dicas e avaliações sobre o código enviado (Ajuda externa).
- **Dashboard do Usuário:** Acompanhamento de progresso e estatísticas.

## Tecnologias Utilizadas

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend/BaaS:** Firebase (Authentication, Firestore, Hosting)

## Estrutura do Projeto

- `index.html`: Página inicial e tela de login.
- `style.css`: Estilos globais e componentes da interface.
- `script.js`: Lógica de autenticação e controle da página de login.
- `pages/`: Contém as páginas e fluxos internos do sistema.
  - `cadastro/`: Página para registro de novos usuários.
  - `recuperar/`: Página para recuperação de senha.
  - `dashboard/`: Painel principal do usuário logado.
  - `desafio/`: Interface para a realização dos desafios e duelos de programação.
- `shared/`: Scripts compartilhados e configurações de conexão com o Firebase.
- `assets/`: Arquivos estáticos como imagens e ícones.

## Como Executar Localmente

1. Faça o clone ou o download deste projeto em sua máquina.
2. Como o projeto é construído com tecnologias web padrão (HTML/CSS/JS), você pode abrir o arquivo `index.html` diretamente em seu navegador.
3. Para uma melhor experiência (e para garantir o funcionamento correto de importações/módulos e chamadas locais), recomenda-se utilizar um servidor local. Algumas opções:
   - Extensão **Live Server** no VSCode.
   - Rodar um servidor http em Python: `python -m http.server`
   - Servidor Node.js simples: `npx http-server`

---
*Projeto projetado para impulsionar a prática de código de forma competitiva e iterativa.*
