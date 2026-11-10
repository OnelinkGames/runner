# DevDesk — Local App Manager

**Versão:** 1.0
**Tipo:** MVP
**Objetivo:** Gerenciamento de aplicações locais
**Execução inicial:** Web local
**Banco de dados:** SQLite
**Process Manager:** PM2
**Frontend:** React + TypeScript
**Backend:** Node.js + TypeScript
**Futuro:** Aplicação Desktop com Electron

---

# 1. Visão Geral

O **DevDesk** será uma aplicação local destinada a centralizar e facilitar o gerenciamento de outras aplicações que normalmente precisam ser iniciadas manualmente através do terminal.

Atualmente, para executar diferentes projetos locais, o usuário precisa:

1. Navegar até a pasta do projeto.
2. Abrir um terminal.
3. Executar um comando como `npm run dev`.
4. Verificar a porta utilizada.
5. Abrir o navegador manualmente.
6. Repetir o processo para cada aplicação.

O DevDesk deverá centralizar esse processo em uma única interface.

O usuário poderá cadastrar suas aplicações locais informando:

* Nome.
* Pasta do projeto.
* Comando de inicialização.
* Porta.
* URL.
* Outras configurações necessárias.

Depois do cadastro, o usuário poderá iniciar, parar, reiniciar e abrir cada aplicação diretamente pela interface.

---

# 2. Objetivo Principal

Transformar o processo:

```text
Abrir terminal
    ↓
Entrar na pasta
    ↓
Executar npm run dev
    ↓
Verificar porta
    ↓
Abrir navegador
```

em:

```text
Abrir DevDesk
    ↓
Selecionar aplicação
    ↓
[ INICIAR ]
    ↓
Aplicação funcionando
```

---

# 3. Objetivos do MVP

O MVP deverá permitir:

* Cadastrar aplicações locais.
* Editar aplicações cadastradas.
* Excluir aplicações.
* Definir a pasta de cada aplicação.
* Definir o comando de inicialização.
* Definir a porta.
* Iniciar aplicações.
* Parar aplicações.
* Reiniciar aplicações.
* Abrir a aplicação no navegador.
* Visualizar o status da aplicação.
* Visualizar a porta utilizada.
* Visualizar informações básicas do processo.
* Iniciar múltiplas aplicações.
* Parar múltiplas aplicações.
* Persistir todas as configurações em SQLite.
* Executar tudo localmente.

---

# 4. Fora do Escopo do MVP

Não serão implementados inicialmente:

* Login.
* Usuários.
* Cloud.
* Sincronização entre computadores.
* SaaS.
* Controle remoto.
* Gerenciamento de servidores externos.
* Deploy.
* Git integrado.
* CI/CD.
* Monitoramento de servidores.
* Docker.
* Kubernetes.

Essas funcionalidades poderão ser adicionadas futuramente.

---

# 5. Arquitetura

A aplicação deverá utilizar uma arquitetura separada em camadas.

```text
┌──────────────────────────────┐
│          DevDesk UI           │
│      React + TypeScript       │
└──────────────┬───────────────┘
               │
               │ HTTP / API
               ↓
┌──────────────────────────────┐
│          Backend              │
│       Node + TypeScript       │
├──────────────────────────────┤
│ Application Service           │
│ Process Manager Service       │
│ Database Service              │
└───────┬──────────────┬───────┘
        │              │
        ↓              ↓
   ┌─────────┐     ┌─────────┐
   │  SQLite │     │   PM2   │
   └─────────┘     └─────────┘
```

A interface não deverá executar comandos do sistema operacional diretamente.

Toda operação deverá passar pelo backend.

---

# 6. Stack Tecnológica

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Biblioteca de componentes UI, se necessário
* Lucide Icons

## Backend

* Node.js
* TypeScript
* Express ou Fastify

## Banco

* SQLite

Biblioteca recomendada:

```text
better-sqlite3
```

## Gerenciamento de processos

