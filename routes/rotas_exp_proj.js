import express from 'express';
import { pool } from '../src/config/banco.js';
import { Autenticacao } from '../src/authentication/autenticacao.js';

const router = express.Router();

router.use(Autenticacao);

router.get('/projeto/:projetoId', async (req, res) => {
  const result = await pool.query(`
    SELECT e.*
    FROM experimento e
    JOIN projeto_experimento pe
      ON pe.experimento_id = e.id
    WHERE pe.projeto_id = $1
  `, [req.params.projetoId]);

  res.json(result.rows);
});

router.get('/disponiveis/:projetoId', async (req, res) => {
  const result = await pool.query(`
    SELECT e.*
    FROM experimento e
    WHERE e.id NOT IN (
      SELECT experimento_id
      FROM projeto_experimento
      WHERE projeto_id = $1
    )
  `, [req.params.projetoId]);

  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { projeto_id, experimento_id } = req.body;

  await pool.query(`
    INSERT INTO projeto_experimento (projeto_id, experimento_id)
    VALUES ($1,$2)
  `, [projeto_id, experimento_id]);

  res.json({ message: 'Vinculado' });
});

router.delete('/:projetoId/:experimentoId', async (req, res) => {
  const { projetoId, experimentoId } = req.params;

  await pool.query(`
    DELETE FROM projeto_experimento
    WHERE projeto_id=$1 AND experimento_id=$2
  `, [projetoId, experimentoId]);

  res.json({ message: 'Desvinculado' });
});

export default router;