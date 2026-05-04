import express from 'express';
import { pool } from '../src/config/banco.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM experimento');
  res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM experimento WHERE id = $1',
    [req.params.id]
  );
  res.json(result.rows[0]);
});

router.post('/', async (req, res) => {
  const { nome, descricao, data, status, pesquisador_id } = req.body;
  const result = await pool.query(
    `INSERT INTO experimento (nome, descricao, data, status, pesquisador_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
    [nome, descricao, data, status, pesquisador_id]
  );
  res.json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  const { nome, descricao, data, status, pesquisador_id } = req.body;
  const result = await pool.query(
    `UPDATE experimento SET
        nome = $1, descricao = $2, data = $3, status = $4, pesquisador_id = $5
      WHERE id = $6
      RETURNING *`,
    [nome, descricao, data, status, pesquisador_id, req.params.id]
  );
  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM experimento WHERE id = $1', [req.params.id]);
  res.json({ mensagem: 'Experimento deletado com sucesso' });
});

export default router;