```text
PM2
```

## Futuro Desktop

```text
Electron
```

---

# 7. Aplicações

O conceito principal do sistema será a entidade **Application**.

Cada aplicação cadastrada deverá possuir suas próprias configurações.

Exemplo:

```text
App Web
────────────────────────
Pasta:
/home/voce/projetos/app-web

Comando:
npm run dev

Porta:
3000
```

Outra aplicação:

```text
Loja
────────────────────────
Pasta:
/home/voce/projetos/loja

Comando:
npm run dev

Porta:
3001
```

---

# 8. Cadastro de Aplicação

O usuário deverá conseguir cadastrar uma nova aplicação.

Campos obrigatórios:

### Nome

Exemplo:

```text
App Web
```

### Diretório

Caminho absoluto da aplicação.

Exemplo:

```text
/home/voce/projetos/app-web
```

### Comando

Comando que deverá ser executado.

Exemplo:

```text
npm run dev
```

### Porta

Porta utilizada pela aplicação.

Exemplo:

```text
3000
```

---

# 9. Campos opcionais

Poderão existir campos adicionais:

### Descrição

Exemplo:

```text
Calculadora de custos para impressões 3D.
```

### URL

Exemplo:

```text
http://localhost:3000
```

Caso não seja informada, o sistema poderá gerar automaticamente:

```text
http://localhost:{porta}
```

### Grupo

Permite organizar aplicações.

Exemplo:

```text
Projetos
Ferramentas
Clientes
Desenvolvimento
```

---

# 10. Validação do Cadastro

Ao cadastrar uma aplicação, o sistema deverá verificar:

### Diretório

Verificar se a pasta existe.

Caso não exista:

```text
A pasta informada não foi encontrada.
```

### Comando

O campo não poderá estar vazio.

### Porta

A porta deverá ser válida.

Intervalo:

```text
1 — 65535
```

### Nome

Não poderá estar vazio.

---

# 11. Detecção de Aplicações

Como melhoria futura, o sistema poderá detectar automaticamente informações de projetos.

Por exemplo, ao selecionar uma pasta:

```text
package.json
```

poderá ser detectado.

O DevDesk poderá apresentar:

```text
Projeto Node.js detectado

Scripts encontrados:

npm run dev
npm start
npm run build
```

O usuário poderá selecionar qual deseja utilizar.

Essa funcionalidade poderá ser implementada após o MVP.

---

# 12. Dashboard

A tela principal será o **Dashboard**.

Ela deverá apresentar todas as aplicações cadastradas.

Exemplo:

```text
┌─────────────────────────────────────────────────────┐
│ DevDesk                                    ⚙       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Minhas Aplicações                    [+ Adicionar] │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🟢 App Web                              │ │
│ │    localhost:3000                              │ │
│ │    Rodando                                      │ │
│ │                                                │ │
│ │    [Abrir] [Reiniciar] [Parar]                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ⚫ Loja                                       │ │
│ │    localhost:3001                              │ │
│ │    Parado                                       │ │
│ │                                                │ │
│ │    [Iniciar] [Editar]                           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

# 13. Status da Aplicação

Cada aplicação deverá possuir um status.

Status principais:

```text
● Rodando
● Parado
● Iniciando
● Parando
● Erro
```

O status deverá ser atualizado automaticamente.

---

# 14. Iniciar Aplicação

Ao clicar em:

```text
[Iniciar]
```

o backend deverá:

1. Buscar a configuração da aplicação.
2. Verificar se o processo já está rodando.
3. Verificar a porta configurada.
4. Iniciar o processo utilizando o PM2.
5. Monitorar o processo.
6. Atualizar o status.

Após iniciar:

```text
🟢 Rodando

http://localhost:3000
```

---

# 15. Parar Aplicação

Ao clicar em:

```text
[Parar]
```

o backend deverá solicitar ao PM2 o encerramento do processo.

O status deverá mudar para:

```text
⚫ Parado
```

---

# 16. Reiniciar Aplicação

O usuário deverá possuir a opção:

```text
[Reiniciar]
```

O sistema deverá:

```text
Parar
 ↓
