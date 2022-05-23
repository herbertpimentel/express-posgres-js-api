import { db } from '../lib/database/dbhelper';

class AuthService {
  async login(user, password) {
    // validar usuario e senha
    if (user !== 'admin' || password !== 'admin') {
      throw new Error('usuário o senha incorreto');
    }

    // registrar sessao de usuario

    // pegar o id da sessao registrada
    const sessaoId = 1;

    // gera o token baseado do id da sessao registrado
    return sign(sessaoId);
  }

  async me(sessionId) {
    // vai no banco e recupera os dados do usuario
    // baseado no ID da sessao
    if (sessionId === 1) {
      return { user: 'admin' };
    }
  }

  async listarUsuariosPorNome(nome) {
    // o que vc precisa se ligar aqui é que inves de : para o parametro usa-se $

    // dentro do dbhelper vc tem:

    // beginTransaction
    // commitTransaction
    // rollbackTransaction
    // find: returns array of objects []
    // findValue: returns only the value ex: select count(*) pessoas... returns 91501
    // findOne: return one {}
    // save ex: save('pessoas', { nome: 'herbert' })
    // update ex: update('pessoas', { nome: 'nome modificado' }, 1)
    // delete ex: delete('pessoas', 1)

    // as duas maneiras funcionam: usando command ou usando direto o db-helper

    // const cmd = dbhelper.createCommand();
    // cmd.add("select * from pessoas where nome ilike $nome");
    // cmd.param("nome", "herbert%");

    // const resultado = await dbhelper.find(cmd);

    const resultado = await db.find(
      'select * from pessoas where nome ilike $nome',
      {
        nome: nome + '%',
      }
    );

    return resultado;
  }
}

export const authService = new AuthService();
