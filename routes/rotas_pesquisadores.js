import express from 'express';
import { pool } from '../src/config/banco.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const result = await pool.query(`
      SELECT 
        pes.id, pes.pessoa_id, p.nome, p.email, pes.area_atuacao, pes.ativo
      FROM pesquisador pes
      JOIN pessoa p ON p.id = pes.pessoa_id
      ORDER BY p.nome`
  );
  res.json(result.rows);
});

router.get('/ativos', async (req, res) => {
  const result = await pool.query(`
      SELECT 
        pes.id, pes.pessoa_id, p.nome, p.email, pes.area_atuacao, pes.ativo
      FROM pesquisador pes
      JOIN pessoa p ON p.id = pes.pessoa_id
      WHERE pes.ativo = true
      ORDER BY p.nome`
  );
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const { nome, cpf, email, area_atuacao } = req.body;

    await client.query('BEGIN');

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
       RETURNING *`,
      [pessoaId, area_atuacao]
    );

    await client.query('COMMIT');

    res.status(201).json(pesquisador.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
});

router.put('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    const { nome, email, area_atuacao, ativo } = req.body;

    await client.query('BEGIN');

    const pes = await client.query(
      `SELECT pessoa_id FROM pesquisador WHERE id = $1`,
      [req.params.id]
    );

    const pessoaId = pes.rows[0].pessoa_id;

    await client.query(
      `UPDATE pessoa SET nome = $1, email = $2 WHERE id = $3`,
      [nome, email, pessoaId]
    );

    const result = await client.query(
      `UPDATE pesquisador
       SET area_atuacao = $1,
           ativo = COALESCE($2, ativo)
       WHERE id = $3
       RETURNING *`,
      [area_atuacao, ativo, req.params.id]
    );

    await client.query('COMMIT');

    res.json(result.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pes = await client.query(
      `SELECT pessoa_id FROM pesquisador WHERE id = $1`,
      [req.params.id]
    );

    if (pes.rows.length === 0) {
      return res.status(404).json({ error: 'Pesquisador não encontrado' });
    }

    const pessoaId = pes.rows[0].pessoa_id;

    await client.query(
      `DELETE FROM pesquisador WHERE id = $1`,
      [req.params.id]
    );

    await client.query(
      `DELETE FROM pessoa WHERE id = $1`,
      [pessoaId]
    );

    await client.query('COMMIT');

    res.json({ message: 'Pesquisador e pessoa removidos com sucesso' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar' });
  } finally {
    client.release();
  }
});

export default router;