Aguardar encerramento
 ↓
Iniciar novamente
```

---

# 17. Abrir Aplicação

Quando a aplicação estiver rodando, deverá existir o botão:

```text
[Abrir]
```

Esse botão deverá abrir:

```text
http://localhost:3000
```

no navegador padrão do sistema operacional.

---

# 18. Iniciar várias aplicações

O usuário deverá conseguir selecionar várias aplicações.

Exemplo:

```text
☑ Frontend
☑ Backend
☑ Banco local
☐ Loja
☐ App Web
```

E executar:

```text
[▶ Iniciar selecionadas]
```

O sistema deverá iniciar todas as aplicações selecionadas.

Também deverá existir:

```text
[▶ Iniciar todas]
[■ Parar todas]
```

---

# 19. Gerenciamento de Portas

Cada aplicação deverá possuir uma porta configurada.

Exemplo:

```text
Aplicação A → 3000
Aplicação B → 3001
Aplicação C → 3002
```

Antes de iniciar uma aplicação, o sistema deverá verificar se a porta está disponível.

Caso esteja ocupada:

```text
A porta 3000 já está em uso.

Deseja utilizar outra porta?
```

---

# 20. Porta Automática

Como funcionalidade opcional do MVP ou primeira evolução, o sistema poderá possuir:

```text
☑ Encontrar porta disponível automaticamente
```

Exemplo:

```text
Porta configurada: 3000

3000 → ocupada
3001 → ocupada
3002 → livre

Aplicação iniciada na porta 3002.
```

Quando a aplicação utilizar uma porta dinâmica, o sistema deverá registrar a porta efetivamente utilizada durante aquela execução.

---

# 21. Importante — Compatibilidade com a aplicação

A troca automática de porta só deverá ser realizada quando a aplicação suportar configuração de porta através de variável de ambiente ou argumento.

Exemplo:

```text
PORT=3002 npm run dev
```

O DevDesk não deverá assumir que qualquer aplicação aceita mudança de porta automaticamente.

---

# 22. Variáveis de Ambiente

O cadastro poderá futuramente permitir variáveis de ambiente.

Exemplo:

```text
PORT=3000
NODE_ENV=development
API_URL=http://localhost:4000
```

Interface futura:

```text
Variáveis de ambiente

PORT       3000
NODE_ENV   development
API_URL    http://localhost:4000

