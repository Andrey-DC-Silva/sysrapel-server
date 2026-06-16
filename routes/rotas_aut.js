import express from 'express';
import { pool } from '../src/config/banco.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../src/authentication/autenticacao.js';

const router = express.Router();

function gerarToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      pesquisador_id: user.pesquisador_id
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

router.post('/login', async (req, res) => {
  const { cpf, senha } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuario WHERE cpf = $1',
      [cpf]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const valid = await bcrypt.compare(senha, user.senha_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Senha inválida' });
    }

    return res.json({ token: gerarToken(user) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/cadastro', async (req, res) => {
  const { nome, cpf, email, senha, area_atuacao } = req.body;

  if (!nome || !cpf || !email || !senha) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const cpfExistente = await client.query(
      'SELECT id FROM pessoa WHERE cpf = $1',
      [cpf]
    );

    if (cpfExistente.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'CPF já cadastrado' });
    }

    const pessoa = await client.query(
      `INSERT INTO pessoa (nome, cpf, email)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [nome, cpf, email]
    );

    const pessoaId = pessoa.rows[0].id;

    const pesquisador = await client.query(
      `INSERT INTO pesquisador (pessoa_id, area_atuacao)
       VALUES ($1, $2)
       RETURNING id`,
      [pessoaId, area_atuacao || null]
    );

    const pesquisadorId = pesquisador.rows[0].id;
    const hash = await bcrypt.hash(senha, 10);

    const usuario = await client.query(
      `INSERT INTO usuario (pesquisador_id, cpf, senha_hash, role)
       VALUES ($1, $2, $3, 'PESQUISADOR')
       RETURNING id, pesquisador_id, cpf, role`,
      [pesquisadorId, cpf, hash]
    );

    await client.query('COMMIT');

    const user = usuario.rows[0];
    return res.status(201).json({
      message: 'Conta criada com sucesso',
      token: gerarToken(user)
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

export default router;
