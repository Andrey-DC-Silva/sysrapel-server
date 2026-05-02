import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../src/config/banco.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM usuario');
  res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM usuario WHERE id=$1',
    [req.params.id]
  );
  res.json(result.rows[0]);
});

router.post('/', async (req, res) => {
  const { pesquisador_id, senha, role } = req.body;

  try {
    const resultPesq = await pool.query(
      `SELECT p.cpf
       FROM pesquisador pes
       JOIN pessoa p ON p.id = pes.pessoa_id
       WHERE pes.id = $1`,
      [pesquisador_id]
    );

    if (resultPesq.rows.length === 0) {
      return res.status(404).json({ error: 'Pesquisador não encontrado' });
    }

    const cpf = resultPesq.rows[0].cpf;

    const hash = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      `INSERT INTO usuario (pesquisador_id, cpf, senha_hash, role)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [pesquisador_id, cpf, hash, role]
    );

    res.json(result.rows[0]);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { role } = req.body;

  const result = await pool.query(
    `UPDATE usuario SET role=$1 WHERE id=$2 RETURNING *`,
    [role, req.params.id]
  );

  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM usuario WHERE id=$1', [req.params.id]);
  res.json({ message: 'Removido' });
});

export default router;