[+ Adicionar variável]
```

Essa funcionalidade é especialmente importante para projetos com frontend e backend.

---

# 23. Logs

O sistema deverá possuir uma área para visualizar logs do processo.

Exemplo:

```text
[10:31:02] Starting development server...
[10:31:03] Local: http://localhost:3000
[10:31:03] ready in 412ms
```

Os logs poderão ser obtidos através do PM2.

A interface deverá possuir:

```text
[Ver Logs]
```

---

# 24. Banco de Dados

O banco será SQLite.

Arquivo:

```text
devdesk.sqlite
```

O banco deverá ficar em um diretório apropriado da aplicação.

---

# 25. Tabela Applications

Tabela:

```text
applications
```

Campos sugeridos:

```text
id
name
description
directory
command
port
url
group_name
auto_port
enabled
created_at
updated_at
```

---

# 26. Tabela Process States

Opcionalmente, poderá existir uma tabela para armazenar informações de execução.

```text
application_processes
```

Campos:

```text
id
application_id
pm2_process_name
pid
status
current_port
started_at
updated_at
```

Entretanto, o estado real do processo deverá sempre ser consultado junto ao PM2 quando necessário.

O banco não deverá ser tratado como fonte absoluta do status do processo.

---

# 27. Identificação do Processo PM2

Cada aplicação deverá possuir um identificador único para o PM2.

Exemplo:

```text
devdesk-app-web
devdesk-loja
devdesk-api
```

O identificador deverá ser gerado automaticamente.

Isso evita conflitos entre aplicações.

---

# 28. Segurança

Apesar de ser uma aplicação local, o backend deverá possuir alguns cuidados básicos.

Não deverá permitir que uma requisição HTTP arbitrária execute qualquer comando do sistema operacional sem passar pelo cadastro de aplicações.

O comando executado deverá ser obtido da aplicação cadastrada.

O diretório também deverá ser validado.

O sistema deverá evitar operações de shell desnecessariamente perigosas.

---

# 29. Interface e Design

O DevDesk deverá possuir um visual:

* Futurista.
* Moderno.
* Elegante.
* Minimalista.
* Profissional.
* Funcional.

A interface não deverá priorizar efeitos visuais em detrimento da usabilidade.

A estética deverá transmitir a ideia de:

```text
Developer Tools
+
Desktop Environment
+
Modern Control Center
```

---

# 30. Direção Visual

Sugestão:

### Tema

Dark Mode como padrão.

### Características

* Fundo escuro.
* Cards com contraste sutil.
* Bordas discretas.
* Efeitos de transparência moderados.
* Gradientes discretos.
* Ícones modernos.
* Tipografia limpa.
* Estados de execução claramente identificados.

O visual deverá evitar excesso de:

* Neon.
* Glow.
* Animações.
* Gradientes fortes.
* Elementos decorativos.

A prioridade é manter a aparência futurista sem prejudicar a leitura.

---

# 31. Layout

Estrutura sugerida:

```text
┌─────────────────────────────────────────────────────┐
│ DevDesk                              🔔    ⚙       │
├───────────────┬─────────────────────────────────────┤
│               │                                     │
│ Dashboard     │                                     │
│ Aplicações    │       CONTEÚDO PRINCIPAL            │
│ Grupos        │                                     │
│ Configurações │                                     │
│               │                                     │
│               │                                     │
└───────────────┴─────────────────────────────────────┘
```

No MVP, o menu poderá conter apenas:

```text
Dashboard
Aplicações
Configurações
```

---

# 32. Card da Aplicação

Cada aplicação deverá possuir um card contendo:

```text
┌──────────────────────────────────────┐
│ 🟢 App Web                   │
│                                      │
│ Status: Rodando                      │
│ Porta: 3000                          │
│ URL: localhost:3000                  │
│                                      │
│ [Abrir] [Reiniciar] [Parar]          │
│                                      │
│ ⋮ Mais opções                         │
└──────────────────────────────────────┘
```

---

# 33. Menu de Aplicação

O menu de cada aplicação poderá conter:

```text
Abrir
Iniciar
Parar
Reiniciar
Ver Logs
Editar
Excluir
```

As opções deverão variar de acordo com o status.

Por exemplo, uma aplicação parada não precisa apresentar:

```text
Parar
```

---

# 34. Busca

A tela principal deverá possuir uma busca.

Exemplo:

```text
🔎 Buscar aplicações...
```

O usuário poderá pesquisar por:

* Nome.
* Descrição.
* Grupo.

---

# 35. Grupos

O sistema poderá permitir agrupar aplicações.

Exemplo:

```text
MEUS PROJETOS

E-commerce
├── Frontend
├── Backend
└── Admin

Ferramentas
├── Loja
├── DevDesk
└── App Web
```

Uma função importante será:

```text
[▶ Iniciar grupo]
```

Isso permitirá iniciar várias aplicações relacionadas.

---

# 36. Configurações

A tela de configurações deverá permitir configurações gerais do DevDesk.

Inicialmente:

* Porta do backend.
* Porta padrão para novas aplicações.
* Intervalo de atualização de status.
* Inicialização automática.
* Tema.

---

# 37. Inicialização Automática

Como funcionalidade futura, o DevDesk poderá ser configurado para iniciar automaticamente com o sistema operacional.

Exemplo:

```text
☑ Iniciar DevDesk com o Windows
```

E também:

```text
☑ Iniciar aplicações marcadas como "Inicializar automaticamente"
```

---

# 38. Campo Auto Start

Cada aplicação poderá possuir:

```text
☐ Iniciar automaticamente
```

Quando o DevDesk for iniciado:

```text
DevDesk
   ↓
