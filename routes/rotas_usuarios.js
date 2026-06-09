import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../src/config/banco.js';
import {
  Autenticacao,
  AutenticarAdmin,
  autorizarProprioOuAdmin
} from '../src/authentication/autenticacao.js';

const router = express.Router();

router.use(Autenticacao);

const PERFIL_QUERY = `
  SELECT
    u.id,
    u.cpf,
    u.role,
    u.pesquisador_id,
    p.nome,
    p.email,
    pes.area_atuacao,
    pes.ativo
  FROM usuario u
  JOIN pesquisador pes ON pes.id = u.pesquisador_id
  JOIN pessoa p ON p.id = pes.pessoa_id
`;

router.get('/', AutenticarAdmin, async (req, res) => {
  try {
    const result = await pool.query(`${PERFIL_QUERY} ORDER BY p.nome`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', async (req, res) => {
  try {
    const result = await pool.query(
      `${PERFIL_QUERY} WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', autorizarProprioOuAdmin(), async (req, res) => {
  try {
    const result = await pool.query(
      `${PERFIL_QUERY} WHERE u.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/me', async (req, res) => {
  const { nome, email, area_atuacao, senha } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const usuario = await client.query(
      'SELECT pesquisador_id FROM usuario WHERE id = $1',
      [req.user.id]
    );

    if (usuario.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const pesquisadorId = usuario.rows[0].pesquisador_id;

    const pes = await client.query(
      'SELECT pessoa_id FROM pesquisador WHERE id = $1',
      [pesquisadorId]
    );

    const pessoaId = pes.rows[0].pessoa_id;

    if (nome || email) {
      await client.query(
        `UPDATE pessoa
         SET nome = COALESCE($1, nome),
             email = COALESCE($2, email)
         WHERE id = $3`,
        [nome || null, email || null, pessoaId]
      );
    }

    if (area_atuacao !== undefined) {
      await client.query(
        'UPDATE pesquisador SET area_atuacao = $1 WHERE id = $2',
        [area_atuacao, pesquisadorId]
      );
    }

    if (senha) {
      const hash = await bcrypt.hash(senha, 10);
      await client.query(
        'UPDATE usuario SET senha_hash = $1 WHERE id = $2',
        [hash, req.user.id]
      );
    }

    await client.query('COMMIT');

    const result = await pool.query(
      `${PERFIL_QUERY} WHERE u.id = $1`,
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put('/:id', autorizarProprioOuAdmin(), async (req, res) => {
  const { role, senha } = req.body;
  const isAdmin = req.user.role === 'ADMIN';
  const isSelf = String(req.user.id) === String(req.params.id);

  if (!isAdmin && !isSelf) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  if (role && !isAdmin) {
    return res.status(403).json({ error: 'Apenas administradores podem alterar perfis' });
  }

  try {
    if (role && isAdmin) {
      const result = await pool.query(
        'UPDATE usuario SET role = $1 WHERE id = $2 RETURNING id, cpf, role, pesquisador_id',
        [role, req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const perfil = await pool.query(
        `${PERFIL_QUERY} WHERE u.id = $1`,
        [req.params.id]
      );

      return res.json(perfil.rows[0]);
    }

    if (senha && isSelf) {
      const hash = await bcrypt.hash(senha, 10);
      await pool.query(
        'UPDATE usuario SET senha_hash = $1 WHERE id = $2',
        [hash, req.params.id]
      );

      const perfil = await pool.query(
        `${PERFIL_QUERY} WHERE u.id = $1`,
        [req.params.id]
      );

      return res.json(perfil.rows[0]);
    }

    return res.status(400).json({ error: 'Nenhuma alteração válida informada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', AutenticarAdmin, async (req, res) => {
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
       VALUES ($1, $2, $3, $4)
       RETURNING id, pesquisador_id, cpf, role`,
      [pesquisador_id, cpf, hash, role || 'PESQUISADOR']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', AutenticarAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM usuario WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ message: 'Usuário removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
