<div align="center" id="readme-top">

<img src="memoria-viva/public/marca/logo.svg" height="110" alt="Memória Viva"/>

### As fotos da família e as histórias por trás delas, num lugar só.

<br/>

[![Licença MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-F5DF8D?style=for-the-badge&labelColor=1E375A)](LICENSE)
[![React](https://img.shields.io/badge/React_18-B85D3B?style=for-the-badge&logo=react&logoColor=F5DF8D&labelColor=1E375A)](https://react.dev)
[![Status](https://img.shields.io/badge/Status-Em%20desenvolvimento-F5DF8D?style=for-the-badge&labelColor=1E375A)](#)

</div>

---

## 🗂️ Índice

- [Sobre o projeto](#-sobre-o-projeto)
- [Por que existe](#-por-que-existe)
- [Funcionalidades](#-funcionalidades)
- [Planos](#-planos)
- [Tecnologias](#-tecnologias)
- [Como rodar](#-como-rodar)
- [Estrutura do repositório](#-estrutura-do-repositório)
- [Equipe](#-equipe)
- [Licença](#-licença)

---

## 📖 Sobre o projeto

> **Memória Viva** é uma plataforma para a família guardar suas fotos, soltas ou em álbuns, junto com as histórias que vêm com elas: quem aparece, onde foi, quando foi e o que aconteceu.

As fotos da gaveta, os álbuns da estante e as lembranças de quem viveu aquilo ficam num acervo da família. Cada pessoa da família pode entrar, contar o que lembra, marcar quem está na foto e corrigir o que estiver errado. Quem lembra, confirma ou corrige: a história fica certa e fica de todos.

Também dá para **perguntar**. "Quem é esse ao lado do vô?", "Onde foi essa festa?": a resposta vem das próprias fotos e histórias da família e sempre mostra de onde saiu.

**Por que o Memória Viva?**

- Fotos soltas e álbuns inteiros guardados num só lugar
- Cada foto com a história de quem viveu aquilo
- A árvore da família montada a partir das memórias
- Perguntas respondidas mostrando de onde veio a resposta
- Pensado para todas as idades, dos **17 aos 80+ anos**: letra grande e linguagem do dia a dia

<div align="right"><a href="#readme-top">voltar ao topo</a></div>

---

## 💭 Por que existe

**47%** das pessoas sabem o nome dos quatro avós, e **66%** gostariam de conhecer mais a história da família (Ancestry/OnePoll, 2019).

As fotos antigas se perdem em caixas, os nomes de quem aparece nelas se perdem com quem lembrava, e as histórias ficam espalhadas em conversas de almoço de domingo. O Memória Viva junta tudo isso antes que se perca.

<div align="right"><a href="#readme-top">voltar ao topo</a></div>

---

## ✨ Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| 🖼️ **Memórias** | Cada memória é uma foto ou um álbum, com data, lugar, quem aparece e a história contada |
| 📅 **Datas do jeito que se lembra** | Dia exato, só o mês, só o ano, "por volta de", década ou "não sei" |
| 🙂 **Rostos** | Marque quem aparece em cada foto e descubra em quais memórias cada pessoa está |
| 🌳 **Árvore da família** | Pessoas, laços e parentescos montados numa árvore genealógica |
| 🧵 **Linha da vida** | As memórias de cada pessoa em ordem, do nascimento em diante |
| 🔍 **Perguntar** | Perguntas sobre a família respondidas a partir do acervo, sempre mostrando a fonte; a família confirma |
| 💡 **Pergunta do dia** | Uma pergunta por dia para puxar lembranças e completar o acervo |
| 👨‍👩‍👧 **Família e convites** | Convide parentes por código para guardar e comentar juntos |
| 💬 **Comentários e reações** | Cada um acrescenta o que lembra em cada memória |
| 🔐 **Privacidade** | Fotos privadas (só quem é da família vê), senhas com Argon2id e exclusão de conta com 30 dias para desistir (LGPD) |

<div align="right"><a href="#readme-top">voltar ao topo</a></div>

---

## 💳 Planos

| Plano | Mensal (R$) | Anual (R$) | Espaço | Créditos de IA/mês | Pessoas na família |
|---|---|---|---|---|---|
| Grátis | 0,00 | — | 1 GB | 10 | 1 |
| Individual | 24,90 | 249,00 | 10 GB | 60 | 1 |
| Família | 49,90 | 499,00 | 50 GB | 150 | 5 |
| Família Ampliada | 79,90 | 799,00 | 120 GB | 300 | 10 |

No plano anual, a família paga 10 meses e leva 12.

<div align="right"><a href="#readme-top">voltar ao topo</a></div>

---

## 🧰 Tecnologias

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![MySQL](https://img.shields.io/badge/MySQL_8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com)
[![Amazon S3](https://img.shields.io/badge/Amazon_S3-569A31?style=for-the-badge&logo=amazons3&logoColor=white)](https://aws.amazon.com/s3/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev)

| Parte | O que usa |
|---|---|
| Front-end | React 18 + Vite, CSS puro |
| Back-end | Node.js + Express 5, validação com Zod |
| Banco | MySQL 8, criado e atualizado por migrações |
| Fotos | Pasta local (desenvolvimento) ou bucket S3 (produção) |
| Testes | Vitest + Supertest |

<div align="right"><a href="#readme-top">voltar ao topo</a></div>

---

## 🚀 Como rodar

**Pré-requisitos:** Node.js 22.9 ou mais novo e MySQL 8.

```sh
git clone https://github.com/memoria-viva-projeto/memoria-viva-react.git
cd memoria-viva-react/memoria-viva

npm install
cp .env.example .env.local   # preencha DB_USUARIO e DB_SENHA
npm run db:migrar            # cria o banco e aplica as migrações
npm run api                  # API em http://localhost:3001
npm run dev                  # em outro terminal: site em http://localhost:5173
```

Sem login, a página `/conta` mostra uma demonstração com o acervo de exemplo da Maria.

Variáveis de ambiente, banco de dados, API, testes e publicação em produção estão no
**[README técnico](memoria-viva/README.md)**.

<div align="right"><a href="#readme-top">voltar ao topo</a></div>

---

## 📁 Estrutura do repositório

```
memoria-viva/
  src/            front-end (landing e área logada)
  public/         imagens, logo e favicons
  server/         API em Node + Express
  db/             migrações e esquema do banco
  design/         kit da marca
  apresentacao/   materiais do pitch
```

<div align="right"><a href="#readme-top">voltar ao topo</a></div>

---

## 👥 Equipe

<!--
  FOTOS: coloque as fotos em .github/equipe/ (quadradas, de preferência 300x300)
  com os nomes indicados em cada bloco e apague os <!- - - -> em volta da linha <img>.
  GITHUB / LINKEDIN: troque "USUARIO" pelos links de cada pessoa e tire o comentário da mesma forma.
-->

<div align="center">

<table>
  <tr>
    <td align="center" width="25%">
      <!-- <img src=".github/equipe/thanawa-matos.jpg" width="100px" alt="Thanawã Matos"/><br/> -->
      <b>Thanawã Matos</b><br/>
      <sub>Product Owner / Vendas</sub>
      <!-- <br/><br/><a href="https://github.com/USUARIO"><img src="https://img.shields.io/badge/GitHub-1E375A?style=flat-square&logo=github&logoColor=F5DF8D"/></a> <a href="https://www.linkedin.com/in/USUARIO"><img src="https://img.shields.io/badge/LinkedIn-B85D3B?style=flat-square&logo=linkedin&logoColor=F5DF8D"/></a> -->
    </td>
    <td align="center" width="25%">
      <!-- <img src=".github/equipe/maria-eduarda-neres.jpg" width="100px" alt="Maria Eduarda Neres"/><br/> -->
      <b>Maria Eduarda Neres</b><br/>
      <sub>Scrum Master / Financeiro</sub>
      <!-- <br/><br/><a href="https://github.com/USUARIO"><img src="https://img.shields.io/badge/GitHub-1E375A?style=flat-square&logo=github&logoColor=F5DF8D"/></a> <a href="https://www.linkedin.com/in/USUARIO"><img src="https://img.shields.io/badge/LinkedIn-B85D3B?style=flat-square&logo=linkedin&logoColor=F5DF8D"/></a> -->
    </td>
    <td align="center" width="25%">
      <!-- <img src=".github/equipe/nathaly-costa.jpg" width="100px" alt="Nathaly Costa"/><br/> -->
      <b>Nathaly Costa</b><br/>
      <sub>Documentarista / Financeiro</sub>
      <!-- <br/><br/><a href="https://github.com/USUARIO"><img src="https://img.shields.io/badge/GitHub-1E375A?style=flat-square&logo=github&logoColor=F5DF8D"/></a> <a href="https://www.linkedin.com/in/USUARIO"><img src="https://img.shields.io/badge/LinkedIn-B85D3B?style=flat-square&logo=linkedin&logoColor=F5DF8D"/></a> -->
    </td>
    <td align="center" width="25%">
      <!-- <img src=".github/equipe/vinicius-araujo.jpg" width="100px" alt="Vinícius de Araújo"/><br/> -->
      <b>Vinícius de Araújo</b><br/>
      <sub>Desenvolvedor / IA</sub>
      <!-- <br/><br/><a href="https://github.com/USUARIO"><img src="https://img.shields.io/badge/GitHub-1E375A?style=flat-square&logo=github&logoColor=F5DF8D"/></a> <a href="https://www.linkedin.com/in/USUARIO"><img src="https://img.shields.io/badge/LinkedIn-B85D3B?style=flat-square&logo=linkedin&logoColor=F5DF8D"/></a> -->
    </td>
  </tr>
  <tr>
    <td align="center" width="25%">
      <!-- <img src=".github/equipe/lais-toyama.jpg" width="100px" alt="Laís Toyama"/><br/> -->
      <b>Laís Toyama</b><br/>
      <sub>Desenvolvedora / Marketing</sub>
      <!-- <br/><br/><a href="https://github.com/USUARIO"><img src="https://img.shields.io/badge/GitHub-1E375A?style=flat-square&logo=github&logoColor=F5DF8D"/></a> <a href="https://www.linkedin.com/in/USUARIO"><img src="https://img.shields.io/badge/LinkedIn-B85D3B?style=flat-square&logo=linkedin&logoColor=F5DF8D"/></a> -->
    </td>
    <td align="center" width="25%">
      <!-- <img src=".github/equipe/julia-teodoro.jpg" width="100px" alt="Júlia Teodoro"/><br/> -->
      <b>Júlia Teodoro</b><br/>
      <sub>Desenvolvedora / Dados</sub>
      <!-- <br/><br/><a href="https://github.com/USUARIO"><img src="https://img.shields.io/badge/GitHub-1E375A?style=flat-square&logo=github&logoColor=F5DF8D"/></a> <a href="https://www.linkedin.com/in/USUARIO"><img src="https://img.shields.io/badge/LinkedIn-B85D3B?style=flat-square&logo=linkedin&logoColor=F5DF8D"/></a> -->
    </td>
    <td align="center" width="25%">
      <!-- <img src=".github/equipe/joshua-trindade.jpg" width="100px" alt="Joshua Trindade"/><br/> -->
      <b>Joshua Trindade</b><br/>
      <sub>Desenvolvedor / IA</sub>
      <!-- <br/><br/><a href="https://github.com/USUARIO"><img src="https://img.shields.io/badge/GitHub-1E375A?style=flat-square&logo=github&logoColor=F5DF8D"/></a> <a href="https://www.linkedin.com/in/USUARIO"><img src="https://img.shields.io/badge/LinkedIn-B85D3B?style=flat-square&logo=linkedin&logoColor=F5DF8D"/></a> -->
    </td>
    <td align="center" width="25%">
      <!-- <img src=".github/equipe/giovanna-felix.jpg" width="100px" alt="Giovanna Felix"/><br/> -->
      <b>Giovanna Felix</b><br/>
      <sub>Desenvolvedora / Marketing</sub>
      <!-- <br/><br/><a href="https://github.com/USUARIO"><img src="https://img.shields.io/badge/GitHub-1E375A?style=flat-square&logo=github&logoColor=F5DF8D"/></a> <a href="https://www.linkedin.com/in/USUARIO"><img src="https://img.shields.io/badge/LinkedIn-B85D3B?style=flat-square&logo=linkedin&logoColor=F5DF8D"/></a> -->
    </td>
  </tr>
</table>

</div>

<div align="right"><a href="#readme-top">voltar ao topo</a></div>

---

## 📄 Licença

Distribuído sob a licença MIT. Veja [`LICENSE`](LICENSE) para mais informações.

<div align="right"><a href="#readme-top">voltar ao topo</a></div>

---

<div align="center">

<br/>

Feito com 🧡 pelo time **Memória Viva**

</div>