Carrega aplicações
   ↓
Identifica aplicações Auto Start
   ↓
Inicia processos
```

---

# 39. Arquitetura para Electron

Desde o início, o projeto deverá ser estruturado para futura transformação em Electron.

O React não deverá depender diretamente de APIs específicas do Electron.

A comunicação deverá ocorrer através de uma camada de serviços.

Inicialmente:

```text
React
 ↓
HTTP
 ↓
Node Backend
```

No futuro:

```text
React
 ↓
Electron IPC
 ↓
Node / Process Manager
```

Isso permitirá manter a maior parte da interface e regras de negócio.

---

# 40. Futuro Executável

A versão futura deverá permitir gerar:

```text
DevDesk.exe
```

O usuário poderá instalar o aplicativo no computador e simplesmente clicar no ícone.

Não deverá ser necessário:

```text
npm install
npm run dev
terminal
Node manualmente
```

Tudo deverá ser empacotado no instalador.

---

# 41. Comportamento Futuro no Electron

No modo Electron:

```text
DevDesk.exe
        ↓
Electron
        ↓
Frontend React
        ↓
Backend/Services
        ↓
PM2 / Processos locais
        ↓
Aplicações do usuário
```

O SQLite continuará sendo utilizado.

---

# 42. Requisitos Não Funcionais

## RNF01 — Local

O sistema deverá funcionar localmente sem depender de serviços externos.

## RNF02 — Persistência

As aplicações cadastradas deverão continuar disponíveis após reiniciar o DevDesk.

## RNF03 — Performance

A interface deverá responder rapidamente às ações do usuário.

## RNF04 — Confiabilidade

O DevDesk deverá detectar quando um processo foi encerrado inesperadamente.

## RNF05 — Recuperação

Caso uma aplicação seja encerrada fora do DevDesk, o sistema deverá atualizar seu status.

## RNF06 — Escalabilidade local

O sistema deverá suportar dezenas de aplicações cadastradas sem degradação perceptível.

## RNF07 — Desktop Ready

A arquitetura deverá permitir futura migração para Electron sem reescrever completamente o frontend.

---

# 43. Tratamento de Erros

Exemplos:

### Pasta inexistente

```text
Não foi possível iniciar a aplicação.

O diretório configurado não existe.
```

### Comando inválido

```text
Não foi possível iniciar a aplicação.

