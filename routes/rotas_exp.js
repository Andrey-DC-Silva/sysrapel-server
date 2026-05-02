import express from 'express';
import { pool } from '../src/config/banco.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM experimento ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM experimento WHERE id = $1',
      [req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/', async (req, res) => {
  const { nome, descricao, data, status, pesquisador_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO experimento 
       (nome, descricao, data, status, pesquisador_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [nome, descricao, data, status, pesquisador_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { nome, descricao, data, status, pesquisador_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE experimento SET
        nome = $1,
        descricao = $2,
        data = $3,
        status = $4,
        pesquisador_id = $5
       WHERE id = $6
       RETURNING *`,
      [nome, descricao, data, status, pesquisador_id, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM experimento WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Deletado com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

export default router;