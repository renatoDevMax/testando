document.addEventListener('DOMContentLoaded', function () {
  console.log('Script de grupos carregado');

  // Referências aos elementos
  const gruposWhatsappBtn = document.querySelector(
    '.nav-button:has(i.fa-users)',
  );
  const gruposWhatsappPanel = document.getElementById('grupos-panel');

  console.log('Botão de grupos:', gruposWhatsappBtn);
  console.log('Painel de grupos:', gruposWhatsappPanel);

  // Estado do painel
  let isPanelVisible = false;

  // Função para carregar grupos
  async function carregarGrupos() {
    console.log('Iniciando carregamento de grupos');
    const gruposListaContainer = document.getElementById(
      'grupos-lista-container',
    );
    const gruposLista = document.getElementById('grupos-lista');
    const carregandoStatus = document.getElementById('carregando-grupos');
    const erroStatus = document.getElementById('erro-grupos');

    // Mostrar status de carregamento
    carregandoStatus.style.display = 'flex';
    gruposListaContainer.style.display = 'none';
    erroStatus.style.display = 'none';

    try {
      console.log('Fazendo requisição para /whatsapp/grupos');
      const response = await fetch('/whatsapp/grupos');
      const data = await response.json();
      console.log('Dados recebidos:', data);

      // Limpar a lista atual
      gruposLista.innerHTML = '';

      // Renderiza a lista de grupos
      if (data.grupos && data.grupos.length > 0) {
        data.grupos.forEach((grupo) => {
          const grupoItem = document.createElement('div');
          grupoItem.className = 'grupo-item';
          grupoItem.textContent = `ID: ${grupo.id}, Nome: ${grupo.nome}`;
          gruposLista.appendChild(grupoItem);
        });
      } else {
        const mensagem = document.createElement('p');
        mensagem.className = 'mensagem-sem-grupos';
        mensagem.textContent = 'Nenhum grupo disponível.';
        gruposLista.appendChild(mensagem);
      }

      // Mostrar a lista de grupos
      carregandoStatus.style.display = 'none';
      gruposListaContainer.style.display = 'block';
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      carregandoStatus.style.display = 'none';
      erroStatus.style.display = 'block';
    }
  }

  // Adiciona o evento de clique ao botão do menu
  if (gruposWhatsappBtn) {
    gruposWhatsappBtn.addEventListener('click', function () {
      console.log('Botão de grupos clicado');
      const mainContent = document.querySelector('.main-content');
      console.log('Main content:', mainContent);

      if (!isPanelVisible) {
        // Limpar o conteúdo principal e mostrar o painel
        Array.from(mainContent.children).forEach((child) => {
          if (child !== gruposWhatsappPanel) {
            child.style.display = 'none';
          }
        });

        // Se o painel não foi adicionado ainda, adicione-o
        if (!gruposWhatsappPanel.parentNode) {
          mainContent.appendChild(gruposWhatsappPanel);
        }

        gruposWhatsappPanel.style.display = 'block';

        // Carregar os grupos
        carregarGrupos();

        isPanelVisible = true;
      } else {
        // Ocultar o painel
        gruposWhatsappPanel.style.display = 'none';
        isPanelVisible = false;
      }
    });
  } else {
    console.error('Botão de grupos não encontrado!');
  }
});
