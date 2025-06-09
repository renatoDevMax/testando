document.addEventListener('DOMContentLoaded', function () {
  // Referências aos elementos
  const mensagemVendaBtn = document.querySelector(
    '.nav-button:has(i.fa-bullhorn)',
  );
  const mensagemVendaPanel = document.getElementById('mensagem-venda-panel');

  // Estado do painel
  let isPanelVisible = false;

  // Função para enviar mensagem
  async function enviarMensagemVenda(event) {
    event.preventDefault();

    const mensagemTextarea = document.getElementById('mensagem-venda-textarea');
    const statusMensagem = document.getElementById('status-mensagem-venda');

    // Validação básica
    if (!mensagemTextarea.value) {
      statusMensagem.textContent = 'Por favor, digite uma mensagem.';
      statusMensagem.className = 'erro';
      return;
    }

    try {
      statusMensagem.textContent = 'Enviando mensagem...';
      statusMensagem.className = '';

      const response = await fetch('/whatsapp/mensagemVenda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mensagem: mensagemTextarea.value,
        }),
      });

      const resultado = await response.json();

      if (resultado.mensagemEnviada) {
        statusMensagem.textContent = 'Mensagem enviada com sucesso!';
        statusMensagem.className = 'sucesso';
        mensagemTextarea.value = ''; // Limpa o textarea após o envio
      } else {
        statusMensagem.textContent =
          'Falha ao enviar mensagem. Verifique se o WhatsApp está autenticado.';
        statusMensagem.className = 'erro';
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      statusMensagem.textContent = 'Erro ao enviar mensagem. Tente novamente.';
      statusMensagem.className = 'erro';
    }
  }

  // Adiciona o evento de clique ao botão do menu
  if (mensagemVendaBtn) {
    mensagemVendaBtn.addEventListener('click', function () {
      const mainContent = document.querySelector('.main-content');

      if (!isPanelVisible) {
        // Limpar o conteúdo principal e mostrar o painel
        Array.from(mainContent.children).forEach((child) => {
          if (child !== mensagemVendaPanel) {
            child.style.display = 'none';
          }
        });

        // Se o painel não foi adicionado ainda, adicione-o
        if (!mensagemVendaPanel.parentNode) {
          mainContent.appendChild(mensagemVendaPanel);
        }

        mensagemVendaPanel.style.display = 'block';
        isPanelVisible = true;
      } else {
        // Ocultar o painel
        mensagemVendaPanel.style.display = 'none';
        isPanelVisible = false;
      }
    });
  }

  // Adiciona evento de submit ao formulário
  const mensagemVendaForm = document.getElementById('mensagem-venda-form');
  if (mensagemVendaForm) {
    mensagemVendaForm.addEventListener('submit', enviarMensagemVenda);
  }
});
