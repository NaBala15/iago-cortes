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
     ================================================================ */
  var formAgendar = document.querySelector('.js-form-agendar');

  if (formAgendar) {
    var campoDia = formAgendar.querySelector('#ag-dia');
    var aviso = formAgendar.querySelector('.js-form-erro');

    /* não deixa escolher um dia que já passou */
    if (campoDia) {
      var hoje = new Date();
      var mes = String(hoje.getMonth() + 1).padStart(2, '0');
      var dia = String(hoje.getDate()).padStart(2, '0');
      campoDia.min = hoje.getFullYear() + '-' + mes + '-' + dia;
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
      var hora = formAgendar.querySelector('#ag-hora').value;
      var obs = formAgendar.querySelector('#ag-obs').value.trim();

      if (!nome)    { mostrarAviso('Escreve seu nome pra eu saber com quem falo.'); formAgendar.querySelector('#ag-nome').focus(); return; }
      if (!servico) { mostrarAviso('Escolhe o serviço que você quer fazer.'); formAgendar.querySelector('#ag-servico').focus(); return; }
      if (!data)    { mostrarAviso('Escolhe o dia do agendamento.'); campoDia.focus(); return; }
      if (!hora)    { mostrarAviso('Escolhe o horário do agendamento.'); formAgendar.querySelector('#ag-hora').focus(); return; }

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
