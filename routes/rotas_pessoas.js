import express from 'express';
import { pool } from '../src/config/banco.js';
import {
  Autenticacao,
  AutenticarAdmin
} from '../src/authentication/autenticacao.js';

const router = express.Router();

router.use(Autenticacao);

router.get('/', AutenticarAdmin, async (req, res) => {
  const result = await pool.query('SELECT * FROM pessoa');
  res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    const own = await pool.query(
      `SELECT p.id
       FROM pessoa p
       JOIN pesquisador pes ON pes.pessoa_id = p.id
       JOIN usuario u ON u.pesquisador_id = pes.id
       WHERE u.id = $1 AND p.id = $2`,
      [req.user.id, req.params.id]
    );

    if (own.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
  }

  const result = await pool.query(
    'SELECT * FROM pessoa WHERE id=$1',
    [req.params.id]
  );
  res.json(result.rows[0]);
});

router.post('/', AutenticarAdmin, async (req, res) => {
  const { nome, cpf, email } = req.body;

  const result = await pool.query(
    `INSERT INTO pessoa (nome, cpf, email)
     VALUES ($1,$2,$3) RETURNING *`,
    [nome, cpf, email]
  );
  res.json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    const own = await pool.query(
      `SELECT p.id
       FROM pessoa p
       JOIN pesquisador pes ON pes.pessoa_id = p.id
       JOIN usuario u ON u.pesquisador_id = pes.id
       WHERE u.id = $1 AND p.id = $2`,
      [req.user.id, req.params.id]
    );

    if (own.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
  }

  const { nome, cpf, email } = req.body;

  const result = await pool.query(
    `UPDATE pessoa
     SET nome=$1, cpf=$2, email=$3
     WHERE id=$4 RETURNING *`,
    [nome, cpf, email, req.params.id]
  );
  res.json(result.rows[0]);
});

router.delete('/:id', AutenticarAdmin, async (req, res) => {
  await pool.query('DELETE FROM pessoa WHERE id=$1', [req.params.id]);
  res.json({ message: 'Pessoa removida com sucesso' });
});

export default router;