O comando retornou um erro.
```

### Porta ocupada

```text
A porta 3000 está sendo utilizada por outro processo.
```

### Processo encerrado

```text
A aplicação foi encerrada inesperadamente.
```

### PM2 indisponível

```text
O gerenciador de processos não está disponível.
Verifique a instalação do PM2.
```

---

# 44. Critérios de Aceitação do MVP

O MVP será considerado concluído quando:

* [ ] A aplicação executar localmente.
* [ ] React estiver funcionando como frontend.
* [ ] Node.js estiver funcionando como backend.
* [ ] SQLite estiver configurado.
* [ ] PM2 estiver integrado.
* [ ] Usuário conseguir cadastrar aplicações.
* [ ] Usuário conseguir definir nome.
* [ ] Usuário conseguir definir pasta.
* [ ] Usuário conseguir definir comando.
* [ ] Usuário conseguir definir porta.
* [ ] Usuário conseguir editar aplicações.
* [ ] Usuário conseguir excluir aplicações.
* [ ] Usuário conseguir iniciar aplicações.
* [ ] Usuário conseguir parar aplicações.
* [ ] Usuário conseguir reiniciar aplicações.
* [ ] Usuário conseguir abrir aplicações no navegador.
* [ ] Sistema mostrar status dos processos.
* [ ] Sistema detectar erros de inicialização.
* [ ] Sistema detectar processos encerrados.
* [ ] Sistema permitir iniciar várias aplicações.
* [ ] Sistema permitir parar várias aplicações.
* [ ] Sistema armazenar configurações no SQLite.
* [ ] Interface possuir visual moderno e futurista.
* [ ] Interface ser responsiva.
* [ ] Arquitetura estar preparada para futura versão Electron.

---

# 45. Roadmap

## Fase 1 — MVP

```text
React
+
Node
+
SQLite
+
PM2
```

Funcionalidades:

```text
Cadastro
Edição
Exclusão
Iniciar
Parar
Reiniciar
Abrir
Status
Logs básicos
```

---

## Fase 2 — Gerenciamento avançado

Adicionar:

```text
Grupos
Busca
Filtros
Variáveis de ambiente
Portas automáticas
Auto Start
Logs avançados
```

---

## Fase 3 — Electron

Transformar:

```text
Aplicação Web Local
```

em:

```text
DevDesk.exe
```

Adicionar:

* Instalador.
* Ícone.
* Inicialização com Windows.
* Tray icon.
* Inicialização automática de aplicações.
* Atualização automática.

---

## Fase 4 — Recursos avançados

Possibilidades:

* Gerenciamento de projetos completos.
* Frontend + Backend como um único grupo.
* Dependências entre aplicações.
* Monitoramento de CPU/RAM.
* Histórico de execução.
* Notificações.
* Atalhos.
* Integração com Git.
* Detecção automática de projetos.
* Backup das configurações.

---

# 46. Exemplo de Utilização

O usuário instala o DevDesk.

Ao abrir pela primeira vez:

```text
Bem-vindo ao DevDesk

Você ainda não possui aplicações cadastradas.

[+ Adicionar aplicação]
```

O usuário cadastra:

```text
Nome:
App Web

Pasta:
/home/voce/projetos/app-web

Comando:
npm run dev

Porta:
3000
```

Depois cadastra:

```text
Nome:
Loja

Pasta:
/home/voce/projetos/loja

Comando:
npm run dev

Porta:
3001
```

No dashboard:

```text
App Web       ⚫ Parado
Loja                ⚫ Parado
```

O usuário seleciona ambas:

```text
☑ App Web
☑ Loja

[▶ Iniciar selecionadas]
```

Resultado:

```text
App Web       🟢 localhost:3000
Loja                🟢 localhost:3001
```

O usuário pode então clicar:

```text
[Abrir]
```

e acessar cada aplicação.

---

# 47. Princípio Fundamental do Projeto

O DevDesk deverá seguir três princípios:

### 1. Simplicidade

O usuário não deve precisar entender PM2, Node, processos ou portas para utilizar o sistema.

### 2. Controle

O usuário deve conseguir visualizar e controlar todas as suas aplicações locais em um único lugar.

### 3. Evolução

O MVP deve ser simples, mas a arquitetura não deve criar obstáculos para transformar posteriormente o DevDesk em uma aplicação desktop completa utilizando Electron.

---

# 48. Resultado Esperado

Ao final do MVP, o usuário deverá conseguir substituir completamente o fluxo manual de:

```text
Abrir pasta
↓
Abrir terminal
↓
npm run dev
↓
Descobrir porta
↓
Abrir navegador
```

por:

```text
Abrir DevDesk
↓
Escolher aplicação
↓
▶ Iniciar
↓
🌐 Abrir
```

E, quando necessário:

```text
☑ Projeto A
☑ Projeto B
☑ Projeto C

▶ Iniciar selecionadas
```

O DevDesk será, portanto, um **painel local de gerenciamento das aplicações de desenvolvimento do usuário**, funcionando inicialmente como aplicação web local e preparado desde sua primeira versão para futuramente se tornar um aplicativo desktop independente através do Electron.
