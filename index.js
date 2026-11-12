// ==========================================
// 1. ESTADO E CONFIGURAÇÃO DA APLICAÇÃO
// ==========================================
const config = JSON.parse(localStorage.getItem('financas_config')) || {
    tetoMensal: 2000.00,
    gastosMesAnteriores: 0.00,
    renda: 3000.00,
    tipoPagamento: 'mensal', // 'mensal' ou 'quinzenal'
    diaPagamento: 1          // dia principal do pagamento (ex: 1, 5, 7)
};

let tarefas = JSON.parse(localStorage.getItem('financas_tarefas')) || [];
let transacoesHoje = JSON.parse(localStorage.getItem('financas_transacoes')) || [];

// Reset diário automático de gastos
const hojeISO = new Date().toISOString().slice(0, 10);
const ultimaData = localStorage.getItem('financas_data_ultima') || hojeISO;

if (ultimaData !== hojeISO) {
    const totalOntem = transacoesHoje.reduce((acc, t) => acc + t.valor, 0);
    config.gastosMesAnteriores += totalOntem;
    transacoesHoje = [];
    localStorage.setItem('financas_config', JSON.stringify(config));
    localStorage.setItem('financas_transacoes', JSON.stringify(transacoesHoje));
    localStorage.setItem('financas_data_ultima', hojeISO);
}

let categoriaSelecionada = null;
let tipoAtividadeSelecionada = 'tarefa';
let contextoSelecionado = 'Empresa';
let filtroStatusAtual = 'aberta';
let modoAgenda = 'semana';

// ==========================================
// 2. SELEÇÃO DE ELEMENTOS DO DOM
// ==========================================
const tituloPagina = document.getElementById('tituloPagina');
const elData = document.getElementById("Data");
const elsaudacao = document.getElementById("saudacao");
const elBtnConfig = document.getElementById('btnConfig');

// Botões de Navegação do Rodapé
const btnNavInicio = document.getElementById('btnNavInicio');
const btnNavTarefas = document.getElementById('btnNavTarefas');
const btnNavAgenda = document.getElementById('btnNavAgenda');
const btnNavAddAtividade = document.getElementById('btnNavAddAtividade');

// Seções/Telas
const secInicio = document.getElementById('sec-inicio');
const secTarefas = document.getElementById('sec-tarefas');
const secAgenda = document.getElementById('sec-agenda');

// Elementos da Tela de Finanças (Início)
const elValorHoje = document.querySelector('.valor-hoje');
const elBadgeStatus = document.querySelector('.badge-status');
const elValorSaldoRestanteMes = document.getElementById('elValorSaldoRestanteMes');
const elBadgeStatusRestanteMes = document.getElementById('elBadgeStatusRestanteMes');
const elInfoMes = document.querySelector('.info-mes span:last-child');
const elProgressoPreenchimento = document.querySelector('.progresso-preenchimento');
const elValorRenda = document.querySelector('.valor-renda-exibicao');
const elInputValor = document.getElementById('inputValor');
const elBtnsCategoria = document.querySelectorAll('.btn-categoria');
const elBtnSalvar = document.querySelector('.btn-salvar');
const elHistoricoLista = document.querySelector('.historico-lista');

// Modal Nova Atividade
const modalAtividade = document.getElementById('modalAtividade');
const btnFecharModal = document.getElementById('btnFecharModal');
const btnCancelarAtividade = document.getElementById('btnCancelarAtividade');
const formAtividade = document.getElementById('formAtividade');

