import express from 'express';
import { pool } from '../src/config/banco.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const result = await pool.query(`
    SELECT 
      p.*,
      pes.id AS pesquisador_id,
      pes.pessoa_id,
      pe.nome AS pesquisador_nome,
      pe.email AS pesquisador_email
    FROM projeto p
    LEFT JOIN pesquisador pes 
      ON pes.id = p.pesquisador_responsavel_id
    LEFT JOIN pessoa pe 
      ON pe.id = pes.pessoa_id
    ORDER BY p.id DESC
  `);

  res.json(result.rows);
});

router.get('/:id', async (req, res) => {
  const result = await pool.query(`
    SELECT * FROM projeto WHERE id=$1
  `, [req.params.id]);

  res.json(result.rows[0]);
});

router.post('/', async (req, res) => {
  const {
    nome,
    descricao,
    data_inicio,
    data_fim,
    status,
    pesquisador_responsavel_id
  } = req.body;

  const result = await pool.query(`
    INSERT INTO projeto 
      (nome, descricao, data_inicio, data_fim, status, pesquisador_responsavel_id)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *
  `, [
    nome,
    descricao,
    data_inicio || null,
    data_fim || null,
    status || 'ATIVO',
    pesquisador_responsavel_id || null
  ]);

  res.json(result.rows[0]);
});

router.put('/:id', async (req, res) => {
  const {
    nome,
    descricao,
    data_inicio,
    data_fim,
    status,
    pesquisador_responsavel_id
  } = req.body;

  const result = await pool.query(`
    UPDATE projeto SET
      nome = $1,
      descricao = $2,
      data_inicio = $3,
      data_fim = $4,
      status = $5,
      pesquisador_responsavel_id = $6
    WHERE id = $7
    RETURNING *
  `, [
    nome,
    descricao,
    data_inicio || null,
    data_fim || null,
    status,
    pesquisador_responsavel_id || null,
    req.params.id
  ]);

  res.json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM projeto WHERE id=$1', [req.params.id]);
  res.json({ message: 'Removido' });
});

export default router;