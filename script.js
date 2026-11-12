/* ==================================================================
   IAGO CORTES — MÃOS DE OURO
   JavaScript puro, sem bibliotecas. Faz quatro coisas:
   1) abre e fecha o menu no mobile
   2) rolagem suave ao clicar nas âncoras do menu
   3) efeito leve de aparição das seções ao rolar a página
   4) monta o pedido de agendamento e abre o WhatsApp já com o texto
   (a faixa rolante do topo é 100% CSS, não usa JavaScript)
   ================================================================== */

(function () {
  'use strict';

  /* ================================================================
     DADOS DO NEGÓCIO
     Trocou de número? Muda SÓ aqui e nos links do index.html
     (procure por "wa.me" no HTML).
     ================================================================ */
  var WHATSAPP = '5511985940622';

  /* ---------- 1) MENU MOBILE ---------- */
  var botaoMenu = document.querySelector('.js-menu-botao');
  var menu = document.querySelector('.js-menu');

  function fecharMenu() {
    if (!menu || !botaoMenu) { return; }
    menu.classList.remove('esta-aberto');
    botaoMenu.setAttribute('aria-expanded', 'false');
    botaoMenu.setAttribute('aria-label', 'Abrir menu de navegação');
  }

  if (botaoMenu && menu) {
    botaoMenu.addEventListener('click', function () {
      var aberto = menu.classList.toggle('esta-aberto');
      botaoMenu.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      botaoMenu.setAttribute('aria-label', aberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
    });

    menu.addEventListener('click', function (evento) {
      if (evento.target.closest('a')) { fecharMenu(); }
    });

    document.addEventListener('keydown', function (evento) {
      if (evento.key === 'Escape') { fecharMenu(); }
    });
  }

  /* ---------- 2) ROLAGEM SUAVE DAS ÂNCORAS ---------- */
  var cabecalho = document.querySelector('.cabecalho');

  document.addEventListener('click', function (evento) {
    var link = evento.target.closest('a[href^="#"]');
    if (!link) { return; }

    var alvoId = link.getAttribute('href');
    if (!alvoId || alvoId === '#') { return; }

    var alvo = document.querySelector(alvoId);
    if (!alvo) { return; }

    evento.preventDefault();

    var alturaCabecalho = cabecalho ? cabecalho.offsetHeight : 0;
    var posicao = alvo.getBoundingClientRect().top + window.pageYOffset - alturaCabecalho - 6;

    window.scrollTo({ top: posicao < 0 ? 0 : posicao, behavior: 'smooth' });

    alvo.setAttribute('tabindex', '-1');
    alvo.focus({ preventScroll: true });
  });

  /* ================================================================
     3) FORMULÁRIO DE AGENDAMENTO

     Não existe servidor nenhum aqui. O formulário só monta a mensagem
     e abre a conversa no WhatsApp do Iago — quem confirma o horário é
     ele, respondendo na conversa.

     REGRAS DA AGENDA (mudou o horário dele? é só mexer aqui):
       DIAS_FECHADOS   0 = domingo, 1 = segunda ... 6 = sábado
       ABRE / FECHA    expediente, em minutos desde a meia-noite
       ANTECEDENCIA    pra hoje, quanto tempo no mínimo à frente

     Isto não substitui a confirmação dele: serve pra ninguém pedir um
     horário em dia fechado ou daqui a dois minutos.
     ================================================================ */
  var DIAS_FECHADOS = [0, 1];
  var ABRE = 10 * 60;
  var FECHA = 20 * 60;
  var ANTECEDENCIA = 30;

  var NOME_DO_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  var formAgendar = document.querySelector('.js-form-agendar');

  if (formAgendar) {
    var campoDia = formAgendar.querySelector('#ag-dia');
    var campoHora = formAgendar.querySelector('#ag-hora');
    var aviso = formAgendar.querySelector('.js-form-erro');

    /* "2026-11-08" -> objeto Date no fuso de quem está olhando.
       new Date("2026-11-08") sozinho seria lido como UTC e, no Brasil,
       voltaria o dia anterior. */
    function dataLocal(valor) {
      var p = String(valor).split('-');
      if (p.length !== 3) { return null; }
      var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      return isNaN(d.getTime()) ? null : d;
    }

    function texto(d) {
      return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
    }

    function estaFechado(d) {
      return DIAS_FECHADOS.indexOf(d.getDay()) !== -1;
    }

    /* minutos desde a meia-noite, a partir de "14:30" */
    function emMinutos(hora) {
      var p = String(hora).split(':');
      if (p.length < 2) { return null; }
      return Number(p[0]) * 60 + Number(p[1]);
    }

    function porExtenso(minutos) {
      return String(Math.floor(minutos / 60)).padStart(2, '0') + 'h' +
        (minutos % 60 ? String(minutos % 60).padStart(2, '0') : '');
    }

    /* O primeiro dia que ele ainda consegue atender: hoje, se estiver
       aberto e ainda couber um horário; senão o próximo dia de agenda. */
    function primeiroDiaPossivel() {
      var d = new Date();
      var agora = d.getHours() * 60 + d.getMinutes();
      if (estaFechado(d) || agora + ANTECEDENCIA > FECHA) {
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
      }
      while (estaFechado(d)) { d.setDate(d.getDate() + 1); }
      return d;
    }

    if (campoDia) { campoDia.min = texto(primeiroDiaPossivel()); }
    if (campoHora) {
      campoHora.min = '10:00';
      campoHora.max = '20:00';
    }

    function mostrarAviso(texto) {
      if (!aviso) { return; }
      aviso.textContent = texto;
      aviso.hidden = false;
    }

    function limparAviso() {
      if (!aviso) { return; }
      aviso.hidden = true;
      aviso.textContent = '';
    }

    /* Devolve o problema do dia + horário escolhidos, ou null se estiver
       tudo certo. Usado na hora de enviar e também a cada mudança nos
       campos, pra pessoa descobrir na hora e não depois de clicar. */
    function problemaNaAgenda(valorData, valorHora) {
      var d = valorData ? dataLocal(valorData) : null;

      if (d && estaFechado(d)) {
        return {
          campo: campoDia,
          texto: NOME_DO_DIA[d.getDay()].charAt(0).toUpperCase() +
            NOME_DO_DIA[d.getDay()].slice(1) +
            ' ele não atende. A agenda é de terça a sábado.'
        };
      }

      if (!valorHora) { return null; }
      var minutos = emMinutos(valorHora);
      if (minutos === null) { return null; }

      if (minutos < ABRE || minutos > FECHA) {
        return {
          campo: campoHora,
          texto: 'O atendimento é das ' + porExtenso(ABRE) + ' às ' + porExtenso(FECHA) + '.'
        };
      }

      if (d) {
        var agora = new Date();
        var ehHoje = texto(agora) === valorData;
        if (ehHoje && minutos < agora.getHours() * 60 + agora.getMinutes() + ANTECEDENCIA) {
          return {
            campo: campoHora,
            texto: 'Pra hoje, escolhe um horário pelo menos ' + ANTECEDENCIA +
              ' minutos à frente — ele precisa de um tempo pra te responder.'
          };
        }
      }

      return null;
    }

    function conferirAgora() {
      var problema = problemaNaAgenda(campoDia ? campoDia.value : '', campoHora ? campoHora.value : '');
      if (problema) { mostrarAviso(problema.texto); } else { limparAviso(); }
    }

    if (campoDia) { campoDia.addEventListener('change', conferirAgora); }
    if (campoHora) { campoHora.addEventListener('change', conferirAgora); }

    /* 2026-03-14 -> 14/03/2026 (sem depender do fuso do navegador) */
    function dataPorExtenso(valor) {
      var partes = String(valor).split('-');
      if (partes.length !== 3) { return valor; }
      return partes[2] + '/' + partes[1] + '/' + partes[0];
    }

    formAgendar.addEventListener('submit', function (evento) {
      evento.preventDefault();
      limparAviso();

      var nome = formAgendar.querySelector('#ag-nome').value.trim();
      var servico = formAgendar.querySelector('#ag-servico').value;
      var data = campoDia ? campoDia.value : '';
      var hora = campoHora ? campoHora.value : '';
      var obs = formAgendar.querySelector('#ag-obs').value.trim();

      if (!nome)    { mostrarAviso('Escreve seu nome pra eu saber com quem falo.'); formAgendar.querySelector('#ag-nome').focus(); return; }
      if (!servico) { mostrarAviso('Escolhe o serviço que você quer fazer.'); formAgendar.querySelector('#ag-servico').focus(); return; }
      if (!data)    { mostrarAviso('Escolhe o dia do agendamento.'); campoDia.focus(); return; }
      if (!hora)    { mostrarAviso('Escolhe o horário do agendamento.'); campoHora.focus(); return; }

      var problema = problemaNaAgenda(data, hora);
      if (problema) {
        mostrarAviso(problema.texto);
        if (problema.campo) { problema.campo.focus(); }
        return;
      }

      var mensagem =
        'Olá Iago! Quero agendar um horário.\n\n' +
        'Nome: ' + nome + '\n' +
        'Serviço: ' + servico + '\n' +
        'Dia: ' + dataPorExtenso(data) + '\n' +
        'Horário: ' + hora;

      if (obs) { mensagem += '\nObservação: ' + obs; }

      mensagem += '\n\nJá posso mandar os 50% pra reservar?';
      mensagem += '\n\n(enviado pelo site)';

      window.open(
        'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(mensagem),
        '_blank',
        'noopener'
      );
    });
  }

  /* ================================================================
     AJUSTE DO VÍDEO DO INSTAGRAM (só no computador)

     O embed do Instagram vem com um rodapé (curtidas e caixa de
     comentário) que não cabe no visual da página. A .reel__janela corta
     esse rodapé, e aqui a gente reduz o vídeo até ele ficar com a mesma
     altura da foto do lado, pra faixa ficar proporcional.

     ALTURA_EMBED = altura do embed, em pixels, da borda de cima até a
     linha "Ver mais no Instagram", quando o iframe tem 380px de largura.
     Se o Instagram mudar o layout do embed, é esse número que se ajusta.
     ================================================================ */
  var LARGURA_EMBED = 380;
  var ALTURA_EMBED = 570;

  function ajustarReel() {
    var janela = document.querySelector('.reel__janela');
    var foto = document.querySelector('.foto-real');
    if (!janela || !foto) { return; }

    var iframe = janela.querySelector('iframe');
    if (!iframe) { return; }

    var escala;

    if (window.innerWidth >= 960) {
      /* no computador: mesma altura da foto do lado, pra faixa ficar pareja */
      var alturaFoto = foto.getBoundingClientRect().height;
      if (!alturaFoto) { return; }
      escala = alturaFoto / ALTURA_EMBED;
    } else {
      /* no celular: ocupa a largura disponível, e a altura vem junto */
      var disponivel = janela.parentNode.getBoundingClientRect().width;
      if (!disponivel) { return; }
      escala = Math.min(disponivel, 400) / LARGURA_EMBED;
    }
    iframe.style.width = LARGURA_EMBED + 'px';
    iframe.style.height = (ALTURA_EMBED + 210) + 'px';
    iframe.style.transformOrigin = 'top left';
    iframe.style.transform = 'scale(' + escala + ')';
    janela.style.width = Math.round(LARGURA_EMBED * escala) + 'px';
    janela.style.height = Math.round(ALTURA_EMBED * escala) + 'px';
  }

  /* roda duas vezes: ao mudar a largura do vídeo a coluna da foto muda de
     tamanho junto, então a segunda passada acerta os últimos pixels */
  function ajustarReelDuasVezes() {
    ajustarReel();
    setTimeout(ajustarReel, 120);
  }

  ajustarReelDuasVezes();
  window.addEventListener('load', ajustarReelDuasVezes);
  document.addEventListener('DOMContentLoaded', ajustarReelDuasVezes);

  var esperaResize;
  window.addEventListener('resize', function () {
    clearTimeout(esperaResize);
    esperaResize = setTimeout(ajustarReelDuasVezes, 150);
  });

  var primeiraFoto = document.querySelector('.foto-real');
  if (primeiraFoto) { primeiraFoto.addEventListener('load', ajustarReelDuasVezes); }

  /* ================================================================
     5) SETAS DO CARROSSEL DE CERTIFICADOS

     A rolagem em si é a do navegador (arrastar no celular, shift+roda
     no mouse, setas do teclado quando o trilho está focado). Estas
     duas setas existem para quem usa mouse comum, que não tem rolagem
     lateral. Sem JavaScript o carrossel continua funcionando — só as
     setas é que somem.

     Elas andam de card em card, mirando a posição exata do próximo em
     vez de somar pixels: somar brigava com o encaixe e o carrossel
     parava no meio do caminho.
     ================================================================ */
  var trilho = document.querySelector('.js-carrossel-trilho');
  var setaAntes = document.querySelector('.js-carrossel-antes');
  var setaDepois = document.querySelector('.js-carrossel-depois');

  if (trilho && setaAntes && setaDepois) {
    var FOLGA = 12;   /* o trilho tem respiro nas pontas; isto é a tolerância */

    /* Onde cada card começa, contado dentro do trilho e já descontando o
       respiro da borda — é esse número que vira destino da rolagem.
       (O scrollLeft entra SOMANDO: o que a gente vê na tela já está
       deslocado pelo tanto que o trilho rolou.) */
    function posicoesDosCards() {
      var esquerdaDoTrilho = trilho.getBoundingClientRect().left;
      var respiro = parseInt(getComputedStyle(trilho).paddingLeft, 10) || 0;
      var lista = [];
      Array.prototype.forEach.call(trilho.querySelectorAll('.certificado'), function (card) {
        var dentro = card.getBoundingClientRect().left - esquerdaDoTrilho + trilho.scrollLeft;
        lista.push(Math.round(dentro - respiro));
      });
      return lista;
    }

    function irPara(destino) {
      var limite = trilho.scrollWidth - trilho.clientWidth;
      if (destino < 0) { destino = 0; }
      if (destino > limite) { destino = limite; }
      trilho.scrollTo({ left: destino, behavior: 'smooth' });
    }

    setaDepois.addEventListener('click', function () {
      var atual = trilho.scrollLeft;
      var proxima = posicoesDosCards().filter(function (p) { return p > atual + FOLGA; })[0];
      irPara(proxima === undefined ? trilho.scrollWidth : proxima);
    });

    setaAntes.addEventListener('click', function () {
      var atual = trilho.scrollLeft;
      var anteriores = posicoesDosCards().filter(function (p) { return p < atual - FOLGA; });
      irPara(anteriores.length ? anteriores[anteriores.length - 1] : 0);
    });

    function atualizarSetas() {
      var limite = trilho.scrollWidth - trilho.clientWidth;
      setaAntes.disabled = trilho.scrollLeft <= FOLGA;
      setaDepois.disabled = trilho.scrollLeft >= limite - FOLGA;
    }

    trilho.addEventListener('scroll', atualizarSetas, { passive: true });
    window.addEventListener('resize', atualizarSetas);
    atualizarSetas();
  }

  /* ---------- 4) APARIÇÃO AO ROLAR ---------- */
  var alvosAnimados = document.querySelectorAll('.secao, .hero__texto, .hero__midia');

  if (!('IntersectionObserver' in window)) { return; }

  var observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (entrada.isIntersecting) {
        entrada.target.classList.add('esta-visivel');
        observador.unobserve(entrada.target);
      }
    });
  }, { threshold: 0.1 });

  alvosAnimados.forEach(function (elemento) {
    elemento.classList.add('aparece');
    observador.observe(elemento);
  });

})();