// ==========================================
// 3. NAVEGAÇÃO ENTRE ABAS
// ==========================================
function abrirAba(aba) {
    if (secInicio) secInicio.classList.add('hidden');
    if (secTarefas) secTarefas.classList.add('hidden');
    if (secAgenda) secAgenda.classList.add('hidden');

    if (btnNavInicio) btnNavInicio.classList.remove('active');
    if (btnNavTarefas) btnNavTarefas.classList.remove('active');
    if (btnNavAgenda) btnNavAgenda.classList.remove('active');
    if (elBtnConfig) elBtnConfig.classList.remove('active');

    if (aba === 'inicio') {
        if (secInicio) secInicio.classList.remove('hidden');
        if (btnNavInicio) btnNavInicio.classList.add('active');
        if (tituloPagina) tituloPagina.textContent = 'Finanças Pessoais';
        atualizarInterfaceFinancas();
    } else if (aba === 'tarefas') {
        if (secTarefas) secTarefas.classList.remove('hidden');
        if (btnNavTarefas) btnNavTarefas.classList.add('active');
        if (tituloPagina) tituloPagina.textContent = 'Tarefas';
        renderizarTarefas();
    } else if (aba === 'agenda') {
        if (secAgenda) secAgenda.classList.remove('hidden');
        if (btnNavAgenda) btnNavAgenda.classList.add('active');
        if (tituloPagina) tituloPagina.textContent = 'Agenda';
        renderizarAgenda();
    }
}

if (btnNavInicio) btnNavInicio.addEventListener('click', () => abrirAba('inicio'));
if (btnNavTarefas) btnNavTarefas.addEventListener('click', () => abrirAba('tarefas'));
if (btnNavAgenda) btnNavAgenda.addEventListener('click', () => abrirAba('agenda'));

// ==========================================
// 4. LÓGICA DE FINANÇAS E CICLO DE PAGAMENTO
// ==========================================
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function obterDiasRestantesNoCiclo() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const ano = hoje.getFullYear();
    const mes = hoje.getMonth();
    const diaAtual = hoje.getDate();

    const tipo = config.tipoPagamento || 'mensal';
    const dia1 = parseInt(config.diaPagamento || 1, 10);

    let proximoPagamento;

    if (tipo === 'quinzenal') {
        let dia2 = dia1 + 15;
        if (dia2 > 28) dia2 = 28;

        if (diaAtual < dia1) {
            proximoPagamento = new Date(ano, mes, dia1);
        } else if (diaAtual < dia2) {
            proximoPagamento = new Date(ano, mes, dia2);
        } else {
            proximoPagamento = new Date(ano, mes + 1, dia1);
        }
    } else {
        if (diaAtual >= dia1) {
            proximoPagamento = new Date(ano, mes + 1, dia1);
        } else {
            proximoPagamento = new Date(ano, mes, dia1);
        }
    }

    const diffMilissegundos = proximoPagamento - hoje;
    const diffDias = Math.ceil(diffMilissegundos / (1000 * 60 * 60 * 24));

    return diffDias > 0 ? diffDias : 1;
}

function calcularFinancas() {
    const totalHoje = transacoesHoje.reduce((acc, t) => acc + t.valor, 0);
    const totalMes = config.gastosMesAnteriores + totalHoje;
    const saldoRestanteMes = config.tetoMensal - totalMes;
    
    const saldoMesLivreInicioHoje = config.tetoMensal - config.gastosMesAnteriores;
    const diasRestantes = obterDiasRestantesNoCiclo();
    
    const cotaDiariaHoje = Math.max(saldoMesLivreInicioHoje, 0) / diasRestantes;
    const disponivelHoje = cotaDiariaHoje - totalHoje;
    const percentualMes = Math.min((totalMes / (config.tetoMensal || 1)) * 100, 100);

    return { totalHoje, totalMes, saldoRestanteMes, disponivelHoje, percentualMes, diasRestantes };
}

function atualizarData() {
    const agora = new Date();
    const hora = agora.getHours();
    const message = agora.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    if (elData) elData.textContent = message;
    if (elsaudacao) elsaudacao.textContent = saudacao(hora);

    atualizarIndicadorNotificacao();
}

// MELHORIA: Indicador do Status de Notificações no Cabeçalho
function atualizarIndicadorNotificacao() {
    const headerRight = document.querySelector('.header-right');
    if (!headerRight) return;

    let statusNotif = '🔔 Notificações: Desativadas';
    let cor = '#9ca3af';

    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            statusNotif = '🔔 Notificações Ativas';
            cor = '#34d399';
        } else if (Notification.permission === 'denied') {
            statusNotif = '🔕 Notificações Bloqueadas';
            cor = '#f87171';
        }
    }

    headerRight.innerHTML = `
        <span style="font-size: 0.75rem; color: ${cor}; font-weight: 600; padding: 4px 8px; background: rgba(255,255,255,0.05); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); display: inline-flex; align-items: center;">
            ${statusNotif}
        </span>
    `;
}

