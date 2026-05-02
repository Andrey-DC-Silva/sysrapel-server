import express from 'express';
import { pool } from '../src/config/banco.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM pessoa');
  res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM pessoa WHERE id=$1',
    [req.params.id]
  );
  res.json(result.rows[0]);
});

router.post('/', async (req, res) => {
  const { nome, cpf, email } = req.body;

  const result = await pool.query(
    `INSERT INTO pessoa (nome, cpf, email)
     VALUES ($1,$2,$3) RETURNING *`,
    [nome, cpf, email]
  );

  res.json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  const { nome, cpf, email } = req.body;

  const result = await pool.query(
    `UPDATE pessoa
     SET nome=$1, cpf=$2, email=$3
     WHERE id=$4 RETURNING *`,
    [nome, cpf, email, req.params.id]
  );

  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM pessoa WHERE id=$1', [req.params.id]);
  res.json({ message: 'Removido' });
});

export default router;