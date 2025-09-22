function testarCodigo() {
  const codigo = document.getElementById("codigo").value; // Captura o código do jogador
  const resultadoDiv = document.getElementById("resultado"); // Div para exibir o resultado

  try {
    // Executa o código do jogador
    eval(codigo);

    // Testa a função criada
    if (typeof soma === "function") {
      const teste1 = soma(2, 3) === 5; // Teste 1: soma(2, 3) deve retornar 5
      const teste2 = soma(-1, 1) === 0; // Teste 2: soma(-1, 1) deve retornar 0
      const teste3 = soma(0, 0) === 0; // Teste 3: soma(0, 0) deve retornar 0

      // Verifica se todos os testes passaram
      if (teste1 && teste2 && teste3) {
        resultadoDiv.innerHTML = "<p style='color: green;'>Parabéns! Todos os testes passaram!</p>";
      } else {
        resultadoDiv.innerHTML = "<p style='color: red;'>Alguns testes falharam. Verifique sua função!</p>";
      }
    } else {
      resultadoDiv.innerHTML = "<p style='color: red;'>Você precisa criar uma função chamada soma!</p>";
    }
  } catch (error) {

    if (error.message.includes("is not defined")){
        resultadoDiv.innerHTML = `<p style= 'color: red;'>Erro: parece que você tentou usar algo que não foi definido. Verifique seu código!</p>`
    }
    else{
         // Exibe erros de sintaxe ou execução
    resultadoDiv.innerHTML = `<p style='color: red;'>Erro no código!</p>`;
  }
    }
   
}

let dicas = [
    "Dica 1: Você precisa criar uma função usando <span class=\"codigospan\">function</span> + nome da função neste caso é <span class=\"codigospan\">soma</span> + parênteses <span class=\"codigospan\">()</span> + chaves <span class=\"codigospan\">{}</span> para abrir e fechar o bloco, e colocar sua lógica dentro das chaves.",
    "Dica 2: A função deve receber dois parâmetros. Esses parâmetros vão dentro dos parênteses após o nome da função, separados por vírgula, por exemplo: <span class=\"codigospan\">(a, b)</span>.",
    "Dica 3: Em javascript não declaramos o tipo de variável dentro dos parâmetros.",
    "Dica 4: A função deve retornar a soma dos dois parâmetros. Você pode usar diretamente o return e retornar a soma dos parâmetros, por exemplo: <span class=\"codigospan\">return a + b;</span>"
];


let indiceDica = 0;

function ajudaCodigo() {
    const resultadoDiv = document.getElementById("resultado");
    
    if (indiceDica < dicas.length) {
        resultadoDiv.innerHTML = `<p style="color: yellow;">${dicas[indiceDica]}</p>`;
        indiceDica++;
    } else {
        resultadoDiv.innerHTML = `<p style="color: yellow;">Você já viu todas as dicas!</p>`;
    }
}