function atualizarInterfaceFinancas() {
    const financas = calcularFinancas();

    // 1. Atualiza Disponível para Hoje
    if (elValorHoje) elValorHoje.textContent = formatarMoeda(financas.disponivelHoje);

    if (elBadgeStatus) {
        if (financas.disponivelHoje >= 0) {
            elBadgeStatus.textContent = `🟢 Meta diária (${financas.diasRestantes}d até pagamento)`;
            elBadgeStatus.style.backgroundColor = '#dcfce7';
            elBadgeStatus.style.color = '#15803d';
            if (elValorHoje) elValorHoje.style.color = '#34D399';
        } else {
            const excesso = Math.abs(financas.disponivelHoje);
            elBadgeStatus.textContent = `🔴 Ultrapassou ${formatarMoeda(excesso)}`;
            elBadgeStatus.style.backgroundColor = '#fee2e2';
            elBadgeStatus.style.color = '#dc2626';
            if (elValorHoje) elValorHoje.style.color = '#dc2626';
        }
    }

    // 2. Atualiza Saldo Restante do Mês
    if (elValorSaldoRestanteMes) elValorSaldoRestanteMes.textContent = formatarMoeda(financas.saldoRestanteMes);

    if (elBadgeStatusRestanteMes) {
        if (financas.saldoRestanteMes >= 0) {
            elBadgeStatusRestanteMes.textContent = '🟢 Restante livre';
            elBadgeStatusRestanteMes.style.backgroundColor = '#dcfce7';
            elBadgeStatusRestanteMes.style.color = '#15803d';
            if (elValorSaldoRestanteMes) elValorSaldoRestanteMes.style.color = '#34D399';
        } else {
            const excessoMes = Math.abs(financas.saldoRestanteMes);
            elBadgeStatusRestanteMes.textContent = `🔴 Ultrapassou ${formatarMoeda(excessoMes)}`;
            elBadgeStatusRestanteMes.style.backgroundColor = '#fee2e2';
            elBadgeStatusRestanteMes.style.color = '#dc2626';
            if (elValorSaldoRestanteMes) elValorSaldoRestanteMes.style.color = '#dc2626';
        }
    }

    // 3. Resumo do Mês e Renda
    if (elInfoMes) elInfoMes.textContent = `${formatarMoeda(financas.totalMes)} / ${formatarMoeda(config.tetoMensal)}`;
    if (elProgressoPreenchimento) {
        elProgressoPreenchimento.style.width = `${financas.percentualMes}%`;
        if (financas.totalMes > config.tetoMensal) {
            elProgressoPreenchimento.style.background = 'var(--cor-perigo)';
        } else {
            elProgressoPreenchimento.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)';
        }
    }

    if (elValorRenda) elValorRenda.textContent = formatarMoeda(config.renda || 0);

    renderizarHistoricoFinancas();
    renderizarDistribuicaoCategorias();
}

// MELHORIA: Distribuição Visual de Gastos de Hoje por Categoria
function renderizarDistribuicaoCategorias() {
    let elContainerCategorias = document.getElementById('distribuicaoCategorias');
    const cardMes = document.querySelector('.card-mes');
    
    if (!cardMes) return;

    if (!elContainerCategorias) {
        elContainerCategorias = document.createElement('div');
        elContainerCategorias.id = 'distribuicaoCategorias';
        elContainerCategorias.style.marginTop = '12px';
        elContainerCategorias.style.paddingTop = '10px';
        elContainerCategorias.style.borderTop = '1px solid rgba(255,255,255,0.08)';
        cardMes.appendChild(elContainerCategorias);
    }

    if (transacoesHoje.length === 0) {
        elContainerCategorias.innerHTML = '<div style="font-size: 0.75rem; color: var(--cor-gray);">Sem gastos registrados hoje.</div>';
        return;
    }

    const totaisPorCat = {};
    let total = 0;
    transacoesHoje.forEach(t => {
        totaisPorCat[t.categoria] = (totaisPorCat[t.categoria] || 0) + t.valor;
        total += t.valor;
    });

    let html = '<div style="font-size: 0.75rem; color: var(--cor-gray); font-weight: 700; margin-bottom: 6px;">HOJE POR CATEGORIA:</div><div style="display: flex; flex-wrap: wrap; gap: 6px;">';
    for (const [cat, val] of Object.entries(totaisPorCat)) {
        const pct = Math.round((val / total) * 100);
        html += `<span style="font-size: 0.75rem; background: rgba(52, 211, 153, 0.12); color: #34d399; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(52, 211, 153, 0.2);">${cat}: ${formatarMoeda(val)} (${pct}%)</span>`;
    }
    html += '</div>';
    elContainerCategorias.innerHTML = html;
}

