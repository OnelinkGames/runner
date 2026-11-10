# DevDesk

Painel local para cadastrar, iniciar, parar, reiniciar e abrir aplicações de desenvolvimento. Substitui o fluxo de abrir um terminal, entrar na pasta do projeto e rodar o comando de desenvolvimento à mão.

A interface é uma aplicação web (React). Ela fala só com a API local via HTTP. Os processos das aplicações cadastradas sobem pelo PM2, no diretório e com o comando que você registrou.

## O que dá para fazer

- Cadastrar aplicações em dois modos: **um comando** (uma pasta sobe o projeto inteiro) ou **vários serviços** (frontend, backend e outros, cada um com pasta, porta e comando).
- Iniciar, parar e reiniciar uma aplicação, um serviço, uma seleção, um grupo ou tudo de uma vez.
- Abrir a URL no navegador, em aba normal ou em janela de aplicativo (Chrome/Chromium, sem abas).
- Organizar aplicações em grupos e iniciar ou parar o grupo inteiro.
- Ler o `.env` do projeto cadastrado, guardar variáveis extras e, se quiser, gravar a porta de volta nesse arquivo ao iniciar.
- Escolher ícone, ver logs do processo e iniciar automaticamente o que estiver marcado quando o DevDesk abrir.

## Requisitos

- Node.js 20 ou superior (a versão do [`.nvmrc`](.nvmrc) é 20)
- npm 10 ou superior

O PM2 entra como dependência do backend. Não precisa instalá-lo globalmente.

No Linux, o atalho de área de trabalho e a janela de aplicativo funcionam melhor com um navegador baseado em Chromium (`google-chrome`, `chromium`, Brave ou Edge). Firefox e `xdg-open` servem como alternativa, em janela comum. Para focar uma janela já aberta, `wmctrl` ou `xdotool` ajudam, mas não são obrigatórios.

## Como executar

Na raiz do repositório:

```bash
npm install
npm run dev
```

Isso sobe os dois processos:

| Serviço | Endereço |
| --- | --- |
| API | http://127.0.0.1:3002 |
| Interface | http://127.0.0.1:5174 |

Abra a interface no navegador. O Vite encaminha `/api` para o backend. A API escuta apenas em `127.0.0.1`.

Para checar se a API está no ar: http://127.0.0.1:3002/api/health

## Atalho no desktop (Linux)

Cria um lançador na área de trabalho e no menu de aplicativos. O arquivo `.desktop` aponta para a pasta deste clone.

```bash
npm run desktop:install
```

Para subir a API e a interface (se ainda não estiverem no ar) e abrir a janela:

```bash
npm run desktop
```

O log fica em `~/.devdesk/devdesk.log`.

## Como usar

1. Em **Aplicações**, cadastre o projeto. Informe nome, pasta absoluta e comando, por exemplo `npm run dev`.
2. Escolha o modo:
   - **Um comando** — uma pasta e um comando já sobem tudo.
   - **Vários serviços** — cada parte tem pasta, porta e comando próprios, e pode ser iniciada separada.
3. Diga como a porta chega no processo:
   - **Não configura porta** — a aplicação escolhe a porta sozinha.
   - **Variável de ambiente / .env** — o DevDesk lê e injeta a variável (padrão `PORT`).
   - **Argumento de linha de comando** — acrescenta a flag, por exemplo `--port 3000`.
4. Use **Carregar do .env** para importar o arquivo do projeto (padrão `.env`, também aceita `.env.local` e nomes parecidos, sempre dentro da pasta do serviço). Com **Atualizar .env ao iniciar** ligado, a porta é gravada nesse arquivo sem apagar as outras chaves.
5. No **Dashboard**, inicie, pare, reinicie, abra, veja logs ou exclua. A busca filtra por nome, descrição, grupo e serviço.
6. Em **Grupos**, junte aplicações relacionadas e inicie ou pare o conjunto.
7. Em **Configurações**, ajuste a porta padrão das novas aplicações, o intervalo de atualização do status, o tema e se o auto-start global está ligado.

**Iniciar automaticamente** em uma aplicação só tem efeito se o auto-start global estiver ligado nas configurações.

A porta do backend também aparece nas configurações, mas mudá-la exige reiniciar a API. No modo de desenvolvimento o proxy do Vite continua apontando para a porta `3002`.

Cada aplicação sobe em localhost, no endereço do serviço cadastrado.

## Onde ficam os dados

O SQLite, o log e o perfil de navegador do atalho ficam fora do repositório:

```text
~/.devdesk/devdesk.sqlite
~/.devdesk/devdesk.log
~/.devdesk/chrome-profile/
```

O banco guarda cadastros, caminhos, comandos e as variáveis extras importadas do `.env` de cada projeto. Esses arquivos não devem ser commitados. O [`.gitignore`](.gitignore) já ignora `*.sqlite`, `*.log` e `.env*`.

Para usar outra pasta:

```bash
DEVDESK_DATA_DIR=/caminho/personalizado npm run dev:api
```

O DevDesk não carrega um `.env` próprio. A única variável dele é `DEVDESK_DATA_DIR`, lida do ambiente do processo. Não há chave, token ou senha embutida no código: os segredos dos projetos que você gerencia continuam nos `.env` desses projetos e, se você importar, na cópia local em `~/.devdesk`.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Sobe API e interface juntas |
| `npm run dev:api` | Só o backend |
| `npm run dev:web` | Só a interface |
| `npm run build` | Gera o build de produção da interface em `apps/web/dist` |
| `npm start` | Inicia somente a API |
| `npm run desktop` | Sobe o que faltar e abre a janela no Linux |
| `npm run desktop:install` | Cria o atalho `.desktop` |
| `npm run typecheck -w @devdesk/api` | Checagem de tipos do backend |
| `npm run typecheck -w @devdesk/web` | Checagem de tipos da interface |

`npm start` não serve a interface compilada. Para usar o painel, rode `npm run dev` ou `npm run desktop`.

## Arquitetura

```text
apps/web          React 19, Vite, Tailwind CSS 4, React Router
apps/api          Fastify, SQLite (better-sqlite3), PM2
packages/shared   Tipos e contratos usados pelos dois lados
scripts/devdesk.sh  Lançador Linux (atalho e janela)
```

O comando e o diretório executados vêm do cadastro. A ação de iniciar não aceita um comando arbitrário no corpo da requisição.

## Fora desta versão

Acesso pela rede local fica para uma versão futura, com outro desenho.

Empacotamento Electron, instalador e inicialização junto com o sistema operacional ainda não existem. O lançador atual é o script de desktop no Linux.

O arquivo [`doc_requisitos.md`](doc_requisitos.md) é a especificação original do produto. O comportamento desta versão é o descrito neste README.
