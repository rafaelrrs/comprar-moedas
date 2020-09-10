<template>
  <div id="app">
    <h1>Compras</h1>
    <div class="menu">
      <el-button @click="tela = 'comprar'">comprar</el-button>
      <el-button @click="tela = 'historico'">historico</el-button>
      <el-button @click="tela = 'relatorio'">relatorio</el-button>
    </div>

    <el-form ref="form" :inline="true" :rules="regras" :model="registro" v-if="tela === 'comprar'">
      <el-form-item label="Quantidade" prop="quantidade">
        <el-input-number v-model.number="registro.quantidade">
        </el-input-number>
      </el-form-item>
      <el-form-item prop="moeda" label="Moeda">
        <el-select v-model="registro.moeda" placeholder="escolha">
          <el-option label="Dolares" value="USD"></el-option>
          <el-option label="Euros" value="EUR"></el-option>
          <el-option label="Libras" value="GBP"></el-option>
          <el-option label="Dolar Canadense" value="CAD"></el-option>
          <el-option label="Rubias" value="RUB"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="Data" prop="dia">
        <el-date-picker type="date" placeholder="da compra" v-model="registro.dia"></el-date-picker>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="adicionar">Adicionar</el-button>
      </el-form-item>
    </el-form>

    <el-table :data="compras" style="width: 100%" :default-sort="{prop: 'dia', order: 'descending'}"
              v-if="tela === 'historico'">
      <el-table-column label="Quantidade">
        <template slot-scope="scope">
          {{ formatar(scope.row.quantidade, scope.row.moeda) }}
        </template>
      </el-table-column>
      <el-table-column prop="moeda" label="Moeda"></el-table-column>
      <el-table-column prop="dia" label="Data da Compras"></el-table-column>
      <el-table-column prop="cotacaoCompra" label="Valor na Compra">
        <template slot-scope="scope">
          {{ formatar(scope.row.cotacaoCompra, 'BRL') }}
        </template>
      </el-table-column>
      <el-table-column prop="percHoje" label="% Hoje">
        <template slot-scope="scope">
          {{ formatar(scope.row.percHoje) }} %
        </template>
      </el-table-column>
      <el-table-column label="Valor de Hoje">
        <template slot-scope="scope">
          {{ formatar(scope.row.valorHoje, 'BRL') }}
        </template>
      </el-table-column>
      <el-table-column
          label="Remover">
        <template slot-scope="scope">
          <el-button @click="remover(scope.$index)" type="text" size="small">remover</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div v-if="tela === 'relatorio'">
      <h1>Relatorio</h1>
      <el-row :gutter="12">
        <el-col :span="8" v-for="moeda in somatorio" :key="moeda.moeda" :offset="index > 0 ? 2 : 0">
          <el-card shadow="hover">
            <h4 slot="header" class="clearfix">
              {{ moeda.moeda }}
            </h4>
            <p>
              Soma: {{ formatar(moeda.soma, 'BRL') }}<br>
              Cotação: {{ formatar(moeda.cotacao, 'BRL') }}
            </p>
          </el-card>
        </el-col>
      </el-row>
      <h1>Riquezas</h1>
      <h2>{{ formatar(this.riqueza, 'BRL') }} </h2>
    </div>
  </div>
</template>

<script>

export default {
  name: 'app',
  data() {
    return {
      tela: 'lista',
      registro: {},
      compras: [],
      cotacoesHoje: {},
      regras: {
        quantidade: [
          {required: true, type: 'number', message: 'Preencher', trigger: 'blur'},
        ],
        dia: [
          {type: 'date', required: true, message: 'Preencher', trigger: 'blur'}
        ],
        moeda: [
          {required: true, message: 'Preencher', trigger: 'change'}
        ]
      }
    }
  },
  computed: {
    somatorio() {
      let moedas = {}
      for (let compra of this.compras) {
        if (!moedas[compra.moeda]) {
          moedas[compra.moeda] = {moeda: compra.moeda, soma: 0, cotacao: this.cotacoesHoje[compra.moeda]}
        }
        moedas[compra.moeda].soma += compra.valorHoje
      }
      let m = Object.values(moedas)
      m.sort((i, j) => i.soma - j.soma)
      return m
    },
    riqueza() {
      let total = 0
      for (let compra of this.compras) {
        total += compra.valorHoje
      }
      return this.formatar(total, 'BRL')
    }
  },
  methods: {
    remover(indice) {
      this.compras.splice(indice, 1)
      this.salvar()
    },
    async adicionar() {

      this.$refs.form.validate(async (valid) => {
        if (valid) {
          let compra_carregada = await this.calcularCompra(this.registro)
          let compra_processada = await this.obterCotacao(compra_carregada)
          this.compras.push(compra_processada)
          this.registro = {}
          this.$refs.form.resetFields()
          this.salvar()
        }
      })
    },
    async calcularCompra(compra) {
      let params = {
        base: compra.moeda,
        symbols: 'BRL'
      }
      let dia = compra.dia.toISOString().substring(0, 10)
      let url = `https://api.exchangeratesapi.io/${dia}/?` + new URLSearchParams(params)
      let options = {mode: 'cors', cache: 'force-cache'}
      let dados = await fetch(url, options).then(res => (res.json()))
      let cotacaoCompra = dados.rates[params.symbols]
      return {...compra, dia, cotacaoCompra}
    },
    async obterCotacao(compra) {
      if (!this.cotacoesHoje[compra.moeda]) {
        let params = {
          base: compra.moeda,
          symbols: 'BRL'
        }
        let url = `https://api.exchangeratesapi.io/latest/?` + new URLSearchParams(params)
        let options = {mode: 'cors', cache: 'force-cache'}
        let dados = await fetch(url, options).then(res => (res.json()))
        this.cotacoesHoje[compra.moeda] = dados.rates[params.symbols]
        console.log(this.cotacoesHoje)
      }

      let valorHoje = (compra.quantidade * this.cotacoesHoje[compra.moeda])
      let percHoje = (this.cotacoesHoje[compra.moeda] / compra.cotacaoCompra) * 100

      return {...compra, percHoje, valorHoje}

    },
    salvar() {
      let lista = this.compras.map(c => {
        let {quantidade, moeda, dia, cotacaoCompra} = c
        return {quantidade, moeda, dia, cotacaoCompra}
      })
      let dados = JSON.stringify(lista)
      window.localStorage.setItem('compras', dados)
    },

    formatar(valor, moeda) {
      if (moeda) {
        return valor.toLocaleString('pt-BR', {style: 'currency', currency: moeda})
      }
      return valor.toLocaleString('pt-BR')
    },
  },
  async beforeMount() {
    let armazenado = window.localStorage.getItem('compras')
    if (!armazenado) {
      return
    }
    let dados = JSON.parse(armazenado)
    for (let item of dados) {
      let compra = await this.obterCotacao(item)
      this.compras.push(compra)
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
.menu{
  margin: 20px 0;
}
</style>