function renderizarHistoricoFinancas() {
    if (!elHistoricoLista) return;
    elHistoricoLista.innerHTML = '';

    if (transacoesHoje.length === 0) {
        elHistoricoLista.innerHTML = '<div style="text-align: center; color: var(--cor-gray); padding: 12px; font-size: 0.85rem;">Nenhum gasto registrado hoje.</div>';
        return;
    }

    [...transacoesHoje].reverse().forEach(item => {
        const divItem = document.createElement('div');
        divItem.className = 'item-historico';
        divItem.innerHTML = `
            <span class="descricao">${item.categoria}</span>
            <div class="item-historico-acoes">
                <span class="valor">- ${formatarMoeda(item.valor)}</span>
                <button class="btn-deletar" title="Excluir" onclick="deletarTransacao(${item.id})">🗑️</button>
            </div>
        `;
        elHistoricoLista.appendChild(divItem);
    });
}

function deletarTransacao(id) {
    transacoesHoje = transacoesHoje.filter(t => t.id !== id);
    localStorage.setItem('financas_transacoes', JSON.stringify(transacoesHoje));
    atualizarInterfaceFinancas();
}

// MELHORIA: Destaque Visual com Animação na Categoria Selecionada
elBtnsCategoria.forEach(btn => {
    btn.addEventListener('click', () => {
        elBtnsCategoria.forEach(b => {
            b.style.borderColor = 'var(--cor-borda)';
            b.style.backgroundColor = 'var(--cor-fundo-navy)';
            b.style.boxShadow = 'none';
            b.style.transform = 'scale(1)';
            b.textContent = b.textContent.replace(' ✓', '');
        });

        btn.style.borderColor = '#34d399';
        btn.style.backgroundColor = '#162e3b';
        btn.style.boxShadow = '0 0 10px rgba(52, 211, 153, 0.3)';
        btn.style.transform = 'scale(1.03)';
        
        let texto = btn.textContent.trim();
        if (!texto.endsWith('✓')) {
            btn.textContent = texto + ' ✓';
        }

        categoriaSelecionada = texto.replace(' ✓', '');
    });
});

if (elBtnSalvar) {
    elBtnSalvar.addEventListener('click', () => {
        if (!elInputValor) return;
        const valorTratado = elInputValor.value.replace(',', '.');
        const valorDigitado = parseFloat(valorTratado);

        if (isNaN(valorDigitado) || valorDigitado <= 0) {
            alert('Por favor, insira um valor válido maior que zero.');
            return;
        }

        if (!categoriaSelecionada) {
            alert('Por favor, selecione uma categoria.');
            return;
        }

        const novaTransacao = {
            id: Date.now(),
            categoria: categoriaSelecionada,
            valor: valorDigitado
        };

        transacoesHoje.push(novaTransacao);
        localStorage.setItem('financas_transacoes', JSON.stringify(transacoesHoje));

        elInputValor.value = '';
        categoriaSelecionada = null;
        elBtnsCategoria.forEach(b => {
            b.style.borderColor = 'var(--cor-borda)';
            b.style.backgroundColor = 'var(--cor-fundo-navy)';
            b.style.boxShadow = 'none';
            b.style.transform = 'scale(1)';
            b.textContent = b.textContent.replace(' ✓', '');
        });

        atualizarInterfaceFinancas();
    });
}

// MELHORIA: Modal de Ajustes Customizado (Substituindo caixas prompt) + Backup JSON
function criarModalConfigSeNaoExistir() {
    let modalConfig = document.getElementById('modalConfig');
    if (modalConfig) return modalConfig;

    modalConfig = document.createElement('div');
    modalConfig.id = 'modalConfig';
    modalConfig.className = 'modal-overlay hidden';
    modalConfig.innerHTML = `
        <div class="modal-card" style="max-width: 440px;">
            <div class="modal-header">
                <h2>⚙️ Ajustes do App</h2>
                <button type="button" id="btnFecharModalConfig" class="btn-close">&times;</button>
            </div>
            <form id="formConfig" style="display: flex; flex-direction: column; gap: 14px;">
                <div class="form-group">
                    <label for="cfgRenda">Renda Mensal (R$)</label>
                    <input type="number" step="0.5" id="cfgRenda" required>
                </div>
                <div class="form-group">
                    <label for="cfgTeto">Teto Mensal de Gastos (R$)</label>
                    <input type="number" step="0.5" id="cfgTeto" required>
                </div>
                <div class="form-group">
                    <label for="cfgGastosAnt">Gastos efetuados neste ciclo até ontem (R$)</label>
                    <input type="number" step="0.5" id="cfgGastosAnt" required>
                </div>
                <div class="form-group">
                    <label for="cfgTipoPag">Frequência de Pagamento</label>
                    <select id="cfgTipoPag" style="width: 100%; padding: 10px; background: var(--cor-fundo-navy); color: #fff; border: 1px solid var(--cor-borda); border-radius: 8px;">
                        <option value="mensal">Mensal (1 vez por mês)</option>
                        <option value="quinzenal">Quinzenal (A cada 15 dias)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="cfgDiaPag">Dia do Pagamento (Mês)</label>
                    <input type="number" min="1" max="31" id="cfgDiaPag" required>
                </div>

                <div style="display: flex; gap: 10px; margin-top: 6px;">
                    <button type="button" id="btnExportarDados" class="btn-secundario" style="flex: 1; font-size: 0.8rem;">📥 Baixar Backup</button>
                    <button type="button" id="btnImportarDados" class="btn-secundario" style="flex: 1; font-size: 0.8rem;">📤 Carregar Backup</button>
                    <input type="file" id="inputImportarBackup" accept=".json" style="display: none;">
                </div>

                <div class="modal-footer" style="margin-top: 10px;">
                    <button type="button" id="btnCancelarConfig" class="btn-secundario">Cancelar</button>
                    <button type="submit" class="btn-principal">Salvar Ajustes</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modalConfig);

    document.getElementById('btnFecharModalConfig').onclick = fecharModalConfig;
    document.getElementById('btnCancelarConfig').onclick = fecharModalConfig;
    
    document.getElementById('formConfig').onsubmit = (e) => {
        e.preventDefault();
        config.renda = parseFloat(document.getElementById('cfgRenda').value) || 0;
        config.tetoMensal = parseFloat(document.getElementById('cfgTeto').value) || 0;
        config.gastosMesAnteriores = parseFloat(document.getElementById('cfgGastosAnt').value) || 0;
        config.tipoPagamento = document.getElementById('cfgTipoPag').value;
        config.diaPagamento = parseInt(document.getElementById('cfgDiaPag').value, 10) || 1;

        localStorage.setItem('financas_config', JSON.stringify(config));
        fecharModalConfig();
        atualizarInterfaceFinancas();
    };

    document.getElementById('btnExportarDados').onclick = exportarDadosBackup;
    document.getElementById('btnImportarDados').onclick = () => document.getElementById('inputImportarBackup').click();
    document.getElementById('inputImportarBackup').onchange = importarDadosBackup;

    return modalConfig;
}

function abrirModalConfig() {
    const modalConfig = criarModalConfigSeNaoExistir();
    document.getElementById('cfgRenda').value = config.renda || 0;
    document.getElementById('cfgTeto').value = config.tetoMensal || 0;
    document.getElementById('cfgGastosAnt').value = config.gastosMesAnteriores || 0;
    document.getElementById('cfgTipoPag').value = config.tipoPagamento || 'mensal';
    document.getElementById('cfgDiaPag').value = config.diaPagamento || 1;
    modalConfig.classList.remove('hidden');
}

function fecharModalConfig() {
    const modalConfig = document.getElementById('modalConfig');
    if (modalConfig) modalConfig.classList.add('hidden');
}

function exportarDadosBackup() {
    const dadosBackup = {
        config,
        tarefas,
        transacoesHoje,
        dataBackup: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(dadosBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_financas_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importarDadosBackup(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const dados = JSON.parse(event.target.result);
            if (dados.config && dados.tarefas && dados.transacoesHoje) {
                Object.assign(config, dados.config);
                tarefas = dados.tarefas;
                transacoesHoje = dados.transacoesHoje;

                localStorage.setItem('financas_config', JSON.stringify(config));
                localStorage.setItem('financas_tarefas', JSON.stringify(tarefas));
                localStorage.setItem('financas_transacoes', JSON.stringify(transacoesHoje));

                alert('Backup importado com sucesso!');
                fecharModalConfig();
                atualizarInterfaceFinancas();
                renderizarTarefas();
                renderizarAgenda();
            } else {
                alert('Arquivo de backup inválido.');
            }
        } catch (err) {
            alert('Erro ao ler o arquivo de backup.');
        }
    };
    reader.readAsText(file);
}

if (elBtnConfig) {
    elBtnConfig.addEventListener('click', abrirModalConfig);
}

// ==========================================
// 5. RENDERING E CRIAÇÃO DE TAREFAS E AGENDA
// ==========================================

function filtrarTarefas(status) {
    filtroStatusAtual = status;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        const texto = btn.textContent.trim().toLowerCase();
        if (
            (status === 'aberta' && (texto === 'abertas' || texto === 'aberta')) ||
            (status === 'concluida' && (texto === 'concluídas' || texto === 'concluidas' || texto === 'concluída')) ||
            (status === 'cancelada' && (texto === 'canceladas' || texto === 'cancelada'))
        ) {
            btn.classList.add('active');
        }
    });

    renderizarTarefas();
}

function alterarStatusTarefa(id, novoStatus) {
    const tarefa = tarefas.find(t => t.id === id);
    if (tarefa) {
        tarefa.status = novoStatus;
        localStorage.setItem('financas_tarefas', JSON.stringify(tarefas));
        renderizarTarefas();
        renderizarAgenda();
    }
}

function excluirTarefa(id) {
    tarefas = tarefas.filter(t => t.id !== id);
    localStorage.setItem('financas_tarefas', JSON.stringify(tarefas));
    renderizarTarefas();
    renderizarAgenda();
}

function renderizarTarefas() {
    const listaTarefasEl = document.getElementById('listaTarefas');
    if (!listaTarefasEl) return;
    listaTarefasEl.innerHTML = '';

    const tarefasFiltradas = tarefas.filter(t => (t.status || 'aberta') === filtroStatusAtual);

    if (tarefasFiltradas.length === 0) {
        listaTarefasEl.innerHTML = `
            <div style="text-align: center; color: var(--cor-gray); padding: 40px 10px;">
                <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 6px;">Nenhuma tarefa (${filtroStatusAtual})</p>
                <p style="font-size: 0.85rem;">Use o botão <strong>+</strong> para criar uma tarefa</p>
            </div>
        `;
        return;
    }

    tarefasFiltradas.forEach(t => {
        const statusAtual = t.status || 'aberta';
        const item = document.createElement('div');
        item.className = 'item-tarefa-card';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';

        item.innerHTML = `
            <div>
                <strong style="font-size: 1rem; color: #ffffff; ${statusAtual === 'concluida' ? 'text-decoration: line-through; opacity: 0.7;' : ''}">${t.titulo}</strong>
                <div style="font-size: 0.8rem; color: var(--cor-gray); margin-top: 4px;">
                    ${t.vencimento ? '📅 ' + t.vencimento : ''} ${t.horario ? '⏰ ' + t.horario : ''}
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="tag-contexto-badge">• ${t.contexto}</span>
                <div class="acoes-tarefa" style="display: flex; gap: 6px;">
                    ${statusAtual === 'aberta' ? `
                        <button title="Concluir" onclick="alterarStatusTarefa(${t.id}, 'concluida')" style="background: none; border: none; cursor: pointer; font-size: 1.1rem;">✅</button>
                        <button title="Cancelar" onclick="alterarStatusTarefa(${t.id}, 'cancelada')" style="background: none; border: none; cursor: pointer; font-size: 1.1rem;">🚫</button>
                    ` : `
                        <button title="Reabrir" onclick="alterarStatusTarefa(${t.id}, 'aberta')" style="background: none; border: none; cursor: pointer; font-size: 1.1rem;">🔄</button>
                    `}
                    <button title="Excluir" onclick="excluirTarefa(${t.id})" style="background: none; border: none; cursor: pointer; font-size: 1.1rem;">🗑️</button>
                </div>
            </div>
        `;
        listaTarefasEl.appendChild(item);
    });
}

function alterarModoAgenda(modo) {
    modoAgenda = modo;

    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.classList.remove('active');
        const texto = btn.textContent.trim().toLowerCase();
        if (texto === modo) {
            btn.classList.add('active');
        }
    });

    renderizarAgenda();
}

function obterDiasDaSemanaAtual() {
    const hoje = new Date();
    const diaDaSemana = hoje.getDay();
    const primeiroDia = new Date(hoje);
    
    const diff = hoje.getDate() - diaDaSemana + (diaDaSemana === 0 ? -6 : 1);
    primeiroDia.setDate(diff);

    const dias = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(primeiroDia);
        d.setDate(primeiroDia.getDate() + i);
        dias.push(d);
    }
    return dias;
}

// MELHORIA: Clique Direto na Linha de Horário da Agenda preenche data/hora no modal
function renderizarAgenda() {
    const elDiasHeader = document.getElementById('agendaDiasHeader');
    const elGrelhaHorarios = document.getElementById('agendaGrelha');
    
    const hoje = new Date();
    const hojeISO = hoje.toISOString().slice(0, 10);
    const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    let diasExibicao = [];
    if (modoAgenda === 'dia') {
        diasExibicao = [hoje];
    } else if (modoAgenda === 'mes') {
        const ano = hoje.getFullYear();
        const mes = hoje.getMonth();
        const totalDias = new Date(ano, mes + 1, 0).getDate();
        for (let i = 1; i <= totalDias; i++) {
            diasExibicao.push(new Date(ano, mes, i));
        }
    } else {
        diasExibicao = obterDiasDaSemanaAtual();
    }

    if (elDiasHeader) {
        elDiasHeader.style.overflowX = modoAgenda === 'mes' ? 'auto' : 'visible';

        elDiasHeader.innerHTML = diasExibicao.map(d => {
            const dataISO = d.toISOString().slice(0, 10);
            const diaNum = d.getDate();
            const diaNome = nomesDias[d.getDay()];
            const isHoje = dataISO === hojeISO;

            return `
                <div class="col-dia-header ${isHoje ? 'hoje' : ''}" style="min-width: 36px;">
                    <small>${diaNome}</small>
                    <span class="badge-dia ${isHoje ? 'active' : ''}">${diaNum}</span>
                </div>
            `;
        }).join('');
    }

    if (elGrelhaHorarios) {
        let htmlGrelha = '';
        for (let h = 7; h <= 22; h++) {
            const horaFormatada = String(h).padStart(2, '0') + ':00';
            
            const tarefasNestaHora = tarefas.filter(t => {
                if (!t.horario) return false;
                const horaTarefa = parseInt(t.horario.split(':')[0], 10);
                return horaTarefa === h;
            });

            htmlGrelha += `
                <div class="linha-horario" onclick="clicarHorarioAgenda('${hojeISO}', '${horaFormatada}')" style="cursor: pointer;" title="Clique para adicionar tarefa neste horário">
                    <span class="hora-label">${horaFormatada}</span>
                    <div class="slots-horario">
                        ${tarefasNestaHora.length > 0 ? tarefasNestaHora.map(t => `
                            <div class="evento-card-agenda">
                                📌 <strong>${t.titulo}</strong> (${t.contexto})
                            </div>
                        `).join('') : '<span style="font-size: 0.7rem; color: rgba(255,255,255,0.15); display: inline-block; padding-top: 4px;">+ Adicionar</span>'}
                    </div>
                </div>
            `;
        }
        elGrelhaHorarios.innerHTML = htmlGrelha;
    }
}

function clicarHorarioAgenda(dataISO, horaFormatada) {
    abrirModalAtividade();
    const inputData = document.getElementById('atividadeData');
    const inputHora = document.getElementById('atividadeHora');
    if (inputData) inputData.value = dataISO;
    if (inputHora) inputHora.value = horaFormatada;
}

// Modal de Criar Atividade
function abrirModalAtividade() {
    if (modalAtividade) modalAtividade.classList.remove('hidden');
}

function fecharModalAtividade() {
    if (modalAtividade) modalAtividade.classList.add('hidden');
    if (formAtividade) formAtividade.reset();
}

if (btnNavAddAtividade) btnNavAddAtividade.addEventListener('click', abrirModalAtividade);
if (btnFecharModal) btnFecharModal.addEventListener('click', fecharModalAtividade);
if (btnCancelarAtividade) btnCancelarAtividade.addEventListener('click', fecharModalAtividade);

document.querySelectorAll('.btn-tipo').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.btn-tipo').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        tipoAtividadeSelecionada = e.target.dataset.tipo;
    });
});

document.querySelectorAll('.tag-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
        document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        contextoSelecionado = e.target.dataset.val;
    });
});

if (formAtividade) {
    formAtividade.addEventListener('submit', (e) => {
        e.preventDefault();

        const novaAtividade = {
            id: Date.now(),
            tipo: tipoAtividadeSelecionada,
            titulo: document.getElementById('atividadeTitulo')?.value || '',
            vencimento: document.getElementById('atividadeData')?.value || null,
            horario: document.getElementById('atividadeHora')?.value || null,
            contexto: contextoSelecionado,
            status: 'aberta'
        };

        tarefas.push(novaAtividade);
        localStorage.setItem('financas_tarefas', JSON.stringify(tarefas));

        fecharModalAtividade();
        renderizarTarefas();
        renderizarAgenda();
    });
}

function saudacao(hora){
    if(hora>=5 && hora<12){
        return "Bom dia, meu amor❤️";
    } else if(hora >= 12 && hora < 18){
        return "Boa tarde, minha princesa❤️";
    } else{
        return "Boa noite, meu neném❤️";
    }
}

// Vincula o clique nos botões de filtro da aba Tarefas ("Abertas", "Concluídas", "Canceladas")
document.addEventListener('click', (e) => {
    const target = e.target.closest('button, .tab-btn, .btn-filtro, .aba-filtro');
    if (!target) return;
    
    const texto = target.textContent.trim().toLowerCase();
    if (texto === 'abertas' || texto === 'aberta') {
        filtrarTarefas('aberta');
    } else if (texto === 'concluídas' || texto === 'concluidas' || texto === 'concluída') {
        filtrarTarefas('concluida');
    } else if (texto === 'canceladas' || texto === 'cancelada') {
        filtrarTarefas('cancelada');
    }
});

// ==========================================
// 6. INICIALIZAÇÃO DA PÁGINA
// ==========================================
atualizarData();
setInterval(atualizarData, 1000);
abrirAba('inicio');

// ==========================================
// 7. REGISTRO DE SERVICE WORKER E NOTIFICAÇÕES PUSH
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registado com sucesso:', registration.scope);
            })
            .catch(error => {
                console.error('Falha ao registrar Service Worker:', error);
            });
    });
}

function solicitarPermissaoNotificacao() {
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Permissão para notificações concedida!');
            }
            atualizarIndicadorNotificacao();
        });
    }
}

document.addEventListener('click', solicitarPermissaoNotificacao, { once: true });